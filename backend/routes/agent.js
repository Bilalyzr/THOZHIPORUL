// routes/agent.js — Agentic layer HTTP surface (PRD §17) + observability.
// All endpoints authenticated + RBAC. No raw SQL from clients.

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');
const supervisor = require('../agentic/orchestrator/supervisor');
const agentAudit = require('../agentic/audit/agentAudit');
const approvalGate = require('../agentic/governance/approvalGate');
const toolsRegistry = require('../agentic/tools/registry');
const graphRegistry = require('../agentic/orchestrator/graphRegistry');
const agentsRegistry = require('../agentic/agents/registry');
const modelGateway = require('../agentic/models/modelGateway');
const { AgentError } = require('../agentic/schemas/agentSchemas');

const ctxOf = (req) => ({ userId: req.user.id, role: req.user.role, industryId: req.user.profile_id || null,
                          parkId: null, actor: req.user.name || req.user.id });

// POST /api/agent/workflows — start a workflow (async; returns workflowId)
router.post('/workflows', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const out = await supervisor.start(req.body || {}, ctxOf(req));
        res.status(202).json(out);
    } catch (e) {
        res.status(e.errorClass === 'AUTHORIZATION_ERROR' ? 403 : e.errorClass === 'VALIDATION_ERROR' ? 400 : 500)
           .json({ error: e.message, code: e.errorClass || 'TOOL_ERROR' });
    }
});

// GET /api/agent/workflows — list (scoped)
router.get('/workflows', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    const params = [];
    const where = [];
    if (req.user.role === 'industry') { params.push(req.user.profile_id); where.push(`industry_id = $${params.length}`); }
    if (req.query.type) { params.push(req.query.type); where.push(`workflow_type = $${params.length}`); }
    if (req.query.status) { params.push(req.query.status); where.push(`status = $${params.length}`); }
    params.push(Math.min(parseInt(req.query.limit) || 50, 200));
    const { rows } = await db.query(`
        SELECT workflow_id, workflow_type, status, risk_level, industry_id, park_id,
               period_year, period_quarter, error_class, started_at, ended_at, result
          FROM agent_workflows ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY started_at DESC LIMIT $${params.length}`, params);
    res.json({ workflows: rows });
});

// GET /api/agent/workflows/:id — state
router.get('/workflows/:id', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    const { rows } = await db.query('SELECT * FROM agent_workflows WHERE workflow_id=$1::uuid', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Workflow not found' });
    const w = rows[0];
    if (req.user.role === 'industry' && w.industry_id !== req.user.profile_id) {
        return res.status(403).json({ error: 'Not your workflow' });
    }
    res.json(w);
});

// GET /api/agent/workflows/:id/steps — execution trace
router.get('/workflows/:id/steps', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    const rec = await agentAudit.reconstruct(req.params.id);
    if (!rec) return res.status(404).json({ error: 'Workflow not found' });
    res.json(rec);
});

// POST /api/agent/workflows/:id/approve — resume after approval (human)
router.post('/workflows/:id/approve', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const decision = await approvalGate.decide({
            approvalId: (req.body || {}).approvalId, decision: 'approve',
            user: req.user, comment: (req.body || {}).comment
        });
        await db.query(`UPDATE agent_workflows SET status='running', updated_at=NOW()
                         WHERE workflow_id=$1::uuid AND status='waiting_approval'`, [req.params.id]);
        const out = await supervisor.resume(req.params.id, ctxOf(req));
        res.json({ approval: decision.status, workflow: out });
    } catch (e) {
        res.status(e.errorClass === 'VALIDATION_ERROR' ? 400 : 500).json({ error: e.message, code: e.errorClass });
    }
});

// POST /api/agent/workflows/:id/reject
router.post('/workflows/:id/reject', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const decision = await approvalGate.decide({
            approvalId: (req.body || {}).approvalId, decision: 'reject',
            user: req.user, comment: (req.body || {}).comment
        });
        await db.query(`UPDATE agent_workflows SET status='cancelled', ended_at=NOW(), updated_at=NOW()
                         WHERE workflow_id=$1::uuid AND status='waiting_approval'`, [req.params.id]);
        res.json({ approval: decision.status });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// GET /api/agent/tasks — human review queue
router.get('/tasks', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    res.json({ approvals: await approvalGate.pendingForUser(req.user) });
});

