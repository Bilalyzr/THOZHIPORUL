// otherWorkflows.js — WORKFLOWS 2–6 (PRD §11–§15): missing-filer,
// anomaly investigation, forecast, investigation (copilot), reporting.
// All graphs share the same persisted-node/approval/audit machinery.

const { StateGraph } = require('@langchain/langgraph');
const { WorkflowState, makeNode, START, END } = require('../orchestrator/state');
const graphRegistry = require('../orchestrator/graphRegistry');
const { riskRouter, okRouter } = require('../orchestrator/router');
const agents = require('../agents/registry');
const tools = require('../tools/registry');
const approvalGate = require('../governance/approvalGate');
const agentAudit = require('../audit/agentAudit');
const db = require('../../db');

function baseCompile(workflowId, ctx, build) {
    const budget = { count: 0 };
    const wf = { workflowId, budget };
    const node = (name, agentName, fn) => makeNode(workflowId, name, agentName, fn);
    const g = new StateGraph(WorkflowState);
    build(g, node, wf, budget);
    return g.compile();
}

// ---------------- WORKFLOW 2 — MISSING FILER (period-based) ----------------
graphRegistry.register('missing_filer', {
    version: '1.0',
    description: 'Scheduler → calendar → expected filers → missing/late detection → notification (policy-gated) → audit.',
    compile(workflowId, ctx) {
        return baseCompile(workflowId, ctx, (g, node, wf, budget) => {
            const tc = (agent) => ({ workflowId, agentName: agent, role: ctx.role || 'system', userId: ctx.userId,
                industryId: ctx.industryId, parkId: ctx.parkId, actor: ctx.actor || 'scheduler', toolBudget: budget,
                source: 'statutory_reminder_engine', requireApprovalProof: false });
            g
                .addNode('detect', node('detect', 'analytics', async () => {
                    const out = await tools.execute('analytics.query', {
                        view: 'agent_v_filing_status',
                        columns: ['company_name', 'industry_id', 'period_year', 'period_quarter', 'due_on', 'closes_on', 'submission_id', 'submission_status'],
                        where: [], orderBy: { column: 'due_on', dir: 'asc' }, limit: 200
                    }, tc('analytics'));
                    const today = new Date().toISOString().slice(0, 10);
                    const missing = out.rows.filter(r => !r.submission_id && String(r.due_on).slice(0, 10) < today);
                    return { findings: missing.slice(0, 50).map(r => ({ severity: 'warning', metric: 'filing',
                        message: `${r.company_name} missing ${r.period_year}-Q${r.period_quarter} (due ${String(r.due_on).slice(0, 10)})` })),
                        result: { status: 'ok', summary: `${missing.length} missing/late filing(s) detected by PERIOD (calendar × expected filers).`,
                            data: { missing: missing.slice(0, 100) } } };
                }))
                .addNode('notify', node('notify', 'notification', async (s) => {
                    // The STATUTORY reminder engine already runs its own sweep with
                    // ledger+dedupe; the agent layer records the coordination and
                    // delegates delivery to that governed engine (source flag set).
                    const { runSubmissionReminders } = require('../../services/scheduler');
                    await runSubmissionReminders().catch(e =>
                        agentAudit.event({ workflowId, type: 'failure', actor: 'scheduler', status: 'failed',
                            detail: { errorClass: 'TOOL_ERROR', message: String(e.message || '').slice(0, 150) } }));
                    return { result: { status: 'ok',
                        summary: 'Delegated to the statutory reminder engine (own policy, ledger, honest provider statuses).' } };
                }))
                .addNode('audit_close', node('audit_close', 'supervisor', async (s) => {
                    await agentAudit.chained(ctx.userId, 'AGENT_WORKFLOW_MISSING_FILER_CLOSED', {
                        entityType: 'agent_workflow', entityId: workflowId,
                        payload: { findings: (s.findings || []).length } });
                    return { status: 'completed' };
                }))
                .addEdge(START, 'detect').addEdge('detect', 'notify').addEdge('notify', 'audit_close').addEdge('audit_close', END);
        });
    }
});

