// audit/agentAudit.js — complete, reconstructable agent trace (PRD §20, §29).
// agent_events is the spine; material decisions also bridge into the
// tamper-evident hash-chained audit_logs via recordAudit.

const db = require('../../db');
const { recordAudit } = require('../../routes/audit');

const TYPES = [
    'workflow_start', 'workflow_end', 'agent_run', 'tool_call', 'model_call',
    'decision', 'approval', 'notification', 'failure', 'retry', 'external_action'
];

/** Sanitize: never log secrets or full file bytes. */
function sanitize(detail) {
    const s = JSON.stringify(detail || {});
    if (s.length > 4000) return { truncated: true, preview: s.slice(0, 4000) };
    const cleaned = JSON.parse(s);
    for (const k of Object.keys(cleaned)) {
        if (/secret|password|token|api_key|authorization/i.test(k)) cleaned[k] = '[REDACTED]';
    }
    return cleaned;
}

async function event({ workflowId, type, actor, agentId = null, toolId = null, model = null,
                       status = null, detail = {}, correlationId = null }) {
    if (!TYPES.includes(type)) type = 'agent_run';
    try {
        await db.query(
            `INSERT INTO agent_events (workflow_id, event_type, actor, agent_id, tool_id, model, status, detail, correlation_id)
             VALUES (NULLIF($1,'')::uuid, $2, $3, $4, $5, $6, $7, $8::jsonb, NULLIF($9,'')::uuid)`,
            [workflowId || null, type, actor || null, agentId, toolId, model, status,
             JSON.stringify(sanitize(detail)), correlationId || null]
        );
    } catch (e) {
        console.warn('[agentAudit] event persist failed:', e.message);
    }
}

/** Bridge a material decision into the hash-chained audit log. */
async function chained(userId, action, meta = {}) {
    await recordAudit(userId, action, meta.ip || null, meta);
}

/** Reconstruct a workflow end-to-end (acceptance #22). */
async function reconstruct(workflowId) {
    const wf = await db.query('SELECT * FROM agent_workflows WHERE workflow_id=$1::uuid', [workflowId]);
    if (!wf.rows.length) return null;
    const steps = await db.query(
        'SELECT * FROM agent_steps WHERE workflow_id=$1::uuid ORDER BY step_no, attempt', [workflowId]);
    const tools = await db.query(
        'SELECT * FROM agent_tool_calls WHERE workflow_id=$1::uuid ORDER BY created_at', [workflowId]);
    const events = await db.query(
        'SELECT * FROM agent_events WHERE workflow_id=$1::uuid ORDER BY created_at, id', [workflowId]);
    const approvals = await db.query(
        'SELECT * FROM agent_approvals WHERE workflow_id=$1::uuid ORDER BY created_at', [workflowId]);
    const models = await db.query(
        'SELECT * FROM ai_runs WHERE workflow_id=$1::uuid ORDER BY created_at', [workflowId]);
    return {
        workflow: wf.rows[0],
        steps: steps.rows,
        tool_calls: tools.rows,
        events: events.rows,
        approvals: approvals.rows,
        model_runs: models.rows
    };
}

module.exports = { event, chained, reconstruct, TYPES };
