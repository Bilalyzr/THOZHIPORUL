// governance/riskEngine.js — deterministic risk classification from
// findings/severity/confidence. No model involvement; explainable.

const SEV_WEIGHT = { info: 0, warning: 2, high: 6, critical: 10 };
const SEV_MAX = { info: 'low', warning: 'medium', high: 'high', critical: 'critical' };

function classify({ findings = [], maxSeverity, confidence = null } = {}) {
    let score = 0;
    let worst = 'info';
    for (const f of findings) {
        score += SEV_WEIGHT[f.severity] || 0;
        if ((SEV_WEIGHT[f.severity] || 0) > SEV_WEIGHT[worst]) worst = f.severity;
    }
    if (maxSeverity && (SEV_WEIGHT[maxSeverity] || 0) > SEV_WEIGHT[worst]) worst = maxSeverity;

    let level;
    if (worst === 'critical' || score >= 10) level = 'critical';
    else if (worst === 'high' || score >= 6) level = 'high';
    else if (worst === 'warning' || score >= 2) level = 'medium';
    else level = 'low';

    // Low-confidence extraction/forecast escalates one notch (PRD §13.1).
    let reason = `findings=${findings.length}, score=${score}, worst=${worst}`;
    if (confidence !== null && confidence < 0.6) {
        level = escalate(level);
        reason += `, confidence=${confidence} (<0.60 threshold → escalated)`;
    }
    const requiresApproval = level === 'high' || level === 'critical';
    return { level, score, worst, requiresApproval, reason };
}

function escalate(level) {
    return { low: 'medium', medium: 'high', high: 'critical', critical: 'critical' }[level] || level;
}

module.exports = { classify, escalate };