// ---------------- WORKFLOW 3 — ANOMALY INVESTIGATION ----------------
graphRegistry.register('investigation', {
    version: '1.0',
    description: 'Submission → history → anomaly → compliance → risk → evidence package → human review → audit.',
    compile(workflowId, ctx) {
        return baseCompile(workflowId, ctx, (g, node, wf, budget) => {
            const runAgent = async (s, name) => {
                const out = await agents.get(name).run(s, ctx, wf);
                const patch = { agentResults: { [out.agent]: out.result } };
                if (out.result.findings) patch.findings = out.result.findings;
                if (out.result.evidence) patch.evidence = out.result.evidence;
                return patch;
            };
            g
                .addNode('history', node('history', 'consistency', s => runAgent(s, 'consistency')))
                .addNode('anomaly', node('anomaly', 'anomaly', s => runAgent(s, 'anomaly')))
                .addNode('compliance', node('compliance', 'compliance', s => runAgent(s, 'compliance')))
                .addNode('risk', node('risk', 'decision', async (s) => {
                    const r = require('../governance/riskEngine').classify({ findings: s.findings, confidence: s.confidence });
                    return { riskLevel: r.level };
                }))
                .addNode('human_review', node('human_review', 'supervisor', async (s) => {
                    if (['high', 'critical'].includes(s.riskLevel) && !s.input.autoReviewed) {
                        const approval = await approvalGate.request({
                            workflowId, action: 'investigation.review_findings',
                            affectedEntities: [{ industryId: ctx.industryId }],
                            evidenceRefs: s.evidence.slice(0, 10).map(e => ({ source: e.source })),
                            recommendation: 'Review evidence package and resolve findings (approve/query/reject).',
                            riskLevel: s.riskLevel, requestedByAgent: 'supervisor'
                        });
                        return { pendingApproval: { approvalId: approval.approval_id, decision: null }, status: 'waiting_approval' };
                    }
                    return {};
                }))
                .addNode('evidence', node('evidence', 'decision', async (s) => ({
                    result: { status: 'ok', risk: s.riskLevel,
                        summary: `Evidence package: ${(s.findings || []).length} finding(s), ${(s.evidence || []).length} citation(s), risk ${s.riskLevel}.`,
                        evidence: s.evidence.slice(0, 10),
                        data: { findings: s.findings, versions: s.submissionId ? 'see submission.version' : null } }
                })))
                .addNode('audit_close', node('audit_close', 'supervisor', async (s) => {
                    await agentAudit.chained(ctx.userId, 'AGENT_WORKFLOW_INVESTIGATION_CLOSED', {
                        entityType: 'agent_workflow', entityId: workflowId, payload: { risk: s.riskLevel } });
                    return { status: s.status === 'waiting_approval' ? 'waiting_approval' : 'completed' };
                }))
                .addEdge(START, 'history')
                .addEdge('history', 'anomaly').addEdge('anomaly', 'compliance').addEdge('compliance', 'risk')
                .addConditionalEdges('risk', riskRouter, { continue: 'evidence', approval: 'human_review', wait: 'audit_close', fail: 'audit_close' })
                .addEdge('human_review', 'audit_close')
                .addEdge('evidence', 'audit_close')
                .addEdge('audit_close', END);
        });
    }
});

// ---------------- WORKFLOW 4 — FORECAST (officer query) ----------------
graphRegistry.register('forecast', {
    version: '1.0',
    description: 'Query → sufficiency check → series → forecast → capacity → decision → chart+evidence+answer → audit.',
    compile(workflowId, ctx) {
        return baseCompile(workflowId, ctx, (g, node, wf, budget) => {
            g
                .addNode('sufficiency', node('sufficiency', 'forecast', async (s) => {
                    const fc = await tools.execute('forecast.generate',
                        s.input.forecast || { metric: 'power', scope: 'state', scopeId: null, horizon: 4 },
                        { workflowId, agentName: 'forecast', role: ctx.role, userId: ctx.userId,
                          industryId: ctx.industryId, parkId: ctx.parkId, actor: ctx.actor, toolBudget: budget });
                    const okData = fc.data_status === 'OK';
                    return {
                        agentResults: { forecast: { status: okData ? 'ok' : 'skipped',
                            summary: okData ? `Model ${fc.model} on ${fc.training_periods} quarters.` : `INSUFFICIENT_DATA — ${fc.minimum_required}`,
                            data: { forecast: fc } } },
                        nextAction: okData ? 'capacity' : 'finish',
                        result: { status: 'ok', summary: okData ? 'Forecast generated with bounds.' : 'Explicit no-forecast state returned.', data: { forecast: fc } }
                    };
                }))
                .addNode('capacity', node('capacity', 'decision', async (s) => {
                    const cap = await tools.execute('park.capacity', { parkId: (s.input.forecast && s.input.forecast.scopeId) || null },
                        { workflowId, agentName: 'decision', role: ctx.role, userId: ctx.userId,
                          industryId: ctx.industryId, parkId: ctx.parkId, actor: ctx.actor, toolBudget: budget });
                    return { result: { status: 'ok',
                        summary: `Capacity analysis: ${cap.parks.length} park(s) evaluated (gap/risk per resource).`,
                        data: { capacity: cap } } };
                }))
                .addNode('audit_close', node('audit_close', 'supervisor', async (s) => ({
                    status: 'completed',
                    result: s.result || { status: 'ok', summary: 'Forecast workflow complete.' }
                })))
                .addEdge(START, 'sufficiency')
                .addConditionalEdges('sufficiency', s => s.nextAction === 'capacity' ? 'capacity' : 'audit_close',
                    { capacity: 'capacity', audit_close: 'audit_close' })
                .addEdge('capacity', 'audit_close')
                .addEdge('audit_close', END);
        });
    }
});

