// memory/semanticMemory.js — approved policies/rules/knowledge/Q&A.
// pgvector embeddings when available; honest trigram/keyword fallback
// otherwise (capability recorded in agent_capabilities).
//
// MEMORY DOES NOT GRANT PERMISSION: every retrieve() re-applies the
// caller's role/industry scoping (PRD §14).

const db = require('../../db');
const { AgentError } = require('../schemas/agentSchemas');

async function vectorAvailable() {
    const { rows } = await db.query(
        `SELECT status FROM agent_capabilities WHERE capability='pgvector'`);
    return rows.length > 0 && rows[0].status === 'AVAILABLE';
}

async function upsert({ layer = 'semantic', key, content, metadata = {}, roles = ['admin', 'govt'], industryId = null, parkId = null, createdBy = null }) {
    let embedding = null;
    if (await vectorAvailable()) {
        try {
            const gw = require('../models/modelGateway');
            const out = await gw.embed(content);
            embedding = JSON.stringify(out.embedding);
        } catch (_) { /* runtime unavailable — store without embedding */ }
    }
    const { rows } = await db.query(
        `INSERT INTO agent_memory (layer, key, content, embedding, metadata, industry_id, park_id, visible_roles, created_by)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8, $9)
         ON CONFLICT DO NOTHING RETURNING id`,
        [layer, key, content, embedding ? embedding : null, JSON.stringify(metadata), industryId, parkId, roles, createdBy]);
    return rows[0] || null;
}

async function retrieve({ query, roles = ['govt'], industryId = null, limit = 5 }) {
    const roleFilter = roles.length
        ? `AND visible_roles && $${roles.length + 2}` : '';
    const scopeFilter = industryId != null
        ? `AND (industry_id IS NULL OR industry_id = $3)` : 'AND industry_id IS NULL';
    if (await vectorAvailable()) {
        try {
            const gw = require('../models/modelGateway');
            const { embedding } = await gw.embed(query);
            const { rows } = await db.query(
                `SELECT id, layer, key, content, metadata,
                        1 - (embedding <=> $1::vector) AS similarity
                   FROM agent_memory
                  WHERE layer = 'semantic' ${scopeFilter} ${roleFilter}
               ORDER BY embedding <=> $1::vector LIMIT $${roles.length + 3}`,
                industryId != null
                    ? [JSON.stringify(embedding), industryId, ...roles, limit]
                    : [JSON.stringify(embedding), ...roles, limit]);
            if (rows.length) return rows;
        } catch (_) { /* fall through to trigram */ }
    }
    // Trigram/keyword fallback (works without pgvector/model).
    const { rows } = await db.query(
        `SELECT id, layer, key, content, metadata,
                similarity(content, $1) AS similarity
           FROM agent_memory
          WHERE layer = 'semantic' ${scopeFilter} ${roleFilter}
       ORDER BY similarity DESC LIMIT $${(industryId != null ? 1 : 0) + roles.length + 1}`,
        industryId != null ? [query, industryId, ...roles, limit] : [query, ...roles, limit]);
    return rows;
}

module.exports = { upsert, retrieve, vectorAvailable };
