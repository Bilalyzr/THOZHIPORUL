const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');

// @route   GET /api/parks
// @desc    List all industrial parks (public summary)
// @access  Public
router.get('/', async (req, res) => {
    try {
        // const { rows } = await db.query('SELECT * FROM industrial_parks ORDER BY name');

        const mockParks = [
            { id: 1, name: 'Oragadam Industrial Park', code: 'ORGDM', district: 'Kancheepuram', total_area_acres: 2500, available_area_acres: 340, latitude: 12.7950, longitude: 79.9880, status: 'active', infrastructure_score: 94, total_industries: 187, total_investment_cr: 4200, total_employment: 23400 },
            { id: 2, name: 'Sriperumbudur Industrial Park', code: 'SRPBR', district: 'Kancheepuram', total_area_acres: 1800, available_area_acres: 220, latitude: 12.9716, longitude: 79.9407, status: 'active', infrastructure_score: 91, total_industries: 156, total_investment_cr: 3800, total_employment: 19800 },
            { id: 3, name: 'Hosur Industrial Park', code: 'HOSUR', district: 'Krishnagiri', total_area_acres: 2100, available_area_acres: 280, latitude: 12.7409, longitude: 77.8253, status: 'active', infrastructure_score: 88, total_industries: 143, total_investment_cr: 3200, total_employment: 18500 },
            { id: 4, name: 'Siruseri IT Park', code: 'SIRUS', district: 'Chengalpattu', total_area_acres: 800, available_area_acres: 50, latitude: 12.8231, longitude: 80.2218, status: 'active', infrastructure_score: 92, total_industries: 95, total_investment_cr: 5600, total_employment: 42000 },
            { id: 5, name: 'Gangaikondan Industrial Park', code: 'GNGKN', district: 'Tirunelveli', total_area_acres: 1200, available_area_acres: 600, latitude: 8.5672, longitude: 77.7906, status: 'active', infrastructure_score: 72, total_industries: 34, total_investment_cr: 850, total_employment: 4200 },
            { id: 6, name: 'Vallam-Vadagal Industrial Park', code: 'VLMVD', district: 'Kancheepuram', total_area_acres: 950, available_area_acres: 550, latitude: 12.7500, longitude: 79.8900, status: 'under_development', infrastructure_score: 65, total_industries: 18, total_investment_cr: 420, total_employment: 2100 },
            { id: 7, name: 'Pillaipakkam Industrial Park', code: 'PLLPK', district: 'Kancheepuram', total_area_acres: 700, available_area_acres: 350, latitude: 12.6800, longitude: 79.9200, status: 'under_development', infrastructure_score: 58, total_industries: 12, total_investment_cr: 280, total_employment: 1400 },
            { id: 8, name: 'Cheyyar Industrial Park', code: 'CHEYR', district: 'Tiruvannamalai', total_area_acres: 1500, available_area_acres: 1200, latitude: 12.6619, longitude: 79.5436, status: 'proposed', infrastructure_score: 35, total_industries: 5, total_investment_cr: 120, total_employment: 600 },
        ];

        res.json(mockParks);
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

        const mockParkDetail = {
            id: parkId,
            name: 'Oragadam Industrial Park',
            code: 'ORGDM',
            district: 'Kancheepuram',
            total_area_acres: 2500,
            developed_area_acres: 2200,
            available_area_acres: 340,
            latitude: 12.7950,
            longitude: 79.9880,
            status: 'active',
            infrastructure_score: 94,
            established_year: 1997,
            total_industries: 187,
            total_investment_cr: 4200,
            total_employment: 23400,
            water_capacity_kl: 5000,
            power_capacity_mw: 250,
            road_connectivity_km: 45,
            nearest_port: 'Chennai Port (65 km)',
            nearest_airport: 'Chennai International (42 km)',
            current_metrics: {
                water_available_kl: 5000,
                water_consumed_kl: 3900,
                power_available_mw: 250,
                power_consumed_mw: 212,
                effluent_treated_kl: 2800
            }
        };

        res.json(mockParkDetail);
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
        const mockPlots = [
            { id: 1, plot_number: 'A-101', area_acres: 5.0, status: 'allotted', zone_type: 'Industrial', allottee: 'ABC Industries' },
            { id: 2, plot_number: 'A-102', area_acres: 3.5, status: 'available', zone_type: 'Industrial', allottee: null },
            { id: 3, plot_number: 'A-103', area_acres: 8.0, status: 'allotted', zone_type: 'Industrial', allottee: 'XYZ Manufacturing' },
            { id: 4, plot_number: 'B-201', area_acres: 2.0, status: 'available', zone_type: 'IT', allottee: null },
            { id: 5, plot_number: 'B-202', area_acres: 4.5, status: 'reserved', zone_type: 'IT', allottee: null },
            { id: 6, plot_number: 'C-301', area_acres: 10.0, status: 'under_construction', zone_type: 'Mixed', allottee: 'PQR Auto' },
        ];
        res.json(mockPlots);
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
        const mockMetrics = [
            { recorded_date: '2026-01-01', water_consumed_kl: 3200, power_consumed_mw: 195, effluent_treated_kl: 2400 },
            { recorded_date: '2026-02-01', water_consumed_kl: 3500, power_consumed_mw: 205, effluent_treated_kl: 2600 },
            { recorded_date: '2026-03-01', water_consumed_kl: 3900, power_consumed_mw: 212, effluent_treated_kl: 2800 },
        ];
        res.json(mockMetrics);
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
        const ids = (req.query.ids || '').split(',').map(Number);
        const mockComparison = [
            { id: 1, name: 'Oragadam', total_area_acres: 2500, available_area_acres: 340, total_industries: 187, infrastructure_score: 94, total_investment_cr: 4200 },
            { id: 3, name: 'Hosur', total_area_acres: 2100, available_area_acres: 280, total_industries: 143, infrastructure_score: 88, total_investment_cr: 3200 },
        ];
        res.json(mockComparison);
    } catch (err) {
        console.error('Park Compare Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
