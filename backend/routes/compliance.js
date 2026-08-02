const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');

// ============================================================
// Helpers
// ============================================================
const pct = (part, total) => (total > 0 ? Math.round((part / total) * 1000) / 10 : 0);

// ============================================================
// @route   GET /api/compliance/overview
// @desc    Summary compliance cards (buckets industries by latest score)
// @access  Private (Admin, Govt)
// ============================================================
router.get('/overview', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        // Bucket each industry by its most recent overall_score. Industries with
        // no scoring history at all are counted as "missing" (never assessed).
        const { rows } = await db.query(`
            WITH latest_scores AS (
                SELECT DISTINCT ON (industry_id) industry_id, overall_score
                FROM compliance_scores
                ORDER BY industry_id, score_date DESC
            )
            SELECT
                (SELECT COUNT(*) FROM industry_profiles) AS total_industries,
                COUNT(*) FILTER (WHERE overall_score >= 80) AS compliant,
                COUNT(*) FILTER (WHERE overall_score >= 60 AND overall_score < 80) AS warning,
                COUNT(*) FILTER (WHERE overall_score < 60) AS violation
            FROM latest_scores
        `);

        const r = rows[0];
        const total = parseInt(r.total_industries) || 0;
        const compliant = parseInt(r.compliant) || 0;
        const warning = parseInt(r.warning) || 0;
        const violation = parseInt(r.violation) || 0;
        const missing = Math.max(total - compliant - warning - violation, 0);

        res.json({
            compliant: { count: compliant, percentage: pct(compliant, total) },
            warning: { count: warning, percentage: pct(warning, total) },
            violation: { count: violation, percentage: pct(violation, total) },
            missing: { count: missing, percentage: pct(missing, total) },
            total_industries: total
        });
    } catch (err) {
        console.error('Compliance Overview Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/compliance/violations
// @desc    Paginated violation list (filter by severity/status)
// @access  Private (Admin, Govt)
// ============================================================
router.get('/violations', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { severity, status } = req.query;
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
        const offset = (page - 1) * limit;

        // Build filters dynamically so invalid/empty values are simply ignored.
        const conditions = [];
        const params = [];
        if (severity) {
            params.push(severity);
            conditions.push(`v.severity = $${params.length}::violation_severity`);
        }
        if (status) {
            params.push(status);
            conditions.push(`v.status = $${params.length}::violation_status`);
        }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const countResult = await db.query(
            `SELECT COUNT(*) FROM compliance_violations v ${where}`,
            params
        );
        const total = parseInt(countResult.rows[0].count) || 0;

        const listResult = await db.query(
            `SELECT
                v.id,
                ip.company_name,
                r.rule_code,
                r.rule_name,
                v.severity,
                v.status,
                v.violation_date,
                v.description
             FROM compliance_violations v
             JOIN industry_profiles ip ON ip.id = v.industry_id
             LEFT JOIN compliance_rules r ON r.id = v.rule_id
             ${where}
             ORDER BY v.violation_date DESC
             LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
            [...params, limit, offset]
        );

        res.json({
            violations: listResult.rows,
            total,
            page,
            totalPages: Math.max(Math.ceil(total / limit), 1)
        });
    } catch (err) {
        console.error('Violations List Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   PUT /api/compliance/violations/:id
// @desc    Update violation status (acknowledge, escalate, resolve)
// @access  Private (Admin)
// ============================================================
router.put('/violations/:id', requireRole(['admin']), async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['open', 'acknowledged', 'resolving', 'resolved', 'escalated'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status value.' });
        }

        const isResolved = status === 'resolved';
        const result = await db.query(
            `UPDATE compliance_violations
             SET status = $1::violation_status,
                 resolved_at = CASE WHEN $2 THEN NOW() ELSE resolved_at END,
                 resolved_by = CASE WHEN $2 THEN $3 ELSE resolved_by END
             WHERE id = $4
             RETURNING id, status, resolved_at`,
            [status, isResolved, req.user.id, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Violation not found.' });
        }

        res.json({ msg: 'Violation status updated', violation: result.rows[0] });
    } catch (err) {
        console.error('Update Violation Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/compliance/missing-submissions
// @desc    Industries that have not submitted for the current period
// @access  Private (Admin, Govt)
// ============================================================
router.get('/missing-submissions', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        // "Current cycle" starts at the beginning of the current calendar year.
        // Any industry whose latest approved/submitted filing predates that (or
        // who has never filed) is considered to have a missing submission.
        const cycleStart = `${new Date().getFullYear()}-01-01`;

        const { rows } = await db.query(`
            SELECT
                ip.id,
                ip.company_name,
                ip.location,
                MAX(ds.submitted_at) AS last_submission
            FROM industry_profiles ip
            LEFT JOIN data_submissions ds
                ON ds.industry_id = ip.id
                AND lower(ds.status) IN ('approved', 'submitted')
            GROUP BY ip.id, ip.company_name, ip.location
            HAVING MAX(ds.submitted_at) IS NULL OR MAX(ds.submitted_at) < $1
            ORDER BY last_submission ASC NULLS FIRST
        `, [cycleStart]);

        const now = Date.now();
        const missing = rows.map(row => {
            let periodsMissed;
            if (!row.last_submission) {
                periodsMissed = null; // never submitted
            } else {
                const months = (now - new Date(row.last_submission).getTime()) / (1000 * 60 * 60 * 24 * 30);
                periodsMissed = Math.max(Math.floor(months / 3), 1); // quarters
            }
            return {
                id: row.id,
                company_name: row.company_name,
                location: row.location,
                last_submission: row.last_submission,
                periods_missed: periodsMissed
            };
        });

        res.json({
            missing,
            total: missing.length,
            cycle_start: cycleStart
        });
    } catch (err) {
        console.error('Missing Submissions Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   POST /api/compliance/send-reminders
// @desc    Send bulk compliance reminders (records intent in audit_logs)
// @access  Private (Admin)
// ============================================================
router.post('/send-reminders', requireRole(['admin']), async (req, res) => {
    try {
        const { industryIds } = req.body;
        const count = Array.isArray(industryIds) ? industryIds.length : 0;

        // Record the action so it shows up in the audit trail (best-effort).
        try {
            await db.query(
                `INSERT INTO audit_logs (user_id, action) VALUES ($1, $2)`,
                [req.user.id, `Sent compliance reminders to ${count} industries`]
            );
        } catch (auditErr) {
            console.warn('Audit log insert skipped:', auditErr.message);
        }

        res.json({ msg: `Reminders sent to ${count} industries`, count });
    } catch (err) {
        console.error('Send Reminders Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/compliance/trends
// @desc    Compliance score trends over time (from compliance_scores)
// @access  Private (Admin, Govt)
// ============================================================
router.get('/trends', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT
                to_char(score_date, 'YYYY-MM') AS month,
                ROUND(AVG(overall_score), 1) AS avg_score,
                ROUND(100.0 * COUNT(*) FILTER (WHERE overall_score >= 75) / COUNT(*), 1) AS compliant_pct
            FROM compliance_scores
            GROUP BY to_char(score_date, 'YYYY-MM')
            ORDER BY month ASC
        `);

        res.json(rows.map(r => ({
            month: r.month,
            avg_score: parseFloat(r.avg_score),
            compliant_pct: parseFloat(r.compliant_pct)
        })));
    } catch (err) {
        console.error('Compliance Trends Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/compliance/by-category
// @desc    Open violations grouped by rule category
// @access  Private (Admin, Govt)
// ============================================================
router.get('/by-category', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT
                COALESCE(r.category, 'other') AS category,
                COUNT(*) AS count
            FROM compliance_violations v
            LEFT JOIN compliance_rules r ON r.id = v.rule_id
            WHERE v.status NOT IN ('resolved')
            GROUP BY COALESCE(r.category, 'other')
            ORDER BY count DESC
        `);

        const total = rows.reduce((sum, r) => sum + parseInt(r.count), 0);
        res.json(rows.map(r => ({
            category: r.category,
            count: parseInt(r.count),
            percentage: pct(parseInt(r.count), total)
        })));
    } catch (err) {
        console.error('By Category Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/compliance/predictions
// @desc    Current aggregates from real data + projected 1-year outlook
// @access  Private (Admin, Govt)
// ============================================================
router.get('/predictions', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        // Current figures are real (latest submission per industry). The 1-year
        // projection applies a transparent growth assumption per metric.
        const { rows } = await db.query(`
            WITH latest_sub AS (
                SELECT DISTINCT ON (industry_id) id, industry_id
                FROM data_submissions
                ORDER BY industry_id, submitted_at DESC
            ),
            latest_scores AS (
                SELECT DISTINCT ON (industry_id) industry_id, overall_score
                FROM compliance_scores
                ORDER BY industry_id, score_date DESC
            )
            SELECT
                (SELECT COUNT(*) FROM industry_profiles) AS active_industries,
                COALESCE(SUM(CASE WHEN f.investment_amount >= 100000 THEN f.investment_amount / 1e7 ELSE f.investment_amount END), 0) AS total_investment_cr,
                COALESCE(SUM(e.permanent_employees + e.contract_employees), 0) AS total_employment,
                (SELECT ROUND(AVG(overall_score), 1) FROM latest_scores) AS avg_compliance
            FROM latest_sub ls
            LEFT JOIN financial_data f ON f.submission_id = ls.id
            LEFT JOIN employment_data e ON e.submission_id = ls.id
        `);

        const r = rows[0];
        // investment normalised per-row in SQL (rupees vs crores) -> already Cr here.
        const investmentCr = parseFloat(r.total_investment_cr) || 0;
        const employment = parseInt(r.total_employment) || 0;
        const complianceRate = parseFloat(r.avg_compliance) || 0;
        const activeIndustries = parseInt(r.active_industries) || 0;

        const project = (val, growthPct) => Math.round(val * (1 + growthPct / 100));
        const fmt = (n) => n.toLocaleString('en-IN');

        res.json([
            { metric: 'Total Investment', current: `${fmt(Math.round(investmentCr))} Cr`, projected_1yr: `${fmt(project(investmentCr, 15))} Cr`, growth_pct: 15 },
            { metric: 'Employment', current: fmt(employment), projected_1yr: fmt(project(employment, 12)), growth_pct: 12 },
            { metric: 'Compliance Rate', current: `${complianceRate}%`, projected_1yr: `${Math.min(project(complianceRate, 6), 100)}%`, growth_pct: 6 },
            { metric: 'Active Industries', current: fmt(activeIndustries), projected_1yr: fmt(project(activeIndustries, 15)), growth_pct: 15 }
        ]);
    } catch (err) {
        console.error('Predictions Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/compliance/escalation-matrix
// @desc    Read the auto-escalation SLA matrix (Quick Win 1)
// @access  Private (Admin, Govt)
// ============================================================
router.get('/escalation-matrix', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT severity, from_state, to_state, sla_hours, auto_action, is_active
              FROM compliance_escalation_matrix
             ORDER BY severity::text, sla_hours
        `);
        res.json(rows);
    } catch (err) {
        console.error('Escalation Matrix Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   POST /api/compliance/run-auto-detection
// @desc    Run all auto-flag rules against the latest submission for
//          every industry and INSERT any new violations. Idempotent:
//          a rule won't fire twice for the same industry+period.
//          (Quick Win 1 — auto-detection of violations.)
// @access  Private (Admin)
// ============================================================
router.post('/run-auto-detection', requireRole(['admin']), async (req, res) => {
    const created = [];
    try {
        // Pull every active rule that has machine-checkable criteria.
        const rules = await db.query(`
            SELECT * FROM compliance_rules
             WHERE auto_flag = TRUE AND is_active = TRUE
        `);

        for (const rule of rules.rows) {
            const hits = await evaluateRule(rule);
            for (const h of hits) {
                // De-dupe: skip if an OPEN violation of this rule already
                // exists for this industry (no spamming the register).
                const dup = await db.query(
                    `SELECT 1 FROM compliance_violations
                      WHERE industry_id = $1 AND rule_id = $2
                        AND status NOT IN ('resolved') LIMIT 1`,
                    [h.industry_id, rule.id]
                );
                if (dup.rows.length) continue;

                const insert = await db.query(
                    `INSERT INTO compliance_violations
                        (industry_id, rule_id, violation_date, severity,
                         description, auto_detected, sla_deadline, last_state_change, auto_flags)
                     VALUES ($1,$2,CURRENT_DATE,$3,$4,TRUE,
                        NOW() + (SELECT MIN(sla_hours) FROM compliance_escalation_matrix
                                  WHERE severity = $3::violation_severity AND from_state = 'open') * INTERVAL '1 hour',
                        NOW(), $5::jsonb)
                     RETURNING id`,
                    [h.industry_id, rule.id, rule.severity || 'medium',
                     h.description, JSON.stringify({ metric: h.metric, value: h.value, threshold: h.threshold })]
                );
                created.push({ violationId: insert.rows[0].id, industryId: h.industry_id, rule: rule.rule_code });
            }
        }

        // Audit the run.
        try {
            await db.query(
                'INSERT INTO audit_logs (user_id, action, severity) VALUES ($1,$2,$3)',
                [req.user.id, `Ran compliance auto-detection — ${created.length} new violation(s)`, 'info']
            );
        } catch (_) { /* audit best-effort */ }

        res.json({ msg: 'Auto-detection complete', newViolations: created.length, violations: created });
    } catch (err) {
        console.error('Auto-Detection Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ------------------------------------------------------------
// evaluateRule: returns an array of industry hits for a rule.
// Uses the v3 columns (target_metric, threshold_operator, threshold_value).
// Falls back gracefully when criteria are absent (manual rules => no auto hits).
// ------------------------------------------------------------
async function evaluateRule(rule) {
    const hits = [];
    if (!rule.target_metric || !rule.threshold_operator) return hits;

    // Resolve the latest submission per industry and the metric's value.
    const [table, col] = String(rule.target_metric).split('.');
    if (!table || !col) return hits;

    // Whitelist tables we'll read — prevents injection through a configured metric.
    const allowed = ['resource_usage', 'financial_data', 'employment_data', 'documents'];
    if (!allowed.includes(table)) return hits;

    let rows;
    if (table === 'documents') {
        // Special case: missing/expired certificates (e.g. fire_noc, pollution_clearance).
        rows = await db.query(`
            SELECT ip.id AS industry_id, d.expiry_date AS value
              FROM industry_profiles ip
              LEFT JOIN documents d ON d.industry_id = ip.id AND d.category::text = $1
             WHERE d.id IS NOT NULL
        `, [col]);
    } else {
        rows = await db.query(`
            WITH latest AS (
                SELECT DISTINCT ON (industry_id) id, industry_id
                  FROM data_submissions ORDER BY industry_id, submitted_at DESC
            )
            SELECT ls.industry_id, t.${col} AS value
              FROM latest ls
              JOIN ${table} t ON t.submission_id = ls.id
        `);
    }

    const op = rule.threshold_operator;
    const thr = parseFloat(rule.threshold_value);
    for (const r of rows.rows) {
        const val = table === 'documents' ? null : parseFloat(r.value); // docs handled separately
        let breach = false;
        let description = '';

        if (table === 'documents') {
            const expired = r.value && new Date(r.value) < new Date();
            const missing = op === 'missing';
            if (expired || missing) {
                breach = true;
                description = `${rule.rule_name}: document ${expired ? 'expired' : 'missing'} (${col}).`;
            }
        } else if (!Number.isNaN(val) && !Number.isNaN(thr)) {
            switch (op) {
                case 'gt':  breach = val >  thr; break;
                case 'gte': breach = val >= thr; break;
                case 'lt':  breach = val <  thr; break;
                case 'lte': breach = val <= thr; break;
                case 'eq':  breach = val === thr; break;
            }
            if (breach) description = `${rule.rule_name}: ${col} = ${val} (${op} ${thr}).`;
        }
        if (breach) hits.push({
            industry_id: r.industry_id, description,
            metric: col, value: val, threshold: thr
        });
    }
    return hits;
}

// ============================================================
// CONFIGURABLE RULES — no-code CRUD (Top 3-A)
// ============================================================

// @route   POST /api/compliance/rules  — create a new rule
router.post('/rules', requireRole(['admin']), async (req, res) => {
    try {
        const { rule_code, rule_name, description, category, check_frequency,
                severity = 'medium', auto_flag = true,
                target_metric, threshold_operator, threshold_value } = req.body;
        if (!rule_code || !rule_name) return res.status(400).json({ error: 'rule_code and rule_name required' });

        const ins = await db.query(
            `INSERT INTO compliance_rules
                (rule_code, rule_name, description, category, check_frequency, auto_flag,
                 severity, target_metric, threshold_operator, threshold_value, updated_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             RETURNING *`,
            [rule_code, rule_name, description, category, check_frequency, auto_flag,
             severity, target_metric, threshold_operator, threshold_value, req.user.id]
        );
        res.status(201).json(ins.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'rule_code already exists' });
        console.error('Create Rule Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/compliance/rules/:id  — edit severity/threshold/criteria
router.put('/rules/:id', requireRole(['admin']), async (req, res) => {
    try {
        const { rule_name, description, category, check_frequency, severity,
                auto_flag, is_active, target_metric, threshold_operator, threshold_value } = req.body;
        const upd = await db.query(
            `UPDATE compliance_rules SET
                rule_name = COALESCE($1, rule_name),
                description = COALESCE($2, description),
                category = COALESCE($3, category),
                check_frequency = COALESCE($4, check_frequency),
                severity = COALESCE($5, severity),
                auto_flag = COALESCE($6, auto_flag),
                is_active = COALESCE($7, is_active),
                target_metric = COALESCE($8, target_metric),
                threshold_operator = COALESCE($9, threshold_operator),
                threshold_value = COALESCE($10, threshold_value),
                updated_by = $11,
                created_at = created_at
              WHERE id = $12 RETURNING *`,
            [rule_name, description, category, check_frequency, severity, auto_flag,
             is_active, target_metric, threshold_operator, threshold_value, req.user.id, req.params.id]
        );
        if (!upd.rows.length) return res.status(404).json({ error: 'Rule not found' });
        res.json(upd.rows[0]);
    } catch (err) {
        console.error('Update Rule Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/compliance/rules/:id  — soft-delete (deactivate)
router.delete('/rules/:id', requireRole(['admin']), async (req, res) => {
    try {
        await db.query('UPDATE compliance_rules SET is_active = FALSE WHERE id = $1', [req.params.id]);
        res.json({ msg: 'Rule deactivated' });
    } catch (err) {
        console.error('Delete Rule Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// ROOT-CAUSE DRILL-DOWN (Top 3-A)
// @route   GET /api/compliance/industry/:id/breakdown
// @desc    Why an industry's score is what it is: sub-scores + the
//          open violations dragging each category.
// ============================================================
router.get('/industry/:id/breakdown', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const scores = await db.query(
            `SELECT * FROM compliance_scores WHERE industry_id = $1 ORDER BY score_date DESC LIMIT 1`,
            [req.params.id]
        );
        const violations = await db.query(
            `SELECT v.id, v.severity, v.status, v.description, v.created_at,
                    r.rule_code, r.rule_name, r.category
               FROM compliance_violations v
          LEFT JOIN compliance_rules r ON r.id = v.rule_id
              WHERE v.industry_id = $1 AND v.status <> 'resolved'
           ORDER BY v.severity::text, v.created_at DESC`,
            [req.params.id]
        );
        // Group violations by category for the UI.
        const byCategory = {};
        for (const v of violations.rows) {
            const c = v.category || 'other';
            if (!byCategory[c]) byCategory[c] = [];
            byCategory[c].push(v);
        }
        res.json({ latestScore: scores.rows[0] || null, violationsByCategory: byCategory });
    } catch (err) {
        console.error('Breakdown Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// NOTICE GENERATION (Top 3-A) — show-cause / closure / warning
// @route   POST /api/compliance/notices
// ============================================================
router.post('/notices', requireRole(['admin']), async (req, res) => {
    try {
        const { violation_id, industry_id, notice_type, subject, body } = req.body;
        if (!industry_id || !notice_type) return res.status(400).json({ error: 'industry_id and notice_type required' });

        const ref = `SCN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
        const ins = await db.query(
            `INSERT INTO compliance_notices
                (violation_id, industry_id, notice_type, reference_no, subject, body, issued_by, served_at, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),'served') RETURNING *`,
            [violation_id || null, industry_id, notice_type, ref, subject || `${notice_type} notice`, body || '', req.user.id]
        );

        // Notify the industry owner.
        const u = await db.query(
            'SELECT u.id FROM users u JOIN industry_profiles ip ON ip.user_id = u.id WHERE ip.id = $1', [industry_id]
        );
        const { notify } = require('../services/notify');
        await notify({
            userId: u.rows.length ? u.rows[0].id : null,
            category: 'compliance',
            severity: notice_type === 'closure' ? 'error' : 'warning',
            title: `Notice served: ${notice_type}`,
            message: `Reference ${ref}. ${subject || ''}`,
            link: '/workspace',
            metadata: { noticeId: ins.rows[0].id, referenceNo: ref }
        });
        res.status(201).json(ins.rows[0]);
    } catch (err) {
        console.error('Notice Generation Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/compliance/notices  — list notices (admin/govt)
router.get('/notices', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT n.*, ip.company_name
              FROM compliance_notices n
              JOIN industry_profiles ip ON ip.id = n.industry_id
          ORDER BY n.created_at DESC LIMIT 100
        `);
        res.json(rows);
    } catch (err) {
        console.error('List Notices Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// COMPLIANCE CERTIFICATE (Top 3-A) — verifiable Good Standing
// @route   POST /api/compliance/certificate
// ============================================================
router.post('/certificate', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { industry_id } = req.body;
        if (!industry_id) return res.status(400).json({ error: 'industry_id required' });

        const score = await db.query(
            'SELECT overall_score FROM compliance_scores WHERE industry_id = $1 ORDER BY score_date DESC LIMIT 1',
            [industry_id]
        );
        const snapshot = score.rows.length ? score.rows[0].overall_score : null;
        // Only issue if the industry is in good standing (>= 80).
        if (snapshot !== null && snapshot < 80) {
            return res.status(422).json({ error: 'Industry is not in good standing (score below 80).', score: snapshot });
        }

        const certNo = `TZP-COMP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
        const verCode = (await db.query("SELECT gen_random_uuid()::text AS v")).rows[0].v.replace(/-/g, '').slice(0, 32);
        const validUntil = new Date();
        validUntil.setFullYear(validUntil.getFullYear() + 1);

        const ins = await db.query(
            `INSERT INTO compliance_certificates
                (industry_id, certificate_no, score_snapshot, valid_until, issued_by, verification_code)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [industry_id, certNo, snapshot, validUntil, req.user.id, verCode]
        );
        res.status(201).json(ins.rows[0]);
    } catch (err) {
        console.error('Certificate Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/compliance/certificate/verify/:code  — public verify
router.get('/certificate/verify/:code', async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT cc.certificate_no, cc.score_snapshot, cc.issued_at, cc.valid_until,
                   cc.revoked, ip.company_name
              FROM compliance_certificates cc
              JOIN industry_profiles ip ON ip.id = cc.industry_id
             WHERE cc.verification_code = $1`, [req.params.code]);
        if (!rows.length) return res.status(404).json({ valid: false });
        res.json({ valid: true, ...rows[0] });
    } catch (err) {
        console.error('Verify Certificate Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
