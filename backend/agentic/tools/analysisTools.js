// analysisTools.js — anomaly.detect, compliance.evaluate, forecast.generate,
// park.capacity, analytics.query. Thin, audited wrappers over the EXISTING
// deterministic engines (PRD §32/§33: agents call services, never re-implement).

const { z } = require('zod');
const registry = require('./registry');
const db = require('../../db');
const anomalyService = require('../../services/anomalyService');
const consistencyEngine = require('../../services/consistencyEngine');
const forecastService = require('../../services/forecastService');
const { AgentError } = require('../schemas/agentSchemas');

// ---------------- anomaly ----------------
registry.register({
    name: 'anomaly.detect',
    description: 'Explainable anomaly detection (POP-%, IQR, version-change, corroboration) for a submission.',
    roles: ['industry', 'govt', 'admin', 'system'],
    inputSchema: z.object({ submissionId: z.number().int().optional(),
                            industryId: z.number().int().optional() }),
    outputSchema: z.any(),
    handler: async (args) => {
        if (args.submissionId) {
            const { findings, skipped } = await anomalyService.evaluateSubmission(args.submissionId, 'agent');
            const diffRow = await db.query(
                'SELECT diff FROM submission_versions WHERE submission_id=$1 ORDER BY version_no DESC LIMIT 1', [args.submissionId]);
            const diff = diffRow.rows[0] && diffRow.rows[0].diff;
            let versionFindings = 0;
            if (Array.isArray(diff) && diff.length) {
                versionFindings = await anomalyService.evaluateVersionChange(args.submissionId, diff, 'agent');
            }
            return { findings: findings + versionFindings, skipped, explainable: true };
        }
        if (args.industryId) {
            const avail = await anomalyService.dataAvailability(args.industryId);
            return { ...avail, note: 'availability probe — no anomalies fabricated below minimum history' };
        }
        throw new AgentError('VALIDATION_ERROR', 'submissionId or industryId required');
    }
});

// ---------------- compliance (existing deterministic engine) ----------------
registry.register({
    name: 'compliance.evaluate',
    description: 'Run the existing compliance engines (consistency + rule interpretation) for an industry.',
    roles: ['govt', 'admin', 'system'],
    inputSchema: z.object({ industryId: z.number().int().optional() }),
    outputSchema: z.any(),
    handler: async (args) => {
        if (args.industryId) {
            const sub = await db.query(
                `SELECT id FROM data_submissions WHERE industry_id=$1 ORDER BY submitted_at DESC LIMIT 1`, [args.industryId]);
            if (!sub.rows.length) return { evaluated: false, reason: 'no submissions on file' };
            const findings = await consistencyEngine.evaluateSubmission(sub.rows[0].id, 'agent');
            const violations = await db.query(
                `SELECT v.severity::text AS severity, v.status, r.rule_code, v.description
                   FROM compliance_violations v LEFT JOIN compliance_rules r ON r.id = v.rule_id
                  WHERE v.industry_id=$1 AND v.status <> 'resolved' ORDER BY v.severity::text`, [args.industryId]);
            return { evaluated: true, consistencyFindings: findings,
                     openViolations: violations.rows, engine: 'deterministic (compliance_rules + findings)' };
        }
        return await consistencyEngine.evaluateAll('agent');
    }
});

// ---------------- forecast ----------------
registry.register({
    name: 'forecast.generate',
    description: 'Quarterly forecast (Q+1..Q+4) with bands; explicit INSUFFICIENT_DATA when history is thin.',
    roles: ['industry', 'govt', 'admin', 'system'],
    inputSchema: z.object({
        metric: z.enum(['investment', 'employment', 'water', 'power', 'turnover', 'production']),
        scope: z.enum(['industry', 'park', 'state']).default('state'),
        scopeId: z.number().int().nullable().default(null),
        horizon: z.number().int().min(1).max(4).default(4)
    }),
    outputSchema: z.any(),
    handler: async (args, ctx) => {
        if (args.scope === 'industry') {
            const id = args.scopeId || ctx.industryId;
            if (ctx.role === 'industry' && Number(id) !== Number(ctx.industryId)) {
                throw Object.assign(new Error('scope violation'), { errorClass: 'AUTHORIZATION_ERROR' });
            }
            return await forecastService.forecast(args.metric, 'industry', id, args.horizon, { persist: true, generatedBy: 'agent' });
        }
        return await forecastService.forecast(args.metric, args.scope, args.scopeId, args.horizon, { persist: true, generatedBy: 'agent' });
    }
});

