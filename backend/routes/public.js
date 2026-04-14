const express = require('express');
const router = express.Router();
const db = require('../db');

// @route   GET /api/public/pulse
// @desc    Public state industrial pulse data (for Home page)
// @access  Public
router.get('/pulse', async (req, res) => {
    try {
        const mockPulse = {
            landBank: '11,550',
            landBank_unit: 'acres',
            activeParkCount: 8,
            totalInvestment: '24,500',
            totalInvestment_unit: 'Cr',
            totalEmployment: '145,000',
            parks: [
                { id: 1, name: 'Oragadam', lat: 12.7950, lng: 79.9880, industries: 187, available_plots: 42 },
                { id: 2, name: 'Sriperumbudur', lat: 12.9716, lng: 79.9407, industries: 156, available_plots: 28 },
                { id: 3, name: 'Hosur', lat: 12.7409, lng: 77.8253, industries: 143, available_plots: 35 },
                { id: 4, name: 'Siruseri', lat: 12.8231, lng: 80.2218, industries: 95, available_plots: 8 },
                { id: 5, name: 'Gangaikondan', lat: 8.5672, lng: 77.7906, industries: 34, available_plots: 78 },
                { id: 6, name: 'Vallam-Vadagal', lat: 12.7500, lng: 79.8900, industries: 18, available_plots: 65 },
                { id: 7, name: 'Pillaipakkam', lat: 12.6800, lng: 79.9200, industries: 12, available_plots: 45 },
                { id: 8, name: 'Cheyyar', lat: 12.6619, lng: 79.5436, industries: 5, available_plots: 120 },
            ],
            highlights: [
                { id: 1, title: 'Rs. 500 Cr investment by Tata Electronics in Hosur', category: 'Investment', date: '2026-04-10' },
                { id: 2, title: 'New 200-acre expansion approved for Oragadam Phase III', category: 'Development', date: '2026-04-08' },
                { id: 3, title: 'Siruseri IT Park achieves 94% occupancy milestone', category: 'Milestone', date: '2026-04-05' },
            ]
        };
        res.json(mockPulse);
    } catch (err) {
        console.error('Public Pulse Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
