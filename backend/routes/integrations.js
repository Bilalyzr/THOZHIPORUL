const express = require('express');
const router = express.Router();
const { requireRole } = require('./auth');

// ============================================================
// EXTERNAL SYSTEM CONNECTORS (SIMULATED)
// These endpoints represent third-party government integrations
// (TNPCB Pollution Control Board, GST Network) that are NOT yet
// wired to the real external APIs. Responses are clearly flagged
// as `simulated` / sandbox so nobody mistakes them for live data.
// ============================================================

// @route   GET /api/integrations/tnpcb/:industryId
// @desc    TNPCB (Pollution Control Board) connector — SIMULATED sandbox response
// @access  Private (Admin, Govt)
router.get('/tnpcb/:industryId', requireRole(['admin', 'govt']), (req, res) => {
    res.json({
        industry_id: req.params.industryId,
        connection: 'not_connected',
        environment: 'sandbox',
        simulated: true,
        notice: 'Simulated TNPCB connector — not linked to the live Pollution Control Board API. Sample values only.',
        status: "Active",
        last_inspection: "2026-03-15",
        air_quality_index: Math.floor(Math.random() * 100) + 50, // 50 - 150
        water_discharge_ph: (Math.random() * 2 + 6.5).toFixed(1), // 6.5 - 8.5
        hazardous_waste_compliance: true
    });
});

// @route   GET /api/integrations/gst/:industryId
// @desc    GST Network connector — SIMULATED sandbox response
// @access  Private (Admin, Govt)
router.get('/gst/:industryId', requireRole(['admin', 'govt']), (req, res) => {
    res.json({
         industry_id: req.params.industryId,
         connection: 'not_connected',
         environment: 'sandbox',
         simulated: true,
         notice: 'Simulated GST Network connector — not linked to the live GSTN API. Sample values only.',
         gstin_status: "Active",
         last_filing: "2026-04-20",
         tax_defaults: false
    });
});

module.exports = router;
