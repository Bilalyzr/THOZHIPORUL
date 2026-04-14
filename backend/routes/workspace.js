const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');

// @route   GET /api/workspace/overview
// @desc    Combined workspace overview for industry user
// @access  Private (Industry)
router.get('/overview', requireRole(['industry']), async (req, res) => {
    try {
        const industryId = req.user.profile_id || 101;

        const mockOverview = {
            company: {
                name: 'ABC Industries',
                park: 'Oragadam Industrial Park',
                plot: 'A-101',
                since: 2019,
                industry_type: 'Auto Components',
                location: 'Oragadam'
            },
            compliance_score: {
                overall: 78,
                submission: 90,
                environmental: 72,
                financial: 85,
                safety: 65
            },
            quick_stats: {
                employees: 234,
                investment_cr: 45,
                power_usage_kwh: 125,
                water_usage_kl: 89
            },
            lease: {
                status: 'Active',
                start_date: '2019-04-01',
                end_date: '2035-03-31',
                monthly_amount: 240000,
                plot_area_acres: 5.0
            },
            pending_tasks: [
                { id: 1, title: 'Q1 2026 Data Submission', due_date: '2026-04-15', type: 'submission', priority: 'high' },
                { id: 2, title: 'Fire NOC Renewal', due_date: '2026-05-01', type: 'document', priority: 'medium' },
                { id: 3, title: 'Pollution Certificate Expiring', due_date: '2026-08-15', type: 'document', priority: 'low' },
            ],
            compliance_notices: [
                { id: 1, severity: 'warning', message: 'Water usage increased 40% from last quarter', date: '2026-04-10' },
                { id: 2, severity: 'info', message: 'New quarterly reporting format effective Q2 2026', date: '2026-04-05' },
            ],
            service_summary: {
                applied: 1,
                in_review: 1,
                approved: 0,
                completed: 5
            }
        };

        res.json(mockOverview);
    } catch (err) {
        console.error('Workspace Overview Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/workspace/compliance-score
// @desc    Detailed compliance breakdown with history
// @access  Private (Industry)
router.get('/compliance-score', requireRole(['industry']), async (req, res) => {
    try {
        const mockScore = {
            current: { overall: 78, submission: 90, environmental: 72, financial: 85, safety: 65 },
            history: [
                { month: '2025-10', overall: 72 },
                { month: '2025-11', overall: 74 },
                { month: '2025-12', overall: 75 },
                { month: '2026-01', overall: 76 },
                { month: '2026-02', overall: 77 },
                { month: '2026-03', overall: 78 },
            ],
            tips: [
                'Submit Q1 data before deadline to maintain submission score',
                'Renew Fire NOC before May to improve safety score',
                'Reduce water consumption to improve environmental score'
            ]
        };
        res.json(mockScore);
    } catch (err) {
        console.error('Compliance Score Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/workspace/documents
// @desc    Document vault list for industry
// @access  Private (Industry)
router.get('/documents', requireRole(['industry']), async (req, res) => {
    try {
        const mockDocuments = [
            { id: 1, category: 'gst_certificate', file_name: 'gst_2026.pdf', expiry_date: '2026-12-31', verified: true, file_size_kb: 245, uploaded_at: '2026-01-15' },
            { id: 2, category: 'fire_noc', file_name: 'fire_noc_2025.pdf', expiry_date: '2026-05-01', verified: true, file_size_kb: 180, uploaded_at: '2025-05-10' },
            { id: 3, category: 'pollution_clearance', file_name: 'pcb_cert_2025.pdf', expiry_date: '2026-08-15', verified: true, file_size_kb: 320, uploaded_at: '2025-08-20' },
            { id: 4, category: 'lease_agreement', file_name: 'lease_agreement.pdf', expiry_date: null, verified: true, file_size_kb: 1200, uploaded_at: '2019-04-01' },
            { id: 5, category: 'incorporation', file_name: 'company_registration.pdf', expiry_date: null, verified: true, file_size_kb: 450, uploaded_at: '2019-03-15' },
        ];
        res.json(mockDocuments);
    } catch (err) {
        console.error('Documents Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/workspace/documents
// @desc    Upload new document
// @access  Private (Industry)
router.post('/documents', requireRole(['industry']), async (req, res) => {
    try {
        const { category, fileName, expiryDate } = req.body;
        console.log(`[DB Mock] Document uploaded: ${fileName} (${category})`);
        res.status(201).json({ msg: 'Document uploaded successfully', id: Date.now() });
    } catch (err) {
        console.error('Document Upload Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/workspace/lease
// @desc    Lease details for industry
// @access  Private (Industry)
router.get('/lease', requireRole(['industry']), async (req, res) => {
    try {
        const mockLease = {
            plot_number: 'A-101',
            park_name: 'Oragadam Industrial Park',
            area_acres: 5.0,
            zone_type: 'Industrial',
            lease_start: '2019-04-01',
            lease_end: '2035-03-31',
            monthly_amount: 240000,
            total_paid: 17280000,
            next_payment_due: '2026-05-01',
            payment_status: 'Current'
        };
        res.json(mockLease);
    } catch (err) {
        console.error('Lease Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
