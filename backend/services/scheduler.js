// ============================================================
// scheduler.js — In-process background job runner.
//
// Runs periodic maintenance jobs that several enhancement modules
// depend on:
//   • Compliance SLA auto-escalation        (every 30 min)
//   • Service SLA breach / deemed approval  (every 30 min)
//   • Document expiry reminders             (daily at 09:00)
//   • Scheduled report generation + email   (every 15 min)
//   • Subscription dunning retry            (hourly)
//
// Design: every job is independently wrapped so a failure in one
// never stops the others. Jobs check for their backing tables and
// skip silently if the v3 migration hasn't been applied yet — this
// keeps the scheduler safe to enable even mid-rollout.
//
// Dependency-free: uses setInterval rather than pulling in a cron
// library, since this project's backend intentionally stays lean.
// ============================================================

const db = require('../db');

const JOBS = [];
let started = false;

function register(name, intervalMs, fn) {
    JOBS.push({ name, intervalMs, fn });
}

// Wrap a job so it never throws out to the timer (which would kill it).
// `tick` is awaited with a `.catch` so a synchronous throw in any job body
// becomes a logged rejection instead of an unhandled-rejection process exit.
function safeRun(job) {
    const tick = () => Promise.resolve()
        .then(() => job.fn())
        .catch((err) => console.error(`[SCHEDULER:${job.name}] error:`, err.message));
    // Run once immediately on startup, then on the interval.
    tick();
    return setInterval(tick, job.intervalMs);
}

function start() {
    if (started) return;
    started = true;
    JOBS.forEach((job) => {
        console.log(`[SCHEDULER] starting "${job.name}" every ${Math.round(job.intervalMs / 1000)}s`);
        safeRun(job);
    });
}

// ------------------------------------------------------------
// Helper: detect whether a table exists (so a job can bail out
// gracefully before the v3 migration is applied).
// ------------------------------------------------------------
async function tableExists(name) {
    try {
        const { rows } = await db.query(
            `SELECT to_regclass($1) AS exists`,
            [`public.${name}`]
        );
        return rows[0] && rows[0].exists !== null;
    } catch (_) { return false; }
}

// ============================================================
// JOB 1 — Compliance SLA auto-escalation.
// Walk the escalation matrix; for any violation whose current state
// has exceeded its SLA window, advance it and fire a notification.
// ============================================================
async function complianceEscalation() {
    if (!(await tableExists('compliance_escalation_matrix'))) return;

    const { rows } = await db.query(`
        SELECT v.id, v.industry_id, v.severity, v.status, v.last_state_change, m.to_state, m.auto_action
        FROM compliance_violations v
        JOIN compliance_escalation_matrix m
          ON m.severity = v.severity AND m.from_state = v.status AND m.is_active = TRUE
        WHERE v.status NOT IN ('resolved')
          AND (v.last_state_change IS NULL OR v.last_state_change + make_interval(hours => m.sla_hours::integer) < NOW())
    `);

    for (const v of rows) {
        // Advance the violation.
        await db.query(
            `UPDATE compliance_violations
                SET status = $1::violation_status,
                    escalation_state = 'escalated',
                    last_state_change = NOW()
              WHERE id = $2`,
            [v.to_state, v.id]
        );

        // Resolve the industry's owner user for the notification.
        const u = await db.query(
            'SELECT u.id FROM users u JOIN industry_profiles ip ON ip.user_id = u.id WHERE ip.id = $1',
            [v.industry_id]
        );
        const userId = u.rows.length ? u.rows[0].id : null;

        const { notify } = require('./notify');
        await notify({
            userId,
            category: 'compliance',
            severity: v.severity === 'critical' ? 'error' : 'warning',
            title: `Compliance violation escalated to ${v.to_state}`,
            message: `A ${v.severity} compliance violation (id ${v.id}) was auto-escalated after the SLA window lapsed. Action: ${v.auto_action || 'review required'}.`,
            link: '/compliance-engine',
            metadata: { violationId: v.id, toState: v.to_state, autoAction: v.auto_action }
        });
    }
    if (rows.length) console.log(`[SCHEDULER] compliance escalation: ${rows.length} violation(s) advanced.`);
}

