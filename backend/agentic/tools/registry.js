// tools/registry.js — strict tool registry (PRD §8).
// Every tool declares schema/roles/risk/timeout/retry; agents may only
// invoke registered tools; every call is authorization-checked,
// schema-validated, timeout-bounded, retried only when retryable,
// budgeted, and fully audited.

const db = require('../../db');
const { canUseTool, assertScope } = require('../governance/permissions');
const { evaluate } = require('../governance/policyEngine');
const { AgentError, RETRYABLE } = require('../schemas/agentSchemas');
const agentAudit = require('../audit/agentAudit');

const REGISTRY = new Map();
const DEFAULT_TIMEOUT_MS = parseInt(process.env.AGENT_TOOL_TIMEOUT_MS) || 20000;
const DEFAULT_BUDGET = parseInt(process.env.AGENT_TOOL_BUDGET) || 40;

function register(def) {
    if (!def || !def.name) throw new Error('tool def requires name');
    const required = ['description', 'inputSchema', 'handler', 'roles'];
    for (const k of required) if (def[k] === undefined) throw new Error(`tool ${def.name}: missing ${k}`);
    REGISTRY.set(def.name, {
        risk: 'low', write: false, approvalRequired: false,
        timeoutMs: DEFAULT_TIMEOUT_MS, retries: 2, ...def
    });
    return def.name;
}

function get(name) { return REGISTRY.get(name) || null; }
function list() { return [...REGISTRY.values()].map(({ handler, ...meta }) => meta); }

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function withTimeout(promise, ms, toolName) {
    let timer;
    const wrapped = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new AgentError('TIMEOUT', `tool ${toolName} exceeded ${ms}ms`)), ms);
    });
    try { return await Promise.race([promise, wrapped]); }
    finally { clearTimeout(timer); }
}

/**
 * execute(name, args, ctx) — the ONLY path from agents to capabilities.
 * ctx = { workflowId, stepId, agentName, role, userId, industryId, parkId, actor,
 *         toolBudget: {count} (per-workflow counter), source? }
 */
async function execute(name, args, ctx) {
    const tool = get(name);
    if (!tool) throw new AgentError('TOOL_ERROR', `Unregistered tool "${name}" — agents may only invoke registered tools.`);

    // 1) Role authorization
    if (!canUseTool(name, ctx.role)) {
        await auditCall(name, ctx, args, null, 'denied');
        await agentAudit.event({ workflowId: ctx.workflowId, type: 'tool_call', actor: ctx.actor,
            agentId: ctx.agentName, toolId: name, status: 'denied',
            detail: { reason: `role ${ctx.role} not authorized for ${name}` } });
        throw new AgentError('AUTHORIZATION_ERROR', `Role "${ctx.role}" may not invoke tool "${name}".`);
    }

    // 2) Policy gate
    const actionMap = { 'notification.send': 'notification.send' };
    const policy = evaluate(actionMap[name] || name, ctx);
    if (policy.decision === 'block') {
        throw new AgentError('POLICY_BLOCK', policy.reason);
    }

    // 3) Tool budget (prompt-injection defense: cap runaway loops)
    if (ctx.toolBudget) {
        ctx.toolBudget.count = (ctx.toolBudget.count || 0) + 1;
        if (ctx.toolBudget.count > DEFAULT_BUDGET) {
            throw new AgentError('POLICY_BLOCK', `Tool budget exceeded (${DEFAULT_BUDGET} calls/workflow) — possible runaway loop.`);
        }
    }

    // 4) Input schema validation (untrusted args never reach handlers raw)
    const parsedIn = tool.inputSchema.safeParse(args || {});
    if (!parsedIn.success) {
        await auditCall(name, ctx, args, null, 'failed');
        throw new AgentError('VALIDATION_ERROR',
            `Tool "${name}" input failed schema validation: ${JSON.stringify(parsedIn.error.issues.slice(0, 3))}`);
    }

    // 5) Scope enforcement
    if (parsedIn.data.industryId != null) assertScope(ctx, parsedIn.data);

    // 6) Timeout + bounded retry (retryable classes only)
    let attempt = 0, lastErr;
    const started = Date.now();
    while (attempt <= tool.retries) {
        try {
            const raw = await withTimeout(tool.handler(parsedIn.data, ctx), tool.timeoutMs, name);
            const parsedOut = tool.outputSchema ? tool.outputSchema.parse(raw) : raw;
            const latency = Date.now() - started;
            await auditCall(name, ctx, parsedIn.data, summarize(parsedOut), 'succeeded', latency, attempt + 1);
            await agentAudit.event({ workflowId: ctx.workflowId, type: 'tool_call', actor: ctx.actor,
                agentId: ctx.agentName, toolId: name, status: 'succeeded',
                detail: { latencyMs: latency, attempt: attempt + 1 } });
            return parsedOut;
        } catch (e) {
            lastErr = e;
            const cls = e.errorClass || (e.name === 'AgentError' ? 'TOOL_ERROR'
                : /timeout/i.test(e.message || '') ? 'TIMEOUT' : 'TOOL_ERROR');
            const retryable = e.retryable !== undefined ? e.retryable : RETRYABLE.has(cls);
            if (!retryable || attempt === tool.retries) break;
            await agentAudit.event({ workflowId: ctx.workflowId, type: 'retry', actor: ctx.actor,
                agentId: ctx.agentName, toolId: name, status: 'retrying',
                detail: { attempt: attempt + 1, errorClass: cls, backoffMs: 1000 * 2 ** attempt } });
            await sleep(1000 * 2 ** attempt);   // 1s, 2s, 4s
            attempt++;
        }
    }
    const latency = Date.now() - started;
    await auditCall(name, ctx, parsedIn.data, null, 'failed', latency, attempt + 1);
    await agentAudit.event({ workflowId: ctx.workflowId, type: 'failure', actor: ctx.actor,
        agentId: ctx.agentName, toolId: name, status: 'failed',
        detail: { errorClass: lastErr.errorClass || 'TOOL_ERROR', message: String(lastErr.message || '').slice(0, 200) } });
    if (lastErr instanceof AgentError) throw lastErr;
    throw new AgentError('TOOL_ERROR', `tool ${name}: ${lastErr.message}`);
}

async function auditCall(name, ctx, args, result, status, latencyMs, attempt) {
    try {
        await db.query(
            `INSERT INTO agent_tool_calls
               (workflow_id, step_id, tool_name, agent_name, caller_role, authorized, risk_level,
                args, result, status, latency_ms)
             VALUES (NULLIF($1,'')::uuid, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11)`,
            [ctx.workflowId || null, ctx.stepId || null, name, ctx.agentName || null, ctx.role || null,
             status !== 'denied', get(name).risk, JSON.stringify(sanitizeArgs(args)),
             result ? JSON.stringify(result) : null, status, latencyMs || null]);
    } catch (_) { /* audit best-effort */ }
}

function sanitizeArgs(args) {
    const s = JSON.stringify(args || {});
    if (s.length > 2000) return { truncated: true };
    const cleaned = JSON.parse(s);
    for (const k of Object.keys(cleaned)) if (/secret|password|token/i.test(k)) cleaned[k] = '[REDACTED]';
    return cleaned;
}

function summarize(out) {
    const s = JSON.stringify(out || {});
    if (s.length > 4000) return { truncated: true, preview: s.slice(0, 4000) };
    return out;
}

module.exports = { register, get, list, execute, DEFAULT_BUDGET };
