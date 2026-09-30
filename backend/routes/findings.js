const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');
const { recordAudit } = require('./audit');
const { invalidate } = require('../services/ruleConfig');
const consistencyEngine = require('../services/consistencyEngine');
const anomalyService = require('../services/anomalyService');

// ============================================================
// findings.js — data quality findings (consistency + anomalies)
// and the configurable rule registry (Phases 9-10).
// Industries see their own findings; admin/govt see everything.
// ============================================================

// GET /api/findings — list with filters
router.get('/', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const { type, severity, status, industryId, limit: qLimit } = req.query;
        const limit = Math.min(Math.max(parseInt(qLimit) || 100, 1), 500);
        const conditions = [];
        const params = [];

        if (req.user.role === 'industry') {
            if (!req.user.profile_id) return res.status(400).json({ error: 'No industry profile.' });
            params.push(req.user.profile_id);
            conditions.push(`f.industry_id = $${params.length}`);
        } else if (industryId) {
            params.push(parseInt(industryId));
            conditions.push(`f.industry_id = $${params.length}`);
        }
        if (type) { params.push(type); conditions.push(`f.finding_type = $${params.length}`); }
        if (severity) { params.push(severity); conditions.push(`f.severity = $${params.length}`); }
        if (status) { params.push(status); conditions.push(`f.status = $${params.length}`); }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const { rows } = await db.query(`
            SELECT f.*, ip.company_name
              FROM data_findings f
              JOIN industry_profiles ip ON ip.id = f.industry_id
              ${where}
          ORDER BY CASE f.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
                   f.detected_at DESC
             LIMIT ${limit}`, params);
        const counts = await db.query(`
            SELECT severity, COUNT(*)::int AS n FROM data_findings f ${where ? where.replace(/f\./g, 'f.') : ''}
         GROUP BY severity`.replace(/LIMIT \$\d+/, ''), params).catch(() => ({ rows: [] }));
        res.json({ findings: rows, count: rows.length });
    } catch (err) {
        console.error('Findings Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// GET /api/findings/open-summary — quick counters for dashboards
router.get('/open-summary', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT finding_type, severity, COUNT(*)::int AS n
              FROM data_findings WHERE status = 'open'
          GROUP BY finding_type, severity`);
        const summary = { total_open: 0, critical: 0, high: 0, warning: 0, info: 0, by_type: {} };
        for (const r of rows) {
            summary.total_open += r.n;
            if (summary[r.severity] !== undefined) summary[r.severity] += r.n;
            summary.by_type[r.finding_type] = (summary.by_type[r.finding_type] || 0) + r.n;
        }
        res.json(summary);
    } catch (err) {
        console.error('Findings Summary Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// PUT /api/findings/:id/status — review / dismiss / resolve
router.put('/:id/status', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { status, note } = req.body;
        if (!['open', 'reviewed', 'dismissed', 'resolved'].includes(status)) {
            return res.status(400).json({ error: 'status must be open | reviewed | dismissed | resolved' });
        }
        const f = await db.query('SELECT * FROM data_findings WHERE id = $1', [req.params.id]);
        if (!f.rows.length) return res.status(404).json({ error: 'Finding not found.' });
        const prev = f.rows[0];

        const { rows } = await db.query(`
            UPDATE data_findings
               SET status = $1, resolved_by = CASE WHEN $1 IN ('resolved','dismissed') THEN $2 ELSE resolved_by END,
                   resolved_at = CASE WHEN $1 IN ('resolved','dismissed') THEN NOW() ELSE resolved_at END,
                   evidence = CASE WHEN $3::text IS NOT NULL
                              THEN jsonb_set(COALESCE(evidence,'{}'::jsonb), '{review_note}', to_jsonb($3::text))
                              ELSE evidence END
             WHERE id = $4 RETURNING *`,
            [status, req.user.id, note || null, req.params.id]);

        await recordAudit(req.user.id, `FINDING_${status.toUpperCase()}`, req.ip, {
            entityType: 'data_finding', entityId: parseInt(req.params.id),
            payload: { rule: prev.rule_id, industry_id: prev.industry_id, metric: prev.metric, note: note || null }
        });
        res.json(rows[0]);
    } catch (err) {
        console.error('Finding Status Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// POST /api/findings/run-detection — batch re-evaluation (admin)
router.post('/run-detection', requireRole(['admin']), async (req, res) => {
    try {
        const consistency = await consistencyEngine.evaluateAll('batch');
        const { rows } = await db.query(`
            SELECT DISTINCT ON (industry_id) id FROM data_submissions
          ORDER BY industry_id, submitted_at DESC`);
        let anomalies = 0;
        for (const r of rows) {
            const res = await anomalyService.evaluateSubmission(r.id, 'batch');
            anomalies += res.findings;
        }
        await recordAudit(req.user.id, 'FINDINGS_BATCH_DETECTION', req.ip, {
            payload: { submissions: rows.length, consistency_findings: consistency.findings, anomalies }
        });
        res.json({ submissions_evaluated: rows.length, new_consistency_findings: consistency.findings, anomalies_detected: anomalies });
    } catch (err) {
        console.error('Batch Detection Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ---- Rule registry (admin) ---------------------------------

// GET /api/findings/rules — the configurable thresholds
router.get('/rules', requireRole(['admin']), async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM intelligence_rules ORDER BY category, rule_id');
        res.json(rows);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// PUT /api/findings/rules/:ruleId — edit a rule's config/enablement
router.put('/rules/:ruleId', requireRole(['admin']), async (req, res) => {
    try {
        const { config, enabled } = req.body;
        const existing = await db.query('SELECT * FROM intelligence_rules WHERE rule_id = $1', [req.params.ruleId]);
        if (!existing.rows.length) return res.status(404).json({ error: 'Rule not found.' });
        const prev = existing.rows[0];

        const { rows } = await db.query(`
            UPDATE intelligence_rules
               SET config = COALESCE($1::jsonb, config),
                   enabled = COALESCE($2, enabled),
                   updated_by = $3, updated_at = NOW()
             WHERE rule_id = $4 RETURNING *`,
            [config ? JSON.stringify(config) : null, enabled === undefined ? null : enabled, req.user.id, req.params.ruleId]);
        invalidate();

        await recordAudit(req.user.id, 'INTELLIGENCE_RULE_UPDATED', req.ip, {
            entityType: 'intelligence_rule', entityId: req.params.ruleId,
            payload: { before: { config: prev.config, enabled: prev.enabled }, after: { config: rows[0].config, enabled: rows[0].enabled } }
        });
        res.json(rows[0]);
    } catch (err) {
        console.error('Rule Update Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
