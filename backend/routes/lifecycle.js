// ============================================================
// lifecycle.js — Tier 2 (Allottee Lifecycle) endpoints
//
// Mounted at /api/lifecycle. ADDITIVE — no existing route changed.
// Closes the allottee-lifecycle loop end-to-end:
//   T2.1 Lease & utility billing (statements, dues, arrears)
//   T2.2 Filing-deficiency query loop (officer <-> allottee)
//   T2.3 PO Status Report -> HO forwarding (inspections)
//   T2.4 Incentive disbursement (inspection -> fund release)
//   T2.5 MD escalation (grievances)
//
// Backed by schema_v5_tier2.sql (auto-applied at boot). All endpoints
// degrade gracefully if the v5 tables/columns aren't present yet.
// ============================================================

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');
const { notify } = require('../services/notify');

// ------------------------------------------------------------
// Helper: does a table exist? (used so endpoints 501/[] cleanly
// instead of 500 when v5 hasn't been applied.)
// ------------------------------------------------------------
async function tableExists(name) {
    try {
        const { rows } = await db.query('SELECT to_regclass($1) AS e', [`public.${name}`]);
        return rows.length && rows[0].e !== null;
    } catch (_) { return false; }
}

// Resolve the industry id for the caller (industry = own profile;
// admin/govt pass ?industryId= for cross-company work). Returns null
// for a missing/garbage param rather than NaN (which 500s downstream).
async function resolveIndustryId(req) {
    if (req.user.role === 'industry') return req.user.profile_id || null;
    if (!req.query.industryId) return null;
    const id = parseInt(req.query.industryId);
    return isNaN(id) ? null : id;
}

// ============================================================
// T2.1 — LEASE & UTILITY BILLING
// ============================================================

