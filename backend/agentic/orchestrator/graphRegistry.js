// graphRegistry.js — registry of workflow graphs (name → builder).
// Each entry supplies compile(workflowId, ctx) returning a runnable
// LangGraph app bound to that run's persistence context.

const registry = new Map();

function register(name, def) {
    registry.set(name, { name, version: def.version || '1.0', description: def.description || '', compile: def.compile });
}
function get(name) { return registry.get(name) || null; }
function list() { return [...registry.values()].map(r => ({ name: r.name, version: r.version, description: r.description })); }

module.exports = { register, get, list };