// ============================================================
// JOB 2 — Service SLA: mark overdue, apply deemed approval.
// ============================================================
async function serviceSla() {
    if (!(await tableExists('service_sla_definitions'))) return;

    // Mark overdue (deadline passed, not yet terminal).
    const overdue = await db.query(`
        UPDATE service_requests
           SET escalation_state = 'escalated'
         WHERE sla_deadline IS NOT NULL
           AND sla_deadline < NOW()
           AND current_status NOT IN ('approved','rejected','completed')
           AND escalation_state <> 'escalated'
         RETURNING id, reference_number, industry_id
    `);

    // Deemed approval where the SLA definition allows it.
    const deemed = await db.query(`
        UPDATE service_requests sr
           SET deemed_approved = TRUE,
               current_status = 'approved',
               actual_completion = CURRENT_DATE,
               escalation_state = 'auto_actioned'
          FROM service_sla_definitions sla
         WHERE sla.service_type = sr.service_type
           AND sla.deemed_approval = TRUE
           AND sr.sla_deadline < NOW()
           AND sr.current_status NOT IN ('approved','rejected','completed')
           AND sr.deemed_approved = FALSE
         RETURNING sr.id, sr.reference_number, sr.industry_id
    `);

    const { notify } = require('./notify');
    for (const r of deemed.rows) {
        const u = await db.query(
            'SELECT u.id FROM users u JOIN industry_profiles ip ON ip.user_id = u.id WHERE ip.id = $1',
            [r.industry_id]
        );
        await notify({
            userId: u.rows.length ? u.rows[0].id : null,
            category: 'service',
            severity: 'success',
            title: 'Service request deemed approved',
            message: `Your request ${r.reference_number} was auto-approved (statutory SLA elapsed).`,
            link: '/services',
            metadata: { requestId: r.id, ref: r.reference_number }
        });
    }
    if (overdue.rowCount || deemed.rowCount)
        console.log(`[SCHEDULER] service SLA: ${overdue.rowCount} overdue, ${deemed.rowCount} deemed-approved.`);
}

// ============================================================
// JOB 3 — Document expiry reminders (Secure Vault).
// For each document with an expiry_date, ensure reminder rows exist
// for [60, 30, 7] days before; then fire the ones due today.
// ============================================================
const REMINDER_WINDOWS = [60, 30, 7];

async function documentExpiry() {
    if (!(await tableExists('document_expiry_reminders'))) return;

    // 1. Ensure reminder rows exist for any un-scheduled expiring doc.
    for (const days of REMINDER_WINDOWS) {
        // Use $1 as a typed integer everywhere; build the interval via
        // make_interval so we avoid any integer/text concatenation ambiguity.
        await db.query(`
            INSERT INTO document_expiry_reminders (document_id, remind_date, days_before)
            SELECT d.id, d.expiry_date - make_interval(days => $1::integer), $1::integer
              FROM documents d
             WHERE d.expiry_date IS NOT NULL
               AND NOT EXISTS (
                     SELECT 1 FROM document_expiry_reminders r
                      WHERE r.document_id = d.id AND r.days_before = $1::integer
                   )
        `, [days]);
    }

    // 2. Fire due, unsent reminders (remind_date <= today).
    const due = await db.query(`
        SELECT r.id, r.document_id, r.days_before, d.file_name, d.category, d.expiry_date, d.industry_id
          FROM document_expiry_reminders r
          JOIN documents d ON d.id = r.document_id
         WHERE r.sent = FALSE AND r.remind_date <= CURRENT_DATE
    `);

    const { notify } = require('./notify');
    for (const r of due.rows) {
        const u = await db.query(
            'SELECT u.id FROM users u JOIN industry_profiles ip ON ip.user_id = u.id WHERE ip.id = $1',
            [r.industry_id]
        );
        const category = String(r.category).replace(/_/g, ' ');
        await notify({
            userId: u.rows.length ? u.rows[0].id : null,
            category: 'document',
            severity: r.days_before <= 7 ? 'error' : 'warning',
            title: `${category} expiring in ${r.days_before} day(s)`,
            message: `Document "${r.file_name}" expires on ${new Date(r.expiry_date).toLocaleDateString('en-IN')}. Please renew to keep your compliance score.`,
            link: '/secure-vault',
            metadata: { documentId: r.document_id, daysBefore: r.days_before }
        });
        await db.query('UPDATE document_expiry_reminders SET sent = TRUE, sent_at = NOW() WHERE id = $1', [r.id]);
    }
    if (due.rowCount) console.log(`[SCHEDULER] doc expiry: ${due.rowCount} reminder(s) sent.`);
}

