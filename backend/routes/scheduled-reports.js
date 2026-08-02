// ============================================================
// scheduled-reports.js — Scheduled auto-reports (Quick Win 4) +
//                        saved report configs + history (Top 3-C).
//
// Mounted at /api/scheduled-reports. The actual PDF build + email
// dispatch is triggered by the central scheduler (services/scheduler.js);
// this route handles CRUD + config + history. ADDITIVE — the existing
// /api/reports/* endpoints are untouched.
// ============================================================

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');

const VALID_FREQ = ['daily', 'weekly', 'monthly', 'quarterly'];

function computeNextRun(frequency, fromDate = new Date()) {
    const d = new Date(fromDate);
    switch (frequency) {
        case 'daily':     d.setDate(d.getDate() + 1); break;
        case 'weekly':    d.setDate(d.getDate() + 7); break;
        case 'monthly':   d.setMonth(d.getMonth() + 1); break;
        case 'quarterly': d.setMonth(d.getMonth() + 3); break;
        default:          d.setDate(d.getDate() + 1);
    }
    return d;
}

// ============================================================
// @route   GET /api/scheduled-reports
// @desc    List the caller's scheduled reports.
// @access  Private (Admin, Govt — admins see all; govt see own)
// ============================================================
router.get('/', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const where = req.user.role === 'admin' ? '' : 'WHERE owner_id = $1';
        const params = req.user.role === 'admin' ? [] : [req.user.id];
        const { rows } = await db.query(`
            SELECT id, name, report_type, frequency, recipients, is_active,
                   next_run_at, last_run_at, created_at
              FROM scheduled_reports
              ${where}
          ORDER BY created_at DESC`, params);
        res.json(rows);
    } catch (err) {
        console.error('List Scheduled Reports Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   POST /api/scheduled-reports
// @desc    Create a scheduled report (daily/weekly/monthly/quarterly).
// @access  Private (Admin, Govt)
// ============================================================
router.post('/', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { name, reportType, frequency, recipients = [], filters = {} } = req.body;
        if (!name || !reportType) return res.status(400).json({ error: 'name and reportType required' });
        if (!VALID_FREQ.includes(frequency)) return res.status(400).json({ error: `frequency must be one of ${VALID_FREQ.join(',')}` });

        const nextRunAt = computeNextRun(frequency);
        const ins = await db.query(
            `INSERT INTO scheduled_reports
                (name, owner_id, report_type, frequency, recipients, filters, next_run_at)
             VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7) RETURNING *`,
            [name, req.user.id, reportType, frequency, recipients, JSON.stringify(filters), nextRunAt]
        );
        res.status(201).json(ins.rows[0]);
    } catch (err) {
        console.error('Create Scheduled Report Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   PUT /api/scheduled-reports/:id
// @desc    Edit (pause/resume, change recipients/frequency).
// @access  Private (Admin, owner)
// ============================================================
router.put('/:id', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { name, frequency, recipients, isActive, filters } = req.body;
        const nextRun = frequency && VALID_FREQ.includes(frequency) ? computeNextRun(frequency) : null;
        const upd = await db.query(
            `UPDATE scheduled_reports SET
                name        = COALESCE($1, name),
                frequency   = COALESCE($2, frequency),
                recipients  = COALESCE($3, recipients),
                is_active   = COALESCE($4, is_active),
                filters     = COALESCE($5::jsonb, filters),
                next_run_at = COALESCE($6, next_run_at)
              WHERE id = $7 ${req.user.role === 'admin' ? '' : 'AND owner_id = $8'}
              RETURNING *`,
            req.user.role === 'admin'
                ? [name, frequency, recipients, isActive, filters ? JSON.stringify(filters) : null, nextRun, req.params.id]
                : [name, frequency, recipients, isActive, filters ? JSON.stringify(filters) : null, nextRun, req.params.id, req.user.id]
        );
        if (!upd.rows.length) return res.status(404).json({ error: 'Scheduled report not found' });
        res.json(upd.rows[0]);
    } catch (err) {
        console.error('Update Scheduled Report Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   DELETE /api/scheduled-reports/:id
// @desc    Delete (or pause) a scheduled report.
// @access  Private (Admin, owner)
// ============================================================
router.delete('/:id', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const where = req.user.role === 'admin' ? 'WHERE id = $1' : 'WHERE id = $1 AND owner_id = $2';
        const params = req.user.role === 'admin' ? [req.params.id] : [req.params.id, req.user.id];
        await db.query(`DELETE FROM scheduled_reports ${where}`, params);
        res.json({ msg: 'Scheduled report deleted' });
    } catch (err) {
        console.error('Delete Scheduled Report Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// SAVED CONFIGS / TEMPLATE LIBRARY (Top 3-C)
// ============================================================

// @route   GET /api/scheduled-reports/configs
router.get('/configs', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        // Templates are global; personal configs are owner-scoped.
        const { rows } = await db.query(`
            SELECT * FROM saved_report_configs
             WHERE is_template = TRUE OR owner_id = $1
          ORDER BY is_template DESC, name`, [req.user.id]);
        res.json(rows);
    } catch (err) {
        console.error('List Saved Configs Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/scheduled-reports/configs
router.post('/configs', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const { name, reportType, config, isTemplate = false } = req.body;
        if (!name || !reportType || !config) return res.status(400).json({ error: 'name, reportType, config required' });
        // Only admin can promote a config to a global template.
        const templated = isTemplate && req.user.role === 'admin';
        const ins = await db.query(
            `INSERT INTO saved_report_configs (owner_id, name, report_type, config, is_template)
             VALUES ($1,$2,$3,$4::jsonb,$5) RETURNING *`,
            [req.user.id, name, reportType, JSON.stringify(config), templated]
        );
        res.status(201).json(ins.rows[0]);
    } catch (err) {
        console.error('Save Config Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/scheduled-reports/configs/:id
router.delete('/configs/:id', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const where = req.user.role === 'admin' ? 'WHERE id = $1' : 'WHERE id = $1 AND owner_id = $2';
        const params = req.user.role === 'admin' ? [req.params.id] : [req.params.id, req.user.id];
        await db.query(`DELETE FROM saved_report_configs ${where}`, params);
        res.json({ msg: 'Config deleted' });
    } catch (err) {
        console.error('Delete Config Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// GENERATION HISTORY (Top 3-C)
// @route   GET /api/scheduled-reports/history
// ============================================================
router.get('/history', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT * FROM report_generation_log
          ORDER BY generated_at DESC LIMIT 200`);
        res.json(rows);
    } catch (err) {
        console.error('Report History Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
