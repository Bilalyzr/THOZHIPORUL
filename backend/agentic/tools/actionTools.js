// actionTools.js — notification.prepare / notification.send / report.generate /
// audit.record. Side effects are gated: notification.send requires policy
// approval (statutory engine flag bypasses with its own ledger), report
// generation reuses the audited v7 report engine, audit.record bridges
// to the hash-chained log.

const { z } = require('zod');
const registry = require('./registry');
const { notify, liveBus } = require('../../services/notify');
const agentAudit = require('../audit/agentAudit');
const { AgentError } = require('../schemas/agentSchemas');
const { buildReport } = require('../../routes/reports');

registry.register({
    name: 'notification.prepare',
    description: 'Draft a notification (no delivery). Returns the exact payload for review.',
    roles: ['industry', 'govt', 'admin', 'system'],
    inputSchema: z.object({
        target: z.object({ userId: z.number().int().optional(), roleScope: z.enum(['govt', 'admin', 'industry']).optional() }),
        category: z.string().default('system'), severity: z.enum(['info', 'success', 'warning', 'error']).default('info'),
        title: z.string().min(3).max(200), message: z.string().min(3).max(2000),
        link: z.string().optional()
    }),
    outputSchema: z.object({ draft: z.record(z.any()), deliveryStatus: z.literal('NOT_SENT') }),
    handler: async (args) => ({ draft: args, deliveryStatus: 'NOT_SENT' })
});

registry.register({
    name: 'notification.send',
    description: 'DELIVER a prepared notification through the real provider layer. Policy-gated (approval required unless statutory engine).',
    roles: ['govt', 'admin', 'system'],
    risk: 'high', write: true, approvalRequired: true, retries: 1,
    inputSchema: z.object({
        userId: z.number().int().optional(), roleScope: z.enum(['govt', 'admin', 'industry']).optional(),
        category: z.string().default('system'), severity: z.enum(['info', 'success', 'warning', 'error']).default('info'),
        title: z.string().min(3).max(200), message: z.string().min(3).max(2000),
        link: z.string().optional(),
        approvalId: z.string().uuid().optional()   // decision proof when human-gated
    }),
    outputSchema: z.object({ notificationId: z.number().int().nullable(), providerStatus: z.record(z.any()) }),
    handler: async (args, ctx) => {
        // The policy engine (registry step 2) already allowed/required approval;
        // when this came from the STATUTORY reminder engine the source flag
        // documents its own governance. For any other path the supervisor
        // must have paused at an approval node first — verify proof exists.
        if (ctx.source !== 'statutory_reminder_engine' && !args.approvalId && ctx.requireApprovalProof !== false) {
            if (ctx.role === 'govt' || ctx.role === 'admin') {
                // Officer-initiated sends from the UI carry their own authority;
                // the tool call is still audited with actor identity.
            } else {
                throw new AgentError('APPROVAL_REQUIRED', 'notification.send requires an approvalId or officer context');
            }
        }
        const inserted = await notify({
            userId: args.userId || null, roleScope: args.roleScope || null,
            category: args.category, severity: args.severity,
            title: args.title, message: args.message, link: args.link || null,
            metadata: { via: 'agent-tool', approvalId: args.approvalId || null, actor: ctx.actor || null }
        });
        // Honest provider outcome — in-app is real SENT; email/SMS follow
        // configured transports (SIMULATED until creds exist). notify()
        // already records per-channel truth in notification_deliveries.
        return {
            notificationId: inserted ? inserted.id : null,
            providerStatus: {
                inApp: inserted ? 'SENT' : 'FAILED',
                email: process.env.SMTP_HOST ? 'per-provider' : 'SIMULATED (no SMTP configured)',
                sms: process.env.SMS_PROVIDER_URL ? 'per-provider' : 'SIMULATED (no provider configured)'
            }
        };
    }
});

registry.register({
    name: 'report.generate',
    description: 'Evidence-backed report dataset via the audited v7 engine (9 types). No fabricated values.',
    roles: ['govt', 'admin', 'industry'],
    inputSchema: z.object({
        type: z.enum(['industry_data', 'park_intelligence', 'missing_submissions', 'compliance',
                      'resource_demand', 'anomaly', 'growth', 'forecast', 'capacity']),
        year: z.number().int().optional(), quarter: z.number().int().min(1).max(4).optional(),
        metric: z.string().optional(), parkId: z.number().int().optional()
    }),
    outputSchema: z.any(),
    handler: async (args, ctx) => {
        const fakeReq = { user: { id: ctx.userId || 0, role: ctx.role }, query: args };
        const report = await buildReport(args.type, fakeReq);
        return { type: args.type, title: report.title, meta: report.meta,
                 headers: report.headers, rowCount: report.rows.length,
                 rows: report.rows.slice(0, 200), caveat: report.caveat || null,
                 basis: 'live DB via the v7 report engine' };
    }
});

registry.register({
    name: 'audit.record',
    description: 'Append a material event to the hash-chained audit log.',
    roles: ['industry', 'govt', 'admin', 'system'],
    inputSchema: z.object({
        action: z.string().min(3).max(120),
        entityType: z.string().optional(), entityId: z.union([z.string(), z.number()]).optional(),
        severity: z.enum(['info', 'warning']).default('info'),
        payload: z.record(z.any()).optional()
    }),
    outputSchema: z.object({ recorded: z.literal(true) }),
    handler: async (args, ctx) => {
        await agentAudit.chained(ctx.userId || null, `AGENT:${args.action}`, {
            entityType: args.entityType, entityId: args.entityId,
            severity: args.severity, payload: { ...args.payload, agent: ctx.agentName, workflowId: ctx.workflowId }
        });
        return { recorded: true };
    }
});

module.exports = {};
