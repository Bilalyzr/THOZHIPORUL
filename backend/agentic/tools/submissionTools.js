// submissionTools.js — PRD §11: submission.get / validate / createDraft /
// submit / version. All writes go through the audited submissionService
// (validation, calendar windows, append-only versioning) — never raw SQL.

const { z } = require('zod');
const db = require('../../db');
const registry = require('./registry');
const submissionService = require('../../services/submissionService');
const { validateSubmission } = require('../../validators/submissionValidator');

const PeriodInput = z.object({ industryId: z.number().int().optional(),
    periodYear: z.number().int(), periodQuarter: z.number().int().min(1).max(4).nullable() });

registry.register({
    name: 'submission.get',
    description: 'Read a submission (full versioned payload) or the industry filing history.',
    roles: ['industry', 'govt', 'admin', 'system'],
    inputSchema: z.object({ industryId: z.number().int(), submissionId: z.number().int().optional() }),
    outputSchema: z.any(),
    handler: async (args, ctx) => {
        if (args.submissionId) {
            const row = await db.query('SELECT * FROM data_submissions WHERE id=$1', [args.submissionId]);
            if (!row.rows.length) return { submission: null };
            if (ctx.role === 'industry' && row.rows[0].industry_id !== ctx.industryId) {
                throw Object.assign(new Error('Not your submission'), { errorClass: 'AUTHORIZATION_ERROR' });
            }
            const payload = await submissionService.getSubmissionPayload(db, args.submissionId);
            const versions = await db.query(
                'SELECT version_no, change_kind, amendment_reason, diff, filed_at, filed_by, source FROM submission_versions WHERE submission_id=$1 ORDER BY version_no', [args.submissionId]);
            return { submission: payload, versions: versions.rows };
        }
        const { rows } = await db.query(
            `SELECT ds.id, ds.period_year, ds.period_quarter, ds.status, ds.is_late, ds.submitted_at
               FROM data_submissions ds WHERE ds.industry_id=$1 ORDER BY ds.period_year DESC, ds.period_quarter DESC NULLS LAST LIMIT 24`,
            [args.industryId]);
        return { history: rows };
    }
});

registry.register({
    name: 'submission.validate',
    description: 'Deterministic server-side validation (types, ranges, units, period, cross-field).',
    roles: ['industry', 'govt', 'admin', 'system'],
    inputSchema: z.object({ payload: z.record(z.any()), isAmendment: z.boolean().optional() }),
    outputSchema: z.object({ ok: z.boolean(), errors: z.array(z.any()) }),
    handler: async (args) => await validateSubmission(args.payload, { isAmendment: !!args.isAmendment })
});

registry.register({
    name: 'submission.createDraft',
    description: 'Create a REVIEWABLE draft payload (never writes). Marks provenance.',
    roles: ['industry', 'govt', 'admin'],
    inputSchema: z.object({ payload: z.record(z.any()), provenance: z.string().default('agent-capture') }),
    outputSchema: z.object({ draft: z.record(z.any()), reviewRequired: z.literal(true) }),
    handler: async (args) => ({ draft: { ...args.payload, _provenance: args.provenance }, reviewRequired: true })
});

registry.register({
    name: 'submission.submit',
    description: 'Submit reviewed data through the audited filing pipeline (validate → window → versioned write → findings).',
    roles: ['industry', 'admin'],
    inputSchema: z.object({ industryId: z.number().int(), userId: z.number().int().nullable().optional(),
        payload: z.record(z.any()), source: z.enum(['web', 'bulk', 'api', 'agent']).default('agent') }),
    outputSchema: z.object({ status: z.number(), body: z.record(z.any()) }),
    risk: 'medium', write: true,
    handler: async (args, ctx) => await submissionService.fileSubmission({
        industryId: args.industryId, userId: args.userId !== undefined ? args.userId : ctx.userId,
        payload: args.payload, source: args.source, ip: null })
});

registry.register({
    name: 'submission.version',
    description: 'Immutable revision evidence: versions + machine-readable diffs.',
    roles: ['industry', 'govt', 'admin', 'system'],
    inputSchema: z.object({ submissionId: z.number().int() }),
    outputSchema: z.any(),
    handler: async (args) => {
        const { rows } = await db.query(
            'SELECT version_no, change_kind, amendment_reason, payload, previous_payload, diff, filed_at, source FROM submission_versions WHERE submission_id=$1 ORDER BY version_no',
            [args.submissionId]);
        return { versions: rows };
    }
});

registry.register({
    name: 'history.compare',
    description: 'Period-over-period and year-over-year comparison for a metric.',
    roles: ['industry', 'govt', 'admin', 'system'],
    inputSchema: z.object({ industryId: z.number().int().optional(), parkId: z.number().int().optional(),
        metric: z.enum(['investment', 'employment', 'water', 'power', 'turnover']) }),
    outputSchema: z.any(),
    handler: async (args) => {
        const { quarterlySeries } = require('../../services/forecastService');
        const scope = args.industryId ? 'industry' : 'park';
        const id = args.industryId || args.parkId || null;
        const series = await quarterlySeries(args.metric, scope, id);
        const out = series.map((p, i) => {
            const prev = series[i - 1];
            const prevY = series.find(x => x.year === p.year - 1 && x.quarter === p.quarter);
            return { ...p,
                qoq_pct: prev && prev.value > 0 ? Math.round(((p.value - prev.value) / prev.value) * 1000) / 10 : null,
                yoy_pct: prevY && prevY.value > 0 ? Math.round(((p.value - prevY.value) / prevY.value) * 1000) / 10 : null };
        });
        return { metric: args.metric, series: out };
    }
});

module.exports = {};
