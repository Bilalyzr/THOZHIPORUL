const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');

// @route   GET /api/parks
// @desc    List all industrial parks (public summary)
// @access  Public
router.get('/', async (req, res) => {
    try {
        // Surface the REAL registered figures (industries in the park + their latest
        // reported investment/employment) for the aggregate fields, so per-park numbers
        // are consistent with the homepage and Command Center. The stored brochure
        // columns remain untouched in the DB.
        const { rows } = await db.query(`
            WITH latest_sub AS (
                SELECT DISTINCT ON (industry_id) id, industry_id
                FROM data_submissions ORDER BY industry_id, submitted_at DESC NULLS LAST
            ),
            park_agg AS (
                SELECT p.id,
                    COUNT(DISTINCT ip.id) AS reg_industries,
                    ROUND(COALESCE(SUM(CASE WHEN f.investment_amount >= 100000 THEN f.investment_amount / 1e7 ELSE f.investment_amount END), 0), 2) AS reg_investment_cr,
                    COALESCE(SUM(e.permanent_employees + e.contract_employees), 0) AS reg_employment
                FROM industrial_parks p
                LEFT JOIN industry_profiles ip ON ip.park_id = p.id
                LEFT JOIN latest_sub ls ON ls.industry_id = ip.id
                LEFT JOIN financial_data f ON f.submission_id = ls.id
                LEFT JOIN employment_data e ON e.submission_id = ls.id
                GROUP BY p.id
            )
            SELECT ip.*, a.reg_industries, a.reg_investment_cr, a.reg_employment
            FROM industrial_parks ip
            JOIN park_agg a ON a.id = ip.id
            ORDER BY ip.name
        `);

        const parks = rows.map(r => {
            const { reg_industries, reg_investment_cr, reg_employment, ...rest } = r;
            return {
                ...rest,
                total_industries: Number(reg_industries),
                total_investment_cr: Number(reg_investment_cr),
                total_employment: Number(reg_employment),
            };
        });
        res.json(parks);
    } catch (err) {
        console.error('Fetch Parks Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/parks/compare
// @desc    Compare parks side-by-side
// @access  Public
// NOTE: Must be defined BEFORE /:id to avoid route matching issues
router.get('/compare', async (req, res) => {
    try {
        const ids = (req.query.ids || '').split(',').map(Number).filter(id => !isNaN(id));
        if (ids.length === 0) return res.json([]);

        const { rows } = await db.query(
            `SELECT id, name, total_area_acres, available_area_acres, total_industries, infrastructure_score, total_investment_cr
             FROM industrial_parks
             WHERE id = ANY($1::int[])`,
            [ids]
        );
        res.json(rows);
    } catch (err) {
        console.error('Park Compare Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/parks/:id
// @desc    Get single park detail with infrastructure metrics
// @access  Public (basic), Authenticated (full metrics)
router.get('/:id', async (req, res) => {
    try {
        const parkId = parseInt(req.params.id);
        if (isNaN(parkId)) return res.status(400).json({ error: 'Invalid park id.' });

        const parkResult = await db.query('SELECT * FROM industrial_parks WHERE id = $1', [parkId]);
        if (parkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Park not found' });
        }
        
        const park = parkResult.rows[0];

        // Fetch latest metrics
        const metricsResult = await db.query(
            'SELECT * FROM park_infrastructure_metrics WHERE park_id = $1 ORDER BY recorded_date DESC LIMIT 1',
            [parkId]
        );

        const response = {
            ...park,
            current_metrics: metricsResult.rows[0] || null
        };

        res.json(response);
    } catch (err) {
        console.error('Park Detail Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/parks/:id/plots
// @desc    Get plot-level data for a park
// @access  Private (Authenticated)
router.get('/:id/plots', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const parkId = parseInt(req.params.id);
        if (isNaN(parkId)) return res.status(400).json({ error: 'Invalid park id.' });
        const { rows } = await db.query(
            `SELECT p.*, ip.company_name as allottee 
             FROM park_plots p 
             LEFT JOIN industry_profiles ip ON p.allottee_industry_id = ip.id 
             WHERE p.park_id = $1`,
            [parkId]
        );
        res.json(rows);
    } catch (err) {
        console.error('Park Plots Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/parks/:id/metrics
// @desc    Get infrastructure time-series metrics
// @access  Private (Admin, Govt)
router.get('/:id/metrics', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const parkId = parseInt(req.params.id);
        if (isNaN(parkId)) return res.status(400).json({ error: 'Invalid park id.' });
        const { rows } = await db.query(
            'SELECT * FROM park_infrastructure_metrics WHERE park_id = $1 ORDER BY recorded_date DESC LIMIT 12',
            [parkId]
        );
        res.json(rows);
    } catch (err) {
        console.error('Park Metrics Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
