// orchestrator/supervisor.js — the Supervisor (PRD §6).
// Receives a task, authenticates context, classifies, selects the graph,
// initializes state, runs it (with resume), routes approval interrupts,
// persists everything, closes the workflow with a full audit trail.
//
// The supervisor NEVER executes raw SQL, bypasses authorization, or
// approves its own high-risk actions (approvals are human-only by
// construction — approvalGate.decide is only callable from human routes).

const db = require('../../db');
const { StateGraph } = require('@langchain/langgraph');
const { WorkflowState, makeNode, resetSteps, START, END } = require('./state');
const agentAudit = require('../audit/agentAudit');
const riskEngine = require('../governance/riskEngine');
const { AgentError } = require('../schemas/agentSchemas');
const graphRegistry = require('./graphRegistry');

// ---------- task classification (deterministic; LLM optional later) ----------
const TASK_RULES = [
    { type: 'submission', match: i => i.kind === 'submission' || !!(i.payload && i.payload.periodYear) || !!(i.document) },
    { type: 'investigation', match: i => i.kind === 'investigation' || /investigat|why|risk/i.test(i.question || '') },
    { type: 'missing_filer', match: i => i.kind === 'missing_filer' },
    { type: 'forecast', match: i => i.kind === 'forecast' || /forecast|project(ed)?|next (four|4)/i.test(i.question || '') },
    { type: 'reporting', match: i => i.kind === 'report' },
    { type: 'copilot', match: i => i.kind === 'copilot' || !!i.question }
];

function classifyTask(input) {
    for (const r of TASK_RULES) if (r.match(input || {})) return r.type;
    return 'copilot';
}

// ---------- workflow lifecycle ----------
async function start(input, ctx, { async = true } = {}) {
    // ctx = { userId, role, industryId, parkId, actor }
    if (!ctx || !ctx.role) throw new AgentError('AUTHORIZATION_ERROR', 'Agent workflows require an authenticated context.');
    const workflowType = input.workflowType || classifyTask(input);
    const graphDef = graphRegistry.get(workflowType);
    if (!graphDef) throw new AgentError('VALIDATION_ERROR', `No registered workflow for type "${workflowType}".`);

    const { rows } = await db.query(
        `INSERT INTO agent_workflows (workflow_type, graph_version, status, initiated_by, role,
                                      industry_id, park_id, period_year, period_quarter, input, idempotency_key)
         VALUES ($1, $2, 'running', $3, $4, $5, $6, $7, $8, $9::jsonb, NULLIF($10,''))
         RETURNING workflow_id`,
        [workflowType, graphDef.version || '1.0', ctx.userId, ctx.role,
         ctx.industryId || null, ctx.parkId || null,
         input.periodYear || null, input.periodQuarter || null,
         JSON.stringify(sanitizeInput(input)), input.idempotencyKey || null]);
    const workflowId = rows[0].workflow_id;

    await agentAudit.event({ workflowId, type: 'workflow_start', actor: ctx.actor || ctx.role,
        detail: { workflowType, role: ctx.role, industryId: ctx.industryId, parkId: ctx.parkId, graph: graphDef.name } });
    await agentAudit.chained(ctx.userId, 'AGENT_WORKFLOW_START', {
        entityType: 'agent_workflow', entityId: workflowId,
        payload: { type: workflowType, role: ctx.role, industryId: ctx.industryId }
    });

    const runPromise = run(workflowId, workflowType, input, ctx).catch(async (e) => {
        await fail(workflowId, e, ctx);
    });

    if (async) {
        // Fire-and-track: caller polls /api/agent/workflows/:id.
        runPromise.then(() => {}).catch(() => {});
        return { workflowId, workflowType, status: 'running', async: true };
    }
    await runPromise;
    const wf = await db.query('SELECT status, result, risk_level FROM agent_workflows WHERE workflow_id=$1::uuid', [workflowId]);
    return { workflowId, workflowType, ...wf.rows[0] };
}

async function run(workflowId, workflowType, input, ctx) {
    const graphDef = graphRegistry.get(workflowType);
    resetSteps(workflowId);
    const app = graphDef.compile(workflowId, ctx);   // build graph bound to this run

    const initialState = {
        workflowId, workflowType,
        userId: ctx.userId, role: ctx.role,
        industryId: ctx.industryId, parkId: ctx.parkId,
        period: input.periodYear ? { year: input.periodYear, quarter: input.periodQuarter } : null,
        input: sanitizeInput(input), status: 'running'
    };
    const finalState = await app.invoke(initialState, { recursionLimit: 60 });
    await close(workflowId, finalState, ctx);
    return finalState;
}

