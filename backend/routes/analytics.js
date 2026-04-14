const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');

// @route   GET /api/analytics/global
// @desc    Get top-level KPI definitions (Total Industries, Investment, Jobs)
// @access  Private (Admin & Govt)
router.get('/global', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        /*
        // Exact PostgreSQL Aggregation Queries:
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
        */

        const mockGlobalAnalytics = {
            total_industries: "1,250",
            total_investment_cr: "24,500",
            total_employment: "145,000",
            total_power_mw: "450"
        };
        
        res.json(mockGlobalAnalytics);
    } catch (err) {
        console.error("Aggregation Calculation Error:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
