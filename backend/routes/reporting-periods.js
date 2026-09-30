const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');
const { recordAudit } = require('./audit');
const { getFilingMatrix, getCurrentPeriodOverview } = require('../services/missingSubmissionEngine');

// ============================================================
// reporting-periods.js — the reporting calendar + period-based
// filing matrix (Phases 6-7).
//
// Deadlines are SEEDED DEFAULTS (quarter-end + 15 days, 7-day
// grace) and are fully configurable by admins — no invented
// statutory dates. The system always knows: who has filed, who
// hasn't, who is late/overdue, who has been notified/escalated.
// ============================================================

// GET /api/reporting-periods — the calendar (all roles; industries
// need it to see their deadlines).
router.get('/', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT rp.*, (SELECT COUNT(*)::int FROM data_submissions ds
                            WHERE ds.period_year = rp.period_year
                              AND ds.period_quarter = rp.period_quarter) AS filed_count
              FROM reporting_periods rp
          ORDER BY rp.period_year DESC, rp.period_quarter DESC
             LIMIT 24`);
        res.json(rows);
    } catch (err) {
        console.error('Reporting Periods Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// PUT /api/reporting-periods/:id — admin edits the calendar.
router.put('/:id', requireRole(['admin']), async (req, res) => {
    try {
        const { opensOn, dueOn, graceDays, closesOn, status } = req.body;
        const existing = await db.query('SELECT * FROM reporting_periods WHERE id = $1', [req.params.id]);
        if (!existing.rows.length) return res.status(404).json({ error: 'Reporting period not found.' });

        const prev = existing.rows[0];
        const grace = graceDays !== undefined ? parseInt(graceDays) : prev.grace_days;
        const due = dueOn || prev.due_on;
        const closes = closesOn || (new Date(new Date(due).getTime() + grace * 86400000).toISOString().slice(0, 10));

        const { rows } = await db.query(`
            UPDATE reporting_periods
               SET opens_on = COALESCE($1, opens_on),
                   due_on = $2,
                   grace_days = $3,
                   closes_on = $4,
                   status = COALESCE($5, status),
                   updated_at = NOW(),
                   created_by = COALESCE(created_by, $6)
             WHERE id = $7 RETURNING *`,
            [opensOn || null, due, grace, closes, status || null, req.user.id, req.params.id]);

        await recordAudit(req.user.id, 'REPORTING_PERIOD_UPDATED', req.ip, {
            entityType: 'reporting_period', entityId: parseInt(req.params.id),
            payload: { before: { due_on: prev.due_on, grace_days: prev.grace_days, closes_on: prev.closes_on, status: prev.status },
                       after: { due_on: rows[0].due_on, grace_days: rows[0].grace_days, closes_on: rows[0].closes_on, status: rows[0].status } }
        });
        res.json(rows[0]);
    } catch (err) {
        console.error('Update Reporting Period Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// POST /api/reporting-periods/generate — auto-create the calendar
// for a year using the default policy (admin can adjust after).
router.post('/generate', requireRole(['admin']), async (req, res) => {
    try {
        const year = parseInt(req.body.year) || (new Date().getUTCFullYear() + 1);
        if (year < 2000 || year > 2100) return res.status(400).json({ error: 'Invalid year.' });
        const inserted = await db.query(`
            INSERT INTO reporting_periods (period_year, period_quarter, opens_on, due_on, grace_days, closes_on, status, created_by)
            SELECT $1, q,
                   make_date($1, (q-1)*3+1, 1),
                   (make_date($1, (q-1)*3+1, 1) + INTERVAL '3 months' - INTERVAL '1 day' + INTERVAL '15 days')::date,
                   7,
                   (make_date($1, (q-1)*3+1, 1) + INTERVAL '3 months' - INTERVAL '1 day' + INTERVAL '22 days')::date,
                   'open', $2
              FROM (VALUES (1),(2),(3),(4)) q(q)
         ON CONFLICT DO NOTHING
         RETURNING id`);
        await recordAudit(req.user.id, 'REPORTING_CALENDAR_GENERATED', req.ip, {
            payload: { year, created: inserted.rows.length }
        });
        res.json({ year, created: inserted.rows.length, note: 'Defaults: due 15 days after quarter-end, 7-day grace. Edit any period to match actual SIPCOT deadlines.' });
    } catch (err) {
        console.error('Generate Calendar Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// GET /api/reporting-periods/filing-matrix?year=&quarter=&parkId=
// The government view: every expected filer × every elapsed
// period, with status + reminder history + summary counts.
router.get('/filing-matrix', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getUTCFullYear();
        const quarter = req.query.quarter ? parseInt(req.query.quarter) : null;
        const parkId = req.query.parkId ? parseInt(req.query.parkId) : null;
        const matrix = await getFilingMatrix({ year, quarter, parkId });
        res.json(matrix);
    } catch (err) {
        console.error('Filing Matrix Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// GET /api/reporting-periods/current — current-period snapshot.
router.get('/current', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        res.json(await getCurrentPeriodOverview(req.query.parkId ? parseInt(req.query.parkId) : null));
    } catch (err) {
        console.error('Current Period Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// GET /api/reporting-periods/my-calendar — the industry view:
// upcoming deadlines + my own filing status per period.
router.get('/my-calendar', requireRole(['industry']), async (req, res) => {
    try {
        if (!req.user.profile_id) return res.status(400).json({ error: 'No industry profile.' });
        const industryId = req.user.profile_id;
        const year = new Date().getUTCFullYear();
        const matrix = await getFilingMatrix({ year });
        const mine = matrix.industries.find(i => i.industry_id === industryId);
        const upcoming = (await db.query(`
            SELECT * FROM reporting_periods
             WHERE closes_on >= CURRENT_DATE
          ORDER BY period_year, period_quarter LIMIT 3`)).rows;
        res.json({
            year,
            my_status: mine || { periods: [], outstanding: [], note: 'Industry not in the expected-filer list (operational status).' },
            summary: matrix.summary,
            upcoming
        });
    } catch (err) {
        console.error('My Calendar Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// POST /api/reporting-periods/run-reminders — invoke the reminder/
// escalation sweep NOW (admin). The scheduler runs the same logic
// hourly; this endpoint lets an officer trigger it on demand and
// see exactly what was sent.
router.post('/run-reminders', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { notify } = require('../services/notify');
        const before = await db.query('SELECT COUNT(*)::int AS n FROM submission_reminders');
        // Reuse the scheduler's exact sweep by requiring the function.
        const scheduler = require('../services/scheduler');
        await scheduler.runSubmissionReminders();
        const after = await db.query('SELECT COUNT(*)::int AS n FROM submission_reminders');
        await recordAudit(req.user.id, 'REMINDER_SWEEP_TRIGGERED', req.ip, {
            payload: { new_reminders: after.rows[0].n - before.rows[0].n }
        });
        res.json({
            msg: 'Reminder sweep executed.',
            reminders_before: before.rows[0].n,
            reminders_after: after.rows[0].n,
            new_reminders: after.rows[0].n - before.rows[0].n,
            note: 'In-app deliveries are real; email/SMS outcomes are recorded honestly per provider (SIMULATED until a transport is configured).'
        });
    } catch (err) {
        console.error('Run Reminders Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