/** Resume a waiting/failed workflow (after approval decision or restart). */
async function resume(workflowId, ctx) {
    const wf = await db.query('SELECT * FROM agent_workflows WHERE workflow_id=$1::uuid', [workflowId]);
    if (!wf.rows.length) throw new AgentError('VALIDATION_ERROR', 'Workflow not found');
    const w = wf.rows[0];
    if (!['waiting_approval', 'failed', 'running'].includes(w.status)) {
        return { workflowId, status: w.status, note: 'nothing to resume' };
    }
    const graphDef = graphRegistry.get(w.workflow_type);
    if (!graphDef) throw new AgentError('VALIDATION_ERROR', 'Graph no longer registered');
    if (w.role !== ctx.role || (w.industry_id && ctx.role === 'industry' && Number(w.industry_id) !== Number(ctx.industryId))) {
        throw new AgentError('AUTHORIZATION_ERROR', 'Workflow belongs to a different scope');
    }
    await db.query(`UPDATE agent_workflows SET status='running', updated_at=NOW() WHERE workflow_id=$1::uuid`, [workflowId]);
    await agentAudit.event({ workflowId, type: 'workflow_start', actor: ctx.actor || ctx.role,
        detail: { resumed: true, previousStatus: w.status } });
    const resumed = await run(workflowId, w.workflow_type, w.input, ctx).catch(async (e) => {
        await fail(workflowId, e, ctx);
    });
    return { workflowId, resumed: true };
}

async function close(workflowId, finalState, ctx) {
    const status = finalState.status === 'failed' ? 'failed'
        : finalState.status === 'waiting_approval' ? 'waiting_approval'
        : 'completed';
    await db.query(
        `UPDATE agent_workflows
            SET status=$2, risk_level=$3, result=$4::jsonb, ended_at=NOW(), updated_at=NOW()
          WHERE workflow_id=$1::uuid`,
        [workflowId, status, finalState.riskLevel || 'low',
         JSON.stringify({ summary: (finalState.result && finalState.result.summary) || null,
                          recommendedAction: (finalState.result && finalState.result.recommended_action) || null,
                          submissionId: finalState.submissionId || null,
                          answer: (finalState.result && finalState.result.data) || null,
                          errors: finalState.errors || [] })]);
    await agentAudit.event({ workflowId, type: 'workflow_end', actor: ctx.actor || ctx.role,
        status, detail: { riskLevel: finalState.riskLevel, errors: (finalState.errors || []).length } });
    // Live push to any SSE listeners (gov role sees workflow completions).
    try {
        const { liveBus } = require('../../services/notify');
        liveBus.emit('role:govt', { id: `wf-${workflowId}`, category: 'system', severity: 'info',
            title: `Agent workflow ${status}`, message: `${finalState.workflowType} → ${status}`,
            link: '/agent-center', created_at: new Date().toISOString() });
    } catch (_) { /* SSE optional */ }
}

async function fail(workflowId, e, ctx) {
    await db.query(
        `UPDATE agent_workflows
            SET status='failed', error_class=$2, error_message=$3, ended_at=NOW(), updated_at=NOW()
          WHERE workflow_id=$1::uuid`,
        [workflowId, e.errorClass || 'TOOL_ERROR', String(e.message || '').slice(0, 500)]);
    await agentAudit.event({ workflowId, type: 'failure', actor: ctx ? ctx.actor : null,
        status: 'failed', detail: { errorClass: e.errorClass || 'TOOL_ERROR', message: String(e.message || '').slice(0, 200) } });
}

/** Boot-time recovery: workflows stuck in 'running' from a dead worker. */
async function recoverPending() {
    const { rows } = await db.query(
        `SELECT workflow_id, workflow_type, initiated_by, role, industry_id, park_id
           FROM agent_workflows WHERE status='running' AND started_at < NOW() - INTERVAL '10 minutes'`);
    for (const w of rows) {
        await agentAudit.event({ workflowId: w.workflow_id, type: 'retry', actor: 'system',
            detail: { recovered: true, reason: 'worker restart — workflow resumed from persisted state' } });
        const ctx = { userId: w.initiated_by, role: w.role, industryId: w.industry_id, parkId: w.park_id, actor: 'system-recovery' };
        await run(w.workflow_id, w.workflow_type, { recover: true }, ctx).catch(async (e) => fail(w.workflow_id, e, ctx));
    }
    return rows.length;
}

function sanitizeInput(input) {
    const s = JSON.stringify(input || {});
    if (s.length > 20000) return { truncated: true };
    const cleaned = JSON.parse(s);
    for (const k of Object.keys(cleaned)) if (/secret|password|token|base64/i.test(k)) cleaned[k] = '[REDACTED]';
    return cleaned;
}

module.exports = { start, resume, recoverPending, classifyTask };
