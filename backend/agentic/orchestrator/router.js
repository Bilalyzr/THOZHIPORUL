// router.js — conditional routing helpers shared by the graphs.

/** Risk-based branch: high/critical → approval path, else continue. */
function riskRouter(state) {
    if (state.status === 'failed') return 'fail';
    if (state.status === 'waiting_approval') return 'wait';
    return ['high', 'critical'].includes(state.riskLevel) ? 'approval' : 'continue';
}

/** After approval resolution: re-run pipeline or finish. */
function approvalRouter(state) {
    const decision = state.pendingApproval && state.pendingApproval.decision;
    if (decision === 'APPROVED') return 'continue';
    if (decision === 'REJECTED') return 'reject';
    return 'wait'; // still pending / expired
}

function okRouter(state) {
    if (state.status === 'failed') return 'fail';
    return 'end';
}

module.exports = { riskRouter, approvalRouter, okRouter };
