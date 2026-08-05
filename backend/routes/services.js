const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');

// ============================================================
// MILESTONE TEMPLATES per service type.
// When a service request is created, these stages are auto-seeded
// into service_milestones so the timeline stepper has content.
// The first stage is marked 'pending'; the rest stay 'pending'
// until an officer advances them via PUT /:id/milestones/:mid.
// ============================================================
const MILESTONE_TEMPLATES = {
    land_allotment: [
        'Application Received',
        'Document Verification',
        'Eligibility Scrutiny',
        'Plot Identification & Allotment',
        'Allotment Letter Issued',
        'Lease Agreement Execution',
        'Possession Handed Over'
    ],
    water_connection: [
        'Application Received',
        'Document Verification',
        'Site Inspection',
        'Estimate & Fee Approval',
        'Connection Sanctioned',
        'Meter Installation & Activation'
    ],
    power_connection: [
        'Application Received',
        'Document Verification',
        'Load Assessment',
        'Estimate & Fee Approval',
        'TANGEDCO Coordination',
        'Energization & Meter Sealing'
    ],
    noc_fire: [
        'Application Received',
        'Document Verification',
        'Site Inspection',
        'Compliance Review',
        'NOC Issued'
    ],
    noc_pollution: [
        'Application Received',
        'Document Verification',
        'Site Inspection',
        'TNPCB Review',
        'Consent Order Issued'
    ],
    building_approval: [
        'Application Received',
        'Plan Scrutiny',
        'Site Inspection',
        'Approval Committee Review',
        'Building Plan Sanctioned'
    ],
    lease_renewal: [
        'Application Received',
        'Compliance & Dues Check',
        'Eligibility Review',
        'Renewal Sanctioned',
        'Lease Deed Updated'
    ],
    transfer_request: [
        'Application Received',
        'Document Verification',
        'Dues & Compliance Clearance',
        'Transfer Committee Approval',
        'Transfer Completed'
    ]
};
const DEFAULT_MILESTONES = ['Application Received', 'Under Review', 'Approval', 'Completed'];

// Seed the milestone timeline for a freshly-created request.
// Idempotent: only inserts if the request has no milestones yet.
async function seedMilestones(client, requestId, serviceType) {
    try {
        const existing = await client.query(
            'SELECT 1 FROM service_milestones WHERE request_id = $1 LIMIT 1', [requestId]
        );
        if (existing.rows.length) return; // already seeded

        const stages = MILESTONE_TEMPLATES[serviceType] || DEFAULT_MILESTONES;
        let order = 1;
        for (const stage of stages) {
            await client.query(
                `INSERT INTO service_milestones (request_id, stage_name, status, sort_order)
                 VALUES ($1, $2, 'pending', $3)`,
                [requestId, stage, order++]
            );
        }
    } catch (_) { /* service_milestones table absent — skip gracefully */ }
}

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

        // Enhancement (Quick Win 2): set SLA deadline + generate a public
        // tracking token. Wrapped so the original flow is unaffected if the
        // v3 migration hasn't been applied yet.
        try {
            const client = await db.pool.connect();
            try {
                await ensureSla(client, rows[0].id, serviceType);
                // Seed the milestone timeline stepper (land_allotment gets a
                // 7-stage timeline, others get their own template).
                await seedMilestones(client, rows[0].id, serviceType);
            }
            finally { client.release(); }
        } catch (_) { /* sla table missing — skip gracefully */ }

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

        console.error('Service Request Error:', err.message);
        res.status(500).json({ error: 'Failed to submit service request. Please try again.' });
    }
});

