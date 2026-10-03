// modelGateway.js — self-hosted LLM runtime abstraction (PRD §24).
//
// Sovereignty (NFR-02): ONLY Ollama and vLLM endpoints on
// operator-configured hosts (localhost/private by convention) are
// contacted. No third-party AI APIs, ever — enforced by an explicit
// host allow-check. With no runtime configured/reachable, every call
// fails with MODEL_UNAVAILABLE — never a fabricated response.
//
// Every invocation is recorded in ai_runs (model, latency, tokens,
// workflow/agent, status).

const db = require('../../db');
const { AgentError } = require('../schemas/agentSchemas');

const PROVIDERS = {
    ollama: {
        envUrl: 'OLLAMA_URL',
        defaultUrl: 'http://localhost:11434',
        // Sovereignty: model inference must be self-hosted.
        allowedHosts: (process.env.AGENT_ALLOWED_HOSTS || 'localhost,127.0.0.1,host.docker.internal').split(',').map(s => s.trim())
    },
    vllm: {
        envUrl: 'VLLM_URL',
        defaultUrl: null, // opt-in only
        allowedHosts: (process.env.AGENT_ALLOWED_HOSTS || 'localhost,127.0.0.1,host.docker.internal').split(',').map(s => s.trim())
    }
};

function activeProvider() {
    const ollamaUrl = process.env[PROVIDERS.ollama.envUrl] || PROVIDERS.ollama.defaultUrl;
    if (process.env.AGENT_PROVIDER === 'vllm' && process.env.VLLM_URL) {
        return { provider: 'vllm', baseUrl: process.env.VLLM_URL };
    }
    if (process.env.AGENT_PROVIDER === 'ollama' || !process.env.AGENT_PROVIDER) {
        // Default to ollama when its daemon answers; health() gates actual use.
        return { provider: 'ollama', baseUrl: ollamaUrl };
    }
    return null;
}

function assertSovereignHost(url) {
    let host;
    try { host = new URL(url).hostname; } catch (_) {
        throw new AgentError('MODEL_ERROR', `Invalid model runtime URL: ${url}`);
    }
    const all = [...PROVIDERS.ollama.allowedHosts, ...(process.env.AGENT_ALLOWED_HOSTS || '').split(',').map(s => s.trim())];
    if (!all.includes(host)) {
        throw new AgentError('POLICY_BLOCK',
            `Sovereignty policy: model runtime host "${host}" is not in AGENT_ALLOWED_HOSTS. Self-hosted inference only — no third-party AI APIs.`);
    }
}

