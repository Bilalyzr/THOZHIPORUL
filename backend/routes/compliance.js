const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');

// @route   GET /api/compliance/overview
// @desc    Summary compliance cards
// @access  Private (Admin, Govt)
router.get('/overview', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const mockOverview = {
            compliant: { count: 892, percentage: 76.8 },
            warning: { count: 156, percentage: 13.4 },
            violation: { count: 45, percentage: 3.9 },
            missing: { count: 67, percentage: 5.8 },
            total_industries: 1160
        };
        res.json(mockOverview);
    } catch (err) {
        console.error('Compliance Overview Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/compliance/violations
// @desc    Paginated violation list
// @access  Private (Admin, Govt)
router.get('/violations', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { severity, status, page = 1, limit = 20 } = req.query;

        const mockViolations = [
            { id: 1, company_name: 'XYZ Manufacturing', rule_code: 'SUB-Q', rule_name: 'Quarterly Submission', severity: 'high', status: 'open', violation_date: '2026-04-01', description: 'Missed Q1 2026 quarterly submission deadline' },
            { id: 2, company_name: 'LMN Textiles', rule_code: 'ENV-WAT', rule_name: 'Water Usage Threshold', severity: 'critical', status: 'open', violation_date: '2026-03-28', description: 'Water consumption exceeded limit by 300%' },
            { id: 3, company_name: 'PQR Auto Parts', rule_code: 'FIN-INV', rule_name: 'Investment Declaration', severity: 'medium', status: 'acknowledged', violation_date: '2026-03-15', description: 'Investment change >10% not declared' },
            { id: 4, company_name: 'Sunrise Foods', rule_code: 'SAF-NOC', rule_name: 'Fire Safety NOC', severity: 'high', status: 'resolving', violation_date: '2026-02-28', description: 'Fire safety NOC expired without renewal' },
            { id: 5, company_name: 'Delta Pharma', rule_code: 'ENV-WST', rule_name: 'Waste Management', severity: 'medium', status: 'open', violation_date: '2026-03-20', description: 'Waste recycling rate dropped below 60% threshold' },
        ];

        res.json({
            violations: mockViolations,
            total: 45,
            page: parseInt(page),
            totalPages: 3
        });
    } catch (err) {
        console.error('Violations List Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/compliance/violations/:id
// @desc    Update violation status (acknowledge, escalate, resolve)
// @access  Private (Admin)
router.put('/violations/:id', requireRole(['admin']), async (req, res) => {
    try {
        const { status, notes } = req.body;
        console.log(`[DB Mock] Violation ${req.params.id} status updated to: ${status}`);
        res.json({ msg: 'Violation status updated' });
    } catch (err) {
        console.error('Update Violation Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/compliance/missing-submissions
// @desc    Industries that have not submitted for current period
// @access  Private (Admin, Govt)
router.get('/missing-submissions', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const mockMissing = [
            { id: 102, company_name: 'XYZ Manufacturing', location: 'Sriperumbudur', last_submission: '2025-10-12', periods_missed: 2 },
            { id: 105, company_name: 'Delta Pharma', location: 'Hosur', last_submission: '2025-07-20', periods_missed: 3 },
            { id: 108, company_name: 'Star Electronics', location: 'Oragadam', last_submission: '2026-01-05', periods_missed: 1 },
        ];
        res.json({ missing: mockMissing, total: 67, deadline: '2026-04-15' });
    } catch (err) {
        console.error('Missing Submissions Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/compliance/send-reminders
// @desc    Send bulk compliance reminders
// @access  Private (Admin)
router.post('/send-reminders', requireRole(['admin']), async (req, res) => {
    try {
        const { industryIds, message } = req.body;
        console.log(`[DB Mock] Compliance reminders sent to ${(industryIds || []).length} industries`);
        res.json({ msg: `Reminders sent to ${(industryIds || []).length} industries` });
    } catch (err) {
        console.error('Send Reminders Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/compliance/trends
// @desc    Compliance score trends over time
// @access  Private (Admin, Govt)
router.get('/trends', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const mockTrends = [
            { month: '2025-07', avg_score: 71.2, compliant_pct: 68.5 },
            { month: '2025-08', avg_score: 72.5, compliant_pct: 70.1 },
            { month: '2025-09', avg_score: 73.1, compliant_pct: 71.8 },
            { month: '2025-10', avg_score: 74.8, compliant_pct: 73.2 },
            { month: '2025-11', avg_score: 75.2, compliant_pct: 74.0 },
            { month: '2025-12', avg_score: 75.9, compliant_pct: 74.8 },
            { month: '2026-01', avg_score: 76.5, compliant_pct: 75.5 },
            { month: '2026-02', avg_score: 77.1, compliant_pct: 76.2 },
            { month: '2026-03', avg_score: 77.8, compliant_pct: 76.8 },
        ];
        res.json(mockTrends);
    } catch (err) {
        console.error('Compliance Trends Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/compliance/predictions
// @desc    Projected growth metrics
// @access  Private (Admin, Govt)
router.get('/predictions', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const mockPredictions = [
            { metric: 'Total Investment', current: '24,500 Cr', projected_1yr: '28,200 Cr', growth_pct: 15.1 },
            { metric: 'Employment', current: '145,000', projected_1yr: '162,000', growth_pct: 11.7 },
            { metric: 'Compliance Rate', current: '76.8%', projected_1yr: '82.3%', growth_pct: 5.5 },
            { metric: 'Active Industries', current: '1,160', projected_1yr: '1,340', growth_pct: 15.5 },
        ];
        res.json(mockPredictions);
    } catch (err) {
        console.error('Predictions Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/compliance/by-category
// @desc    Violations grouped by category
// @access  Private (Admin, Govt)
router.get('/by-category', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const mockByCategory = [
            { category: 'submission', count: 18, percentage: 40 },
            { category: 'environmental', count: 12, percentage: 26.7 },
            { category: 'safety', count: 9, percentage: 20 },
            { category: 'financial', count: 6, percentage: 13.3 },
        ];
        res.json(mockByCategory);
    } catch (err) {
        console.error('By Category Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
