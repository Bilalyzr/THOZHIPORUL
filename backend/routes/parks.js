const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');

// @route   GET /api/parks
// @desc    List all industrial parks (public summary)
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM industrial_parks ORDER BY name');
        res.json(rows);
    } catch (err) {
        console.error('Fetch Parks Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/parks/:id
// @desc    Get single park detail with infrastructure metrics
// @access  Public (basic), Authenticated (full metrics)
router.get('/:id', async (req, res) => {
    try {
        const parkId = parseInt(req.params.id);

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

// @route   GET /api/parks/compare
// @desc    Compare parks side-by-side
// @access  Public
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

module.exports = router;
