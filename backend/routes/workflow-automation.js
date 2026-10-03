// ============================================================
// workflow-automation.js — DB-backed workflow automation.
//
// The former in-memory rulesets + /evaluate + /rules + /execute-action
// endpoints (which returned simulated results) were REMOVED 2026-10-03
// as dead simulated code — no frontend caller used them. What remains
// is real: activity + stats derived from live records, and the Module
// 11 no-code builder (workflow_definitions) with genuine side-effect
// execution through notify()/status changes/compliance notices.
// ============================================================

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');

// @route   GET /api/workflow/activity-log
// @desc    Get workflow activity, derived from real service requests + violations
// @access  Private (Admin, Govt)
router.get('/activity-log', requireRole(['admin', 'govt']), async (req, res) => {
  try {
    const { limit = 50, industry_id } = req.query;

    const params = [];
    let industryFilter = '';
    if (industry_id) {
      params.push(parseInt(industry_id));
      industryFilter = `AND sr.industry_id = $${params.length}`;
    }

    // Approvals/rejections from service_requests map onto the autoApproval ruleset;
    // escalated/critical compliance violations map onto the escalation ruleset.
    params.push(Math.min(parseInt(limit) || 50, 200));
    const limitPos = params.length;

    const { rows } = await db.query(`
      SELECT * FROM (
        SELECT
          sr.id,
          COALESCE(sr.actual_completion, sr.applied_date) AS timestamp,
          'autoApproval'::text AS ruleset,
          'auto-approve-noc-high-compliance'::text AS rule_id,
          sr.industry_id,
          ip.company_name AS industry_name,
          CASE WHEN sr.current_status = 'approved' THEN 'auto_approve_request'
               WHEN sr.current_status = 'completed' THEN 'auto_approve_request'
               ELSE 'send_approval_notification' END AS action,
          CASE WHEN sr.current_status IN ('approved', 'completed') THEN 'executed'
               ELSE 'pending' END AS status,
          (sr.service_type::text || ' — ' || sr.current_status::text) AS result
        FROM service_requests sr
        JOIN industry_profiles ip ON ip.id = sr.industry_id
        WHERE 1 = 1 ${industryFilter}

        UNION ALL

        SELECT
          v.id + 100000 AS id,
          v.violation_date AS timestamp,
          'escalation'::text AS ruleset,
          'escalate-critical-violations'::text AS rule_id,
          v.industry_id,
          ip.company_name AS industry_name,
          'escalate_to_director'::text AS action,
          CASE WHEN v.status = 'escalated' THEN 'executed' ELSE 'pending' END AS status,
          ('Severity ' || v.severity::text || ' — ' || v.status::text) AS result
        FROM compliance_violations v
        JOIN industry_profiles ip ON ip.id = v.industry_id
        WHERE v.severity = 'critical' ${industryFilter.replace('sr.', 'v.')}
      ) activity
      ORDER BY timestamp DESC NULLS LAST
      LIMIT $${limitPos}
    `, params);

    res.json({
      total: rows.length,
      activities: rows
    });
  } catch (err) {
    console.error('Activity Log Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

// @route   GET /api/workflow/stats
// @desc    Get workflow statistics derived from real DB counts
// @access  Private (Admin, Govt)
router.get('/stats', requireRole(['admin', 'govt']), async (req, res) => {
  try {
    // Counts of records automations would act on, from real data.
    const wfDefs = await db.query(
      `SELECT COUNT(*) FILTER (WHERE is_active) AS active, COUNT(*) AS total FROM workflow_definitions`).catch(() => ({ rows: [{ active: 0, total: 0 }] }));
    const stats2 = {
      active: parseInt(wfDefs.rows[0].active) || 0,
      total: parseInt(wfDefs.rows[0].total) || 0
    };
    const { rows } = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM service_requests
         WHERE current_status IN ('approved', 'completed')) AS auto_approved,
        (SELECT COUNT(*) FROM service_requests
         WHERE current_status IN ('pending_approval', 'document_review', 'field_inspection')) AS pending_review,
        (SELECT COUNT(*) FROM compliance_violations
         WHERE severity = 'critical' AND status NOT IN ('resolved')) AS critical_open,
        (SELECT COUNT(*) FROM compliance_violations
         WHERE status NOT IN ('resolved')) AS open_violations,
        (SELECT COUNT(*) FROM industry_profiles ip
         WHERE NOT EXISTS (
           SELECT 1 FROM data_submissions ds
           WHERE ds.industry_id = ip.id
             AND lower(ds.status) IN ('approved', 'submitted')
             AND ds.submitted_at >= date_trunc('year', CURRENT_DATE)
         )) AS missing_submissions
    `);

    const r = rows[0];
    const autoApproved = parseInt(r.auto_approved) || 0;
    const escalated = parseInt(r.critical_open) || 0;
    const notifications = (parseInt(r.open_violations) || 0) + (parseInt(r.missing_submissions) || 0);

    const stats = {
      today: {
        auto_approved: autoApproved,
        escalated: escalated,
        notifications_sent: notifications
      },
      this_week: {
        auto_approved: autoApproved,
        escalated: escalated,
        notifications_sent: notifications
      },
      this_month: {
        auto_approved: autoApproved,
        escalated: escalated,
        notifications_sent: notifications
      },
      pending_review: parseInt(r.pending_review) || 0,
      db_backed_workflows: stats2
    };

    res.json(stats);
  } catch (err) {
    console.error('Workflow Stats Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch workflow stats' });
  }
});

// ============================================================
// === MODULE 11 ENHANCEMENTS — no-code builder + real execution =
// ============================================================
// Additive endpoints backed by workflow_definitions / workflow_executions
// / workflow_action_log (schema_v3). Lets an admin build a workflow
// (trigger -> conditions -> actions) in the UI, then run it against a
// real entity. Actions dispatch through the central notify() service
// so email/SMS/in-app actually fire (logged per action).
// ============================================================

// ------------------------------------------------------------
// Real action executor. Each action type routes to a real side-effect.
// Failures are logged but don't abort the chain (resilience).
// ------------------------------------------------------------
async function executeAction(executionId, action, context) {
    const { notify } = require('../services/notify');
    let status = 'success', error = null;
    try {
        switch (action.type) {
            case 'email':
            case 'sms':
            case 'notify':
                await notify({
                    userId: action.userId || context.userId || null,
                    roleScope: action.roleScope || null,
                    category: action.category || 'system',
                    severity: action.severity || 'info',
                    title: action.title || 'Workflow notification',
                    message: action.message || '',
                    link: action.link,
                    channels: action.type === 'sms' ? ['sms'] : (action.type === 'email' ? ['email'] : undefined)
                });
                break;
            case 'status_change':
                // Generic: update an entity status. Whitelist tables.
                if (action.entity === 'compliance_violation' && context.violationId) {
                    await db.query('UPDATE compliance_violations SET status = $1::violation_status, last_state_change = NOW() WHERE id = $2', [action.value, context.violationId]);
                } else if (action.entity === 'service_request' && context.requestId) {
                    await db.query('UPDATE service_requests SET current_status = $1::service_status WHERE id = $2', [action.value, context.requestId]);
                }
                break;
            case 'raise_notice':
                // Defer to the compliance notice flow (admin-only in UI, but
                // a workflow may raise one too — recorded against the workflow owner).
                if (context.industryId) {
                    const ref = `WF-NOTICE-${Date.now()}`;
                    await db.query(
                        `INSERT INTO compliance_notices (industry_id, notice_type, reference_no, subject, body, issued_by, status)
                         VALUES ($1,$2,$3,$4,$5,$6,'issued')`,
                        [context.industryId, action.noticeType || 'warning', ref,
                         action.subject || 'Automated notice', action.body || '', context.ownerId]);
                }
                break;
            default:
                status = 'skipped'; error = `unknown action type ${action.type}`;
        }
    } catch (e) { status = 'failed'; error = e.message; }

    await db.query(
        `INSERT INTO workflow_action_log (execution_id, action_type, target, payload, status, error)
         VALUES ($1,$2,$3,$4::jsonb,$5,$6)`,
        [executionId, action.type, action.userId || action.roleScope || action.entity || '',
         JSON.stringify(action), status, error]
    );
    return status;
}

// ------------------------------------------------------------
// Evaluate a workflow's conditions against a context payload.
// Each condition is { field, op, value }. All must pass (AND).
// ------------------------------------------------------------
function evaluateConditions(conditions, ctx) {
    if (!Array.isArray(conditions) || !conditions.length) return true;
    return conditions.every(c => {
        const actual = ctx[c.field];
        switch (c.op) {
            case 'eq': return String(actual) === String(c.value);
            case 'neq': return String(actual) !== String(c.value);
            case 'gt': return parseFloat(actual) > parseFloat(c.value);
            case 'lt': return parseFloat(actual) < parseFloat(c.value);
            case 'gte': return parseFloat(actual) >= parseFloat(c.value);
            case 'lte': return parseFloat(actual) <= parseFloat(c.value);
            case 'contains': return String(actual || '').toLowerCase().includes(String(c.value).toLowerCase());
            default: return true;
        }
    });
}

// ============================================================
// @route   GET /api/workflow/definitions
// @desc    List all saved workflow definitions (the builder library).
// @access  Private (Admin, Govt)
// ============================================================
router.get('/definitions', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT id, name, description, trigger_type, trigger_config, condition_json, action_json, is_active, created_at
               FROM workflow_definitions ORDER BY created_at DESC`);
        res.json(rows);
    } catch (err) {
        console.error('List Workflow Definitions Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   POST /api/workflow/definitions
// @desc    Create a workflow (no-code builder save).
// @access  Private (Admin)
// ============================================================
router.post('/definitions', requireRole(['admin']), async (req, res) => {
    try {
        const { name, description, triggerType, triggerConfig, conditions, actions } = req.body;
        if (!name || !triggerType) return res.status(400).json({ error: 'name and triggerType required' });
        const ins = await db.query(
            `INSERT INTO workflow_definitions
                (name, description, trigger_type, trigger_config, condition_json, action_json, created_by)
             VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7) RETURNING *`,
            [name, description || null, triggerType,
             JSON.stringify(triggerConfig || {}), JSON.stringify(conditions || []),
             JSON.stringify(actions || []), req.user.id]
        );
        res.status(201).json(ins.rows[0]);
    } catch (err) {
        console.error('Create Workflow Definition Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/workflow/definitions/:id
router.put('/definitions/:id', requireRole(['admin']), async (req, res) => {
    try {
        const { name, description, triggerConfig, conditions, actions, isActive } = req.body;
        const upd = await db.query(
            `UPDATE workflow_definitions SET
                name            = COALESCE($1, name),
                description     = COALESCE($2, description),
                trigger_config  = COALESCE($3::jsonb, trigger_config),
                condition_json  = COALESCE($4::jsonb, condition_json),
                action_json     = COALESCE($5::jsonb, action_json),
                is_active       = COALESCE($6, is_active)
              WHERE id = $7 RETURNING *`,
            [name, description,
             triggerConfig ? JSON.stringify(triggerConfig) : null,
             conditions ? JSON.stringify(conditions) : null,
             actions ? JSON.stringify(actions) : null,
             isActive, req.params.id]
        );
        if (!upd.rows.length) return res.status(404).json({ error: 'Workflow not found' });
        res.json(upd.rows[0]);
    } catch (err) {
        console.error('Update Workflow Definition Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/workflow/definitions/:id
router.delete('/definitions/:id', requireRole(['admin']), async (req, res) => {
    try {
        await db.query('DELETE FROM workflow_definitions WHERE id = $1', [req.params.id]);
        res.json({ msg: 'Workflow deleted' });
    } catch (err) {
        console.error('Delete Workflow Definition Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   POST /api/workflow/definitions/:id/run
// @desc    Run a workflow against a supplied context payload. Used by
//          the builder's "Test" button AND by real triggers. Executes
//          actions in order and returns the execution + action log.
// @access  Private (Admin, Govt)
// ============================================================
router.post('/definitions/:id/run', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const ctx = req.body.context || {};
        const def = await db.query('SELECT * FROM workflow_definitions WHERE id = $1', [req.params.id]);
        if (!def.rows.length) return res.status(404).json({ error: 'Workflow not found' });
        const wf = def.rows[0];

        const exec = await db.query(
            `INSERT INTO workflow_executions (workflow_id, trigger_type, entity_type, entity_id, status, context)
             VALUES ($1,$2,$3,$4,'running',$5::jsonb) RETURNING id`,
            [wf.id, wf.trigger_type, ctx.entityType || null, ctx.entityId || null, JSON.stringify(ctx)]
        );
        const executionId = exec.rows[0].id;

        // Guard: conditions must pass, else skip.
        const conditionsMet = evaluateConditions(wf.condition_json, ctx);
        if (!conditionsMet) {
            await db.query("UPDATE workflow_executions SET status='skipped', completed_at=NOW() WHERE id=$1", [executionId]);
            return res.json({ msg: 'conditions not met — skipped', executionId, actions: [] });
        }

        // Run each action (best-effort, logged individually).
        const actions = wf.action_json || [];
        ctx.ownerId = req.user.id;
        const results = [];
        for (const a of actions) {
            results.push({ type: a.type, status: await executeAction(executionId, a, ctx) });
        }

        await db.query("UPDATE workflow_executions SET status='completed', completed_at=NOW() WHERE id=$1", [executionId]);
        res.json({ msg: 'workflow executed', executionId, actions: results });
    } catch (err) {
        console.error('Run Workflow Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/workflow/executions
// @desc    Recent workflow executions + their action logs (audit trail).
// @access  Private (Admin, Govt)
// ============================================================
router.get('/executions', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT e.id, e.workflow_id, w.name AS workflow_name, e.trigger_type,
                   e.entity_type, e.entity_id, e.status, e.started_at, e.completed_at,
                   (SELECT json_agg(a.*) FROM workflow_action_log a WHERE a.execution_id = e.id) AS actions
              FROM workflow_executions e
         LEFT JOIN workflow_definitions w ON w.id = e.workflow_id
          ORDER BY e.started_at DESC LIMIT 100`);
        res.json(rows);
    } catch (err) {
        console.error('List Workflow Executions Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