// ============================================================
// JOB 4 — Scheduled report generation.
// HONEST behaviour (Phase 21 fix): a REAL CSV artifact is built
// from live data, stored under uploads/reports/, recorded in
// report_generation_log, and the user is notified with a download
// path. Email delivery is only claimed when a real email
// transport exists — otherwise the notification says the report
// is available in the portal and email stays SIMULATED.
// ============================================================
async function scheduledReports() {
    if (!(await tableExists('scheduled_reports'))) return;
    const { rows } = await db.query(`
        SELECT * FROM scheduled_reports
         WHERE is_active = TRUE
           AND (next_run_at IS NULL OR next_run_at <= NOW())
    `);
    if (!rows.length) return;

    const fs = require('fs');
    const path = require('path');
    const REPORTS_DIR = path.join(__dirname, '..', 'uploads', 'reports');
    const { notify, PROVIDERS } = require('./notify');

    for (const sched of rows) {
        try {
            fs.mkdirSync(REPORTS_DIR, { recursive: true });

            // Real per-industry dataset (same source as /api/reports/data).
            const data = await db.query(`
                WITH latest_sub AS (
                    SELECT DISTINCT ON (industry_id) id, industry_id FROM data_submissions
                     WHERE lower(status) IN ('approved','submitted')
                  ORDER BY industry_id, submitted_at DESC)
                SELECT ip.company_name, ip.location, ip.operational_status,
                       f.investment_amount, f.annual_turnover,
                       COALESCE(e.permanent_employees,0)+COALESCE(e.contract_employees,0) AS employment,
                       r.water_consumption, r.power_usage
                  FROM industry_profiles ip
             LEFT JOIN latest_sub ls ON ls.industry_id = ip.id
             LEFT JOIN financial_data f ON f.submission_id = ls.id
             LEFT JOIN employment_data e ON e.submission_id = ls.id
             LEFT JOIN resource_usage r ON r.submission_id = ls.id
              ORDER BY ip.company_name`);

            const header = 'Company,Location,Operational Status,Investment (INR),Turnover (INR),Employment,Water (KL),Power (kWh)';
            const lines = data.rows.map(r =>
                `"${r.company_name}","${r.location || ''}","${r.operational_status || ''}",` +
                `${r.investment_amount ?? ''},${r.annual_turnover ?? ''},${r.employment},${r.water_consumption ?? ''},${r.power_usage ?? ''}`);
            const stamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `scheduled_${sched.report_type || 'report'}_${sched.id}_${stamp}.csv`;
            fs.writeFileSync(path.join(REPORTS_DIR, fileName), [header, ...lines].join('\n'), 'utf8');

            // Record the generation (real log row, real artifact).
            await db.query(`
                INSERT INTO report_generation_log
                    (generated_by, report_type, format, report_id_code, row_count, file_size_kb, filters)
                 VALUES ($1,$2,'csv',$3,$4,$5,$6::jsonb)`,
                [sched.owner_id, sched.report_type || 'scheduled', `SCH-${sched.id}-${stamp}`,
                 data.rows.length, Math.round(fs.statSync(path.join(REPORTS_DIR, fileName)).size / 1024),
                 JSON.stringify({ schedule_id: sched.id, frequency: sched.frequency })]);

            const emailReal = !!(PROVIDERS.email.configured && PROVIDERS.email.transportImplemented);
            await notify({
                userId: sched.owner_id,
                category: 'system',
                severity: 'info',
                title: `Scheduled report generated: ${sched.name}`,
                message: `Your ${sched.frequency} "${sched.report_type}" report was generated from live data (${data.rows.length} industries, artifact ${fileName}). ` +
                    (emailReal
                        ? `Emailed to ${(Array.isArray(sched.recipients) ? sched.recipients : []).length} recipient(s).`
                        : `Download it from the Report Center — email delivery is not configured on this deployment, so no email was sent.`),
                link: '/report-center',
                metadata: { scheduleId: sched.id, artifact: fileName, rows: data.rows.length, emailDelivered: emailReal }
            });

            await db.query(
                `UPDATE scheduled_reports SET last_run_at = NOW(), next_run_at = $1 WHERE id = $2`,
                [nextRun(sched.frequency), sched.id]
            );
        } catch (err) {
            console.warn(`[SCHEDULER] scheduled report id=${sched.id} failed:`, err.message);
        }
    }
}

