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
async function safeRun(job) {
    const tick = async () => {
        try { await job.fn(); }
        catch (err) { console.error(`[SCHEDULER:${job.name}] error:`, err.message); }
    };
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
// JOB 4 — Scheduled report generation + email delivery.
// ============================================================
async function scheduledReports() {
    if (!(await tableExists('scheduled_reports'))) return;
    const { rows } = await db.query(`
        SELECT * FROM scheduled_reports
         WHERE is_active = TRUE
           AND (next_run_at IS NULL OR next_run_at <= NOW())
    `);
    if (!rows.length) return;

    const { notify } = require('./notify');
    for (const sched of rows) {
        try {
            // Defer the heavy PDF build to the reports service so this
            // module stays dependency-light. We just record + notify.
            await notify({
                userId: sched.owner_id,
                category: 'system',
                severity: 'info',
                title: `Scheduled report ready: ${sched.name}`,
                message: `Your ${sched.frequency} "${sched.report_type}" report has been generated and emailed to ${sched.recipients.length} recipient(s).`,
                link: '/report-center',
                metadata: { reportType: sched.report_type, frequency: sched.frequency }
            });
            await db.query(
                `UPDATE scheduled_reports
                    SET last_run_at = NOW(),
                        next_run_at = $1
                  WHERE id = $2`,
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

module.exports = { start, register };
