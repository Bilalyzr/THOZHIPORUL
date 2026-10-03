// specialists.js — the 11 specialist agents (PRD §7.1–7.11).
// Each agent = thin, audited coordinator over REGISTERED TOOLS backed by
// the existing deterministic services. No agent contains business truth.
// Every run() returns an AgentResult-shaped object (schema-validated by
// the node wrapper before it enters workflow state).

const { register, toolCtx } = require('./registry');
const tools = require('../tools/registry');
const riskEngine = require('../governance/riskEngine');

// ---------------- 7.1 CAPTURE ----------------
register({
    name: 'capture', description: 'Document → structured draft fields with confidence + evidence (never writes).',
    tools: ['document.extract', 'submission.createDraft'],
    async run(state, ctx, wf) {
        const tc = toolCtx('capture', ctx, wf.workflowId, wf.budget);
        if (!state.input.document && !state.input.documentBase64) {
            return { agent: 'capture', result: { status: 'skipped', summary: 'No document provided — form-based submission.',
                data: { draft: state.input.payload || null } } };
        }
        const doc = state.input.document || {};
        const ext = await tools.execute('document.extract', {
            fileName: doc.fileName, base64: doc.base64, mimeType: doc.mimeType
        }, tc);
        // Persist extraction evidence rows (review surface).
        const db = require('../../db');
        for (const f of ext.fields) {
            await db.query(
                `INSERT INTO ai_extractions (workflow_id, field, value, unit, confidence, source_document, page, evidence)
                 VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)`,
                [wf.workflowId, f.field, f.value, f.unit || null, f.confidence || null,
                 doc.fileName || null, f.page || null, (f.evidence || '').slice(0, 500)]).catch(() => {});
        }
        const draft = {};
        for (const f of ext.fields) draft[f.field] = f.value;
        const lowConf = ext.fields.some(f => (f.confidence || 0) < 0.6);
        return { agent: 'capture', result: {
            status: ext.status === 'extracted' ? (lowConf ? 'review_required' : 'ok') : 'skipped',
            confidence: ext.fields.length ? Math.min(...ext.fields.map(f => f.confidence || 0)) : null,
            summary: `${ext.fields.length} field(s) extracted via ${ext.method}; draft prepared for HUMAN review.${ext.message ? ' ' + ext.message : ''}`,
            evidence: ext.fields.map(f => ({ source: 'document.extract', ref: f.field, note: (f.evidence || '').slice(0, 100) })),
            data: { draft, extractionStatus: ext.status, method: ext.method, fields: ext.fields }
        } };
    }
});

// ---------------- 7.2 VALIDATION ----------------
register({
    name: 'validation', description: 'Deterministic server-side validation of the draft/payload.',
    tools: ['submission.validate'],
    async run(state, ctx, wf) {
        const tc = toolCtx('validation', ctx, wf.workflowId, wf.budget);
        const payload = (state.draft && Object.keys(state.draft).length ? state.draft : null)
            || state.input.payload || {};
        const v = await tools.execute('submission.validate', { payload }, tc);
        if (!v.ok) {
            return { agent: 'validation', result: {
                status: 'review_required',
                summary: `Validation rejected ${v.errors.length} field(s) — nothing persisted.`,
                findings: v.errors.slice(0, 10).map(e => ({ severity: 'warning', metric: e.field, message: e.message })),
                data: { validation: v } } };
        }
        return { agent: 'validation', result: { status: 'ok', summary: 'Server-side validation passed.',
            data: { validation: v, payload } } };
    }
});

// ---------------- 7.3 CONSISTENCY ----------------
register({
    name: 'consistency', description: 'Cross-period / cross-source consistency comparisons.',
    tools: ['history.compare', 'compliance.evaluate'],
    async run(state, ctx, wf) {
        const tc = toolCtx('consistency', ctx, wf.workflowId, wf.budget);
        if (ctx.industryId) {
            const h = await tools.execute('history.compare', { industryId: ctx.industryId, metric: 'employment' }, tc);
            const last = h.series[h.series.length - 1];
            const prev = h.series[h.series.length - 2];
            const findings = [];
            if (last && prev && last.qoq_pct !== null && Math.abs(last.qoq_pct) > 50) {
                findings.push({ severity: 'high', metric: 'employment',
                    message: `Employment ${prev.value} → ${last.value} (${last.qoq_pct > 0 ? '+' : ''}${last.qoq_pct}% vs previous filed quarter)`,
                    evidence: { previous: prev, current: last } });
            }
            return { agent: 'consistency', result: {
                status: findings.length ? 'review_required' : 'ok',
                summary: findings.length ? 'Cross-period inconsistency detected.' : 'No cross-period inconsistencies.',
                findings, data: { series: h.series } } };
        }
        return { agent: 'consistency', result: { status: 'skipped', summary: 'No industry scope for consistency comparison.' } };
    }
});

