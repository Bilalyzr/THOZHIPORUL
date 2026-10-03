// agents/registry.js — agent registry (PRD AG-03): only registered agents
// can be invoked; each declares its allowed tools (least privilege).

const REGISTRY = new Map();

function register(def) {
    REGISTRY.set(def.name, def);
}
function get(name) { return REGISTRY.get(name) || null; }
function list() { return [...REGISTRY.values()].map(({ run, ...m }) => m); }

/** Shared tool-context builder passed to every tool call from agents. */
function toolCtx(agentName, wfCtx, workflowId, toolBudget) {
    return { workflowId, agentName, role: wfCtx.role, userId: wfCtx.userId,
             industryId: wfCtx.industryId, parkId: wfCtx.parkId, actor: wfCtx.actor || agentName,
             toolBudget };
}

module.exports = { register, get, list, toolCtx };
