const express = require('express');
const router = express.Router();
const db = require('../db');

// ============================================================
// Helpers
// ============================================================
// Format an integer with Indian-locale thousands separators (e.g. 145000 -> '145,000').
const fmt = (n) => (Number(n) || 0).toLocaleString('en-IN');

// ============================================================
// @route   GET /api/public/pulse
// @desc    Public state industrial pulse data (for Home page)
// @access  Public
// ============================================================
router.get('/pulse', async (req, res) => {
    try {
        // ---- State-wide aggregates ----
        // Land & park count come from industrial_parks. Investment & employment are
        // the REAL figures reported by registered industries (latest submission each),
        // so the headline total matches the Command Center and Compliance Engine.
        const aggResult = await db.query(`
            WITH latest_sub AS (
                SELECT DISTINCT ON (industry_id) id, industry_id
                FROM data_submissions ORDER BY industry_id, submitted_at DESC NULLS LAST
            )
            SELECT
                (SELECT COALESCE(SUM(available_area_acres), 0) FROM industrial_parks) AS land_bank,
                (SELECT COUNT(*) FROM industrial_parks) AS active_park_count,
                ROUND(COALESCE(SUM(CASE WHEN f.investment_amount >= 100000 THEN f.investment_amount / 1e7 ELSE f.investment_amount END), 0)) AS total_investment_cr,
                COALESCE(SUM(e.permanent_employees + e.contract_employees), 0) AS total_employment
            FROM latest_sub ls
            LEFT JOIN financial_data f ON f.submission_id = ls.id
            LEFT JOIN employment_data e ON e.submission_id = ls.id
        `);
        const agg = aggResult.rows[0];

        // ---- Per-park detail for the homepage map ----
        // industries = registered industries in the park; investment_cr = their real
        // reported investment. available_plots derived from available land (~10 acres/plot).
        const parksResult = await db.query(`
            WITH latest_sub AS (
                SELECT DISTINCT ON (industry_id) id, industry_id
                FROM data_submissions ORDER BY industry_id, submitted_at DESC NULLS LAST
            )
            SELECT
                p.id,
                p.name,
                p.status,
                p.available_area_acres,
                p.latitude AS lat,
                p.longitude AS lng,
                COUNT(DISTINCT ip.id) AS industries,
                ROUND(COALESCE(SUM(CASE WHEN f.investment_amount >= 100000 THEN f.investment_amount / 1e7 ELSE f.investment_amount END), 0), 1) AS investment_cr,
                GREATEST(ROUND(COALESCE(p.available_area_acres, 0) / 10.0), 0)::int AS available_plots
            FROM industrial_parks p
            LEFT JOIN industry_profiles ip ON ip.park_id = p.id
            LEFT JOIN latest_sub ls ON ls.industry_id = ip.id
            LEFT JOIN financial_data f ON f.submission_id = ls.id
            GROUP BY p.id, p.name, p.status, p.available_area_acres, p.latitude, p.longitude
            ORDER BY p.id ASC
        `);

        const parks = parksResult.rows.map(p => ({
            id: p.id,
            name: p.name,
            lat: parseFloat(p.lat),
            lng: parseFloat(p.lng),
            industries: parseInt(p.industries) || 0,
            available_plots: parseInt(p.available_plots) || 0
        }));

        // ---- Highlights derived from real park data (registered investment) ----
        const hp = [...parksResult.rows].sort((a, b) => Number(b.investment_cr) - Number(a.investment_cr));
        const today = new Date().toISOString().slice(0, 10);
        const highlights = [];

        // 1. Largest registered-investment park.
        if (hp[0]) {
            highlights.push({
                id: 1,
                title: `${hp[0].name} leads with Rs. ${fmt(Math.round(hp[0].investment_cr))} Cr in registered investment`,
                category: 'Investment',
                date: today
            });
        }
        // 2. A real under-development / proposed park (expansion story).
        const devPark = parksResult.rows.find(p => p.status === 'under_development') || parksResult.rows.find(p => p.status === 'proposed');
        if (devPark) {
            highlights.push({
                id: 2,
                title: `${devPark.name} under development with ${fmt(Math.round(devPark.available_area_acres))} acres available`,
                category: 'Development',
                date: today
            });
        }
        // 3. Second-largest investment park as a milestone.
        if (hp[1]) {
            highlights.push({
                id: 3,
                title: `${hp[1].name} attracts Rs. ${fmt(Math.round(hp[1].investment_cr))} Cr in industrial investment`,
                category: 'Milestone',
                date: today
            });
        }

        res.json({
            landBank: fmt(Math.round(agg.land_bank)),
            landBank_unit: 'acres',
            activeParkCount: parseInt(agg.active_park_count) || 0,
            totalInvestment: fmt(Math.round(agg.total_investment_cr)),
            totalInvestment_unit: 'Cr',
            totalEmployment: fmt(agg.total_employment),
            parks,
            highlights
        });
    } catch (err) {
        console.error('Public Pulse Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
