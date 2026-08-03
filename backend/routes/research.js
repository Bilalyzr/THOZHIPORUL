// ============================================================
// research.js — Research-grounded Tier 1 endpoints
//
// Mounted at /api/research. ADDITIVE — no existing route changed.
// Exposes the real-world structure added by schema_v4_research.sql:
//   T1.1  Investment & Employment realisation (committed vs actual)
//   T1.2  CSR dashboard (5-pillar, 2% PAT mandate, SDG, local-area)
//   T1.3  Water/power quota vs actual
//   T1.4  GSTIN + turnover reconciliation
//
// All endpoints degrade gracefully if the v4 columns aren't present
// yet (pre-migration) — they return nulls/defaults rather than 500.
// ============================================================

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');

// ------------------------------------------------------------
// Helper: does industry_profiles have the v4 columns? Cached.
// ------------------------------------------------------------
let _v4Cache = null;
async function hasV4Cols() {
    if (_v4Cache !== null) return _v4Cache;
    try {
        const { rows } = await db.query(
            `SELECT column_name FROM information_schema.columns
              WHERE table_name = 'industry_profiles'
                AND column_name IN ('committed_investment_cr','water_allocated_kl','gstin')`
        );
        _v4Cache = rows.length === 3;
    } catch (_) { _v4Cache = false; }
    return _v4Cache;
}