// POST /api/agent/query — NL query through the copilot graph
router.post('/query', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const out = await supervisor.start({ kind: 'copilot', question: (req.body || {}).question }, ctxOf(req), { async: false });
        res.json(out);
    } catch (e) {
        res.status(500).json({ error: e.message, code: e.errorClass });
    }
});

// GET /api/agent/audit — search the agent trail
router.get('/audit', requireRole(['admin', 'govt']), async (req, res) => {
    const params = [];
    const where = [];
    if (req.query.workflowId) { params.push(req.query.workflowId); where.push(`workflow_id = $${params.length}::uuid`); }
    if (req.query.type) { params.push(req.query.type); where.push(`event_type = $${params.length}`); }
    params.push(Math.min(parseInt(req.query.limit) || 200, 1000));
    const { rows } = await db.query(`
        SELECT * FROM agent_events ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY created_at DESC LIMIT $${params.length}`, params);
    res.json({ events: rows });
});

// POST /api/agent/workflows/:id/cancel
router.post('/workflows/:id/cancel', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    const { rows } = await db.query(
        `UPDATE agent_workflows SET status='cancelled', ended_at=NOW(), updated_at=NOW()
          WHERE workflow_id=$1::uuid AND status IN ('running','waiting_approval') RETURNING workflow_id`, [req.params.id]);
    if (!rows.length) return res.status(409).json({ error: 'Not cancellable in current state' });
    await agentAudit.event({ workflowId: req.params.id, type: 'workflow_end', actor: req.user.name, status: 'cancelled' });
    res.json({ cancelled: true });
});

// GET /api/agent/metrics — observability (PRD §37) computed from real tables
router.get('/metrics', requireRole(['admin', 'govt']), async (req, res) => {
    const { rows } = await db.query(`
        SELECT
          (SELECT COUNT(*)::int FROM agent_workflows) AS agent_runs_total,
          (SELECT COUNT(*)::int FROM agent_workflows WHERE status='failed') AS agent_failures_total,
          (SELECT COUNT(*)::int FROM agent_tool_calls) AS tool_calls_total,
          (SELECT COUNT(*)::int FROM agent_tool_calls WHERE status='failed') AS tool_failures_total,
          (SELECT COUNT(*)::int FROM agent_tool_calls WHERE status='denied') AS tool_denied_total,
          (SELECT ROUND(AVG(latency_ms))::int FROM agent_tool_calls WHERE latency_ms IS NOT NULL) AS avg_tool_latency_ms,
          (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (ended_at-started_at))*1000))::int FROM agent_workflows WHERE ended_at IS NOT NULL) AS avg_workflow_duration_ms,
          (SELECT COUNT(*)::int FROM ai_runs) AS model_calls_total,
          (SELECT COUNT(*)::int FROM ai_runs WHERE status='failed') AS model_errors_total,
          (SELECT ROUND(AVG(latency_ms))::int FROM ai_runs WHERE latency_ms IS NOT NULL) AS avg_model_latency_ms,
          (SELECT COUNT(*)::int FROM agent_approvals WHERE status='PENDING_APPROVAL') AS approvals_pending,
          (SELECT COUNT(*)::int FROM forecasts) AS forecast_runs,
          (SELECT COUNT(*)::int FROM notification_deliveries WHERE status='SENT') AS notification_delivery_success,
          (SELECT COUNT(*)::int FROM notification_deliveries WHERE status IN ('FAILED','SIMULATED')) AS notification_delivery_nonsent`);
    res.json({ metrics: rows[0], generated_at: new Date().toISOString() });
});

// GET /api/agent/capabilities — honest AI capability statement
router.get('/capabilities', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    const caps = await db.query('SELECT * FROM agent_capabilities');
    const health = await modelGateway.health();
    res.json({
        orchestrator: 'LangGraph.js (StateGraph, persisted nodes, human gates)',
        agents: agentsRegistry.list().map(a => ({ name: a.name, tools: a.tools })),
        tools: toolsRegistry.list().map(t => ({ name: t.name, risk: t.risk, write: !!t.write, approval: !!t.approvalRequired })),
        workflows: graphRegistry.list(),
        model_runtime: health,
        capabilities: caps.rows,
        principles: ['agents coordinate trusted capabilities', 'deterministic services are the source of truth',
                     'consequential actions need human approval', 'no fake functionality — SIMULATED states are labelled']
    });
});

module.exports = router;