async function recordRun({ provider, model, kind, status, latencyMs, agentId, workflowId, errorClass, usage }) {
    try {
        await db.query(
            `INSERT INTO ai_runs (workflow_id, agent_id, provider, model, kind, status, latency_ms, prompt_tokens, completion_tokens, error_class)
             VALUES (NULLIF($1,'')::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [workflowId || null, agentId || null, provider, model, kind, status, latencyMs || null,
             usage && usage.prompt_tokens, usage && usage.completion_tokens, errorClass || null]
        );
    } catch (_) { /* audit best-effort */ }
}

async function callRuntime(fn, { provider, model, kind, agentId, workflowId }) {
    const started = Date.now();
    try {
        const out = await fn();
        await recordRun({ provider, model, kind, status: 'succeeded', latencyMs: Date.now() - started, agentId, workflowId, usage: out.usage });
        return out;
    } catch (e) {
        const unavailable = /ECONNREFUSED|fetch failed|ENOTFOUND|ECONNRESET/i.test(e.message || '');
        await recordRun({
            provider, model, kind, status: unavailable ? 'unavailable' : 'failed',
            latencyMs: Date.now() - started, agentId, workflowId,
            errorClass: unavailable ? 'MODEL_UNAVAILABLE' : 'MODEL_ERROR'
        });
        throw new AgentError(unavailable ? 'MODEL_UNAVAILABLE' : 'MODEL_ERROR',
            `Model runtime (${provider}) ${unavailable ? 'unavailable — install/start Ollama or configure VLLM_URL; deterministic fallback in use' : 'error'}: ${(e.message || '').slice(0, 160)}`);
    }
}

const gateway = {
    /** Liveness + config probe (never fabricates). */
    async health() {
        const act = activeProvider();
        if (!act) return { configured: false, provider: null, status: 'NOT_CONFIGURED' };
        assertSovereignHost(act.baseUrl);
        try {
            if (act.provider === 'ollama') {
                const r = await fetch(`${act.baseUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
                const j = await r.json();
                return { configured: true, provider: 'ollama', status: r.ok ? 'OK' : 'DEGRADED',
                         models: (j.models || []).map(m => m.name) };
            }
            const r = await fetch(`${act.baseUrl}/v1/models`, { signal: AbortSignal.timeout(2000) });
            const j = await r.json();
            return { configured: true, provider: 'vllm', status: r.ok ? 'OK' : 'DEGRADED',
                     models: (j.data || []).map(m => m.id) };
        } catch (_) {
            return { configured: true, provider: act.provider, status: 'MODEL_UNAVAILABLE',
                     note: 'No self-hosted runtime reachable. Agents run deterministic paths; LLM enhancement disabled (honestly).' };
        }
    },

    modelInfo() {
        const act = activeProvider();
        return {
            provider: act ? act.provider : null,
            baseUrl: act ? act.baseUrl : null,
            generationModel: process.env.AGENT_MODEL || (act && act.provider === 'ollama' ? 'qwen2.5:7b-instruct' : null),
            embedModel: process.env.AGENT_EMBED_MODEL || null,
            sovereignty: 'self-hosted only (Ollama/vLLM); third-party AI egress blocked by policy'
        };
    },

    /** Free-form generation. Throws MODEL_UNAVAILABLE when no runtime. */
    async generate(prompt, { system, agentId, workflowId, maxTokens = 512, temperature = 0.2 } = {}) {
        const act = activeProvider();
        if (!act) throw new AgentError('MODEL_UNAVAILABLE', 'No model runtime configured');
        assertSovereignHost(act.baseUrl);
        const model = this.modelInfo().generationModel;
        return callRuntime(async () => {
            let text, usage;
            if (act.provider === 'ollama') {
                const r = await fetch(`${act.baseUrl}/api/generate`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model, prompt, system: system || '', stream: false,
                                           options: { num_predict: maxTokens, temperature } }),
                    signal: AbortSignal.timeout(60000)
                });
                if (!r.ok) throw new Error(`ollama HTTP ${r.status}`);
                const j = await r.json();
                text = j.response; usage = { prompt_tokens: j.prompt_eval_count, completion_tokens: j.eval_count };
            } else {
                const r = await fetch(`${act.baseUrl}/v1/chat/completions`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model, messages: [
                        ...(system ? [{ role: 'system', content: system }] : []),
                        { role: 'user', content: prompt }
                    ], max_tokens: maxTokens, temperature, stream: false }),
                    signal: AbortSignal.timeout(60000)
                });
                if (!r.ok) throw new Error(`vllm HTTP ${r.status}`);
                const j = await r.json();
                text = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
                usage = j.usage;
            }
            return { text, usage, model };
        }, { provider: act.provider, model, kind: 'generate', agentId, workflowId });
    },

    /** Structured generation validated against a zod schema (PRD §25). */
    async structuredGenerate(prompt, schema, opts = {}) {
        const out = await this.generate(
            `${prompt}\n\nRespond ONLY with a JSON object matching this shape: ${JSON.stringify(zodToShape(schema))}`,
            { system: 'You are a deterministic JSON producer. Output valid JSON only. Never invent data — use null for unknowns.', ...opts }
        );
        let parsed;
        try {
            const m = out.text.match(/\{[\s\S]*\}/);
            parsed = JSON.parse(m ? m[0] : out.text);
        } catch (e) {
            throw new AgentError('MODEL_ERROR', 'Model returned non-JSON output: ' + (e.message || ''));
        }
        const check = schema.safeParse(parsed);
        if (!check.success) throw new AgentError('MODEL_ERROR', 'Model output failed schema validation');
        return check.data;
    },

    /** Embeddings (used by semantic memory when pgvector is available). */
    async embed(text, { agentId, workflowId } = {}) {
        const act = activeProvider();
        if (!act || act.provider !== 'ollama') throw new AgentError('MODEL_UNAVAILABLE', 'embeddings require Ollama');
        assertSovereignHost(act.baseUrl);
        const model = this.modelInfo().embedModel || 'nomic-embed-text';
        return callRuntime(async () => {
            const r = await fetch(`${act.baseUrl}/api/embeddings`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, prompt: String(text).slice(0, 4000) }),
                signal: AbortSignal.timeout(30000)
            });
            if (!r.ok) throw new Error(`ollama HTTP ${r.status}`);
            const j = await r.json();
            return { embedding: j.embedding, model };
        }, { provider: 'ollama', model, kind: 'embed', agentId, workflowId });
    }
};

// Minimal JSON-shape describer for prompts (no secrets, schema only).
function zodToShape(schema) {
    try {
        const def = schema._def;
        if (def && def.shape) {
            const out = {};
            for (const [k, v] of Object.entries(def.shape())) out[k] = zodToShape(v);
            return out;
        }
        if (def && def.innerType) return zodToShape(def.innerType);
        if (def && def.values) return def.values;
        if (def && def.typeName === 'ZodString') return 'string';
        if (def && def.typeName === 'ZodNumber') return 'number';
        if (def && def.typeName === 'ZodBoolean') return 'boolean';
        if (def && def.typeName === 'ZodArray') return [zodToShape(def.type)];
        return 'any';
    } catch (_) { return 'any'; }
}

module.exports = gateway;
