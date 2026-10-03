// submissionWorkflow.js — WORKFLOW 1 (PRD §10, exact graph):
// START → capture → validation → consistency → anomaly → compliance →
// risk assessment → (LOW/MED continue | HIGH human approval) →
// versioned submission → analytics refresh → forecast refresh →
// notification → audit → END. Fail path included; every node persists.

const { StateGraph } = require('@langchain/langgraph');
const { WorkflowState, makeNode, START, END } = require('../orchestrator/state');
const graphRegistry = require('../orchestrator/graphRegistry');
const { riskRouter } = require('../orchestrator/router');
const agents = require('../agents/registry');
const approvalGate = require('../governance/approvalGate');
const tools = require('../tools/registry');
const db = require('../../db');

graphRegistry.register('submission', {
    version: '1.0',
    description: 'Document-assisted quarterly submission with validation, anomaly, compliance, risk gate and versioned write.',
    compile(workflowId, ctx) {
        const budget = { count: 0 };
        const wf = { workflowId, budget };
        const node = (name, agentName, fn) => makeNode(workflowId, name, agentName, fn);
        const runAgent = async (state, name) => {
            const agent = agents.get(name);
            if (!agent) throw new Error(`agent ${name} not registered`);
            const out = await agent.run(state, ctx, wf);
            const patch = { agentResults: { [out.agent]: out.result } };
            if (out.result.findings) patch.findings = out.result.findings;
            if (out.result.evidence) patch.evidence = out.result.evidence;
            if (out.result.confidence !== null && out.result.confidence !== undefined) patch.confidence = out.result.confidence;
            if (out.result.data && out.result.data.draft) patch.draft = out.result.data.draft;
            if (out.result.status === 'failed') patch.status = 'failed';
            return patch;
        };

        const g = new StateGraph(WorkflowState)
            .addNode('capture', node('capture', 'capture', s => runAgent(s, 'capture')))
            .addNode('validation', node('validation', 'validation', s => runAgent(s, 'validation')))
            .addNode('consistency', node('consistency', 'consistency', s => runAgent(s, 'consistency')))
            .addNode('anomaly', node('anomaly', 'anomaly', s => runAgent(s, 'anomaly')))
            .addNode('compliance', node('compliance', 'compliance', s => runAgent(s, 'compliance')))
            .addNode('risk', node('risk', 'decision', async (s) => {
                const r = require('../governance/riskEngine').classify({ findings: s.findings, confidence: s.confidence });
                return { riskLevel: r.level, agentResults: { decision: { status: r.requiresApproval ? 'review_required' : 'ok', risk: r.level,
                    summary: `Risk ${r.level} (${r.reason})`, requires_approval: r.requiresApproval, recommended_action: null, data: { risk: r } } } };
            }))
            .addNode('approval', node('approval', 'supervisor', async (s) => {
                // HUMAN GATE: high/critical risk pauses the workflow.
                const approval = await approvalGate.request({
                    workflowId, action: 'submission.accept_high_risk',
                    affectedEntities: [{ industryId: ctx.industryId, period: s.period }],
                    evidenceRefs: s.evidence.slice(0, 10).map(e => ({ source: e.source, ref: e.ref || null })),
                    recommendation: (s.agentResults.decision && s.agentResults.decision.summary) || 'High-risk submission review',
                    riskLevel: s.riskLevel, requestedByAgent: 'supervisor'
                });
                return { pendingApproval: { approvalId: approval.approval_id, action: approval.requested_action, decision: null },
                         status: 'waiting_approval' };
            }))
            .addNode('write', node('write', 'supervisor', async (s) => {
                // Versioned write ONLY through the audited domain service.
                if (ctx.role !== 'industry' && ctx.role !== 'admin') {
                    return { status: 'failed', errors: [{ node: 'write', errorClass: 'AUTHORIZATION_ERROR', message: 'Only industry/admin contexts may write filings.' }] };
                }
                const payload = (s.draft && Object.keys(s.draft).filter(k => !k.startsWith('_')).length ? s.draft : s.input.payload) || {};
                payload.periodYear = s.input.periodYear || (s.period && s.period.year);
                payload.periodQuarter = s.input.periodQuarter || (s.period && s.period.quarter);
                const out = await tools.execute('submission.submit', {
                    industryId: ctx.industryId, payload, source: 'agent'
                }, { workflowId, agentName: 'supervisor', role: ctx.role, userId: ctx.userId,
                    industryId: ctx.industryId, parkId: ctx.parkId, actor: ctx.actor, toolBudget: budget });
                if (out.status !== 201) {
                    return { status: 'failed', errors: [{ node: 'write', errorClass: 'VALIDATION_ERROR', message: JSON.stringify(out.body).slice(0, 300) }] };
                }
                return { submissionId: out.body.submissionId,
                    result: { status: 'ok', summary: `Filed as submission ${out.body.submissionId} (v${out.body.version}, ${out.body.changeKind}).` } };
            }))
            .addNode('analytics_refresh', node('analytics_refresh', 'supervisor', async (s) => {
                // Deterministic refresh: recompute scores for this industry (real service).
                const { computeAllScores } = require('../../services/complianceScoring');
                await computeAllScores().catch(() => {});
                return {};
            }))
            .addNode('forecast_refresh', node('forecast_refresh', 'forecast', async (s) => {
                const fc = await tools.execute('forecast.generate', { metric: 'power', scope: 'state', scopeId: null, horizon: 4 },
                    { workflowId, agentName: 'forecast', role: ctx.role, userId: ctx.userId, industryId: ctx.industryId, parkId: ctx.parkId, actor: ctx.actor, toolBudget: budget });
                return { agentResults: { forecast: { status: fc.data_status === 'OK' ? 'ok' : 'skipped',
                    summary: fc.data_status === 'OK' ? `Refreshed forecast (${fc.model})` : 'INSUFFICIENT_DATA for forecast refresh (honest skip)', data: { forecast: fc } } } };
            }))
            .addNode('notify', node('notify', 'notification', s => {
                const a = agents.get('notification'); return a.run(s, ctx, wf);
            }))
            .addNode('audit_close', node('audit_close', 'supervisor', async (s) => {
                await require('../audit/agentAudit').chained(ctx.userId, 'AGENT_WORKFLOW_SUBMISSION_CLOSED', {
                    entityType: 'agent_workflow', entityId: workflowId,
                    payload: { submissionId: s.submissionId, risk: s.riskLevel }
                });
                return { status: s.status === 'waiting_approval' ? 'waiting_approval' : 'completed' };
            }))
            .addNode('fail', node('fail', 'supervisor', async (s) => {
                await db.query(`UPDATE agent_workflows SET error_class='TOOL_ERROR', error_message=$2 WHERE workflow_id=$1::uuid`,
                    [workflowId, JSON.stringify(s.errors.slice(0, 3)).slice(0, 400)]).catch(() => {});
                return { status: 'failed' };
            }))
            .addEdge(START, 'capture')
            .addEdge('capture', 'validation')
            .addEdge('validation', 'consistency')
            .addEdge('consistency', 'anomaly')
            .addEdge('anomaly', 'compliance')
            .addEdge('compliance', 'risk')
            .addConditionalEdges('risk', riskRouter, { continue: 'write', approval: 'approval', wait: 'audit_close', fail: 'fail' })
            .addEdge('approval', 'audit_close')           // paused; resume path re-enters at write
            .addEdge('write', 'analytics_refresh')
            .addEdge('analytics_refresh', 'forecast_refresh')
            .addEdge('forecast_refresh', 'notify')
            .addEdge('notify', 'audit_close')
            .addEdge('audit_close', END)
            .addEdge('fail', END);
        return g.compile();
    }
});
