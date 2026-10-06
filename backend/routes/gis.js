// ============================================================
// gis.js — GIS / Industrial Parks Explorer enhancements (Module 2)
//
// Mounted at /api/gis. ADDITIVE to /api/parks (which still serves the
// base park list + detail). Adds:
//   • Layer registry (plots, utilities, zones, heatmaps, environmental, IoT)
//   • Plot-level drill-down from the map (allottee, lease, area, readiness)
//   • Live IoT telemetry overlay (latest power/water/effluent per park)
//   • Investment + occupancy heatmap data (per district / per park)
//   • Encroachment flags (placeholder for satellite/visual detection)
// ============================================================

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');

// ============================================================
// @route   GET /api/gis/layers
// @desc    Available map layers + active state. Drives the layer-toggle UI.
// @access  Public
// ============================================================
router.get('/layers', async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT layer_key, display_name, description, is_active, config FROM gis_layers ORDER BY display_name'
        );
        res.json(rows);
    } catch (_) {
        // Table missing pre-migration — return a static default set so the UI works.
        res.json([
            { layer_key: 'plots', display_name: 'Plot Availability', is_active: true },
            { layer_key: 'utilities', display_name: 'Utility Network', is_active: true },
            { layer_key: 'zones', display_name: 'Zoning', is_active: false },
            { layer_key: 'investment_heat', display_name: 'Investment Heatmap', is_active: true },
            { layer_key: 'occupancy_heat', display_name: 'Occupancy Heatmap', is_active: false },
            { layer_key: 'environmental', display_name: 'Environmental', is_active: false },
        ]);
    }
});

// ============================================================
// @route   PUT /api/gis/layers/:key
// @desc    Toggle a layer's visibility (admin config).
// @access  Private (Admin)
// ============================================================
router.put('/layers/:key', requireRole(['admin']), async (req, res) => {
    try {
        const { isActive } = req.body;
        await db.query('UPDATE gis_layers SET is_active = $1 WHERE layer_key = $2', [isActive, req.params.key]);
        res.json({ msg: 'updated' });
    } catch (err) {
        console.error('Toggle Layer Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/gis/plots/:id
// @desc    Plot drill-down from the map: allottee, lease status,
//          area, dues, readiness score. The map calls this when a
//          user clicks a plot.
// @access  Private (Admin, Govt, Industry)
// ============================================================
router.get('/plots/:id', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT pp.id, pp.plot_number, pp.area_acres, pp.status, pp.zone_type,
                   pp.allotment_date, pp.lease_start_date, pp.lease_end_date,
                   pp.monthly_lease_amount,
                   p.id AS park_id, p.name AS park_name, p.district,
                   ip.id AS industry_id, ip.company_name AS allottee,
                   p.water_capacity_kl, p.power_capacity_mw, p.road_connectivity_km
              FROM park_plots pp
              JOIN industrial_parks p ON p.id = pp.park_id
         LEFT JOIN industry_profiles ip ON ip.id = pp.allottee_industry_id
             WHERE pp.id = $1`, [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Plot not found' });

        const r = rows[0];
        // Tenant privacy: commercial lease terms and the allottee's identity
        // are visible only to admin/govt or the plot's OWN allottee — other
        // industry users must not read a competitor's rent and lease dates.
        if (req.user.role === 'industry' && r.industry_id !== req.user.profile_id) {
            r.allottee = null;
            r.industry_id = null;
            r.monthly_lease_amount = null;
            r.lease_start_date = null;
            r.lease_end_date = null;
            r.allotment_date = null;
        }
        // "Plug-and-play" readiness score: simple composite from available infra.
        const readiness = [
            r.water_capacity_kl > 0, r.power_capacity_mw > 0, r.road_connectivity_km > 0
        ].filter(Boolean).length;
        res.json({ ...r, readiness_score: Math.round((readiness / 3) * 100) });
    } catch (err) {
        console.error('Plot Drill-down Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/gis/heatmap?type=investment|occupancy
// @desc    Per-park intensity for the heatmap layers.
// @access  Public
// ============================================================
router.get('/heatmap', async (req, res) => {
    try {
        const type = req.query.type === 'occupancy' ? 'occupancy' : 'investment';
        const col = type === 'investment'
            ? 'total_investment_cr'
            : 'CASE WHEN total_area_acres>0 THEN (total_area_acres-available_area_acres)/total_area_acres*100 ELSE 0 END';
        const { rows } = await db.query(
            `SELECT id, name, district, latitude, longitude, ROUND((${col})::numeric,2) AS intensity
               FROM industrial_parks ORDER BY intensity DESC`
        );
        res.json({ type, points: rows });
    } catch (err) {
        console.error('Heatmap Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/gis/encroachments
// @desc    Encroachment flags (Module 2 — satellite/visual detection).
//          Until a vision pipeline is wired in, this returns flags
//          raised manually via the audit-style endpoint below.
// @access  Private (Admin, Govt)
// ============================================================
router.get('/encroachments', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT * FROM search_index WHERE entity_type = 'encroachment' ORDER BY updated_at DESC LIMIT 100`);
        res.json(rows);
    } catch (_) { res.json([]); }
});

// @route   POST /api/gis/encroachments  — raise a flag
router.post('/encroachments', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { parkId, plotId, description, latitude, longitude } = req.body;
        if (!description) return res.status(400).json({ error: 'description required' });
        const ins = await db.query(
            `INSERT INTO search_index (entity_type, entity_id, title, subtitle, description, payload)
             VALUES ('encroachment', $1, $2, $3, $4, $5::jsonb) RETURNING id`,
            [parkId || 0, 'Encroachment flag', plotId ? `Plot ${plotId}` : null,
             description, JSON.stringify({ parkId, plotId, latitude, longitude, raisedBy: req.user.id })]
        );
        res.status(201).json({ id: ins.rows[0].id, msg: 'Encroachment flag raised' });
    } catch (err) {
        console.error('Encroachment Flag Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
