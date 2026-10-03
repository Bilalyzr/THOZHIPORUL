// governance/approvalGate.js — persisted human approval gates (PRD §13).
// States: PENDING_APPROVAL → APPROVED | REJECTED | EXPIRED | CANCELLED.
// Only HUMAN users decide — agents create requests, never decisions
// (agent-cannot-approve-own-action is structural: no agent path calls decide()).

const db = require('../../db');
const { recordAudit } = require('../../routes/audit');
const { evaluate } = require('./policyEngine');
const { AgentError } = require('../schemas/agentSchemas');

const DEFAULT_TTL_HOURS = 72;

async function request({ workflowId, action, affectedEntities = [], evidenceRefs = [],
                         recommendation = null, riskLevel = 'medium', requestedByAgent,
                         expiresAt = null }) {
    const policy = evaluate(action, {});
    if (policy.decision === 'block') {
        throw new AgentError('POLICY_BLOCK', policy.reason);
    }
    const { rows } = await db.query(
        `INSERT INTO agent_approvals
           (workflow_id, requested_action, affected_entities, evidence_refs, recommendation,
            risk_level, requested_by_agent, expires_at)
         VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8)
         RETURNING *`,
        [workflowId, action, JSON.stringify(affectedEntities), JSON.stringify(evidenceRefs),
         recommendation, riskLevel, requestedByAgent,
         expiresAt || new Date(Date.now() + DEFAULT_TTL_HOURS * 3600e3)]
    );
    const approval = rows[0];
    await db.query(
        `UPDATE agent_workflows SET status='waiting_approval', updated_at=NOW()
          WHERE workflow_id=$1::uuid AND status='running'`, [workflowId]);
    return approval;
}

/** Human decision — invoked ONLY from authenticated human routes. */
async function decide({ approvalId, decision, user, comment = null }) {
    if (!['approve', 'reject', 'cancel'].includes(decision)) {
        throw new AgentError('VALIDATION_ERROR', 'decision must be approve|reject|cancel');
    }
    const cur = await db.query('SELECT * FROM agent_approvals WHERE approval_id=$1::uuid', [approvalId]);
    if (!cur.rows.length) throw new AgentError('VALIDATION_ERROR', 'Approval not found');
    const a = cur.rows[0];
    if (a.status !== 'PENDING_APPROVAL') {
        throw new AgentError('VALIDATION_ERROR', `Approval already ${a.status}`);
    }
    const status = decision === 'approve' ? 'APPROVED' : decision === 'reject' ? 'REJECTED' : 'CANCELLED';
    const { rows } = await db.query(
        `UPDATE agent_approvals
            SET status=$1, decided_by=$2, decided_at=NOW(), decision_comment=$3
          WHERE approval_id=$4::uuid RETURNING *`,
        [status, user.id, comment, approvalId]
    );
    await recordAudit(user.id, `AGENT_APPROVAL_${status}`, null, {
        entityType: 'agent_approval', entityId: approvalId, severity: 'warning',
        payload: { workflow_id: a.workflow_id, action: a.requested_action, risk: a.risk_level, comment }
    });
    return rows[0];
}

/** Expire stale PENDING approvals (scheduler hygiene). */
async function expireStale() {
    const { rows } = await db.query(
        `UPDATE agent_approvals SET status='EXPIRED'
          WHERE status='PENDING_APPROVAL' AND expires_at < NOW() RETURNING approval_id, workflow_id`);
    for (const r of rows) {
        await db.query(
            `UPDATE agent_workflows SET status='expired', ended_at=NOW(), updated_at=NOW()
              WHERE workflow_id=$1::uuid AND status='waiting_approval'`, [r.workflow_id]);
    }
    return rows.length;
}

async function pendingForUser(user) {
    const { rows } = await db.query(`
        SELECT a.*, w.workflow_type, w.industry_id, w.park_id, w.period_year, w.period_quarter,
               w.risk_level AS workflow_risk
          FROM agent_approvals a
          JOIN agent_workflows w ON w.workflow_id = a.workflow_id
         WHERE a.status = 'PENDING_APPROVAL'
           AND (a.expires_at IS NULL OR a.expires_at > NOW())
      ORDER BY a.created_at DESC LIMIT 100`);
    // Industry users see only their own workflow approvals.
    if (user.role === 'industry') return rows.filter(r => r.industry_id === user.profile_id);
    return rows;
}

async function latestDecision(workflowId) {
    const { rows } = await db.query(
        `SELECT * FROM agent_approvals
          WHERE workflow_id = $1::uuid AND status IN ('APPROVED','REJECTED','CANCELLED','EXPIRED')
       ORDER BY decided_at DESC LIMIT 1`, [workflowId]);
    return rows[0] || null;
}

module.exports = { request, decide, expireStale, pendingForUser, latestDecision, DEFAULT_TTL_HOURS };
