const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');

// @route   GET /api/analytics/global
// @desc    Get top-level KPI definitions (Total Industries, Investment, Jobs)
// @access  Private (Admin & Govt)
router.get('/global', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { rows: kpiRows } = await db.query(`
            SELECT 
                COUNT(i.id) as total_industries,
                COALESCE(SUM(CASE WHEN f.investment_amount >= 100000 THEN f.investment_amount / 1e7 ELSE f.investment_amount END), 0) as total_investment_cr,
                COALESCE(SUM(e.permanent_employees + e.contract_employees), 0) as total_employment,
                COALESCE(SUM(r.power_usage), 0) as total_power
            FROM industry_profiles i
            LEFT JOIN (SELECT DISTINCT ON (industry_id) id, industry_id FROM data_submissions ORDER BY industry_id, submitted_at DESC) latest_sub ON latest_sub.industry_id = i.id
            LEFT JOIN financial_data f ON f.submission_id = latest_sub.id
            LEFT JOIN employment_data e ON e.submission_id = latest_sub.id
            LEFT JOIN resource_usage r ON r.submission_id = latest_sub.id
        `);

        const globalAnalytics = {
            total_industries: kpiRows[0].total_industries,
            total_investment_cr: Number(kpiRows[0].total_investment_cr) || 0,
            total_employment: kpiRows[0].total_employment,
            total_power_mw: kpiRows[0].total_power
        };
        
        res.json(globalAnalytics);
    } catch (err) {
        console.error("Aggregation Calculation Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/analytics/command-center
// @desc    Get data for the Gov Command Center
// @access  Private (Admin & Govt)
router.get('/command-center', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        // Run all queries concurrently using Promise.all
        const [kpiResult, parkResult, locResult, flagResult] = await Promise.all([
            db.query(`
                SELECT 
                    COALESCE(SUM(CASE WHEN f.investment_amount >= 100000 THEN f.investment_amount / 1e7 ELSE f.investment_amount END), 0) as total_investment,
                    COALESCE(SUM(CASE WHEN f.annual_turnover >= 100000 THEN f.annual_turnover / 1e7 ELSE f.annual_turnover END), 0) as total_revenue,
                    COALESCE(SUM(e.permanent_employees), 0) as direct_employment,
                    COALESCE(SUM(e.contract_employees), 0) as indirect_employment
                FROM industry_profiles i
                LEFT JOIN (SELECT DISTINCT ON (industry_id) id, industry_id FROM data_submissions ORDER BY industry_id, submitted_at DESC) latest_sub ON latest_sub.industry_id = i.id
                LEFT JOIN financial_data f ON f.submission_id = latest_sub.id
                LEFT JOIN employment_data e ON e.submission_id = latest_sub.id
            `),
            db.query(`
                SELECT 
                    p.id,
                    p.name,
                    COUNT(i.id) as total_industries,
                    COALESCE(SUM(CASE WHEN f.investment_amount >= 100000 THEN f.investment_amount / 1e7 ELSE f.investment_amount END), 0) as total_investment_cr,
                    COALESCE(SUM(e.permanent_employees + e.contract_employees), 0) as total_employment,
                    85 as infrastructure_score
                FROM industrial_parks p
                LEFT JOIN industry_profiles i ON i.park_id = p.id
                LEFT JOIN (SELECT DISTINCT ON (industry_id) id, industry_id FROM data_submissions ORDER BY industry_id, submitted_at DESC) latest_sub ON latest_sub.industry_id = i.id
                LEFT JOIN financial_data f ON f.submission_id = latest_sub.id
                LEFT JOIN employment_data e ON e.submission_id = latest_sub.id
                GROUP BY p.id, p.name
                ORDER BY total_investment_cr DESC
                LIMIT 5
            `),
            db.query(`
                SELECT 
                    p.district as district,
                    COUNT(DISTINCT p.id) as parks,
                    COUNT(i.id) as industries,
                    COALESCE(SUM(CASE WHEN f.investment_amount >= 100000 THEN f.investment_amount / 1e7 ELSE f.investment_amount END), 0) as investment_cr
                FROM industrial_parks p
                LEFT JOIN industry_profiles i ON i.park_id = p.id
                LEFT JOIN (SELECT DISTINCT ON (industry_id) id, industry_id FROM data_submissions ORDER BY industry_id, submitted_at DESC) latest_sub ON latest_sub.industry_id = i.id
                LEFT JOIN financial_data f ON f.submission_id = latest_sub.id
                GROUP BY p.district
                ORDER BY investment_cr DESC
            `),
            // Count pending service requests for the red-flags KPI. This table
            // is added by a later migration, so guard against it being absent
            // on a fresh/partial DB rather than failing the whole Command Center.
            db.query(`
                SELECT COUNT(*) as count FROM service_requests
                WHERE current_status NOT IN ('completed', 'approved', 'rejected')
            `).catch(() => ({ rows: [{ count: 0 }] }))
        ]);

        const kpiRows = kpiResult.rows;
        const parkRows = parkResult.rows;
        const locRows = locResult.rows;
        const flagRows = flagResult.rows || [{ count: 0 }];
        const redFlagsCount = parseInt(flagRows[0] && flagRows[0].count) || 0;

        res.json({
            kpis: {
                total_capex_cr: kpiRows[0].total_investment,
                total_revenue_cr: kpiRows[0].total_revenue,
                direct_employment: kpiRows[0].direct_employment,
                indirect_employment: kpiRows[0].indirect_employment,
                red_flags: redFlagsCount
            },
            rankings: parkRows,
            heatmapData: locRows
        });

    } catch (err) {
        console.error("Command Center Calculation Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/analytics/utility-breakdown?type=power|water
// @desc    Per-industry utility usage drill-down for the real-time
//          Electricity / Water panels in the Command Center.
//          Returns each industry's latest usage, the per-unit tariff,
//          the computed billed amount at the current rate, the
//          sanctioned quota, and an over-draw flag (120% rule).
//          Powers the click-to-drill-down dialog on the dashboard.
// @access  Private (Admin, Govt)
// ============================================================
router.get('/utility-breakdown', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const type = (req.query.type || 'power').toLowerCase();
        const isWater = type === 'water';

        // Tariff defaults mirror the rates shown on the Command Center
        // panels. Each industry MAY carry its own negotiated tariff
        // (industry_profiles.tariff_per_unit for power); fall back to the
        // statewide default otherwise.
        const DEFAULT_POWER_RATE = 7.50;  // ₹ / kWh
        const DEFAULT_WATER_RATE = 45.00; // ₹ / kL

        const usageCol = isWater ? 'r.water_consumption' : 'r.power_usage';
        const quotaCol = isWater ? 'ip.water_allocated_kl' : 'ip.sanctioned_load_kw';
        // The power tariff column only applies to electricity.
        const tariffCol = isWater ? `${DEFAULT_WATER_RATE}` : 'COALESCE(ip.tariff_per_unit, 7.50)';
        const unit = isWater ? 'kL' : 'kWh';

        const { rows } = await db.query(`
            SELECT ip.id AS industry_id,
                   ip.company_name,
                   p.name AS park_name,
                   COALESCE(${usageCol}, 0) AS usage,
                   COALESCE(${quotaCol}, 0) AS quota,
                   ${tariffCol}::numeric AS tariff
              FROM industry_profiles ip
              LEFT JOIN industrial_parks p ON p.id = ip.park_id
              LEFT JOIN (SELECT DISTINCT ON (industry_id) id, industry_id
                           FROM data_submissions
                          ORDER BY industry_id, submitted_at DESC) latest_sub
                ON latest_sub.industry_id = ip.id
              LEFT JOIN resource_usage r ON r.submission_id = latest_sub.id
             WHERE COALESCE(${usageCol}, 0) > 0
             ORDER BY ${usageCol} DESC
        `);

        // Compute amounts + quota utilisation server-side so the frontend
        // never has to recompute tariffs. Over-draw follows the existing
        // ENV-WAT-OD / ENV-PWR-OD compliance rule (>120% of quota).
        const breakdown = rows.map(r => {
            const usage = Number(r.usage) || 0;
            const quota = Number(r.quota) || 0;
            const tariff = Number(r.tariff) || (isWater ? DEFAULT_WATER_RATE : DEFAULT_POWER_RATE);
            const amount = usage * tariff;
            const quotaPct = quota > 0 ? (usage / quota) * 100 : null;
            const overdraw = quota > 0 && usage > quota * 1.2;
            return {
                industry_id: r.industry_id,
                company_name: r.company_name,
                park_name: r.park_name || '—',
                usage,
                unit,
                quota,
                quota_pct: quotaPct === null ? null : Math.round(quotaPct),
                tariff,
                amount,
                amount_display: `₹ ${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
                overdraw
            };
        });

        const totalUsage = breakdown.reduce((s, r) => s + r.usage, 0);
        const totalAmount = breakdown.reduce((s, r) => s + r.amount, 0);

        res.json({
            type: isWater ? 'water' : 'power',
            unit,
            rate: isWater ? DEFAULT_WATER_RATE : DEFAULT_POWER_RATE,
            rate_display: `₹ ${isWater ? DEFAULT_WATER_RATE : DEFAULT_POWER_RATE} / ${unit}`,
            industries: breakdown,
            total_usage: totalUsage,
            total_amount: totalAmount,
            total_amount_display: `₹ ${totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
            overdraw_count: breakdown.filter(r => r.overdraw).length
        });
    } catch (err) {
        console.error('Utility Breakdown Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
