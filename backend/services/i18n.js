// ============================================================
// i18n.js — Backend Tamil/bilingual string service.
//
// Loads strings from the i18n_strings table (seeded by schema_v3),
// caches them in memory, and exposes a t(key, lang) helper plus the
// HTTP-facing endpoints (mounted on a new route, not the legacy ones).
//
// Falls back to English (returns the key) if a translation is absent
// or the table doesn't exist yet — so the UI degrades gracefully.
// ============================================================

const db = require('../db');

let cache = {};        // { 'ta': { key: value }, 'en': { key: value } }
let loadedAt = 0;
const TTL_MS = 5 * 60 * 1000;   // refresh every 5 min (admin edits flow through)

async function load() {
    try {
        const { rows } = await db.query('SELECT string_key, language, value FROM i18n_strings');
        const next = {};
        for (const r of rows) {
            if (!next[r.language]) next[r.language] = {};
            next[r.language][r.string_key] = r.value;
        }
        cache = next;
        loadedAt = Date.now();
    } catch (_) {
        // table missing (migration not applied yet) — operate in passthrough.
        cache = {};
    }
}

async function ensureLoaded() {
    if (Date.now() - loadedAt > TTL_MS) await load();
}

// Translate a single key. Falls back to key itself.
async function t(key, lang = 'en') {
    await ensureLoaded();
    if (lang && cache[lang] && cache[lang][key]) return cache[lang][key];
    if (cache['en'] && cache['en'][key]) return cache['en'][key];
    return key;
}

// Translate a batch of keys (single round-trip for the frontend).
async function tBatch(keys, lang = 'en') {
    await ensureLoaded();
    const out = {};
    for (const k of keys) {
        out[k] = (lang && cache[lang] && cache[lang][k])
            ? cache[lang][k]
            : (cache['en'] && cache['en'][k] ? cache['en'][k] : k);
    }
    return out;
}

// Return the whole dictionary for a language (frontend bootstrap).
async function dictionary(lang = 'en') {
    await ensureLoaded();
    return cache[lang] || {};
}

module.exports = { t, tBatch, dictionary, load };
