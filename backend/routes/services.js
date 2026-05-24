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
        const profileId = req.user.profile_id;

        let queryText = `
            SELECT sr.*, ip.company_name, p.name as park_name 
            FROM service_requests sr 
            JOIN industry_profiles ip ON sr.industry_id = ip.id
            LEFT JOIN industrial_parks p ON sr.park_id = p.id
        `;
        let params = [];

        if (userRole === 'industry') {
            queryText += ' WHERE sr.industry_id = $1';
            params.push(profileId);
        }

        queryText += ' ORDER BY sr.applied_date DESC';

        const { rows } = await db.query(queryText, params);
        res.json(rows);
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
        const { serviceType, priority, remarks, parkId, requestedArea } = req.body;
        const industryId = req.user.profile_id;

        if (!industryId) {
            return res.status(400).json({ error: 'Industry profile not found. Please complete your profile first.' });
        }

        if (!serviceType) {
            return res.status(400).json({ error: 'Service type is required' });
        }

        // Validate parkId if provided
        if (parkId) {
            const parkCheck = await db.query('SELECT id FROM industrial_parks WHERE id = $1', [parkId]);
            if (parkCheck.rows.length === 0) {
                return res.status(400).json({ error: 'Invalid park selected' });
            }
        }

        // Generate reference number
        const refNumber = `SR-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 8999))}`;

        const queryText = `
            INSERT INTO service_requests (industry_id, park_id, service_type, reference_number, requested_area_acres, priority, remarks)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const { rows } = await db.query(queryText, [
            industryId, parkId || null, serviceType, refNumber, requestedArea || null, priority || 'normal', remarks || ''
        ]);

        res.status(201).json({ msg: 'Service request submitted successfully', request: rows[0] });
    } catch (err) {
        console.error('Create Service Error:', err);
        console.error('Error details:', err.message, err.stack);

        // Handle specific database errors
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Reference number conflict. Please try again.' });
        }
        if (err.code === '23503') {
            return res.status(400).json({ error: 'Invalid reference: park or industry not found' });
        }
        if (err.code === '23502') {
            return res.status(400).json({ error: 'Missing required field: ' + err.column });
        }
        if (err.code === '22P02') {
            return res.status(400).json({ error: 'Invalid data format for a field' });
        }

        res.status(500).json({ error: err.message || 'Failed to submit service request. Please try again.' });
    }
});

// @route   GET /api/services/:id
// @desc    Get request detail
// @access  Private
router.get('/:id', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const requestId = parseInt(req.params.id);
        const { rows } = await db.query(`
            SELECT sr.*, ip.company_name, p.name as park_name 
            FROM service_requests sr 
            JOIN industry_profiles ip ON sr.industry_id = ip.id
            LEFT JOIN industrial_parks p ON sr.park_id = p.id
            WHERE sr.id = $1
        `, [requestId]);

        if (rows.length === 0) return res.status(404).json({ error: 'Request not found' });
        
        res.json(rows[0]);
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
        const requestId = req.params.id;

        await db.query(
            'UPDATE service_requests SET current_status = $1, remarks = COALESCE($2, remarks), updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [status, remarks, requestId]
        );

        res.json({ msg: 'Service request status updated' });
    } catch (err) {
        console.error('Update Service Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/services/:id/allot
// @desc    Approve and Allot Plot (Admin only)
// @access  Private (Admin)
router.post('/:id/allot', requireRole(['admin']), async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { plotId } = req.body;
        const requestId = req.params.id;

        await client.query('BEGIN');

        // 1. Get request and industry details
        const reqResult = await client.query('SELECT * FROM service_requests WHERE id = $1', [requestId]);
        if (reqResult.rows.length === 0) throw new Error('Request not found');
        const serviceReq = reqResult.rows[0];

        // 2. Update Plot
        await client.query(
            'UPDATE park_plots SET status = \'allotted\', allottee_industry_id = $1, allotment_date = CURRENT_DATE WHERE id = $2',
            [serviceReq.industry_id, plotId]
        );

        // 3. Update Request Status
        await client.query(
            'UPDATE service_requests SET current_status = \'completed\', remarks = $1, actual_completion = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [`Plot Allotted (Plot ID: ${plotId})`, requestId]
        );

        // 4. Update Industry Profile
        await client.query(
            'UPDATE industry_profiles SET plot_id = $1, park_id = (SELECT park_id FROM park_plots WHERE id = $1) WHERE id = $2',
            [plotId, serviceReq.industry_id]
        );

        await client.query('COMMIT');
        res.json({ msg: 'Plot successfully allotted and request completed' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Allotment Error:', err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
