// governance/permissions.js — role → tool authorization map (least privilege).
// Agents inherit the CALLING user's role/scope; nothing broader.

const ROLE_TOOLS = {
    industry: [
        'submission.get', 'submission.validate', 'submission.createDraft', 'submission.submit',
        'submission.version', 'history.compare', 'document.extract', 'anomaly.detect',
        'forecast.generate', 'park.capacity', 'notification.prepare', 'report.generate',
        'analytics.query', 'audit.record'
    ],
    govt: [
        'submission.get', 'submission.validate', 'submission.createDraft', 'submission.version',
        'history.compare', 'anomaly.detect', 'compliance.evaluate', 'forecast.generate',
        'analytics.query', 'park.capacity', 'notification.prepare', 'notification.send',
        'report.generate', 'audit.record', 'document.extract'
    ],
    admin: [ // superset — admin is an operational role, still no NEVER_AUTONOMOUS actions
        'submission.get', 'submission.validate', 'submission.createDraft', 'submission.submit',
        'submission.version', 'history.compare', 'document.extract', 'anomaly.detect',
        'compliance.evaluate', 'forecast.generate', 'analytics.query', 'park.capacity',
        'notification.prepare', 'notification.send', 'report.generate', 'audit.record'
    ],
    // Scheduler/statutory engine context (no human caller).
    system: ['submission.get', 'analytics.query', 'notification.prepare', 'notification.send', 'audit.record']
};

function canUseTool(toolName, role) {
    const allowed = ROLE_TOOLS[role];
    if (!allowed) return false;
    return allowed.includes(toolName);
}

// Scope enforcement: an industry-context call may only ever touch its own
// industryId; gov/admin are park/statewide by design (existing RBAC mirrors this).
function assertScope(ctx, { industryId } = {}) {
    if (ctx.role === 'industry') {
        if (industryId != null && Number(industryId) !== Number(ctx.industryId)) {
            const err = new Error(`Scope violation: industry context cannot access industryId ${industryId}`);
            err.errorClass = 'AUTHORIZATION_ERROR';
            throw err;
        }
    }
}

module.exports = { canUseTool, assertScope, ROLE_TOOLS };
