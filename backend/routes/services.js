const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');

// @route   GET /api/services
// @desc    List service requests (filtered by role)
// @access  Private
router.get('/', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const userRole = req.user.role;
        // Industry sees only their own; admin/govt see all
        // const query = userRole === 'industry'
        //   ? 'SELECT sr.*, ip.company_name FROM service_requests sr JOIN industry_profiles ip ON sr.industry_id = ip.id WHERE sr.industry_id = $1'
        //   : 'SELECT sr.*, ip.company_name FROM service_requests sr JOIN industry_profiles ip ON sr.industry_id = ip.id';

        const mockRequests = [
            { id: 1, reference_number: 'SR-2026-0045', service_type: 'noc_fire', company_name: 'ABC Industries', current_status: 'field_inspection', priority: 'normal', applied_date: '2026-03-15', expected_completion: '2026-04-30', assigned_officer: 'Mr. Kumar' },
            { id: 2, reference_number: 'SR-2026-0044', service_type: 'land_allotment', company_name: 'ABC Industries', current_status: 'document_review', priority: 'high', applied_date: '2026-03-10', expected_completion: '2026-05-15', assigned_officer: 'Ms. Priya' },
            { id: 3, reference_number: 'SR-2026-0043', service_type: 'water_connection', company_name: 'XYZ Manufacturing', current_status: 'completed', priority: 'normal', applied_date: '2026-02-20', expected_completion: '2026-03-20', actual_completion: '2026-03-18', assigned_officer: 'Mr. Rajan' },
            { id: 4, reference_number: 'SR-2026-0042', service_type: 'power_connection', company_name: 'LMN Textiles', current_status: 'pending_approval', priority: 'urgent', applied_date: '2026-02-01', expected_completion: '2026-03-15', assigned_officer: 'Mr. Kumar' },
            { id: 5, reference_number: 'SR-2026-0041', service_type: 'lease_renewal', company_name: 'PQR Auto Parts', current_status: 'approved', priority: 'normal', applied_date: '2026-01-15', expected_completion: '2026-02-28', actual_completion: '2026-02-25', assigned_officer: 'Ms. Priya' },
        ];

        res.json(mockRequests);
    } catch (err) {
        console.error('Fetch Services Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/services
// @desc    Create new service request
// @access  Private (Industry)
router.post('/', requireRole(['industry']), async (req, res) => {
    try {
        const { serviceType, priority, remarks } = req.body;
        const industryId = req.user.profile_id || 101;

        // Generate reference number
        const refNumber = `SR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;

        console.log(`[DB Mock] Service request ${refNumber} created: ${serviceType} by industry ${industryId}`);
        res.status(201).json({ msg: 'Service request submitted successfully', reference_number: refNumber });
    } catch (err) {
        console.error('Create Service Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/services/:id
// @desc    Get request detail with milestones
// @access  Private
router.get('/:id', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const mockDetail = {
            id: parseInt(req.params.id),
            reference_number: 'SR-2026-0045',
            service_type: 'noc_fire',
            company_name: 'ABC Industries',
            current_status: 'field_inspection',
            priority: 'normal',
            applied_date: '2026-03-15',
            expected_completion: '2026-04-30',
            assigned_officer: 'Mr. Kumar',
            remarks: 'New unit expansion requires updated fire safety NOC',
            milestones: [
                { id: 1, stage_name: 'Application Received', status: 'completed', started_at: '2026-03-15', completed_at: '2026-03-15', sort_order: 1 },
                { id: 2, stage_name: 'Document Review', status: 'completed', started_at: '2026-03-16', completed_at: '2026-03-18', sort_order: 2 },
                { id: 3, stage_name: 'Field Inspection', status: 'in_progress', started_at: '2026-03-20', completed_at: null, sort_order: 3 },
                { id: 4, stage_name: 'Pending Approval', status: 'pending', started_at: null, completed_at: null, sort_order: 4 },
                { id: 5, stage_name: 'NOC Issued', status: 'pending', started_at: null, completed_at: null, sort_order: 5 },
            ]
        };

        res.json(mockDetail);
    } catch (err) {
        console.error('Service Detail Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/services/:id/status
// @desc    Update service request status
// @access  Private (Admin, Govt)
router.put('/:id/status', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { status, remarks } = req.body;
        console.log(`[DB Mock] Service ${req.params.id} status updated to: ${status}`);
        res.json({ msg: 'Service request status updated' });
    } catch (err) {
        console.error('Update Service Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/services/bottlenecks
// @desc    Get overdue service requests
// @access  Private (Admin, Govt)
router.get('/bottlenecks', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const mockBottlenecks = [
            { id: 4, reference_number: 'SR-2026-0042', service_type: 'power_connection', company_name: 'LMN Textiles', days_overdue: 28, current_status: 'pending_approval', assigned_officer: 'Mr. Kumar' },
        ];
        res.json(mockBottlenecks);
    } catch (err) {
        console.error('Bottleneck Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
