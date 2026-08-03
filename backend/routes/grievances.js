const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');

// ============================================================
// @route   GET /api/grievances
// @desc    List all grievances (newest first)
// @access  Private (Admin, Govt) — official review view
// ============================================================
router.get('/', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT id, title, location, name, description, status, submitted_at
             FROM grievances
             ORDER BY submitted_at DESC, id DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error('Grievances List Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   POST /api/grievances
// @desc    Submit a new grievance
// @access  Public (citizens submit grievances)
// ============================================================
router.post('/', async (req, res) => {
    try {
        // Extract only allowed fields to prevent mass assignment vulnerability
        const { title, location, name, description } = req.body;

        if (!title || !location) {
            return res.status(400).json({ error: 'Title and location are required' });
        }

        // Enhancement (Module 10): generate a trackable reference number,
        // a quick sentiment guess, and an SLA deadline. The extra columns
        // are nullable so this still works pre-v3-migration.
        const ref = `GRV-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 8999))}`;
        const sentiment = guessSentiment(`${title} ${description || ''}`);
        const category = classifyCategory(`${title} ${description || ''}`);

        const { rows } = await db.query(
            `INSERT INTO grievances (title, location, name, description, status, reference_number, sentiment, category, sla_deadline)
             VALUES ($1, $2, $3, $4, 'Open', $5, $6, $7, NOW() + INTERVAL '7 days')
             RETURNING id, title, location, name, description, status, submitted_at, reference_number`,
            [title, location, name || 'Anonymous', description || '', ref, sentiment, category]
        );

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Grievance Create Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   PUT /api/grievances/:id/status
// @desc    Update grievance status
// @access  Private (Admin, Govt)
// ============================================================
router.put('/:id/status', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { status } = req.body;

        if (!['Open', 'In Progress', 'Resolved'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Must be Open, In Progress, or Resolved.' });
        }

        const { rows } = await db.query(
            `UPDATE grievances
             SET status = $1
             WHERE id = $2
             RETURNING id, title, location, name, description, status, submitted_at`,
            [status, req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Grievance not found' });
        }

        res.json({ msg: `Grievance status updated to ${status}`, grievance: rows[0] });
    } catch (err) {
        console.error('Update Grievance Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// === MODULE 10 ENHANCEMENTS (additive) ========================
// ============================================================
// Lightweight sentiment + category heuristics. Rule-based (no model
// dependency) — good enough to route and prioritise public grievances.
// ============================================================
function guessSentiment(text) {
    const t = String(text || '').toLowerCase();
    const neg = /(urgent|serious|danger|accident|injured|death|fire|overflow|collapse|unsafe|worst|angry|frustrated|repeated|ignored|cheat|fraud|pollution|toxic|smell|vomiting|sick)/;
    const pos = /(thank|good|appreciate|excellent|happy|satisfied|resolved quickly)/;
    if (neg.test(t)) return 'negative';
    if (pos.test(t)) return 'positive';
    return 'neutral';
}
function classifyCategory(text) {
    const t = String(text || '').toLowerCase();
    if (/(water|sewage|drainage|leak|overflow)/.test(t)) return 'water';
    if (/(road|pothole|street|traffic|signal)/.test(t)) return 'roads';
    if (/(streetlight|street light|lamp|dark|light)/.test(t)) return 'streetlights';
    if (/(fire|safety|hazard|accident|injury)/.test(t)) return 'safety';
    if (/(pollution|effluent|smoke|smell|toxic|waste|garbage)/.test(t)) return 'environment';
    if (/(power|electric|transformer|voltage|current)/.test(t)) return 'power';
    return 'general';
}

// ============================================================
// @route   GET /api/grievances/track/:reference
// @desc    PUBLIC self-service tracking by reference number.
// ============================================================
router.get('/track/:reference', async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT reference_number, title, status, submitted_at, sla_deadline, resolved_at, category, priority
               FROM grievances WHERE reference_number = $1`, [req.params.reference]);
        if (!rows.length) return res.status(404).json({ error: 'No grievance found with that reference number.' });
        res.json(rows[0]);
    } catch (err) {
        console.error('Track Grievance Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   PUT /api/grievances/:id/assign
// @desc    Assign a grievance to a department/officer + set priority.
// @access  Private (Admin, Govt)
// ============================================================
router.put('/:id/assign', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { department, priority, assignedTo } = req.body;
        const upd = await db.query(
            `UPDATE grievances
                SET department = COALESCE($1, department),
                    priority   = COALESCE($2, priority),
                    assigned_to = COALESCE($3, assigned_to)
              WHERE id = $4 RETURNING *`, [department, priority, assignedTo, req.params.id]);
        if (!upd.rows.length) return res.status(404).json({ error: 'Grievance not found' });
        res.json(upd.rows[0]);
    } catch (err) {
        console.error('Assign Grievance Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   POST /api/grievances/:id/feedback
// @desc    Post-resolution feedback/rating from the citizen.
// @access  Public (the citizen has the grievance reference).
// ============================================================
router.post('/:id/feedback', async (req, res) => {
    try {
        const { rating, comment } = req.body;
        if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'rating (1-5) required' });
        const ins = await db.query(
            `INSERT INTO grievance_feedback (grievance_id, rating, comment)
             VALUES ($1,$2,$3)
             ON CONFLICT (grievance_id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment
             RETURNING *`,
            [req.params.id, rating, comment || null]
        );
        res.status(201).json(ins.rows[0]);
    } catch (err) {
        console.error('Grievance Feedback Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/grievances/stats
// @desc    Sentiment + category breakdown for the dashboard.
// @access  Private (Admin, Govt)
// ============================================================
// @route   GET /api/grievances/public-stats
// @desc    Public aggregate counters for the Grievance Portal landing page
//          (resolved count, active inquiries count, avg response time).
//          Returns ONLY public numbers — no PII, no details. Placed BEFORE
//          the /:reference route so it isn't shadowed by the param route.
router.get('/public-stats', async (req, res) => {
    try {
        const resolved = await db.query(`SELECT COUNT(*)::int AS n FROM grievances WHERE status = 'Resolved'`);
        const active = await db.query(`SELECT COUNT(*)::int AS n FROM grievances WHERE status IS DISTINCT FROM 'Resolved'`);
        // Average response time: difference between submitted_at and
        // resolved_at for resolved grievances, in hours.
        const avgHours = await db.query(`
            SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - submitted_at)) / 3600), 0)::numeric(10,1) AS hrs
              FROM grievances
             WHERE status = 'Resolved' AND resolved_at IS NOT NULL
        `);
        res.json({
            resolved: resolved.rows[0].n,
            active: active.rows[0].n,
            avg_response_hours: parseFloat(avgHours.rows[0].hrs) || 0
        });
    } catch (err) {
        console.error('Public Grievance Stats Error:', err.message);
        // Never leak internals on a public endpoint — return zeros so the
        // landing page renders gracefully if the DB is unreachable.
        res.json({ resolved: 0, active: 0, avg_response_hours: 0 });
    }
});

router.get('/stats', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const byCat = await db.query(`SELECT COALESCE(category,'general') AS category, COUNT(*) AS n FROM grievances GROUP BY 1 ORDER BY n DESC`);
        const bySent = await db.query(`SELECT COALESCE(sentiment,'neutral') AS sentiment, COUNT(*) AS n FROM grievances GROUP BY 1`);
        const byStatus = await db.query(`SELECT status, COUNT(*) AS n FROM grievances GROUP BY 1`);
        const overdue = await db.query(`SELECT COUNT(*) AS n FROM grievances WHERE sla_deadline IS NOT NULL AND sla_deadline < NOW() AND status <> 'Resolved'`);
        res.json({
            by_category: byCat.rows,
            by_sentiment: bySent.rows,
            by_status: byStatus.rows,
            overdue: parseInt(overdue.rows[0].n)
        });
    } catch (err) {
        console.error('Grievance Stats Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