// @route   GET /api/services/bottlenecks
// @desc    Service-request bottlenecks by stage (pending requests + avg age)
// @access  Private (Admin, Govt)
// NOTE: must be defined BEFORE /:id so 'bottlenecks' isn't parsed as an id.
router.get('/bottlenecks', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT
                current_status AS stage,
                COUNT(*)::int AS count,
                COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - applied_date)) / 86400)), 0)::int AS avg_age_days
            FROM service_requests
            WHERE current_status NOT IN ('completed', 'approved', 'rejected')
            GROUP BY current_status
            ORDER BY count DESC
        `);
        const total = rows.reduce((sum, r) => sum + (parseInt(r.count) || 0), 0);
        res.json({ bottlenecks: rows, total });
    } catch (err) {
        console.error('Bottlenecks Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// STATIC PATHS — must be registered BEFORE /:id so Express doesn't
// match "sla-definitions", "officer-analytics", or "track" as an :id.
// ============================================================

// @route   GET /api/services/sla-definitions
router.get('/sla-definitions', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        // service_sla_definitions is a v3 table. Return [] if absent so the UI
        // shows "no SLA configured" rather than erroring.
        const exists = await db.query(`SELECT to_regclass('public.service_sla_definitions') AS e`);
        if (!exists.rows.length || !exists.rows[0].e) return res.json([]);
        const { rows } = await db.query(
            'SELECT service_type, sla_days, deemed_approval, checklist FROM service_sla_definitions ORDER BY service_type'
        );
        res.json(rows);
    } catch (err) {
        console.error('SLA Definitions Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/services/officer-analytics
router.get('/officer-analytics', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        // service_tat_log is a v3 table. Return an empty list if it's absent
        // rather than 500ing — the page just shows "no data yet".
        const exists = await db.query(`SELECT to_regclass('public.service_tat_log') AS e`);
        if (!exists.rows.length || !exists.rows[0].e) return res.json([]);
        const { rows } = await db.query(`
            SELECT t.officer_id,
                   u.name AS officer_name,
                   COUNT(*) AS actions,
                   ROUND(AVG(t.duration_hours), 1) AS avg_hours,
                   ROUND(MAX(t.duration_hours), 1) AS max_hours
              FROM service_tat_log t
              LEFT JOIN users u ON u.id = t.officer_id
             WHERE t.officer_id IS NOT NULL
          GROUP BY t.officer_id, u.name
          ORDER BY avg_hours DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error('Officer Analytics Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/services/track/:token
// @desc    PUBLIC applicant self-service tracking by reference token.
//          No auth required — the token is the secret.
// ============================================================
router.get('/track/:token', async (req, res) => {
    try {
        // Public tracking requires the v3 columns (public_tracking_token etc.).
        // If the migration isn't applied, fail gracefully instead of 500ing.
        const hasTracking = await hasServiceV3Cols();
        if (!hasTracking) {
            return res.status(501).json({
                error: 'Public tracking is not available on this instance (requires the v3 service columns).'
            });
        }
        const sr = await db.query(`
            SELECT sr.reference_number, sr.service_type, sr.current_status,
                   sr.applied_date, sr.expected_completion, sr.actual_completion,
                   sr.sla_deadline, sr.deemed_approved
              FROM service_requests sr
             WHERE sr.public_tracking_token = $1`, [req.params.token]);
        if (!sr.rows.length) return res.status(404).json({ error: 'Invalid tracking link' });

        const milestones = await db.query(
            `SELECT stage_name, status, started_at, completed_at
               FROM service_milestones
              WHERE request_id = (SELECT id FROM service_requests WHERE public_tracking_token = $1)
           ORDER BY sort_order, id`,
            [req.params.token]
        );
        res.json({ ...sr.rows[0], milestones: milestones.rows });
    } catch (err) {
        console.error('Public Track Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/services/:id
// @desc    Get request detail
// @access  Private
router.get('/:id', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const requestId = parseInt(req.params.id);
        if (isNaN(requestId)) return res.status(404).json({ error: 'Request not found' });
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

// ============================================================
// === ENHANCEMENTS (Quick Win 2 + Module 3) — additive =======
// ============================================================
// The endpoints below are NEW. The existing GET/POST/PUT above are
// unchanged. These power: SLA countdown, deemed-approval state,
// visual milestone timeline (stepper), required document checklist,
// officer TAT analytics, and public reference-number tracking.
// ============================================================

// ------------------------------------------------------------
// Detect whether the v3 enhancement columns exist on
// service_requests (sla_deadline, deemed_approved, escalation_state,
// public_tracking_token). Cached after first probe. Enhancement
// endpoints must keep working (or fail gracefully) when the v3
// migration hasn't been applied — otherwise they 500.
// ------------------------------------------------------------
let _serviceV3ColsCache = null;
async function hasServiceV3Cols() {
    if (_serviceV3ColsCache !== null) return _serviceV3ColsCache;
    try {
        const { rows } = await db.query(
            `SELECT column_name FROM information_schema.columns
              WHERE table_name = 'service_requests' AND column_name IN
                    ('sla_deadline','deemed_approved','escalation_state','public_tracking_token')`
        );
        _serviceV3ColsCache = rows.length === 4;
    } catch (_) { _serviceV3ColsCache = false; }
    return _serviceV3ColsCache;
}

// ------------------------------------------------------------
// Helper: set sla_deadline + public token when a request is
// created (we expose it as an idempotent backfill too).
// ------------------------------------------------------------
async function ensureSla(client, requestId, serviceType) {
    const sla = await client.query(
        'SELECT sla_days FROM service_sla_definitions WHERE service_type = $1', [serviceType]
    );
    const days = sla.rows.length ? sla.rows[0].sla_days : 14;
    const crypto = require('crypto');
    const token = crypto.randomBytes(24).toString('hex');
    await client.query(
        `UPDATE service_requests
            SET sla_deadline = applied_date + make_interval(days => $1::integer),
                public_tracking_token = COALESCE(public_tracking_token, $2)
          WHERE id = $3 AND sla_deadline IS NULL`,
        [days, token, requestId]
    );
    return { days, token };
}

// ============================================================
// @route   GET /api/services/sla-definitions
// @desc    All service SLA definitions (drives the SLA countdown UI)
// @access  Private (Admin, Govt, Industry)
// ============================================================
// ============================================================
// @route   GET /api/services/:id/timeline
// @desc    Visual milestone timeline (stepper) for a request.
//          Returns the ordered milestones with computed status so the
//          frontend can render a Stepper directly.
// @access  Private (Admin, Govt, Industry — scoped by ownership/role)
// ============================================================
router.get('/:id/timeline', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const enhanced = await hasServiceV3Cols();
        const { rows } = await db.query(`
            SELECT sm.id, sm.stage_name, sm.status, sm.started_at, sm.completed_at,
                   sm.officer_id, sm.notes, sm.sort_order,
                   u.name AS officer_name
              FROM service_milestones sm
              LEFT JOIN users u ON u.id = sm.officer_id
             WHERE sm.request_id = $1
          ORDER BY sm.sort_order ASC, sm.id ASC`, [req.params.id]);

        // Surface the SLA countdown + deemed-approval flag when v3 cols exist.
        const slaSelect = enhanced
            ? 'SELECT reference_number, current_status, applied_date, sla_deadline, deemed_approved, escalation_state FROM service_requests WHERE id = $1'
            : 'SELECT reference_number, current_status, applied_date FROM service_requests WHERE id = $1';
        const req_row = await db.query(slaSelect, [req.params.id]);
        if (!req_row.rows.length) return res.status(404).json({ error: 'Request not found' });

        const now = Date.now();
        const sla = req_row.rows[0];
        const deadline = sla.sla_deadline ? new Date(sla.sla_deadline).getTime() : null;
        const hoursLeft = deadline ? Math.round((deadline - now) / 3600000) : null;
        const breached = deadline ? deadline < now : false;

        res.json({
            reference: sla.reference_number,
            current_status: sla.current_status,
            milestones: rows,
            sla: {
                deadline: sla.sla_deadline,
                hours_left: hoursLeft,
                breached,
                deemed_approved: sla.deemed_approved,
                escalation_state: sla.escalation_state
            }
        });
    } catch (err) {
        console.error('Timeline Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   PUT /api/services/:id/milestones/:mid
// @desc    Advance a single milestone (start / complete / skip) and
//          log turnaround time. Drives the visual timeline.
// @access  Private (Admin, Govt)
// ============================================================
router.put('/:id/milestones/:mid', requireRole(['admin', 'govt']), async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { status, notes } = req.body; // pending, in_progress, completed, skipped
        const valid = ['pending', 'in_progress', 'completed', 'skipped'];
        if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid milestone status' });

        await client.query('BEGIN');

        // Fetch current milestone to compute TAT.
        const cur = await client.query(
            'SELECT status, started_at FROM service_milestones WHERE id = $1 AND request_id = $2',
            [req.params.mid, req.params.id]
        );
        if (!cur.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Milestone not found' }); }

        const prev = cur.rows[0].status;
        const startedAt = status === 'in_progress' && !cur.rows[0].started_at ? new Date() : cur.rows[0].started_at;
        const completedAt = status === 'completed' ? new Date() : null;

        await client.query(
            `UPDATE service_milestones
                SET status = $1, started_at = COALESCE($2, started_at),
                    completed_at = COALESCE($3, completed_at),
                    officer_id = $4, notes = COALESCE($5, notes)
              WHERE id = $6`,
            [status, startedAt, completedAt, req.user.id, notes || null, req.params.mid]
        );

        // TAT log on transition into completed.
        if (status === 'completed' && prev !== 'completed' && startedAt) {
            const hours = Math.round((Date.now() - new Date(startedAt).getTime()) / 3600000);
            await client.query(
                `INSERT INTO service_tat_log (request_id, officer_id, from_status, to_status, duration_hours)
                 VALUES ($1,$2,$3,$4,$5)`,
                [req.params.id, req.user.id, prev, status, hours]
            );
        }

        await client.query('COMMIT');
        res.json({ msg: 'Milestone updated', status });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Milestone Update Error:', err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});

// ============================================================
// @route   GET /api/services/officer-analytics
// @desc    Officer turnaround-time analytics (avg hours per officer).
// @access  Private (Admin, Govt)
// ============================================================
module.exports = router;
