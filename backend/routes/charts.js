// routes/charts.js — Comprehensive chart-data endpoint that returns ALL
// dashboard visualizations in a single request. Every number originates
// from real filings — nothing fabricated.

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');
const cache = require('../services/cache');

// pg returns `numeric` columns as strings — convert them to real numbers so
// Recharts' stacking math and axis domains work off JS numbers.
const numifyRows = (rows) => rows.map(r => {
  const out = {};
  for (const [k, v] of Object.entries(r)) {
    out[k] = (typeof v === 'string' && v !== '' && !isNaN(Number(v))) ? Number(v) : v;
  }
  return out;
});

// GET /api/charts/all — every chart dataset in one payload
router.get('/all', requireRole(['admin', 'govt', 'industry']), cache.middleware(60_000), async (req, res) => {
  try {
    const isIndustry = req.user.role === 'industry';
    const profileId = req.user.profile_id;

    // ── 1. Investment by Industry (latest filing) ──
    const investment = await db.query(`
      WITH latest AS (
        SELECT DISTINCT ON (ds.industry_id) ds.id, ds.industry_id
          FROM data_submissions ds
          ${isIndustry ? 'WHERE ds.industry_id = $1' : ''}
       ORDER BY ds.industry_id, ds.period_year DESC, ds.period_quarter DESC
      )
      SELECT ip.company_name AS name, p.name AS park,
             ROUND(f.investment_amount / 1e7, 1) AS value_cr
        FROM latest l
        JOIN industry_profiles ip ON ip.id = l.industry_id
        LEFT JOIN industrial_parks p ON p.id = ip.park_id
        LEFT JOIN financial_data f ON f.submission_id = l.id
       ORDER BY value_cr DESC`, isIndustry ? [profileId] : []);

    // ── 2. Employment by Industry ──
    const employment = await db.query(`
      WITH latest AS (
        SELECT DISTINCT ON (ds.industry_id) ds.id, ds.industry_id
          FROM data_submissions ds
          ${isIndustry ? 'WHERE ds.industry_id = $1' : ''}
       ORDER BY ds.industry_id, ds.period_year DESC, ds.period_quarter DESC
      )
      SELECT ip.company_name AS name, p.name AS park,
             COALESCE(e.permanent_employees, 0) AS permanent,
             COALESCE(e.contract_employees, 0) AS contract,
             COALESCE(e.women_employees, 0) AS women
        FROM latest l
        JOIN industry_profiles ip ON ip.id = l.industry_id
        LEFT JOIN industrial_parks p ON p.id = ip.park_id
        LEFT JOIN employment_data e ON e.submission_id = l.id
       ORDER BY COALESCE(e.permanent_employees, 0) + COALESCE(e.contract_employees, 0) DESC`, isIndustry ? [profileId] : []);

    // ── 3. Water Consumption by Industry ──
    const water = await db.query(`
      WITH latest AS (
        SELECT DISTINCT ON (ds.industry_id) ds.id, ds.industry_id
          FROM data_submissions ds
          ${isIndustry ? 'WHERE ds.industry_id = $1' : ''}
       ORDER BY ds.industry_id, ds.period_year DESC, ds.period_quarter DESC
      )
      SELECT ip.company_name AS name, p.name AS park,
             ROUND(r.water_consumption) AS value_kl,
             ip.water_allocated_kl AS allocation
        FROM latest l
        JOIN industry_profiles ip ON ip.id = l.industry_id
        LEFT JOIN industrial_parks p ON p.id = ip.park_id
        LEFT JOIN resource_usage r ON r.submission_id = l.id
       WHERE r.water_consumption IS NOT NULL
       ORDER BY value_kl DESC`, isIndustry ? [profileId] : []);

    // ── 4. Power Consumption by Industry ──
    const power = await db.query(`
      WITH latest AS (
        SELECT DISTINCT ON (ds.industry_id) ds.id, ds.industry_id
          FROM data_submissions ds
          ${isIndustry ? 'WHERE ds.industry_id = $1' : ''}
       ORDER BY ds.industry_id, ds.period_year DESC, ds.period_quarter DESC
      )
      SELECT ip.company_name AS name, p.name AS park,
             ROUND(r.power_usage) AS value_kwh,
             ip.sanctioned_load_kw AS sanctioned_kw
        FROM latest l
        JOIN industry_profiles ip ON ip.id = l.industry_id
        LEFT JOIN industrial_parks p ON p.id = ip.park_id
        LEFT JOIN resource_usage r ON r.submission_id = l.id
       WHERE r.power_usage IS NOT NULL
       ORDER BY value_kwh DESC`, isIndustry ? [profileId] : []);

    // ── 5. CSR Spending by Industry ──
    const csr = await db.query(`
      WITH latest AS (
        SELECT DISTINCT ON (ds.industry_id) ds.id, ds.industry_id
          FROM data_submissions ds
          ${isIndustry ? 'WHERE ds.industry_id = $1' : ''}
       ORDER BY ds.industry_id, ds.period_year DESC, ds.period_quarter DESC
      )
      SELECT ip.company_name AS name,
             ROUND(COALESCE(c.amount_spent, 0) / 1e5, 1) AS value_lakhs,
             c.description AS activity,
             c.beneficiary_count
        FROM latest l
        JOIN industry_profiles ip ON ip.id = l.industry_id
        LEFT JOIN csr_activities c ON c.submission_id = l.id
       WHERE c.amount_spent IS NOT NULL AND c.amount_spent > 0
       ORDER BY value_lakhs DESC`, isIndustry ? [profileId] : []);

    // ── 6. Park-Level Comparison (all metrics) ──
    const parks = await db.query(`
      WITH latest AS (
        SELECT DISTINCT ON (ds.industry_id) ds.id, ds.industry_id
          FROM data_submissions ds
       ORDER BY ds.industry_id, ds.period_year DESC, ds.period_quarter DESC
      )
      SELECT p.name AS park, p.district,
             COUNT(DISTINCT ip.id) AS industries,
             ROUND(COALESCE(SUM(f.investment_amount), 0) / 1e7, 1) AS investment_cr,
             COALESCE(SUM(COALESCE(e.permanent_employees, 0) + COALESCE(e.contract_employees, 0)), 0) AS employees,
             ROUND(COALESCE(SUM(r.water_consumption), 0)) AS water_kl,
             ROUND(COALESCE(SUM(r.power_usage), 0)) AS power_kwh
        FROM industrial_parks p
        LEFT JOIN industry_profiles ip ON ip.park_id = p.id
        LEFT JOIN latest l ON l.industry_id = ip.id
        LEFT JOIN financial_data f ON f.submission_id = l.id
        LEFT JOIN employment_data e ON e.submission_id = l.id
        LEFT JOIN resource_usage r ON r.submission_id = l.id
       GROUP BY p.name, p.district
      HAVING COUNT(DISTINCT ip.id) > 0
       ORDER BY investment_cr DESC`);

    // ── 7. Compliance Distribution ──
    const compliance = await db.query(`
      WITH latest AS (
        SELECT DISTINCT ON (industry_id) industry_id, overall_score
          FROM compliance_scores ORDER BY industry_id, score_date DESC
      )
      SELECT CASE
               WHEN overall_score >= 80 THEN 'Compliant'
               WHEN overall_score >= 60 THEN 'Warning'
               WHEN overall_score < 60 THEN 'Violation'
             END AS name,
             COUNT(*)::int AS value
        FROM latest GROUP BY 1`);

    // ── 8. Grievances by Status ──
    const grievances = await db.query(`
      SELECT status AS name, COUNT(*)::int AS value
        FROM grievances GROUP BY status ORDER BY value DESC`);

    // ── 9. Turnover by Industry ──
    const turnover = await db.query(`
      WITH latest AS (
        SELECT DISTINCT ON (ds.industry_id) ds.id, ds.industry_id
          FROM data_submissions ds
          ${isIndustry ? 'WHERE ds.industry_id = $1' : ''}
       ORDER BY ds.industry_id, ds.period_year DESC, ds.period_quarter DESC
      )
      SELECT ip.company_name AS name,
             ROUND(f.annual_turnover / 1e7, 1) AS value_cr,
             ROUND(COALESCE(f.export_revenue, 0) / 1e7, 1) AS export_cr
        FROM latest l
        JOIN industry_profiles ip ON ip.id = l.industry_id
        LEFT JOIN financial_data f ON f.submission_id = l.id
       WHERE f.annual_turnover IS NOT NULL
       ORDER BY value_cr DESC`, isIndustry ? [profileId] : []);

    // ── 10. Quarterly Trend (all metrics over time) ──
    const trend = await db.query(`
      WITH quarterly AS (
        SELECT DISTINCT ON (ds.industry_id, ds.period_year, ds.period_quarter)
               ds.id, ds.industry_id, ds.period_year, ds.period_quarter
          FROM data_submissions ds
       ORDER BY ds.industry_id, ds.period_year, ds.period_quarter, ds.submitted_at DESC
      )
      SELECT q.period_year || '-Q' || q.period_quarter AS period,
             ROUND(COALESCE(SUM(f.investment_amount), 0) / 1e7, 1) AS investment_cr,
             COALESCE(SUM(COALESCE(e.permanent_employees, 0) + COALESCE(e.contract_employees, 0)), 0) AS employees,
             ROUND(COALESCE(SUM(r.water_consumption), 0)) AS water_kl,
             ROUND(COALESCE(SUM(r.power_usage), 0)) AS power_kwh,
             ROUND(COALESCE(SUM(c.amount_spent), 0) / 1e5, 1) AS csr_lakhs
        FROM quarterly q
        LEFT JOIN financial_data f ON f.submission_id = q.id
        LEFT JOIN employment_data e ON e.submission_id = q.id
        LEFT JOIN resource_usage r ON r.submission_id = q.id
        LEFT JOIN csr_activities c ON c.submission_id = q.id
       GROUP BY q.period_year, q.period_quarter
       ORDER BY q.period_year, q.period_quarter`);

    // ── 11. Production by Industry ──
    const production = await db.query(`
      WITH latest AS (
        SELECT DISTINCT ON (pd.industry_id, pd.period_year, pd.period_quarter)
               pd.submission_id, pd.industry_id
          FROM production_data pd
       ORDER BY pd.industry_id, pd.period_year, pd.period_quarter, pd.created_at DESC
      )
      SELECT ip.company_name AS name, pd.product_name,
             pd.quantity, pd.unit,
             ROUND(pd.production_value / 1e7, 1) AS value_cr
        FROM latest l
        JOIN industry_profiles ip ON ip.id = l.industry_id
        JOIN production_data pd ON pd.submission_id = l.submission_id
       ORDER BY value_cr DESC LIMIT 15`);

    res.json({
      investment: numifyRows(investment.rows),
      employment: numifyRows(employment.rows),
      water: numifyRows(water.rows),
      power: numifyRows(power.rows),
      csr: numifyRows(csr.rows),
      parks: numifyRows(parks.rows),
      compliance: numifyRows(compliance.rows),
      grievances: numifyRows(grievances.rows),
      turnover: numifyRows(turnover.rows),
      trend: numifyRows(trend.rows),
      production: numifyRows(production.rows),
      generated_at: new Date().toISOString(),
      source: 'live PostgreSQL — latest filing per industry per period'
    });
  } catch (err) {
    console.error('Charts Error:', err.message);
    res.status(500).json({ error: 'Failed to load chart data' });
  }
});

module.exports = router;