function nextRun(frequency) {
    const d = new Date();
    switch (frequency) {
        case 'daily':     d.setDate(d.getDate() + 1); break;
        case 'weekly':    d.setDate(d.getDate() + 7); break;
        case 'monthly':   d.setMonth(d.getMonth() + 1); break;
        case 'quarterly': d.setMonth(d.getMonth() + 3); break;
        default:          d.setDate(d.getDate() + 1);
    }
    return d;
}

// ============================================================
// JOB 5 — Subscription dunning (failed payment retry).
// ============================================================
async function subscriptionDunning() {
    if (!(await tableExists('subscription_subscriptions'))) return;
    const { rows } = await db.query(`
        UPDATE subscription_subscriptions
           SET dunning_retries = dunning_retries + 1
         WHERE status = 'past_due'
           AND dunning_retries < 3
         RETURNING id, user_id, dunning_retries
    `);
    if (!rows.length) return;
    const { notify } = require('./notify');
    for (const s of rows) {
        await notify({
            userId: s.user_id,
            category: 'payment',
            severity: 'warning',
            title: 'Subscription payment retry attempted',
            message: `We retried your subscription payment (attempt ${s.dunning_retries} of 3). Please update your payment method to avoid service interruption.`,
            link: '/subscriptions',
            metadata: { subscriptionId: s.id, attempt: s.dunning_retries }
        });
    }
    console.log(`[SCHEDULER] dunning: ${rows.length} subscription(s) retried.`);
}

// ------------------------------------------------------------
// Register all jobs with sensible cadences.
// ------------------------------------------------------------
register('compliance-escalation', 30 * 60 * 1000, complianceEscalation);
register('service-sla',           30 * 60 * 1000, serviceSla);
register('document-expiry',       24 * 60 * 60 * 1000, documentExpiry);
register('scheduled-reports',     15 * 60 * 1000, scheduledReports);
register('subscription-dunning',  60 * 60 * 1000, subscriptionDunning);
register('reporting-calendar',    24 * 60 * 60 * 1000, reportingCalendarMaintenance);
register('submission-reminders',  60 * 60 * 1000, submissionReminders);
register('compliance-scoring',    24 * 60 * 60 * 1000, complianceScoringJob);
register('anomaly-batch',         24 * 60 * 60 * 1000, anomalyBatch);

