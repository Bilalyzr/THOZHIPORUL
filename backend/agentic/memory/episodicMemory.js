// memory/episodicMemory.js — past workflow runs (what happened, outcomes,
// corrections). Retrieval never grants permission; callers re-scope.

const db = require('../../db');

async function search({ workflowType, industryId, status, limit = 20 } = {}) {
    const conditions = [];
    const params = [];
    if (workflowType) { params.push(workflowType); conditions.push(`workflow_type = $${params.length}`); }
    if (industryId) { params.push(industryId); conditions.push(`industry_id = $${params.length}`); }
    if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
    params.push(Math.min(limit, 100));
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await db.query(
        `SELECT workflow_id, workflow_type, status, risk_level, industry_id, park_id,
                period_year, period_quarter, result, error_class, started_at, ended_at
           FROM agent_workflows ${where}
       ORDER BY started_at DESC LIMIT $${params.length}`, params);
    return rows;
}

/** Corrections made after agent output — used to learn review patterns. */
async function corrections({ industryId, limit = 20 } = {}) {
    const params = [];
    const where = [];
    if (industryId) { params.push(industryId); where.push(`x.industry_id = $${params.length}`); }
    params.push(Math.min(limit, 100));
    const { rows } = await db.query(`
        SELECT x.workflow_id, x.review_status, x.field, x.value, x.created_at, x.evidence
          FROM ai_extractions x
          ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY x.created_at DESC LIMIT $${params.length}`, params);
    return rows;
}

module.exports = { search, corrections };