// ============================================================
// T1.1 — Realisation (committed vs actual) for the logged-in industry
// @route   GET /api/research/realisation
// @access  Private (Industry)
// ============================================================
router.get('/realisation', requireRole(['industry']), async (req, res) => {
    try {
        const v4 = await hasV4Cols();
        if (!v4) return res.json({ available: false, msg: 'v4 migration not applied yet.' });

        const industryId = req.user.profile_id;
        const { rows } = await db.query(`
            SELECT ip.committed_investment_cr, ip.committed_employment,
                   ip.total_investment_cr, ip.total_employees,
                   ip.water_allocated_kl, ip.sanctioned_load_kw, ip.tariff_per_unit,
                   (SELECT COALESCE(SUM(CASE WHEN f.investment_amount >= 100000
                            THEN f.investment_amount/1e7 ELSE f.investment_amount END),0)
                      FROM data_submissions ds JOIN financial_data f ON f.submission_id = ds.id
                     WHERE ds.industry_id = ip.id) AS realised_investment_cr,
                   (SELECT COALESCE(SUM(COALESCE(e.permanent_employees,0)+COALESCE(e.contract_employees,0)),0)
                      FROM data_submissions ds JOIN employment_data e ON e.submission_id = ds.id
                     WHERE ds.industry_id = ip.id) AS realised_employment
              FROM industry_profiles ip WHERE ip.id = $1`, [industryId]);

        if (!rows.length) return res.status(404).json({ error: 'Industry not found.' });
        const r = rows[0];
        const invRealised = parseFloat(r.realised_investment_cr) || 0;
        const empRealised = parseInt(r.realised_employment) || 0;
        const invCommitted = parseFloat(r.committed_investment_cr) || 0;
        const empCommitted = parseInt(r.committed_employment) || 0;

        res.json({
            available: true,
            investment: {
                committed_cr: invCommitted,
                realised_cr: Math.round(invRealised * 100) / 100,
                realisation_pct: invCommitted > 0 ? Math.round((invRealised / invCommitted) * 1000) / 10 : null
            },
            employment: {
                committed: empCommitted,
                realised: empRealised,
                realisation_pct: empCommitted > 0 ? Math.round((empRealised / empCommitted) * 1000) / 10 : null
            },
            quotas: {
                water_allocated_kl: parseFloat(r.water_allocated_kl) || 0,
                sanctioned_load_kw: parseFloat(r.sanctioned_load_kw) || 0,
                tariff_per_unit: parseFloat(r.tariff_per_unit) || 6.5
            }
        });
    } catch (err) {
        console.error('Realisation Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// T1.1 (govt) — Park-wise realisation for the Command Center heatmap
// @route   GET /api/research/park-realisation
// @access  Private (Admin, Govt)
// ============================================================
router.get('/park-realisation', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const v4 = await hasV4Cols();
        if (!v4) return res.json({ available: false, parks: [] });

        const { rows } = await db.query(`
            SELECT p.id, p.name, p.code, p.district, p.latitude, p.longitude,
                   COALESCE(SUM(ip.committed_investment_cr), 0) AS committed_cr,
                   COALESCE(SUM(ip.total_investment_cr), 0)     AS realised_cr
              FROM industrial_parks p
         LEFT JOIN industry_profiles ip ON ip.park_id = p.id
          GROUP BY p.id, p.name, p.code, p.district, p.latitude, p.longitude
          ORDER BY p.name`);
        const parks = rows.map(r => {
            const committed = parseFloat(r.committed_cr) || 0;
            const realised = parseFloat(r.realised_cr) || 0;
            return {
                id: r.id, name: r.name, code: r.code, district: r.district,
                latitude: r.latitude, longitude: r.longitude,
                committed_cr: Math.round(committed * 100) / 100,
                realised_cr: Math.round(realised * 100) / 100,
                realisation_pct: committed > 0 ? Math.round((realised / committed) * 1000) / 10 : null
            };
        });
        res.json({ available: true, parks });
    } catch (err) {
        console.error('Park Realisation Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// T1.2 — CSR dashboard (5-pillar, mandate, SDG, local-area)
// @route   GET /api/research/csr-dashboard
// @access  Private (Admin, Govt see all; Industry sees own)
// ============================================================
router.get('/csr-dashboard', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const scoped = req.user.role === 'industry' && req.user.profile_id;
        const filter = scoped ? `AND ip.id = $1` : '';
        const params = scoped ? [req.user.profile_id] : [];

        const { rows } = await db.query(`
            SELECT c.id, ip.company_name, c.description, c.amount_spent, c.beneficiary_count,
                   c.pillar, c.pat_baseline_cr, c.mandated_spend_cr, c.actual_spend_cr,
                   c.implementing_partner, c.csr1_registration_no, c.sdg_goals,
                   c.location_benefited
              FROM csr_activities c
              JOIN data_submissions ds ON ds.id = c.submission_id
              JOIN industry_profiles ip ON ip.id = ds.industry_id
             WHERE 1=1 ${filter}
          ORDER BY c.id DESC`, params);

        // Aggregate by pillar.
        const byPillar = {};
        let totalActual = 0, totalMandated = 0;
        const sdgSet = new Set();
        for (const r of rows) {
            const p = r.pillar || 'uncategorised';
            if (!byPillar[p]) byPillar[p] = { spend: 0, count: 0, beneficiaries: 0 };
            const spend = parseFloat(r.actual_spend_cr) || (parseFloat(r.amount_spent) || 0) / 100; // Lakhs->Cr fallback
            byPillar[p].spend += spend;
            byPillar[p].count += 1;
            byPillar[p].beneficiaries += parseInt(r.beneficiary_count) || 0;
            totalActual += spend;
            totalMandated += parseFloat(r.mandated_spend_cr) || 0;
            (r.sdg_goals || []).forEach(s => sdgSet.add(s));
        }

        res.json({
            total_records: rows.length,
            total_actual_spend_cr: Math.round(totalActual * 100) / 100,
            total_mandated_spend_cr: Math.round(totalMandated * 100) / 100,
            mandate_compliance_pct: totalMandated > 0 ? Math.round((totalActual / totalMandated) * 1000) / 10 : null,
            sdg_coverage: Array.from(sdgSet).sort((a, b) => a - b),
            by_pillar: byPillar,
            records: rows
        });
    } catch (err) {
        console.error('CSR Dashboard Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// T1.2 — CSR compliance check (run the 2% mandate rule)
// @route   POST /api/research/csr-check
// @desc    For each industry with a PAT baseline, flag if actual CSR
//          spend < mandated 2%. Returns the shortfalls (does NOT auto-
//          insert violations — that's an explicit admin action).
// @access  Private (Admin)
// ============================================================
router.post('/csr-check', requireRole(['admin']), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT ip.id AS industry_id, ip.company_name,
                   MAX(c.pat_baseline_cr) AS pat,
                   SUM(COALESCE(c.actual_spend_cr, 0)) AS actual,
                   SUM(COALESCE(c.mandated_spend_cr, 0)) AS mandated
              FROM industry_profiles ip
         LEFT JOIN csr_activities c ON c.submission_id IN
                    (SELECT id FROM data_submissions WHERE industry_id = ip.id)
             WHERE EXISTS (SELECT 1 FROM csr_activities c2
                            JOIN data_submissions ds2 ON ds2.id = c2.submission_id
                           WHERE ds2.industry_id = ip.id AND c2.pat_baseline_cr > 0)
          GROUP BY ip.id, ip.company_name`);
        const shortfalls = rows.filter(r => {
            const mandated = parseFloat(r.mandated) || 0;
            const actual = parseFloat(r.actual) || 0;
            return mandated > 0 && actual < mandated;
        }).map(r => ({
            industry_id: r.industry_id,
            company_name: r.company_name,
            mandated_cr: Math.round((parseFloat(r.mandated)) * 100) / 100,
            actual_cr: Math.round((parseFloat(r.actual)) * 100) / 100,
            shortfall_cr: Math.round((parseFloat(r.mandated) - parseFloat(r.actual)) * 100) / 100
        }));
        res.json({ checked: rows.length, shortfalls, shortfall_count: shortfalls.length });
    } catch (err) {
        console.error('CSR Check Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// T1.4 — GSTIN + turnover reconciliation list
// @route   GET /api/research/gst-reconciliation
// @desc    Latest submissions with their declared vs gst turnover + status.
// @access  Private (Admin, Govt)
// ============================================================
router.get('/gst-reconciliation', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT DISTINCT ON (ip.id)
                   ip.id, ip.company_name, ip.gstin,
                   ds.period_year, ds.period_quarter,
                   f.annual_turnover AS declared_turnover_cr,
                   f.gst_turnover_cr,
                   f.gst_reconcile_status
              FROM industry_profiles ip
         LEFT JOIN data_submissions ds ON ds.industry_id = ip.id
         LEFT JOIN financial_data f ON f.submission_id = ds.id
             WHERE f.id IS NOT NULL
          ORDER BY ip.id, ds.submitted_at DESC`);
        res.json(rows);
    } catch (err) {
        console.error('GST Reconciliation Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// T1.4 — Officer marks a submission's GST reconciliation status
// @route   PUT /api/research/gst-reconcile/:submissionId
// @access  Private (Admin, Govt)
// ============================================================
router.put('/gst-reconcile/:submissionId', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { status, gstTurnoverCr } = req.body;
        if (!['unverified', 'matches', 'mismatch', 'overdue'].includes(status)) {
            return res.status(400).json({ error: 'status must be unverified|matches|mismatch|overdue' });
        }
        const result = await db.query(
            `UPDATE financial_data
                SET gst_reconcile_status = $1,
                    gst_turnover_cr = COALESCE($2, gst_turnover_cr)
              WHERE submission_id = $3 RETURNING id, gst_reconcile_status, gst_turnover_cr`,
            [status, gstTurnoverCr || null, req.params.submissionId]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Submission financial data not found.' });
        try { await db.query('INSERT INTO audit_logs (user_id, action) VALUES ($1, $2)',
            [req.user.id, `GST reconcile ${status} for submission ${req.params.submissionId}`]); } catch (_) {}
        res.json(result.rows[0]);
    } catch (err) {
        console.error('GST Reconcile Update Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