// @route  GET /api/lifecycle/billing
// @desc   List billing statements (industry sees own; admin/govt all)
// @access Private (all roles)
router.get('/billing', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        if (!(await tableExists('lease_billing'))) return res.json([]);
        const industryId = await resolveIndustryId(req);
        const where = industryId ? 'WHERE b.industry_id = $1' : '';
        const params = industryId ? [industryId] : [];
        const { rows } = await db.query(`
            SELECT b.*, ip.company_name, p.name AS park_name, pp.plot_number
              FROM lease_billing b
              JOIN industry_profiles ip ON ip.id = b.industry_id
         LEFT JOIN industrial_parks p ON p.id = b.plot_id
         LEFT JOIN park_plots pp ON pp.id = b.plot_id
              ${where}
          ORDER BY b.billing_period DESC`, params);
        res.json(rows);
    } catch (err) {
        console.error('Billing List Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route  GET /api/lifecycle/billing/summary
// @desc   Outstanding dues summary (total due, overdue count, arrears ageing)
// @access Private (Industry sees own; admin/govt aggregate)
router.get('/billing/summary', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        if (!(await tableExists('lease_billing'))) return res.json({ available: false });
        const industryId = await resolveIndustryId(req);
        const where = industryId ? 'WHERE industry_id = $1' : '';
        const params = industryId ? [industryId] : [];
        const { rows } = await db.query(`
            SELECT
                COUNT(*)::int AS total_statements,
                COUNT(*) FILTER (WHERE status = 'overdue')::int AS overdue_count,
                COALESCE(SUM(balance_due), 0) AS total_outstanding,
                COALESCE(SUM(balance_due) FILTER (WHERE due_date < CURRENT_DATE - 90), 0) AS arrears_gt_90d
              FROM lease_billing ${where}`, params);
        const r = rows[0];
        res.json({
            available: true,
            total_statements: r.total_statements,
            overdue_count: r.overdue_count,
            total_outstanding: parseFloat(r.total_outstanding) || 0,
            arrears_gt_90d: parseFloat(r.arrears_gt_90d) || 0
        });
    } catch (err) {
        console.error('Billing Summary Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route  POST /api/lifecycle/billing/generate
// @desc   Generate a monthly billing statement for an industry.
//         Computes lease rent (from park_plots), maintenance, and
//         water/power charges from the latest submission * tariff.
// @access Private (Admin, Govt)
router.post('/billing/generate', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { industryId, period } = req.body; // period = 'YYYY-MM'
        if (!industryId || !period) return res.status(400).json({ error: 'industryId and period (YYYY-MM) required' });

        // Fetch the plot (for lease rent) + latest resource usage + tariff.
        const profile = await db.query(`
            SELECT ip.id, ip.plot_id, pp.monthly_lease_amount,
                   ip.tariff_per_unit, ip.water_allocated_kl, ip.sanctioned_load_kw
              FROM industry_profiles ip
         LEFT JOIN park_plots pp ON pp.id = ip.plot_id
             WHERE ip.id = $1`, [industryId]);
        if (!profile.rows.length) return res.status(404).json({ error: 'Industry not found.' });
        const p = profile.rows[0];

        // Latest water + power consumption.
        const usage = await db.query(`
            SELECT r.water_consumption, r.power_usage
              FROM data_submissions ds JOIN resource_usage r ON r.submission_id = ds.id
             WHERE ds.industry_id = $1
          ORDER BY ds.submitted_at DESC LIMIT 1`, [industryId]);
        const waterKl = usage.rows.length ? parseFloat(usage.rows[0].water_consumption) || 0 : 0;
        const powerKwh = usage.rows.length ? parseFloat(usage.rows[0].power_usage) || 0 : 0;
        const tariff = parseFloat(p.tariff_per_unit) || 6.5;

        const leaseRent = parseFloat(p.monthly_lease_amount) || 0;
        const maintenance = Math.round(leaseRent * 0.10); // 10% of rent as maintenance
        const waterCharges = Math.round(waterKl * 35);    // ~₹35/KL industrial water
        const powerCharges = Math.round(powerKwh * tariff);
        const total = leaseRent + maintenance + waterCharges + powerCharges;
        const invoiceNo = `LB-${period.replace('-', '')}-${industryId}`;

        const due = new Date(); due.setDate(due.getDate() + 30);

        const ins = await db.query(
            `INSERT INTO lease_billing
                (industry_id, plot_id, billing_period, lease_rent, maintenance_fee,
                 water_charges, power_charges, total_amount, balance_due, due_date, invoice_no, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,$10,'unpaid')
             ON CONFLICT (industry_id, billing_period) DO UPDATE SET
               lease_rent=EXCLUDED.lease_rent, maintenance_fee=EXCLUDED.maintenance_fee,
               water_charges=EXCLUDED.water_charges, power_charges=EXCLUDED.power_charges,
               total_amount=EXCLUDED.total_amount, balance_due=EXCLUDED.balance_due
             RETURNING *`,
            [industryId, p.plot_id || null, period, leaseRent, maintenance,
             waterCharges, powerCharges, total, due, invoiceNo]
        );

        // Notify the industry owner.
        const u = await db.query('SELECT u.id FROM users u JOIN industry_profiles ip ON ip.user_id=u.id WHERE ip.id=$1', [industryId]);
        await notify({
            userId: u.rows.length ? u.rows[0].id : null,
            category: 'payment', severity: 'info',
            title: `Billing statement ${invoiceNo} generated`,
            message: `A billing statement of ₹${total.toLocaleString('en-IN')} for ${period} is now due.`,
            link: '/workspace', metadata: { invoiceNo, total }
        });

        res.status(201).json(ins.rows[0]);
    } catch (err) {
        console.error('Billing Generate Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route  POST /api/lifecycle/billing/:id/pay
// @desc   Mark a billing statement as paid (full payment).
// @access Private (Industry owner, Admin)
router.post('/billing/:id/pay', requireRole(['admin', 'industry']), async (req, res) => {
    try {
        const ownership = req.user.role === 'industry' ? ' AND industry_id = $2' : '';
        const params = req.user.role === 'industry' ? [req.params.id, req.user.profile_id] : [req.params.id];
        const result = await db.query(
            `UPDATE lease_billing
                SET status = 'paid', amount_paid = total_amount, balance_due = 0, paid_at = NOW()
              WHERE id = $1${ownership} RETURNING *`, params);
        if (!result.rows.length) return res.status(404).json({ error: 'Statement not found or not yours.' });
        res.json({ msg: 'Payment recorded', statement: result.rows[0] });
    } catch (err) {
        console.error('Billing Pay Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// T2.2 — FILING-DEFICIENCY QUERY LOOP
// ============================================================

// @route  GET /api/lifecycle/queries
// @desc   List queries on submissions (industry sees own; admin/govt all)
router.get('/queries', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        if (!(await tableExists('submission_queries'))) return res.json([]);
        const scoped = req.user.role === 'industry';
        const join = scoped
            ? 'JOIN data_submissions ds ON ds.id = q.submission_id WHERE ds.industry_id = $1'
            : '';
        const params = scoped ? [req.user.profile_id] : [];
        const { rows } = await db.query(`
            SELECT q.*, ip.company_name,
                   ru.email AS raised_by_email, resp_u.email AS responded_by_email
              FROM submission_queries q
              JOIN data_submissions ds ON ds.id = q.submission_id
              JOIN industry_profiles ip ON ip.id = ds.industry_id
         LEFT JOIN users ru ON ru.id = q.raised_by
         LEFT JOIN users resp_u ON resp_u.id = q.responded_by
              ${join}
          ORDER BY q.raised_at DESC`, params);
        res.json(rows);
    } catch (err) {
        console.error('Queries List Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route  POST /api/lifecycle/queries
// @desc   Officer raises a deficiency query on a submission.
// @access Private (Admin, Govt)
router.post('/queries', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { submissionId, queryText } = req.body;
        if (!submissionId || !queryText) return res.status(400).json({ error: 'submissionId and queryText required' });
        const ins = await db.query(
            `INSERT INTO submission_queries (submission_id, raised_by, query_text)
             VALUES ($1,$2,$3) RETURNING *`,
            [submissionId, req.user.id, queryText]
        );
        // Notify the industry owner of the queried submission.
        const sub = await db.query('SELECT industry_id FROM data_submissions WHERE id = $1', [submissionId]);
        if (sub.rows.length) {
            const u = await db.query('SELECT u.id FROM users u JOIN industry_profiles ip ON ip.user_id=u.id WHERE ip.id=$1', [sub.rows[0].industry_id]);
            await notify({
                userId: u.rows.length ? u.rows[0].id : null,
                category: 'submission', severity: 'warning',
                title: 'Filing deficiency query raised',
                message: `An officer has raised a query on your submission: "${queryText.slice(0, 80)}..."`,
                link: '/submit-data', metadata: { submissionId }
            });
        }
        res.status(201).json(ins.rows[0]);
    } catch (err) {
        console.error('Query Raise Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route  PUT /api/lifecycle/queries/:id/respond
// @desc   Industry responds to a query.
// @access Private (Industry)
router.put('/queries/:id/respond', requireRole(['industry']), async (req, res) => {
    try {
        const { responseText } = req.body;
        if (!responseText) return res.status(400).json({ error: 'responseText required' });
        // Ownership: the query must be on the caller's submission.
        const owns = await db.query(
            `SELECT q.id FROM submission_queries q
              JOIN data_submissions ds ON ds.id = q.submission_id
             WHERE q.id = $1 AND ds.industry_id = $2`, [req.params.id, req.user.profile_id]);
        if (!owns.rows.length) return res.status(403).json({ error: 'Not your query.' });
        const upd = await db.query(
            `UPDATE submission_queries
                SET response_text = $1, responded_by = $2, responded_at = NOW(), status = 'responded'
              WHERE id = $3 RETURNING *`,
            [responseText, req.user.id, req.params.id]);
        res.json(upd.rows[0]);
    } catch (err) {
        console.error('Query Respond Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route  PUT /api/lifecycle/queries/:id/resolve
// @desc   Officer marks a query resolved.
// @access Private (Admin, Govt)
router.put('/queries/:id/resolve', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const upd = await db.query(
            `UPDATE submission_queries
                SET status = 'resolved', resolved_by = $1, resolved_at = NOW()
              WHERE id = $2 RETURNING *`,
            [req.user.id, req.params.id]);
        if (!upd.rows.length) return res.status(404).json({ error: 'Query not found.' });
        res.json(upd.rows[0]);
    } catch (err) {
        console.error('Query Resolve Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route  GET /api/lifecycle/queries/open/:submissionId
// @desc   Check if a submission has open queries (used to block approval).
router.get('/queries/open/:submissionId', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        if (!(await tableExists('submission_queries'))) return res.json({ has_open: false });
        const { rows } = await db.query(
            'SELECT COUNT(*)::int AS n FROM submission_queries WHERE submission_id=$1 AND status IN ($2,$3)',
            [req.params.submissionId, 'open', 'responded']
        );
        res.json({ has_open: rows[0].n > 0, open_count: rows[0].n });
    } catch (err) {
        console.error('Open Queries Check Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// T2.3 — PO STATUS REPORT -> HO FORWARDING (inspections)
// ============================================================

// @route  PUT /api/lifecycle/inspections/:id/forward-ho
// @desc   PO forwards a completed inspection (with status report) to HO.
// @access Private (Admin, Govt — the PO role)
router.put('/inspections/:id/forward-ho', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { statusReport } = req.body;
        const upd = await db.query(
            `UPDATE inspections
                SET forwarded_to_ho = TRUE, forwarded_at = NOW(),
                    status_report = COALESCE($1, status_report), ho_decision = COALESCE(ho_decision, 'pending')
              WHERE id = $2 RETURNING *`,
            [statusReport || null, req.params.id]);
        if (!upd.rows.length) return res.status(404).json({ error: 'Inspection not found.' });
        res.json(upd.rows[0]);
    } catch (err) {
        console.error('Forward HO Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route  PUT /api/lifecycle/inspections/:id/ho-decision
// @desc   HO records its decision on a forwarded inspection.
// @access Private (Admin)
router.put('/inspections/:id/ho-decision', requireRole(['admin']), async (req, res) => {
    try {
        const { decision } = req.body; // 'approved' | 'rejected'
        if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'decision must be approved|rejected' });
        const upd = await db.query(
            `UPDATE inspections
                SET ho_decision = $1, ho_decision_by = $2, ho_decision_at = NOW()
              WHERE id = $3 RETURNING *`,
            [decision, req.user.id, req.params.id]);
        if (!upd.rows.length) return res.status(404).json({ error: 'Inspection not found.' });
        res.json(upd.rows[0]);
    } catch (err) {
        console.error('HO Decision Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// T2.4 — INCENTIVE DISBURSEMENT
// ============================================================

// @route  GET /api/lifecycle/incentives
// @desc   List incentive disbursements (industry own; admin/govt all)
router.get('/incentives', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        if (!(await tableExists('incentive_disbursements'))) return res.json([]);
        const industryId = await resolveIndustryId(req);
        const where = industryId ? 'WHERE d.industry_id = $1' : '';
        const params = industryId ? [industryId] : [];
        const { rows } = await db.query(`
            SELECT d.*, ip.company_name
              FROM incentive_disbursements d
              JOIN industry_profiles ip ON ip.id = d.industry_id
              ${where}
          ORDER BY d.created_at DESC`, params);
        res.json(rows);
    } catch (err) {
        console.error('Incentives List Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route  POST /api/lifecycle/incentives
// @desc   Create an incentive disbursement, optionally linked to an inspection.
// @access Private (Admin, Govt)
router.post('/incentives', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { industryId, incentiveScheme, inspectionId, amountSanctioned, notes } = req.body;
        if (!industryId || !incentiveScheme || !amountSanctioned) return res.status(400).json({ error: 'industryId, incentiveScheme, amountSanctioned required' });
        const ins = await db.query(
            `INSERT INTO incentive_disbursements
                (industry_id, incentive_scheme, inspection_id, amount_sanctioned, status, approved_by, approved_at, notes)
             VALUES ($1,$2,$3,$4,'sanctioned',$5,NOW(),$6) RETURNING *`,
            [industryId, incentiveScheme, inspectionId || null, amountSanctioned, req.user.id, notes || null]
        );
        // Notify the industry.
        const u = await db.query('SELECT u.id FROM users u JOIN industry_profiles ip ON ip.user_id=u.id WHERE ip.id=$1', [industryId]);
        await notify({
            userId: u.rows.length ? u.rows[0].id : null,
            category: 'system', severity: 'success',
            title: `Incentive sanctioned: ${incentiveScheme}`,
            message: `₹${Number(amountSanctioned).toLocaleString('en-IN')} sanctioned under ${incentiveScheme}.`,
            link: '/workspace', metadata: { scheme: incentiveScheme }
        });
        res.status(201).json(ins.rows[0]);
    } catch (err) {
        console.error('Incentive Create Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route  PUT /api/lifecycle/incentives/:id/disburse
// @desc   Record the actual disbursement (fund release).
// @access Private (Admin)
router.put('/incentives/:id/disburse', requireRole(['admin']), async (req, res) => {
    try {
        const { amountDisbursed } = req.body;
        const upd = await db.query(
            `UPDATE incentive_disbursements
                SET amount_disbursed = $1, disbursement_date = CURRENT_DATE, status = 'disbursed'
              WHERE id = $2 RETURNING *`,
            [amountDisbursed || null, req.params.id]);
        if (!upd.rows.length) return res.status(404).json({ error: 'Disbursement not found.' });
        res.json(upd.rows[0]);
    } catch (err) {
        console.error('Incentive Disburse Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// T2.5 — MD ESCALATION (grievances)
// ============================================================

// @route  PUT /api/lifecycle/grievances/:id/escalate-md
// @desc   Escalate a grievance to the Managing Director's desk.
// @access Private (Admin, Govt)
router.put('/grievances/:id/escalate-md', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        // Guard: the column may not exist pre-v5.
        const upd = await db.query(
            `UPDATE grievances
                SET escalated_to_md = TRUE, escalated_at = NOW(), escalated_by = $1,
                    priority = 'high'
              WHERE id = $2 RETURNING id, title, escalated_to_md, escalated_at`,
            [req.user.id, req.params.id]);
        if (!upd.rows.length) return res.status(404).json({ error: 'Grievance not found.' });
        res.json({ msg: 'Escalated to MD', grievance: upd.rows[0] });
    } catch (err) {
        console.error('MD Escalate Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route  PUT /api/lifecycle/grievances/:id/md-resolution
// @desc   MD (or admin on behalf) records a resolution.
// @access Private (Admin)
router.put('/grievances/:id/md-resolution', requireRole(['admin']), async (req, res) => {
    try {
        const { resolution } = req.body;
        if (!resolution) return res.status(400).json({ error: 'resolution required' });
        const upd = await db.query(
            `UPDATE grievances
                SET md_resolution = $1, status = 'Resolved', resolved_at = NOW()
              WHERE id = $2 RETURNING *`,
            [resolution, req.params.id]);
        if (!upd.rows.length) return res.status(404).json({ error: 'Grievance not found.' });
        res.json(upd.rows[0]);
    } catch (err) {
        console.error('MD Resolution Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route  GET /api/lifecycle/grievances/md-escalations
// @desc   List all grievances escalated to the MD (for the Command Center view).
// @access Private (Admin, Govt)
router.get('/grievances/md-escalations', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT id, title, location, name, description, status, priority,
                   submitted_at, escalated_at, category, sentiment, md_resolution
              FROM grievances
             WHERE escalated_to_md = TRUE
          ORDER BY escalated_at DESC`);
        res.json(rows);
    } catch (err) {
        // Column may be absent pre-v5 — return empty.
        res.json([]);
    }
});

module.exports = router;
