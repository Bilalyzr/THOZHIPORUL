const express = require('express');
const router = express.Router();

router.get('/tnpcb/:industryId', (req, res) => {
    // Mock TNPCB (Pollution Control Board) data
    res.json({
        industry_id: req.params.industryId,
        status: "Active",
        last_inspection: "2026-03-15",
        air_quality_index: Math.floor(Math.random() * 100) + 50, // 50 - 150
        water_discharge_ph: (Math.random() * 2 + 6.5).toFixed(1), // 6.5 - 8.5
        hazardous_waste_compliance: true
    });
});

router.get('/gst/:industryId', (req, res) => {
    res.json({
         industry_id: req.params.industryId,
         gstin_status: "Active",
         last_filing: "2026-04-20",
         tax_defaults: false
    });
});

module.exports = router;
