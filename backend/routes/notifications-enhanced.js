// ============================================================
// notifications-enhanced.js — Persistent notifications (Quick Win 5)
//
// Mounted at /api/notifications-v2. The legacy /api/notifications
// route (on-the-fly derived alerts) is UNTOUCHED — both coexist.
// This file adds the persistent layer:
//   • list (with unread filter), mark read, mark-all-read
//   • preference centre (email/sms/portal toggles)
//   • real-time Server-Sent Events stream
//   • digest snapshot
//
// Real-time push is powered by the liveBus EventEmitter in
// services/notify.js — every notify() call fans out to SSE listeners.
// ============================================================

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');
const { liveBus, getPreferences } = require('../services/notify');

// ------------------------------------------------------------
// Helper: get a user's id safely (industry users have id+profile).
// ------------------------------------------------------------
const userId = (req) => req.user && req.user.id;

// ============================================================
// @route   GET /api/notifications-v2
// @desc    List the caller's persistent notifications (newest first).
//          Optional ?unreadOnly=true.
// @access  Private
// ============================================================
router.get('/', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const onlyUnread = req.query.unreadOnly === 'true';
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const where = onlyUnread ? `AND read_at IS NULL` : '';

        const { rows } = await db.query(`
            SELECT id, category, severity, title, message, link, metadata,
                   read_at IS NOT NULL AS is_read, created_at
              FROM notifications
             WHERE user_id = $1
             ${where}
          ORDER BY created_at DESC
             LIMIT $2`, [userId(req), limit]);

        const unread = await db.query(
            'SELECT COUNT(*) AS n FROM notifications WHERE user_id = $1 AND read_at IS NULL',
            [userId(req)]
        );
        res.json({ notifications: rows, unread_count: parseInt(unread.rows[0].n) });
    } catch (err) {
        console.error('List Notifications V2 Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   PUT /api/notifications-v2/:id/read
// @desc    Mark a single notification read.
// ============================================================
router.put('/:id/read', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        await db.query(
            'UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2',
            [req.params.id, userId(req)]
        );
        res.json({ msg: 'marked read' });
    } catch (err) {
        console.error('Mark Read Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   PUT /api/notifications-v2/read-all
// @desc    Mark all of the caller's notifications as read.
// ============================================================
router.put('/read-all', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const r = await db.query(
            'UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL',
            [userId(req)]
        );
        res.json({ msg: 'all marked read', updated: r.rowCount });
    } catch (err) {
        console.error('Mark All Read Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// PREFERENCE CENTRE
// @route   GET /api/notifications-v2/preferences
// ============================================================
router.get('/preferences', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        res.json(await getPreferences(userId(req)));
    } catch (err) {
        console.error('Get Preferences Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/notifications-v2/preferences
router.put('/preferences', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const { email, sms, portal } = req.body;
        const prefs = {
            email: email !== false,
            sms: sms === true,
            portal: portal !== false
        };
        await db.query(
            `UPDATE users SET notification_preferences = $1::jsonb WHERE id = $2`,
            [JSON.stringify(prefs), userId(req)]
        );
        res.json(prefs);
    } catch (err) {
        console.error('Update Preferences Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// DIGEST (period summary) — for email digests.
// @route   GET /api/notifications-v2/digest
// ============================================================
router.get('/digest', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const since = req.query.since
            ? new Date(req.query.since)
            : new Date(Date.now() - 24 * 3600 * 1000);

        const { rows } = await db.query(`
            SELECT category, severity, COUNT(*) AS n
              FROM notifications
             WHERE user_id = $1 AND created_at >= $2
          GROUP BY category, severity
          ORDER BY n DESC`, [userId(req), since]);

        const total = rows.reduce((s, r) => s + parseInt(r.n), 0);
        res.json({ since, total, breakdown: rows });
    } catch (err) {
        console.error('Digest Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// REAL-TIME STREAM (Server-Sent Events)
// @route   GET /api/notifications-v2/stream
// @desc    Long-lived SSE connection. Pushes a notification JSON the
//          instant it is created for this user. Falls back to a
//          periodic keep-alive comment so proxies don't drop it.
// @access  Private
// ============================================================
router.get('/stream', requireRole(['admin', 'govt', 'industry']), (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'          // disable nginx buffering
    });
    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, userId: userId(req) })}\n\n`);

    const channel = `user:${userId(req)}`;
    const sender = (payload) => {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };
    liveBus.on(channel, sender);

    // Keep-alive every 25s to prevent idle-proxy timeouts.
    const ka = setInterval(() => res.write(`: keepalive ${Date.now()}\n\n`), 25000);

    // Clean up on disconnect.
    req.on('close', () => {
        clearInterval(ka);
        liveBus.off(channel, sender);
    });
});

module.exports = router;
