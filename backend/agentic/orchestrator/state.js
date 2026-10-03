// orchestrator/state.js — typed LangGraph state (PRD §20) + node wrapper
// that persists every transition (checkpoint) and validates every agent
// result against the AgentResult schema before it enters state.

const { Annotation, START, END } = require('@langchain/langgraph');
const db = require('../../db');
const { AgentResult } = require('../schemas/agentSchemas');
const agentAudit = require('../audit/agentAudit');

// Append-style channels keep the full trace inside state; scalars are
// last-write (standard LangGraph semantics).
const WorkflowState = Annotation.Root({
    workflowId: Annotation({ reducer: (_o, n) => n, default: () => null }),
    workflowType: Annotation({ reducer: (_o, n) => n, default: () => null }),
    userId: Annotation({ reducer: (_o, n) => n, default: () => null }),
    role: Annotation({ reducer: (_o, n) => n, default: () => null }),
    industryId: Annotation({ reducer: (_o, n) => n, default: () => null }),
    parkId: Annotation({ reducer: (_o, n) => n, default: () => null }),
    period: Annotation({ reducer: (_o, n) => n, default: () => null }),
    currentNode: Annotation({ reducer: (_o, n) => n, default: () => null }),
    status: Annotation({ reducer: (_o, n) => n, default: () => 'running' }),
    riskLevel: Annotation({ reducer: (_o, n) => n, default: () => 'low' }),
    confidence: Annotation({ reducer: (_o, n) => n, default: () => null }),
    input: Annotation({ reducer: (_o, n) => n, default: () => ({}) }),
    draft: Annotation({ reducer: (_o, n) => n, default: () => null }),
    submissionId: Annotation({ reducer: (_o, n) => n, default: () => null }),
    findings: Annotation({ reducer: (o, n) => [...(o || []), ...(n || [])], default: () => [] }),
    evidence: Annotation({ reducer: (o, n) => [...(o || []), ...(n || [])], default: () => [] }),
    agentResults: Annotation({ reducer: (o, n) => ({ ...(o || {}), [n.agent]: n.result }), default: () => ({}) }),
    toolResults: Annotation({ reducer: (o, n) => [...(o || []), ...(n || [])], default: () => [] }),
    pendingApproval: Annotation({ reducer: (_o, n) => n, default: () => null }),
    nextAction: Annotation({ reducer: (_o, n) => n, default: () => null }),
    errors: Annotation({ reducer: (o, n) => [...(o || []), ...(n || [])], default: () => [] }),
    result: Annotation({ reducer: (_o, n) => n, default: () => null })
});

let stepCounter = new Map();   // workflowId -> step_no (per process run)

/**
 * makeNode(workflowId, name, agentName, fn) — wraps a graph node with:
 * step persistence, state checkpointing, agent-result schema validation,
 * and event tracing. fn(state) returns a state-patch object; if the patch
 * has `agent` + `result`, `result` must satisfy AgentResult.
 */
function makeNode(workflowId, name, agentName, fn) {
    return async (state) => {
        const t0 = Date.now();
        const stepNo = (stepCounter.get(workflowId) || 0) + 1;
        stepCounter.set(workflowId, stepNo);
        let patch, status = 'succeeded', errorClass = null;
        try {
            patch = await fn(state) || {};
            if (patch.agent && patch.result !== undefined) {
                const check = AgentResult.safeParse(patch.result);
                if (!check.success) {
                    throw new (require('../schemas/agentSchemas').AgentError)('MODEL_ERROR',
                        `Agent ${patch.agent} returned non-conforming structured output: ${JSON.stringify(check.error.issues.slice(0, 2))}`);
                }
                patch.result = check.data;
            }
        } catch (e) {
            status = 'failed';
            errorClass = e.errorClass || 'TOOL_ERROR';
            patch = {
                errors: [{ node: name, errorClass, message: String(e.message || '').slice(0, 300) }],
                status: 'failed',
                nextAction: 'halt'
            };
        }
        const latency = Date.now() - t0;
        const { rows } = await db.query(
            `INSERT INTO agent_steps (workflow_id, step_no, node_name, agent_name, status, latency_ms, error_class, ended_at)
             VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id`,
            [workflowId, stepNo, name, agentName, status, latency, errorClass]).catch(() => ({ rows: [{}] }));
        await agentAudit.event({
            workflowId, type: 'agent_run', actor: agentName, agentId: agentName,
            status, detail: { node: name, latencyMs: latency, stepNo, errorClass }
        });
        await db.query(
            `UPDATE agent_workflows SET currentNode=$2, updated_at=NOW() WHERE workflow_id=$1::uuid`,
            [workflowId, name]).catch(() => {});
        return { ...patch, currentNode: name };
    };
}

function resetSteps(workflowId) { stepCounter.set(workflowId, 0); }

module.exports = { WorkflowState, makeNode, resetSteps, START, END };