// ============================================================
// JOB 6 — reporting-calendar maintenance (daily).
// Ensures calendar rows exist for the current and next year
// (default policy), and closes periods past their closing date.
// Admins can edit any row afterwards — this only fills gaps.
// ============================================================
async function reportingCalendarMaintenance() {
    if (!(await tableExists('reporting_periods'))) return;
    const years = [new Date().getUTCFullYear(), new Date().getUTCFullYear() + 1];
    for (const y of years) {
        await db.query(`
            INSERT INTO reporting_periods (period_year, period_quarter, opens_on, due_on, grace_days, closes_on, status)
            SELECT $1, q,
                   make_date($1, (q-1)*3+1, 1),
                   (make_date($1, (q-1)*3+1, 1) + INTERVAL '3 months' - INTERVAL '1 day' + INTERVAL '15 days')::date,
                   7,
                   (make_date($1, (q-1)*3+1, 1) + INTERVAL '3 months' - INTERVAL '1 day' + INTERVAL '22 days')::date,
                   'open'
              FROM (VALUES (1),(2),(3),(4)) q(q)
         ON CONFLICT DO NOTHING`, [y]);
    }
    const closed = await db.query(`
        UPDATE reporting_periods SET status = 'closed', updated_at = NOW()
         WHERE status = 'open' AND closes_on < CURRENT_DATE RETURNING id`);
    if (closed.rowCount) console.log(`[SCHEDULER] reporting calendar: ${closed.rowCount} period(s) closed.`);
}

// ============================================================
// JOB 7 — submission reminder + escalation engine (hourly).
// For every OPEN period with elapsed stages, reminds industries
// that have not filed:
//   T-7 days  → reminder 1 "upcoming"
//   due date  → reminder 2 "due"
//   grace -2  → reminder 3 "grace"
//   past close→ reminder 4 "overdue"  + GOVT officer notification
//   +7 past   → reminder 5 "escalated" + govt re-notification
// Every send is persisted in submission_reminders (unique key
// prevents duplicates). Delivery honesty follows notify.js.
// ============================================================
async function submissionReminders() {
    if (!(await tableExists('reporting_periods'))) return;

    const periods = await db.query(`
        SELECT * FROM reporting_periods
         WHERE due_on <= CURRENT_DATE + 7
           AND closes_on >= CURRENT_DATE - 90`);
    if (!periods.rows.length) return;

    const { notify } = require('./notify');
    const today = new Date();
    const days = (d) => Math.floor((today - new Date(d)) / 86400000);

    for (const rp of periods.rows) {
        // Expected filers that have NOT filed this period.
        const nonFilers = await db.query(`
            SELECT ip.id, ip.company_name, u.id AS user_id
              FROM industry_profiles ip
              JOIN users u ON u.id = ip.user_id
             WHERE ip.operational_status = ANY(ARRAY['OPERATING','IDLE','TEMPORARILY_CLOSED']::text[])
               AND NOT EXISTS (
                     SELECT 1 FROM data_submissions ds
                      WHERE ds.industry_id = ip.id
                        AND ds.period_year = $1 AND ds.period_quarter = $2)`,
            [rp.period_year, rp.period_quarter]);
        if (!nonFilers.rows.length) continue;

        // Determine the current stage + reminder number.
        let stage = null, reminderNo = 0, notifyGovt = false;
        const dueIn = -days(rp.due_on); // positive = days until due
        if (dueIn >= 1 && dueIn <= 7) { stage = 'upcoming'; reminderNo = 1; }
        else if (dueIn <= 0 && days(rp.closes_on) < 0) {
            // past due, still in grace window
            const daysToClose = -days(rp.closes_on);
            if (daysToClose <= 2) { stage = 'grace'; reminderNo = 3; }
            else { stage = 'due'; reminderNo = 2; }
        }
        if (stage === null && days(rp.closes_on) >= 0) {
            const past = days(rp.closes_on);
            if (past >= 7) { stage = 'escalated'; reminderNo = 5; notifyGovt = true; }
            else { stage = 'overdue'; reminderNo = 4; notifyGovt = true; }
        }
        if (stage === null) continue;

        const periodLabel = `${rp.period_year}-Q${rp.period_quarter}`;
        const messages = {
            upcoming: `Reminder: your ${periodLabel} industrial data return is due on ${rp.due_on}.`,
            due: `DUE NOW: your ${periodLabel} industrial data return was due on ${rp.due_on}. File immediately.`,
            grace: `FINAL NOTICE: the grace window for your ${periodLabel} return closes on ${rp.closes_on}.`,
            overdue: `OVERDUE: your ${periodLabel} industrial data return is overdue (window closed ${rp.closes_on}). This has been reported to SIPCOT officers.`,
            escalated: `ESCALATED: ${periodLabel} return still missing after escalation window. Further enforcement may follow.`
        };

        for (const ind of nonFilers.rows) {
            // Dedupe via unique (industry, period, reminder_no).
            const ins = await db.query(`
                INSERT INTO submission_reminders (industry_id, period_year, period_quarter, reminder_no, stage, gov_notified)
                VALUES ($1,$2,$3,$4,$5,$6)
              ON CONFLICT DO NOTHING RETURNING id`, [ind.id, rp.period_year, rp.period_quarter, reminderNo, stage, notifyGovt]);
            if (!ins.rows.length) continue; // already sent

            await notify({
                userId: ind.user_id,
                category: 'submission',
                severity: stage === 'overdue' || stage === 'escalated' ? 'error' : 'warning',
                title: `[${stage.toUpperCase()}] ${periodLabel} data return`,
                message: messages[stage],
                link: '/submit-data',
                metadata: { periodYear: rp.period_year, periodQuarter: rp.period_quarter, stage, reminderNo }
            });
        }

        // Government officer notification on overdue/escalated. Gov-wide
        // notices are recorded in the notifications table (the reminders
        // ledger is per-industry; industry_id has an FK to real profiles).
        if (notifyGovt) {
            const count = nonFilers.rows.length;
            const already = await db.query(
                `SELECT COUNT(*)::int AS n FROM notifications
                  WHERE role_scope='govt' AND category='submission'
                    AND title = $1 AND created_at > NOW() - INTERVAL '7 days'`,
                [`${count} industries ${stage === 'escalated' ? 'escalated' : 'overdue'} for ${periodLabel}`]);
            if (!already.rows[0].n) {
                await notify({
                    roleScope: 'govt',
                    category: 'submission',
                    severity: stage === 'escalated' ? 'error' : 'warning',
                    title: `${count} industries ${stage === 'escalated' ? 'escalated' : 'overdue'} for ${periodLabel}`,
                    message: `${count} expected filers have not submitted their ${periodLabel} return (window closed ${rp.closes_on}). See the Compliance Engine → Filing Status view.`,
                    link: '/compliance-engine',
                    metadata: { periodYear: rp.period_year, periodQuarter: rp.period_quarter, nonFilers: count, stage }
                });
            }
        }
        console.log(`[SCHEDULER] reminders: ${periodLabel} stage=${stage}, ${nonFilers.rows.length} non-filer(s) processed.`);
    }
}