// ---------------- 7.4 ANOMALY ----------------
register({
    name: 'anomaly', description: 'Explainable statistical anomaly detection (POP%, IQR, version-change, corroboration).',
    tools: ['anomaly.detect'],
    async run(state, ctx, wf) {
        const tc = toolCtx('anomaly', ctx, wf.workflowId, wf.budget);
        const out = state.submissionId
            ? await tools.execute('anomaly.detect', { submissionId: state.submissionId }, tc)
            : { findings: 0, note: 'no submission yet — post-write detection will run' };
        const list = out.findingsList || [];
        return { agent: 'anomaly', result: {
            status: (out.findings || 0) > 0 ? 'review_required' : 'ok',
            summary: `${out.findings || 0} explainable anomaly finding(s) (detectors: POP%, IQR fence, version-change, corroboration).`,
            findings: list.slice(0, 8).map(f => ({ severity: f.severity, metric: f.metric, message: f.reason || f.message })),
            evidence: [{ source: 'data_findings', ref: state.submissionId }],
            data: out } };
    }
});

// ---------------- 7.5 COMPLIANCE (existing engine!) ----------------
register({
    name: 'compliance', description: 'Invokes the deterministic compliance engine; interprets (never re-implements) rules.',
    tools: ['compliance.evaluate'],
    async run(state, ctx, wf) {
        const tc = toolCtx('compliance', ctx, wf.workflowId, wf.budget);
        if (!ctx.industryId) return { agent: 'compliance', result: { status: 'skipped', summary: 'No industry scope.' } };
        const ev = await tools.execute('compliance.evaluate', { industryId: ctx.industryId }, tc);
        const sev = ev.openViolations ? ev.openViolations.map(v => v.severity) : [];
        const worst = sev.includes('critical') ? 'critical' : sev.includes('high') ? 'high' : sev.includes('medium') ? 'warning' : 'info';
        return { agent: 'compliance', result: {
            status: sev.length ? 'review_required' : 'ok',
            summary: `Compliance engine: ${ev.openViolations ? ev.openViolations.length : 0} open violation(s), ${ev.consistencyFindings || 0} consistency finding(s).`,
            findings: (ev.openViolations || []).slice(0, 6).map(v => ({ severity: worst === 'info' ? 'warning' : worst, metric: v.rule_code, message: v.description })),
            evidence: [{ source: 'compliance_rules/compliance_violations', ref: ctx.industryId }],
            data: ev } };
    }
});

// ---------------- 7.6 FORECAST ----------------
register({
    name: 'forecast', description: 'Quarterly forecasts with honest INSUFFICIENT_DATA states.',
    tools: ['forecast.generate', 'park.capacity'],
    async run(state, ctx, wf) {
        const tc = toolCtx('forecast', ctx, wf.workflowId, wf.budget);
        const req = state.input.forecast || { metric: 'power', scope: 'state', scopeId: null, horizon: 4 };
        const fc = await tools.execute('forecast.generate', req, tc);
        return { agent: 'forecast', result: {
            status: fc.data_status === 'OK' ? 'ok' : 'skipped',
            summary: fc.data_status === 'OK'
                ? `Forecast via ${fc.model} on ${fc.training_periods} quarters: ${fc.projection.map(p => `${p.period}=${p.value}`).join(', ')}`
                : `INSUFFICIENT_DATA (${fc.available_points} quarter(s); ${fc.minimum_required}) — no forecast fabricated.`,
            confidence: fc.data_status === 'OK' ? 0.7 : null,
            evidence: [{ source: 'forecasts', ref: `${req.metric}/${req.scope}` }],
            data: fc } };
    }
});

// ---------------- 7.7 ANALYTICS/QUERY ----------------
register({
    name: 'analytics', description: 'Safe NL→vetted-view analytics with citations (read-only).',
    tools: ['analytics.query'],
    async run(state, ctx, wf) {
        const tc = toolCtx('analytics', ctx, wf.workflowId, wf.budget);
        const plan = state.input.queryPlan;
        if (!plan) return { agent: 'analytics', result: { status: 'skipped', summary: 'No query plan resolved.' } };
        const out = await tools.execute('analytics.query', plan, tc);
        return { agent: 'analytics', result: {
            status: 'ok', summary: `${out.rowCount} row(s) from vetted view ${out.view}.`,
            evidence: [{ source: out.citation }],
            data: out } };
    }
});

// ---------------- 7.8 DECISION ----------------
register({
    name: 'decision', description: 'Evidence aggregation → risk assessment + recommendation (never enforcement).',
    tools: [],
    async run(state) {
        const r = riskEngine.classify({ findings: state.findings, confidence: state.confidence });
        const top = (state.findings || []).filter(f => f.severity === 'high' || f.severity === 'critical');
        const recommendation = top.length
            ? `Review ${top.length} high-severity finding(s): ${top.slice(0, 3).map(f => f.message.slice(0, 80)).join('; ')} — officer review recommended.`
            : 'No high-severity findings; proceed with standard lifecycle.';
        return { agent: 'decision', result: {
            status: r.requiresApproval ? 'review_required' : 'ok',
            risk: r.level, confidence: state.confidence,
            summary: `Risk ${r.level} (${r.reason}).`,
            recommended_action: recommendation,
            requires_approval: r.requiresApproval,
            data: { risk: r } } };
    }
});

