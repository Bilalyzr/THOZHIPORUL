// governance/policyEngine.js — action authorization policy (PRD §3, §13).
// Single source of truth for what agents may do, what needs a human,
// and what is NEVER automated.

const TOOL_ACTIONS = {
    // Deterministic reads/analysis — allowed for authorized roles.
    'submission.get': { risk: 'low', gate: null },
    'submission.validate': { risk: 'low', gate: null },
    'submission.createDraft': { risk: 'low', gate: null },          // draft only — never a write
    'history.compare': { risk: 'low', gate: null },
    'document.extract': { risk: 'low', gate: null },
    'anomaly.detect': { risk: 'low', gate: null },
    'compliance.evaluate': { risk: 'low', gate: null },
    'forecast.generate': { risk: 'low', gate: null },
    'analytics.query': { risk: 'low', gate: null },
    'park.capacity': { risk: 'low', gate: null },
    'audit.record': { risk: 'low', gate: null },

    // Writes with side effects — real domain service only.
    'submission.submit': { risk: 'medium', gate: null, note: 'goes through fileSubmission validation/versioning' },
    'submission.accept_high_risk': { risk: 'high', gate: 'approval_required' },
    'investigation.review_findings': { risk: 'medium', gate: 'approval_required' },
    'report.finalize': { risk: 'low', gate: null },
    'submission.version': { risk: 'medium', gate: null, note: 'append-only via submissionService' },
    'report.generate': { risk: 'low', gate: null },

    // External side effects — APPROVAL REQUIRED before send.
    'notification.prepare': { risk: 'low', gate: null },             // draft only
    'notification.send': { risk: 'high', gate: 'approval_required' } // human gate mandatory
};

// PRD §13.2 — absolutely never autonomous (regardless of role/approval).
const NEVER_AUTONOMOUS = new Set([
    'penalty.issue', 'lease.cancel', 'legal.action', 'account.block',
    'permission.change', 'policy.change', 'audit.delete', 'compliance.rule.change',
    'government.approval.override'
]);

function evaluate(action, ctx = {}) {
    if (NEVER_AUTONOMOUS.has(action)) {
        return { decision: 'block', reason: `Action "${action}" is on the NEVER_AUTONOMOUS list — no agent or workflow may perform it (PRD §13.2).` };
    }
    const spec = TOOL_ACTIONS[action];
    if (!spec) {
        return { decision: 'block', reason: `Unknown action "${action}" — not registered in the policy engine.` };
    }
    if (spec.gate === 'approval_required') {
        // External notifications: officer-scope sends still require approval
        // EXCEPT the already-governed statutory reminder engine (its own
        // policy/dedupe ledger) — scheduler-driven reminders pass a flag.
        if (ctx.source === 'statutory_reminder_engine') {
            return { decision: 'allow', reason: 'Statutory reminder sweep (own policy, ledger, dedupe).' };
        }
        return { decision: 'approval_required', risk: spec.risk,
                 reason: `"${action}" is an external side effect — a human must approve before execution (PRD §13.1).` };
    }
    return { decision: 'allow', risk: spec.risk };
}

module.exports = { evaluate, TOOL_ACTIONS, NEVER_AUTONOMOUS };