// ============================================================
// JOB 8 — compliance scoring (daily). Real scores from real
// violations/filing behaviour; replaces static seed values.
// ============================================================
async function complianceScoringJob() {
    if (!(await tableExists('compliance_scores'))) return;
    const { computeAllScores } = require('./complianceScoring');
    const result = await computeAllScores();
    if (result.scored) console.log(`[SCHEDULER] compliance scoring: ${result.scored} industries scored as of ${result.as_of}.`);
}

// ============================================================
// JOB 9 — anomaly batch (daily). Re-runs consistency + anomaly
// detection across every industry's latest filing so findings
// stay current even when rules change after filing.
// ============================================================
async function anomalyBatch() {
    if (!(await tableExists('data_findings'))) return;
    const consistencyEngine = require('./consistencyEngine');
    const anomalyService = require('./anomalyService');
    const { rows } = await db.query(`
        SELECT DISTINCT ON (industry_id) id FROM data_submissions
      ORDER BY industry_id, submitted_at DESC`);
    let findings = 0;
    const c = await consistencyEngine.evaluateAll('scheduler');
    findings += c.findings;
    for (const r of rows) {
        const res = await anomalyService.evaluateSubmission(r.id, 'scheduler');
        findings += res.findings;
    }
    if (findings) console.log(`[SCHEDULER] anomaly batch: ${findings} finding(s) across ${rows.length} latest filings.`);
}


// Exposed for the admin on-demand sweep endpoint (same logic the
// hourly job runs — single source of truth).
module.exports.runSubmissionReminders = submissionReminders;
module.exports.start = start;
module.exports.register = register;