// ---------------- 7.9 NOTIFICATION ----------------
register({
    name: 'notification', description: 'Prepares permitted notifications; sends only through policy/provider truth.',
    tools: ['notification.prepare', 'notification.send'],
    async run(state, ctx, wf) {
        const tc = toolCtx('notification', ctx, wf.workflowId, wf.budget);
        const draft = await tools.execute('notification.prepare', {
            roleScope: 'govt', category: 'compliance', severity: state.riskLevel === 'critical' ? 'error' : 'warning',
            title: `Agent workflow ${state.workflowType}: ${state.riskLevel} risk`,
            message: state.result && state.result.summary ? String(state.result.summary).slice(0, 400) : 'Workflow completed.',
            link: '/agent-center'
        }, tc);
        // Sending is gated: only when policy allowed it (statutory engine) or an
        // approval exists; otherwise the DRAFT is the deliverable.
        return { agent: 'notification', result: {
            status: 'ok', summary: 'Notification drafted (NOT_SENT). Delivery requires officer send or approval gate.',
            data: { draft: draft.draft, deliveryStatus: 'NOT_SENT' } } };
    }
});

// ---------------- 7.10 REPORT ----------------
register({
    name: 'report', description: 'Evidence-backed report artifacts from the audited v7 engine.',
    tools: ['report.generate'],
    async run(state, ctx, wf) {
        const tc = toolCtx('report', ctx, wf.workflowId, wf.budget);
        const type = state.input.reportType || 'compliance';
        const rep = await tools.execute('report.generate', { type }, tc);
        return { agent: 'report', result: {
            status: 'ok', summary: `Report "${rep.title}" generated from live data (${rep.rowCount} rows).`,
            evidence: [{ source: 'report_generation_log', ref: type }],
            data: { report: rep } } };
    }
});

// ---------------- 7.11 COPILOT ----------------
register({
    name: 'copilot', description: 'Unified assistant — routes questions to the existing DB-backed assistant + tools.',
    tools: ['analytics.query', 'forecast.generate', 'history.compare', 'park.capacity'],
    async run(state, ctx, wf) {
        const question = state.input.question || '';
        // Deterministic NL planner (regex intent → vetted query plan / forecast).
        const plan = planQuestion(question, ctx);
        if (!plan) {
            return { agent: 'copilot', result: { status: 'ok',
                summary: 'No safe plan resolved for the question; suggesting the DB-backed assistant.',
                data: { fallback: 'assistant' } } };
        }
        const tc = toolCtx('copilot', ctx, wf.workflowId, wf.budget);
        if (plan.kind === 'forecast') {
            const fc = await tools.execute('forecast.generate', plan.spec, tc);
            return { agent: 'copilot', result: { status: 'ok',
                summary: fc.data_status === 'OK'
                    ? `Forecast (${fc.model}): ${fc.projection.map(p => `${p.period}=${p.value}`).join(', ')}`
                    : `INSUFFICIENT_DATA — ${fc.minimum_required}`,
                evidence: [{ source: 'forecastService' }],
                data: { forecast: fc } } };
        }
        const out = await tools.execute('analytics.query', plan.spec, tc);
        return { agent: 'copilot', result: { status: 'ok',
            summary: `${out.rowCount} row(s) from ${out.view}.`,
            evidence: [{ source: out.citation }],
            data: { query: out } } };
    }
});

// Deterministic question planner (extendable; LLM enhancement optional later).
function planQuestion(q, ctx) {
    const s = String(q).toLowerCase();
    const metricMap = { investment: 'investment_amount', employment: 'permanent_employees',
                        water: 'water_consumption', power: 'power_usage', turnover: 'annual_turnover' };
    const fcMetric = s.match(/power|electricity/) ? 'power' : s.match(/water/) ? 'water'
        : s.match(/employment|jobs?/) ? 'employment' : s.match(/investment/) ? 'investment'
        : s.match(/turnover/) ? 'turnover' : null;
    if (fcMetric && /forecast|project|next (four|4)|q\+/.test(s)) {
        return { kind: 'forecast', spec: { metric: fcMetric, scope: ctx.industryId ? 'industry' : 'state',
            scopeId: ctx.industryId || null, horizon: 4 } };
    }
    if (/missing|not (yet )?submitted|non.?filer/.test(s)) {
        return { kind: 'query', spec: { view: 'agent_v_filing_status',
            columns: ['company_name', 'period_year', 'period_quarter', 'due_on', 'submission_status'],
            where: [], orderBy: { column: 'due_on', dir: 'asc' }, limit: 50 } };
    }
    if (/compliance|score/.test(s)) {
        return { kind: 'query', spec: { view: 'agent_v_compliance',
            columns: ['company_name', 'overall_score', 'open_violations', 'open_flags'],
            where: [], orderBy: { column: 'overall_score', dir: 'asc' }, limit: 20 } };
    }
    for (const [word, col] of Object.entries(metricMap)) {
        if (s.includes(word)) {
            return { kind: 'query', spec: { view: 'agent_v_industry_metrics',
                columns: ['company_name', col], where: [], orderBy: { column: col, dir: 'desc' }, limit: 20 } };
        }
    }
    return null;
}

module.exports = { planQuestion };