// ---------------- WORKFLOW 5 — INVESTIGATION QUESTION (copilot) ----------------
graphRegistry.register('copilot', {
    version: '1.0',
    description: 'Question → copilot planner → analytics/anomaly/history/forecast tools → cited answer → audit.',
    compile(workflowId, ctx) {
        return baseCompile(workflowId, ctx, (g, node, wf, budget) => {
            g
                .addNode('plan', node('plan', 'copilot', async (s) => {
                    const { planQuestion } = require('../agents/specialists');
                    const plan = planQuestion(s.input.question || '', ctx);
                    return { input: { ...s.input, queryPlan: plan && plan.kind === 'query' ? plan.spec : null,
                        forecast: plan && plan.kind === 'forecast' ? plan.spec : (s.input.forecast || null) } };
                }))
                .addNode('answer', node('answer', 'copilot', async (s) => {
                    const out = await agents.get('copilot').run(s, ctx, wf);
                    return { agentResults: { copilot: out.result }, result: out.result };
                }))
                .addNode('audit_close', node('audit_close', 'supervisor', async () => {
                    await agentAudit.chained(ctx.userId, 'AGENT_WORKFLOW_COPILOT_CLOSED', {
                        entityType: 'agent_workflow', entityId: workflowId, payload: {} });
                    return { status: 'completed' };
                }))
                .addEdge(START, 'plan').addEdge('plan', 'answer').addEdge('answer', 'audit_close').addEdge('audit_close', END);
        });
    }
});

// ---------------- WORKFLOW 6 — REPORT GENERATION ----------------
graphRegistry.register('reporting', {
    version: '1.0',
    description: 'Analytics + compliance + forecast + decision → report agent → evidence validation → human review (govt) → artifact.',
    compile(workflowId, ctx) {
        return baseCompile(workflowId, ctx, (g, node, wf, budget) => {
            const runAgent = async (s, name) => {
                const out = await agents.get(name).run(s, ctx, wf);
                return { agentResults: { [out.agent]: out.result } };
            };
            g
                .addNode('analytics', node('analytics', 'analytics', s => runAgent(s, 'analytics')))
                .addNode('forecast', node('forecast', 'forecast', s => runAgent(s, 'forecast')))
                .addNode('report', node('report', 'report', s => runAgent(s, 'report')))
                .addNode('human_review', node('human_review', 'supervisor', async (s) => {
                    if (ctx.role === 'govt' && !s.input.autoReviewed) {
                        const approval = await approvalGate.request({
                            workflowId, action: 'report.finalize',
                            affectedEntities: [{ parkId: ctx.parkId }],
                            evidenceRefs: [{ source: 'report_generation_log' }],
                            recommendation: 'Approve final report artifact for publication.',
                            riskLevel: 'low', requestedByAgent: 'supervisor'
                        });
                        return { pendingApproval: { approvalId: approval.approval_id, decision: null }, status: 'waiting_approval' };
                    }
                    return {};
                }))
                .addNode('audit_close', node('audit_close', 'supervisor', async (s) => {
                    await agentAudit.chained(ctx.userId, 'AGENT_WORKFLOW_REPORT_CLOSED', {
                        entityType: 'agent_workflow', entityId: workflowId, payload: { type: s.input.reportType } });
                    return { status: s.status === 'waiting_approval' ? 'waiting_approval' : 'completed' };
                }))
                .addEdge(START, 'analytics').addEdge('analytics', 'forecast').addEdge('forecast', 'report')
                .addEdge('report', 'human_review').addEdge('human_review', 'audit_close').addEdge('audit_close', END);
        });
    }
});
