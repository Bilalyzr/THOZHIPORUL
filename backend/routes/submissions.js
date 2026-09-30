const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { requireRole } = require('./auth');
const { requireFeature, TIER_FEATURES } = require('../middleware/subscriptionGuard');
const { fileSubmission, getSubmissionPayload } = require('../services/submissionService');
const { recordAudit } = require('./audit');

// ============================================================
// POST /api/submissions — file quarterly industrial data.
// All validation, versioning, production, operational-status and
// findings logic lives in services/submissionService (shared by
// the web form, bulk import and API paths).
// Canonical units: INR / count / KL / kWh / MT / percent.
// Invalid input → 400 { success:false, code:'VALIDATION_ERROR', errors:[{field,message}] }
// ============================================================
router.post('/', requireRole(['industry']), async (req, res) => {
    if (!req.user.profile_id) {
        return res.status(400).json({ error: 'No industry profile linked to this account. Contact support.' });
    }
    const result = await fileSubmission({
        industryId: req.user.profile_id,
        userId: req.user.id,
        payload: req.body,
        source: 'web',
        ip: req.ip
    });
    res.status(result.status).json(result.body);
});

// ============================================================
// GET /api/submissions/me — own filings incl. versions + production
// ============================================================
router.get('/me', requireRole(['industry']), async (req, res) => {
    if (!req.user.profile_id) {
        return res.status(400).json({ error: 'No industry profile linked to this account. Contact support.' });
    }
    const industry_id = req.user.profile_id;
    try {
        const result = await db.query(`
            SELECT
                ds.id, ds.period_year, ds.period_quarter, ds.status, ds.submitted_at,
                ds.is_late, ds.created_at, ds.updated_at,
                ds.approved_by, u.email as approver_email,
                (SELECT MAX(version_no) FROM submission_versions sv WHERE sv.submission_id = ds.id) AS version_count,
                f.investment_amount, f.annual_turnover, f.export_revenue, f.rd_expenditure,
                e.permanent_employees, e.contract_employees, e.sc_st_employees, e.women_employees,
                r.water_consumption, r.power_usage, r.waste_generated, r.waste_recycled_pct,
                c.description as csr_activities, c.amount_spent as csr_spent, c.beneficiary_count as csr_beneficiaries,
                (SELECT json_agg(json_build_object(
                    'productName', pd.product_name, 'quantity', pd.quantity, 'unit', pd.unit,
                    'productionValue', pd.production_value, 'remarks', pd.remarks) ORDER BY pd.id)
                 FROM production_data pd WHERE pd.submission_id = ds.id) AS production_items
            FROM data_submissions ds
            LEFT JOIN financial_data f ON f.submission_id = ds.id
            LEFT JOIN employment_data e ON e.submission_id = ds.id
            LEFT JOIN resource_usage r ON r.submission_id = ds.id
            LEFT JOIN csr_activities c ON c.submission_id = ds.id
            LEFT JOIN users u ON ds.approved_by = u.id
            WHERE ds.industry_id = $1
            ORDER BY ds.period_year DESC, ds.period_quarter DESC NULLS LAST
        `, [industry_id]);

        const mappedSubmissions = result.rows.map(row => ({
            id: row.id,
            period: row.period_quarter ? `Q${row.period_quarter} ${row.period_year}` : `FY ${row.period_year}`,
            periodYear: row.period_year,
            periodQuarter: row.period_quarter,
            status: row.status,
            isLate: row.is_late,
            versionCount: row.version_count || 1,
            submitted: row.submitted_at ? new Date(row.submitted_at).toISOString().split('T')[0] : '-',
            approved_by: row.approver_email || 'Pending',
            data: {
                investmentAmount: row.investment_amount,
                annualTurnover: row.annual_turnover,
                exportRevenue: row.export_revenue,
                rdExpenditure: row.rd_expenditure,
                permanentEmployees: row.permanent_employees,
                contractEmployees: row.contract_employees,
                scStEmployees: row.sc_st_employees,
                womenEmployees: row.women_employees,
                waterConsumption: row.water_consumption,
                powerUsage: row.power_usage,
                wasteGenerated: row.waste_generated,
                wasteRecycledPct: row.waste_recycled_pct,
                csrActivities: row.csr_activities,
                csrSpent: row.csr_spent,
                csrBeneficiaries: row.csr_beneficiaries,
                productionItems: row.production_items || []
            }
        }));

        res.json(mappedSubmissions);
    } catch (err) {
        console.error("Error fetching submissions:", err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// GET /api/submissions/:id/versions — append-only history + diffs
// Industry sees its own; admin/govt see any.
// ============================================================
router.get('/:id/versions', requireRole(['industry', 'admin', 'govt']), async (req, res) => {
    try {
        const sub = await db.query(
            'SELECT id, industry_id FROM data_submissions WHERE id = $1', [req.params.id]);
        if (!sub.rows.length) return res.status(404).json({ error: 'Submission not found' });
        if (req.user.role === 'industry' && sub.rows[0].industry_id !== req.user.profile_id) {
            return res.status(403).json({ error: 'Not your submission.' });
        }
        const { rows } = await db.query(`
            SELECT sv.id, sv.version_no, sv.change_kind, sv.amendment_reason, sv.diff,
                   sv.payload, sv.previous_payload, sv.filed_at, sv.submission_status, sv.source,
                   u.email AS filed_by_email
              FROM submission_versions sv
         LEFT JOIN users u ON u.id = sv.filed_by
             WHERE sv.submission_id = $1
          ORDER BY sv.version_no DESC`, [req.params.id]);
        res.json({ submissionId: parseInt(req.params.id), versions: rows });
    } catch (err) {
        console.error('Versions Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// GET /api/submissions/:id/diff — latest change, machine-readable
// FIELD | OLD | NEW | CHANGE % | CHANGED BY | CHANGED AT | REASON
// ============================================================
router.get('/:id/diff', requireRole(['industry', 'admin', 'govt']), async (req, res) => {
    try {
        const sub = await db.query('SELECT industry_id FROM data_submissions WHERE id = $1', [req.params.id]);
        if (!sub.rows.length) return res.status(404).json({ error: 'Submission not found' });
        if (req.user.role === 'industry' && sub.rows[0].industry_id !== req.user.profile_id) {
            return res.status(403).json({ error: 'Not your submission.' });
        }
        const { rows } = await db.query(`
            SELECT diff, amendment_reason, change_kind, filed_at, version_no, u.email AS changed_by
              FROM submission_versions sv
         LEFT JOIN users u ON u.id = sv.filed_by
             WHERE sv.submission_id = $1
          ORDER BY version_no DESC LIMIT 1`, [req.params.id]);
        if (!rows.length) return res.json({ note: 'NO_VERSION_RECORD', message: 'This submission predates version tracking; no diff available.' });
        res.json(rows[0]);
    } catch (err) {
        console.error('Diff Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// GET /api/submissions/compliance — govt/admin overview
// (kept for UI compatibility; richer matrix lives in
//  /api/reporting-periods/filing-matrix)
// ============================================================
router.get('/compliance', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const query = `
            SELECT
                i.id as industry_id, i.company_name as name, i.location, i.operational_status,
                ds.period_year, ds.period_quarter, ds.status as submission_status, ds.submitted_at, ds.is_late,
                ds.id as submission_id,
                f.investment_amount, f.annual_turnover,
                r.water_consumption, r.power_usage,
                e.permanent_employees, e.contract_employees
            FROM industry_profiles i
            LEFT JOIN LATERAL (
                SELECT * FROM data_submissions
                WHERE industry_id = i.id
                ORDER BY period_year DESC, period_quarter DESC NULLS LAST LIMIT 1
            ) ds ON true
            LEFT JOIN financial_data f ON ds.id = f.submission_id
            LEFT JOIN resource_usage r ON ds.id = r.submission_id
            LEFT JOIN employment_data e ON ds.id = e.submission_id
        `;
        const result = await db.query(query);

        const mappedCompliance = result.rows.map(row => ({
            id: row.industry_id,
            name: row.name,
            location: row.location,
            operationalStatus: row.operational_status,
            lastSubmission: row.submitted_at ? new Date(row.submitted_at).toLocaleDateString() : 'Missing',
            status: row.submission_status === 'Approved' ? 'Compliant' : row.submission_status === 'Submitted' ? 'Pending Review' : row.submission_status || 'Alert',
            isLate: row.is_late,
            period: row.period_quarter ? `Q${row.period_quarter} ${row.period_year}` : '-',
            investmentAmount: row.investment_amount,
            annualTurnover: row.annual_turnover,
            waterConsumption: row.water_consumption,
            powerUsage: row.power_usage,
            totalEmployees: (row.permanent_employees || 0) + (row.contract_employees || 0),
            submissionId: row.submission_id
        }));

        res.json(mappedCompliance);
    } catch (err) {
        console.error("Error fetching compliance:", err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// PUT /api/submissions/:id/status — govt/admin approve / reject
// (workflow preserved from the audited implementation, now with
//  chained audit + payload and notification to the industry)
// ============================================================
router.put('/:id/status', requireRole(['admin', 'govt']), async (req, res) => {
    const { status, reviewComments } = req.body;
    const submissionId = req.params.id;
    const userId = req.user.id;

    if (!['Approved', 'Rejected', 'Submitted'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be Approved, Rejected, or Submitted.' });
    }

    try {
        // T2.2 — Block approval if there are open filing-deficiency queries.
        if (status === 'Approved') {
            try {
                const openQ = await db.query(
                    `SELECT COUNT(*)::int AS n FROM submission_queries
                      WHERE submission_id = $1 AND status IN ('open','responded')`,
                    [submissionId]
                );
                if (openQ.rows.length && openQ.rows[0].n > 0) {
                    return res.status(409).json({
                        error: `Cannot approve: ${openQ.rows[0].n} open filing-deficiency query/queries must be resolved first.`,
                        code: 'OPEN_QUERIES_BLOCK_APPROVAL'
                    });
                }
            } catch (_) { /* submission_queries table may be absent pre-v5 — allow */ }
        }

        const sub = await db.query(
            `SELECT ds.industry_id, ds.period_year, ds.period_quarter, ip.company_name
               FROM data_submissions ds JOIN industry_profiles ip ON ip.id = ds.industry_id
              WHERE ds.id = $1`, [submissionId]);
        if (!sub.rows.length) return res.status(404).json({ error: 'Submission not found' });
        const info = sub.rows[0];

        const result = await db.query(
            `UPDATE data_submissions
             SET status = $1, approved_by = $2, updated_at = NOW()
             WHERE id = $3
             RETURNING id, status`,
            [status, userId, submissionId]
        );

        // Chained audit with the decision payload.
        await recordAudit(userId, `SUBMISSION_${String(status).toUpperCase()}`, req.ip, {
            entityType: 'submission', entityId: submissionId,
            severity: status === 'Rejected' ? 'warning' : 'info',
            payload: { industry_id: info.industry_id, period: `${info.period_year}-Q${info.period_quarter ?? 'FY'}`, review_comments: reviewComments || null }
        });

        // Notify the industry owner.
        try {
            const owner = await db.query(
                'SELECT u.id FROM users u JOIN industry_profiles ip ON ip.user_id = u.id WHERE ip.id = $1',
                [info.industry_id]);
            if (owner.rows.length) {
                const { notify } = require('../services/notify');
                await notify({
                    userId: owner.rows[0].id,
                    category: 'submission',
                    severity: status === 'Approved' ? 'success' : status === 'Rejected' ? 'error' : 'info',
                    title: `Your ${info.period_year}-Q${info.period_quarter ?? 'FY'} filing was ${String(status).toLowerCase()}`,
                    message: reviewComments ? `Officer note: ${reviewComments}` : `Submission status is now ${status}.`,
                    link: '/workspace',
                    metadata: { submissionId: parseInt(submissionId), status }
                });
            }
        } catch (_) { /* notification is best-effort */ }

        res.json({ msg: `Submission status successfully updated to ${status}!`, submission: result.rows[0] });
    } catch (err) {
        console.error("Error updating submission status:", err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// GET /api/submissions/prefill — seed the form from the last filing
// ============================================================
router.get('/prefill', requireRole(['industry']), async (req, res) => {
    try {
        const industryId = req.user.profile_id;
        if (!industryId) return res.status(400).json({ error: 'No industry profile' });

        const last = await db.query(`
            SELECT ds.id, ds.period_year, ds.period_quarter, ip.operational_status,
                   f.investment_amount, f.annual_turnover, f.export_revenue, f.rd_expenditure,
                   e.permanent_employees, e.contract_employees, e.sc_st_employees, e.women_employees,
                   r.water_consumption, r.power_usage, r.waste_generated, r.waste_recycled_pct,
                   c.description AS csr_activities, c.amount_spent AS csr_spent, c.beneficiary_count AS csr_beneficiaries
              FROM data_submissions ds
              JOIN industry_profiles ip ON ip.id = ds.industry_id
         LEFT JOIN financial_data f ON f.submission_id = ds.id
         LEFT JOIN employment_data e ON e.submission_id = ds.id
         LEFT JOIN resource_usage r ON r.submission_id = ds.id
         LEFT JOIN csr_activities c ON c.submission_id = ds.id
             WHERE ds.industry_id = $1 AND lower(ds.status) IN ('approved','submitted')
          ORDER BY ds.submitted_at DESC LIMIT 1`, [industryId]);
        if (!last.rows.length) return res.json({ prefill: null, msg: 'No prior submission to prefill from.' });
        const prod = await db.query(
            'SELECT product_name, quantity, unit, production_value, remarks FROM production_data WHERE submission_id = $1 ORDER BY id',
            [last.rows[0].id]);
        res.json({ prefill: { ...last.rows[0], production_items: prod.rows } });
    } catch (err) {
        console.error('Prefill Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// POST /api/submissions/bulk — many periods, each fully validated
// and versioned (invalid rows are itemised, never half-written)
// ============================================================
router.post('/bulk', requireRole(['industry']), requireFeature(TIER_FEATURES.EXCEL_UPLOAD), async (req, res) => {
    const industryId = req.user.profile_id;
    if (!industryId) return res.status(400).json({ error: 'No industry profile' });
    const periods = Array.isArray(req.body.periods) ? req.body.periods : [];
    if (!periods.length) return res.status(400).json({ error: 'periods array required' });

    const succeeded = [], failed = [];
    for (let i = 0; i < periods.length; i++) {
        const result = await fileSubmission({
            industryId, userId: req.user.id, payload: periods[i], source: 'bulk', ip: req.ip
        });
        if (result.status === 201) {
            succeeded.push({ row: i, submissionId: result.body.submissionId, version: result.body.version, period: `${periods[i].periodYear}-Q${periods[i].periodQuarter}` });
        } else {
            failed.push({ row: i, code: result.body.code, errors: result.body.errors || [{ field: 'payload', message: result.body.message || 'Rejected' }] });
        }
    }
    res.json({ total: periods.length, succeeded: succeeded.length, failed: failed.length, succeeded_rows: succeeded, failed_rows: failed });
});

// ============================================================
// POST /api/submissions/api-submit — programmatic filing.
// SECURITY (upgraded): submissions are authenticated with a
// SCOPED PER-INDUSTRY API key (sha256-hashed at rest, shown once
// at issuance by an admin). The legacy shared master key is only
// honoured when ALLOW_MASTER_SUBMISSION_KEY=true AND is audited
// loudly — per-industry keys are the supported mechanism.
// ============================================================
router.post('/api-submit', async (req, res) => {
    try {
        const apiKey = req.header('x-api-key');
        if (!apiKey) return res.status(401).json({ error: 'Missing x-api-key header.' });

        const { industryId, ...payload } = req.body;
        if (!industryId) return res.status(400).json({ error: 'industryId required in body.' });

        // 1. Scoped per-industry key.
        const keyRow = await db.query(
            'SELECT api_key_hash FROM industry_profiles WHERE id = $1', [industryId]);
        let authenticated = false, authMode = null;
        if (keyRow.rows.length && keyRow.rows[0].api_key_hash) {
            const hash = crypto.createHash('sha256').update(String(apiKey)).digest('hex');
            const a = Buffer.from(hash), b = Buffer.from(keyRow.rows[0].api_key_hash);
            authenticated = a.length === b.length && crypto.timingSafeEqual(a, b);
            if (authenticated) authMode = 'industry_key';
        }
        // 2. Legacy master key — explicit opt-in only, always audited.
        if (!authenticated && process.env.ALLOW_MASTER_SUBMISSION_KEY === 'true' && process.env.SUBMISSION_API_KEY) {
            const a = Buffer.from(String(apiKey)), b = Buffer.from(String(process.env.SUBMISSION_API_KEY));
            if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
                authenticated = true; authMode = 'master_key (legacy, audited)';
            }
        }
        if (!authenticated) {
            await recordAudit(null, 'API_SUBMIT_DENIED', req.ip, {
                severity: 'warning', payload: { industryId, reason: 'invalid API key' }
            });
            return res.status(401).json({ error: 'Invalid API key for this industry. Contact a SIPCOT administrator for a scoped key.' });
        }

        const result = await fileSubmission({
            industryId, userId: null, payload, source: 'api', ip: req.ip
        });
        if (authMode !== 'industry_key') {
            await recordAudit(null, 'API_SUBMIT_MASTER_KEY_USED', req.ip, {
                severity: 'warning', payload: { industryId, submissionId: result.body && result.body.submissionId }
            });
        }
        res.status(result.status).json(result.body);
    } catch (err) {
        console.error('API Submit Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