// ---------------- capacity ----------------
registry.register({
    name: 'park.capacity',
    description: 'Demand vs capacity per park (current/projected/capacity/gap/risk) — planning input.',
    roles: ['govt', 'admin', 'industry'],
    inputSchema: z.object({ parkId: z.number().int().nullable().default(null) }),
    outputSchema: z.any(),
    handler: async (args) => {
        const q = args.parkId
            ? 'SELECT * FROM industrial_parks WHERE id=$1'
            : 'SELECT * FROM industrial_parks ORDER BY id';
        const parks = (await db.query(q, args.parkId ? [args.parkId] : [])).rows;
        const out = [];
        for (const p of parks) {
            const entry = { park_id: p.id, name: p.name, resources: {} };
            for (const metric of ['water', 'power']) {
                const series = await forecastService.quarterlySeries(metric, 'park', p.id);
                const current = series.length ? series[series.length - 1].value : null;
                const fc = await forecastService.forecast(metric, 'park', p.id, 4, { persist: false });
                const projected = fc.data_status === 'OK'
                    ? Math.round(fc.projection.reduce((s, x) => s + x.value, 0) / fc.projection.length)
                    : current;
                const capacity = metric === 'water'
                    ? (Number(p.water_capacity_kl) > 0 ? Math.round(Number(p.water_capacity_kl) * 91) : null)
                    : (Number(p.power_capacity_mw) > 0 ? Math.round(Number(p.power_capacity_mw) * 1000 * 2190) : null);
                const gap = capacity !== null && projected !== null ? projected - capacity : null;
                const risk = capacity === null ? 'NOT_CONFIGURED' : projected === null ? 'NO_DEMAND_DATA'
                    : projected / capacity > 1 ? 'HIGH' : projected / capacity > 0.85 ? 'MEDIUM' : 'LOW';
                entry.resources[metric] = { current, projected, capacity, gap, risk,
                    data_status: fc.data_status, model: fc.model || null };
            }
            out.push(entry);
        }
        return { parks: out };
    }
});

// ---------------- analytics.query (SAFE parameterized, vetted views only) ----------------
const VETTED = {
    agent_v_industry_metrics: ['industry_id', 'company_name', 'park_id', 'park_name', 'operational_status',
        'investment_amount', 'annual_turnover', 'permanent_employees', 'contract_employees', 'water_consumption', 'power_usage'],
    agent_v_park_metrics: ['park_id', 'park_name', 'district', 'water_capacity_kl', 'power_capacity_mw', 'industries', 'operating_industries'],
    agent_v_compliance: ['industry_id', 'company_name', 'park_id', 'overall_score', 'open_violations', 'open_flags'],
    agent_v_resource_usage: ['industry_id', 'company_name', 'park_id', 'period_year', 'period_quarter',
        'water_consumption', 'power_usage', 'water_allocated_kl', 'sanctioned_load_kw'],
    agent_v_forecasts: ['metric', 'scope_type', 'scope_id', 'period_year', 'period_quarter',
        'predicted_value', 'lower_bound', 'upper_bound', 'model', 'generated_at'],
    agent_v_filing_status: ['period_year', 'period_quarter', 'due_on', 'closes_on', 'period_status',
        'industry_id', 'company_name', 'park_id', 'submission_id', 'submission_status', 'is_late']
};
const ALLOWED_OPS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'];

registry.register({
    name: 'analytics.query',
    description: 'Read-only query over vetted views only. Structured spec in, rows + citations out. No arbitrary SQL ever.',
    roles: ['industry', 'govt', 'admin', 'system'],
    inputSchema: z.object({
        view: z.string().refine(v => VETTED[v] !== undefined, 'view not in vetted allow-list'),
        columns: z.array(z.string()).min(1).max(12).default(['*']),
        where: z.array(z.object({
            column: z.string(), op: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte']),
            value: z.union([z.string(), z.number(), z.boolean(), z.null()])
        })).max(8).default([]),
        orderBy: z.object({ column: z.string(), dir: z.enum(['asc', 'desc']) }).optional(),
        limit: z.number().int().min(1).max(200).default(50)
    }),
    outputSchema: z.any(),
    handler: async (args, ctx) => {
        const cols = VETTED[args.view];
        if (args.columns.includes('*')) args.columns = cols;
        for (const c of args.columns) {
            if (!cols.includes(c)) throw new AgentError('VALIDATION_ERROR', `Column "${c}" not in vetted list for ${args.view}`);
        }
        const params = [];
        const whereSql = [];
        for (const w of args.where) {
            if (!cols.includes(w.column)) throw new AgentError('VALIDATION_ERROR', `Where column "${w.column}" not vetted`);
            if (!ALLOWED_OPS.includes(w.op)) throw new AgentError('VALIDATION_ERROR', `Operator "${w.op}" not allowed`);
            params.push(w.value);
            const sqlop = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' }[w.op];
            whereSql.push(`"${w.column}" ${sqlop} $${params.length}`);
        }
        // ROLE SCOPING: industry context is pinned to its own rows, always.
        if (ctx.role === 'industry') {
            if (cols.includes('industry_id')) {
                params.push(ctx.industryId);
                whereSql.push(`"industry_id" = $${params.length}`);
            } else if (args.view === 'agent_v_park_metrics') {
                params.push(ctx.parkId || -1);
                whereSql.push(`"park_id" = ANY(SELECT park_id FROM industry_profiles WHERE id = $${params.length})`);
            } else {
                throw new AgentError('AUTHORIZATION_ERROR', `View ${args.view} is not industry-scoped`);
            }
        }
        let sql = `SELECT ${args.columns.map(c => `"${c}"`).join(', ')} FROM ${args.view}`;
        if (whereSql.length) sql += ' WHERE ' + whereSql.join(' AND ');
        if (args.orderBy) {
            if (!cols.includes(args.orderBy.column)) throw new AgentError('VALIDATION_ERROR', 'orderBy column not vetted');
            sql += ` ORDER BY "${args.orderBy.column}" ${args.orderBy.dir.toUpperCase()}`;
        }
        params.push(args.limit);
        sql += ` LIMIT $${params.length}`;
        const { rows } = await db.query(sql, params);
        return { view: args.view, sql_shape: { columns: args.columns, where: args.where.length, limit: args.limit },
                 rowCount: rows.length, rows,
                 citation: `view=${args.view} (${rows.length} rows, parameterized read-only)` };
    }
});

module.exports = { VETTED };
