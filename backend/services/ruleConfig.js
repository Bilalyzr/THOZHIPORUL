// ============================================================
// ruleConfig.js — cached loader for intelligence_rules.
//
// The validation/consistency/anomaly engines read their thresholds
// from the DB (admin-editable at runtime). Reads are cached for
// CACHE_TTL_MS so the hot submission path doesn't query the rules
// table on every filing; PUT /api/findings/rules invalidates.
// ============================================================

const db = require('../db');

const CACHE_TTL_MS = 60 * 1000;
let _cache = null;           // { at, rules: Map<rule_id, row> }

async function loadRules(force = false) {
    if (!force && _cache && Date.now() - _cache.at < CACHE_TTL_MS) return _cache.rules;
    const { rows } = await db.query(
        'SELECT rule_id, category, description, config, enabled FROM intelligence_rules'
    );
    const rules = new Map();
    for (const r of rows) rules.set(r.rule_id, r);
    _cache = { at: Date.now(), rules };
    return rules;
}

async function getRule(ruleId) {
    const rules = await loadRules();
    return rules.get(ruleId) || null;
}

async function getEnabledByCategory(category) {
    const rules = await loadRules();
    const out = [];
    for (const r of rules.values()) if (r.category === category && r.enabled) out.push(r);
    return out;
}

function invalidate() { _cache = null; }

module.exports = { loadRules, getRule, getEnabledByCategory, invalidate };
