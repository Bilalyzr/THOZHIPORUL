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
                COALESCE(SUM(f.investment_amount), 0) as total_investment,
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
            total_investment_cr: kpiRows[0].total_investment > 10000 ? kpiRows[0].total_investment / 10000000 : kpiRows[0].total_investment,
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
                    COALESCE(SUM(f.investment_amount), 0) / 10000000.0 as total_investment,
                    COALESCE(SUM(f.annual_turnover), 0) / 10000000.0 as total_revenue,
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
                    COALESCE(SUM(f.investment_amount), 0) / 10000000.0 as total_investment_cr,
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
                    COALESCE(SUM(f.investment_amount), 0) / 10000000.0 as investment_cr
                FROM industrial_parks p
                LEFT JOIN industry_profiles i ON i.park_id = p.id
                LEFT JOIN (SELECT DISTINCT ON (industry_id) id, industry_id FROM data_submissions ORDER BY industry_id, submitted_at DESC) latest_sub ON latest_sub.industry_id = i.id
                LEFT JOIN financial_data f ON f.submission_id = latest_sub.id
                GROUP BY p.district
                ORDER BY investment_cr DESC
            `),
            db.query(`
                SELECT COUNT(*) as count FROM service_requests 
                WHERE current_status NOT IN ('completed', 'approved', 'rejected')
            `)
        ]);

        const kpiRows = kpiResult.rows;
        const parkRows = parkResult.rows;
        const locRows = locResult.rows;
        const flagRows = flagResult.rows;
        const redFlagsCount = parseInt(flagRows[0].count) || 0;

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

module.exports = router;
