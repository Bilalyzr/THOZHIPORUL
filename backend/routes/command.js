const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');

// @route   GET /api/command/kpis
// @desc    Aggregated KPI cards for Command Center
// @access  Private (Admin, Govt)
router.get('/kpis', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const mockKPIs = {
            total_capex_cr: 24500,
            capex_growth_pct: 4.2,
            total_revenue_cr: 18200,
            revenue_growth_pct: 2.1,
            direct_employment: 89000,
            direct_growth_pct: 1.8,
            indirect_employment: 56000,
            indirect_growth_pct: 3.1,
            red_flags: 12,
            red_flags_change: -2
        };
        res.json(mockKPIs);
    } catch (err) {
        console.error('Command KPIs Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/command/heatmap
// @desc    District-level aggregation for state heatmap
// @access  Private (Admin, Govt)
router.get('/heatmap', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const mockHeatmap = [
            { district: 'Kancheepuram', parks: 4, industries: 373, investment_cr: 8700, employment: 46700 },
            { district: 'Krishnagiri', parks: 1, industries: 143, investment_cr: 3200, employment: 18500 },
            { district: 'Chengalpattu', parks: 1, industries: 95, investment_cr: 5600, employment: 42000 },
            { district: 'Tirunelveli', parks: 1, industries: 34, investment_cr: 850, employment: 4200 },
            { district: 'Tiruvannamalai', parks: 1, industries: 5, investment_cr: 120, employment: 600 },
        ];
        res.json(mockHeatmap);
    } catch (err) {
        console.error('Heatmap Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/command/rankings
// @desc    Park performance rankings
// @access  Private (Admin, Govt)
router.get('/rankings', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const sortBy = req.query.sort || 'infrastructure_score';

        const mockRankings = [
            { rank: 1, name: 'Oragadam', code: 'ORGDM', infrastructure_score: 94, total_industries: 187, total_investment_cr: 4200, total_employment: 23400 },
            { rank: 2, name: 'Siruseri IT Park', code: 'SIRUS', infrastructure_score: 92, total_industries: 95, total_investment_cr: 5600, total_employment: 42000 },
            { rank: 3, name: 'Sriperumbudur', code: 'SRPBR', infrastructure_score: 91, total_industries: 156, total_investment_cr: 3800, total_employment: 19800 },
            { rank: 4, name: 'Hosur', code: 'HOSUR', infrastructure_score: 88, total_industries: 143, total_investment_cr: 3200, total_employment: 18500 },
            { rank: 5, name: 'Gangaikondan', code: 'GNGKN', infrastructure_score: 72, total_industries: 34, total_investment_cr: 850, total_employment: 4200 },
            { rank: 6, name: 'Vallam-Vadagal', code: 'VLMVD', infrastructure_score: 65, total_industries: 18, total_investment_cr: 420, total_employment: 2100 },
            { rank: 7, name: 'Pillaipakkam', code: 'PLLPK', infrastructure_score: 58, total_industries: 12, total_investment_cr: 280, total_employment: 1400 },
            { rank: 8, name: 'Cheyyar', code: 'CHEYR', infrastructure_score: 35, total_industries: 5, total_investment_cr: 120, total_employment: 600 },
        ];

        res.json(mockRankings);
    } catch (err) {
        console.error('Rankings Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/command/alerts
// @desc    Red-flag alerts for command center
// @access  Private (Admin, Govt)
router.get('/alerts', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const mockAlerts = [
            { id: 1, severity: 'critical', category: 'compliance', message: '12 industries missed Q1 2026 data submission deadline', count: 12, action_url: '/compliance-engine' },
            { id: 2, severity: 'high', category: 'infrastructure', message: '3 parks operating below 70% infrastructure capacity', count: 3, action_url: '/parks' },
            { id: 3, severity: 'high', category: 'services', message: '5 NOC service requests overdue by 15+ days', count: 5, action_url: '/services' },
            { id: 4, severity: 'medium', category: 'environmental', message: 'LMN Textiles reported 300% water usage spike', count: 1, action_url: '/compliance-engine' },
            { id: 5, severity: 'low', category: 'registration', message: '8 new industry registration requests pending', count: 8, action_url: '/users' },
        ];
        res.json(mockAlerts);
    } catch (err) {
        console.error('Alerts Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/command/trends
// @desc    Historical trend data for charts
// @access  Private (Admin, Govt)
router.get('/trends', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const metric = req.query.metric || 'investment';

        const mockTrends = {
            investment: [
                { year: 2021, value: 16800 },
                { year: 2022, value: 18500 },
                { year: 2023, value: 20200 },
                { year: 2024, value: 22100 },
                { year: 2025, value: 24500 },
            ],
            employment: [
                { year: 2021, value: 112000 },
                { year: 2022, value: 121000 },
                { year: 2023, value: 130000 },
                { year: 2024, value: 138000 },
                { year: 2025, value: 145000 },
            ]
        };

        res.json(mockTrends[metric] || mockTrends.investment);
    } catch (err) {
        console.error('Trends Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/command/activity-feed
// @desc    Recent system-wide activity feed
// @access  Private (Admin, Govt)
router.get('/activity-feed', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const mockFeed = [
            { id: 1, type: 'submission', message: 'ABC Industries submitted Q1 2026 data', severity: 'info', timestamp: '2026-04-12T10:30:00' },
            { id: 2, type: 'violation', message: 'LMN Textiles flagged for water usage spike', severity: 'warning', timestamp: '2026-04-12T09:15:00' },
            { id: 3, type: 'registration', message: 'Sunrise Foods completed registration', severity: 'info', timestamp: '2026-04-11T16:45:00' },
            { id: 4, type: 'service', message: 'NOC Fire Safety approved for PQR Auto', severity: 'success', timestamp: '2026-04-11T14:20:00' },
            { id: 5, type: 'compliance', message: 'Monthly compliance scores recalculated', severity: 'info', timestamp: '2026-04-10T08:00:00' },
        ];
        res.json(mockFeed);
    } catch (err) {
        console.error('Activity Feed Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
