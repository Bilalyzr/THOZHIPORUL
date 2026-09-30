const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');
const { recordAudit } = require('./audit');

// ============================================================
// AI DECISION SUPPORT ENGINE (Phase 18 upgrade)
//
// Deterministic rule engine over real data — preserved from the
// audited implementation, with the two dead inputs now REAL:
//   • submissions  → outstanding filing periods (calendar × filings)
//   • payment_status → lease billing arrears (overdue when any
//                      statement is outstanding past 90 days)
//
// NEW: every generated recommendation is PERSISTED to
// ai_recommendations with evidence. Consequential actions require
// HUMAN APPROVAL (PUT /:id/review) before execution, and the
// executor only sends notifications / creates audit records —
// the engine NEVER autonomously penalizes, cancels leases or
// takes legal action.
// ============================================================

const COMPLIANCE_THRESHOLDS = {
  CRITICAL: 40,
  WARNING: 70,
  GOOD: 85,
  EXCELLENT: 95
};

function analyzeIndustryHealth(industryData) {
  const { compliance_score, submissions, violations, payment_status, lease_expiry } = industryData;

  const issues = [];
  const recommendations = [];
  let priority = 'low';
  let riskLevel = 'low';

  // 1. Compliance Score Analysis
  if (compliance_score < COMPLIANCE_THRESHOLDS.CRITICAL) {
    issues.push('Critical compliance score detected');
    recommendations.push({
      action: 'Schedule Immediate Inspection',
      reason: `Compliance score of ${compliance_score}% is critically low. Multiple violations likely exist.`,
      priority: 'critical',
      category: 'compliance'
    });
    riskLevel = 'critical';
    priority = 'critical';
  } else if (compliance_score < COMPLIANCE_THRESHOLDS.WARNING) {
    issues.push('Compliance score below threshold');
    recommendations.push({
      action: 'Send Warning Notice',
      reason: `Compliance score of ${compliance_score}% requires attention.`,
      priority: 'high',
      category: 'compliance'
    });
    riskLevel = 'medium';
    priority = 'high';
  }

  // 2. Missing Submissions Check (NOW REAL — outstanding periods)
  const missingSubmissions = submissions?.filter(s => s.status === 'OVERDUE' || s.status === 'MISSING') || [];
  if (missingSubmissions.length > 0) {
    recommendations.push({
      action: 'Send Submission Reminder',
      reason: `${missingSubmissions.length} required filing period(s) outstanding (${missingSubmissions.map(s => s.period).join(', ')}).`,
      priority: missingSubmissions.length > 2 ? 'high' : 'medium',
      category: 'submissions'
    });
  }

  // 3. Violations Analysis
  const criticalViolations = violations?.filter(v => v.severity === 'critical' && v.status !== 'resolved') || [];
  const openViolations = violations?.filter(v => v.status !== 'resolved') || [];

  if (criticalViolations.length > 0) {
    recommendations.push({
      action: 'Issue Show Cause Notice',
      reason: `${criticalViolations.length} critical violation(s) remain unresolved.`,
      priority: 'critical',
      category: 'violations'
    });
    riskLevel = 'critical';
  } else if (openViolations.length > 3) {
    recommendations.push({
      action: 'Escalate to Regional Officer',
      reason: `${openViolations.length} violations have been open for more than 30 days.`,
      priority: 'high',
      category: 'violations'
    });
  }

  // 4. Payment Status Check (NOW REAL — lease arrears)
  if (payment_status === 'overdue') {
    recommendations.push({
      action: 'Initiate Payment Recovery',
      reason: 'Lease payments are in arrears (>90 days outstanding). Follow the manual recovery process — this engine never auto-recovers.',
      priority: 'high',
      category: 'financial'
    });
  }

  // 5. Lease Expiry Check
  if (lease_expiry) {
    const daysUntilExpiry = Math.ceil((new Date(lease_expiry) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry < 30 && daysUntilExpiry > 0) {
      recommendations.push({
        action: 'Process Lease Renewal',
        reason: `Lease expires in ${daysUntilExpiry} days. Initiate renewal process.`,
        priority: 'medium',
        category: 'lease'
      });
    } else if (daysUntilExpiry < 0) {
      recommendations.push({
        action: 'Review Lease Violation',
        reason: 'Lease has expired. Legal action may be required.',
        priority: 'high',
        category: 'lease'
      });
    }
  }

  // 6. Positive Recommendations (for good performers)
  if (compliance_score >= COMPLIANCE_THRESHOLDS.GOOD && issues.length === 0) {
    recommendations.push({
      action: 'Approve Lease Renewal (Expedited)',
      reason: `Excellent compliance record (${compliance_score}%). Eligible for expedited processing.`,
      priority: 'low',
      category: 'reward',
      positive: true
    });

    if (compliance_score >= COMPLIANCE_THRESHOLDS.EXCELLENT) {
      recommendations.push({
        action: 'Consider for Expansion Incentives',
        reason: 'Outstanding compliance performance. Recommend for priority expansion consideration.',
        priority: 'low',
        category: 'reward',
        positive: true
      });
    }
  }

  return {
    industry_id: industryData.id,
    industry_name: industryData.name,
    compliance_score: compliance_score,
    risk_level: riskLevel,
    issues_detected: issues.length,
    recommendations: recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }),
    generated_at: new Date().toISOString()
  };
}

// ============================================================
// Data access — real inputs.
// ============================================================
async function fetchIndustries(whereSql = '', params = []) {
  const { rows } = await db.query(`
    SELECT
      ip.id,
      ip.company_name,
      ip.compliance_score AS profile_score,
      p.name AS park_name,
      ls.overall_score AS latest_score
    FROM industry_profiles ip
    LEFT JOIN LATERAL (
      SELECT overall_score
      FROM compliance_scores cs
      WHERE cs.industry_id = ip.id
      ORDER BY cs.score_date DESC
      LIMIT 1
    ) ls ON true
    LEFT JOIN park_plots pp ON pp.allottee_industry_id = ip.id
    LEFT JOIN industrial_parks p ON p.id = pp.park_id
    ${whereSql}
    ORDER BY COALESCE(ls.overall_score, ip.compliance_score, 100) ASC
  `, params);
  return rows;
}

async function fetchOpenViolations(industryId = null) {
  const params = [];
  let where = "WHERE v.status <> 'resolved'";
  if (industryId) {
    params.push(industryId);
    where += ` AND v.industry_id = $1`;
  }
  const { rows } = await db.query(`
    SELECT v.industry_id, v.severity, v.status, v.description
    FROM compliance_violations v
    ${where}
  `, params);
  const byIndustry = {};
  for (const r of rows) {
    (byIndustry[r.industry_id] = byIndustry[r.industry_id] || []).push(r);
  }
  return byIndustry;
}

async function fetchLeaseExpiry(industryId = null) {
  const params = [];
  let where = 'WHERE pp.allottee_industry_id IS NOT NULL';
  if (industryId) {
    params.push(industryId);
    where += ` AND pp.allottee_industry_id = $1`;
  }
  const { rows } = await db.query(`
    SELECT allottee_industry_id AS industry_id, MAX(lease_end_date) AS lease_end
    FROM park_plots pp
    ${where}
    GROUP BY allottee_industry_id
  `, params);
  const map = {};
  for (const r of rows) map[r.industry_id] = r.lease_end;
  return map;
}

// Outstanding filing periods per industry (real, calendar-based).
async function fetchOutstandingFilings(industryId = null) {
  const { getFilingMatrix } = require('../services/missingSubmissionEngine');
  const matrix = await getFilingMatrix({ year: new Date().getUTCFullYear() });
  const map = {};
  for (const ind of matrix.industries) {
    map[ind.industry_id] = ind.periods
      .filter(p => p.status === 'OVERDUE' || p.status === 'MISSING')
      .map(p => ({ period: `${matrix.year}-Q${p.quarter}`, status: p.status }));
  }
  return industryId ? (map[industryId] || []) : map;
}

// Lease arrears: any statement outstanding past 90 days → overdue.
async function fetchPaymentStatus(industryId = null) {
  const map = {};
  try {
    const params = [];
    let where = '';
    if (industryId) { params.push(industryId); where = 'WHERE industry_id = $1'; }
    const { rows } = await db.query(`
      SELECT industry_id,
             BOOL_OR(outstanding_amount > 0 AND due_date < CURRENT_DATE - INTERVAL '90 days') AS overdue
        FROM lease_billing ${where}
    GROUP BY industry_id`, params);
    for (const r of rows) map[r.industry_id] = r.overdue ? 'overdue' : 'current';
  } catch (_) { /* lease_billing absent pre-v5 */ }
  return industryId ? (map[industryId] || 'current') : map;
}

function buildIndustryData(row, violations, leaseExpiry, outstanding, paymentStatus) {
  const score = row.latest_score != null
    ? Number(row.latest_score)
    : (row.profile_score != null ? Number(row.profile_score) : 0);
  return {
    id: row.id,
    name: row.company_name,
    park: row.park_name || null,
    compliance_score: score,
    submissions: (outstanding[row.id] || []).map(p => ({ status: p.status, period: p.period })),
    violations: violations[row.id] || [],
    payment_status: paymentStatus[row.id] || 'current',
    lease_expiry: leaseExpiry[row.id] || null
  };
}

// ------------------------------------------------------------
// Persist recommendations (dedupe: one PENDING row per
// industry+action; re-runs refresh evidence/timestamps).
// ------------------------------------------------------------
async function persistRecommendations(analysis) {
  let inserted = 0;
  for (const rec of analysis.recommendations) {
    const dup = await db.query(
      `SELECT id FROM ai_recommendations
        WHERE industry_id = $1 AND recommendation = $2 AND status IN ('pending','approved') LIMIT 1`,
      [analysis.industry_id, rec.action]);
    if (dup.rows.length) {
      await db.query(
        `UPDATE ai_recommendations
            SET reason=$1, evidence=$2, priority=$3, category=$4, risk_level=$5, generated_at=NOW()
          WHERE id=$6`,
        [rec.reason, JSON.stringify({ compliance_score: analysis.compliance_score, issues: analysis.issues_detected }),
         rec.priority, rec.category, analysis.risk_level, dup.rows[0].id]);
    } else {
      await db.query(
        `INSERT INTO ai_recommendations
           (industry_id, recommendation, reason, evidence, priority, category, risk_level)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [analysis.industry_id, rec.action, rec.reason,
         JSON.stringify({ compliance_score: analysis.compliance_score, issues: analysis.issues_detected }),
         rec.priority, rec.category, analysis.risk_level]);
      inserted++;
    }
  }
  return inserted;
}

// ============================================================
// ENDPOINTS
// ============================================================

// @route   GET /api/ai-decisions/recommendations/:industryId
router.get('/recommendations/:industryId', requireRole(['admin', 'govt']), async (req, res) => {
  try {
    const industryId = parseInt(req.params.industryId, 10);
    if (Number.isNaN(industryId)) return res.status(400).json({ error: 'Invalid industry id.' });

    const industries = await fetchIndustries('WHERE ip.id = $1', [industryId]);
    if (industries.length === 0) return res.status(404).json({ error: 'Industry not found.' });

    const [violations, leaseExpiry] = await Promise.all([
      fetchOpenViolations(industryId), fetchLeaseExpiry(industryId)
    ]);
    const outstanding = await fetchOutstandingFilings(industryId);
    const payment = await fetchPaymentStatus(industryId);

    const analysis = analyzeIndustryHealth({
      ...buildIndustryData(industries[0], violations, leaseExpiry,
        { [industryId]: outstanding }, { [industryId]: payment })
    });
    const persisted = await persistRecommendations(analysis);
    res.json({ ...analysis, newly_persisted: persisted });
  } catch (err) {
    console.error('AI Analysis Error:', err.message);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// @route   GET /api/ai-decisions/batch
router.get('/batch', requireRole(['admin', 'govt']), async (req, res) => {
  try {
    const { risk_level } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

    const [industries, violations, leaseExpiry, outstanding, payment] = await Promise.all([
      fetchIndustries(), fetchOpenViolations(), fetchLeaseExpiry(),
      fetchOutstandingFilings(), fetchPaymentStatus()
    ]);

    let results = [];
    for (const row of industries) {
      const analysis = analyzeIndustryHealth(buildIndustryData(row, violations, leaseExpiry, outstanding, payment));
      await persistRecommendations(analysis);
      results.push({
        industry_id: analysis.industry_id,
        industry_name: analysis.industry_name,
        park: row.park_name || null,
        compliance_score: analysis.compliance_score,
        risk_level: analysis.risk_level,
        urgent_actions: analysis.recommendations.filter(r => !r.positive).map(r => r.action)
      });
    }

    if (risk_level) results = results.filter(item => item.risk_level === risk_level);
    results = results.slice(0, limit);
    res.json({ total: results.length, filtered_by: risk_level || 'none', recommendations: results });
  } catch (err) {
    console.error('Batch Analysis Error:', err.message);
    res.status(500).json({ error: 'Failed to run batch recommendations' });
  }
});

// @route   GET /api/ai-decisions/dashboard-summary
router.get('/dashboard-summary', requireRole(['admin', 'govt']), async (req, res) => {
  try {
    const [industries, violations, leaseExpiry, outstanding, payment] = await Promise.all([
      fetchIndustries(), fetchOpenViolations(), fetchLeaseExpiry(),
      fetchOutstandingFilings(), fetchPaymentStatus()
    ]);

    const riskDistribution = { critical: 0, high: 0, medium: 0, low: 0 };
    let urgentActions = 0, autoApprovable = 0, pendingReviews = 0;
    const typeCounts = {};

    for (const row of industries) {
      const analysis = analyzeIndustryHealth(buildIndustryData(row, violations, leaseExpiry, outstanding, payment));
      const hasHigh = analysis.recommendations.some(r => r.priority === 'high');
      if (analysis.risk_level === 'critical') riskDistribution.critical += 1;
      else if (hasHigh) riskDistribution.high += 1;
      else if (analysis.risk_level === 'medium') riskDistribution.medium += 1;
      else riskDistribution.low += 1;

      const nonPositive = analysis.recommendations.filter(r => !r.positive);
      if (nonPositive.length > 0) { urgentActions += 1; pendingReviews += 1; }
      else autoApprovable += 1;

      for (const rec of analysis.recommendations) {
        if (rec.positive) continue;
        if (!typeCounts[rec.action]) typeCounts[rec.action] = { count: 0, priority: rec.priority };
        typeCounts[rec.action].count += 1;
      }
    }

    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const recommendations = Object.entries(typeCounts)
      .map(([type, info]) => ({ type, count: info.count, priority: info.priority }))
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || b.count - a.count);

    res.json({
      total_industries: industries.length,
      risk_distribution: riskDistribution,
      urgent_actions_required: urgentActions,
      auto_approvable: autoApprovable,
      pending_reviews: pendingReviews,
      recommendations
    });
  } catch (err) {
    console.error('Dashboard Summary Error:', err.message);
    res.status(500).json({ error: 'Failed to generate dashboard summary' });
  }
});

// ============================================================
// PERSISTED RECOMMENDATION WORKFLOW (Phase 18)
// ============================================================

// @route   GET /api/ai-decisions/list — persisted recommendations
router.get('/list', requireRole(['admin', 'govt']), async (req, res) => {
  try {
    const { status, priority, limit } = req.query;
    const conditions = [];
    const params = [];
    if (status) { params.push(status); conditions.push(`r.status = $${params.length}`); }
    if (priority) { params.push(priority); conditions.push(`r.priority = $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(Math.min(parseInt(limit) || 50, 200));

    const { rows } = await db.query(`
        SELECT r.*, ip.company_name, u.email AS reviewer_email
          FROM ai_recommendations r
          JOIN industry_profiles ip ON ip.id = r.industry_id
     LEFT JOIN users u ON u.id = r.reviewed_by
          ${where}
      ORDER BY CASE r.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
               r.generated_at DESC
         LIMIT $${params.length}`, params);
    res.json({ recommendations: rows, count: rows.length });
  } catch (err) {
    console.error('AI Rec List Error:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/ai-decisions/:id/review — HUMAN decision gate
router.put('/:id/review', requireRole(['admin', 'govt']), async (req, res) => {
  try {
    const { decision, note } = req.body;
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'decision must be approved | rejected' });
    }
    const existing = await db.query('SELECT * FROM ai_recommendations WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Recommendation not found.' });
    if (existing.rows[0].status !== 'pending') {
      return res.status(409).json({ error: `Already ${existing.rows[0].status}.` });
    }

    const { rows } = await db.query(`
        UPDATE ai_recommendations
           SET status=$1, reviewed_by=$2, reviewed_at=NOW(), review_note=COALESCE($3, review_note)
         WHERE id=$4 RETURNING *`,
        [decision, req.user.id, note || null, req.params.id]);

    await recordAudit(req.user.id, `AI_RECOMMENDATION_${decision.toUpperCase()}`, req.ip, {
      entityType: 'ai_recommendation', entityId: parseInt(req.params.id),
      severity: decision === 'rejected' ? 'info' : 'warning',
      payload: { industry_id: existing.rows[0].industry_id, action: existing.rows[0].recommendation, note: note || null }
    });
    res.json(rows[0]);
  } catch (err) {
    console.error('AI Review Error:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/ai-decisions/:id/execute — admin only, and
// ONLY after human approval. Execution is limited to safe
// actions (notifications + audit). Statutory consequences
// (notices, penalties, recovery) stay in their manual workflows.
router.post('/:id/execute', requireRole(['admin']), async (req, res) => {
  try {
    const existing = await db.query('SELECT * FROM ai_recommendations WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Recommendation not found.' });
    const rec = existing.rows[0];
    if (rec.status !== 'approved') {
      return res.status(409).json({ error: 'Human approval is required before execution.', code: 'APPROVAL_REQUIRED' });
    }

    const ind = await db.query(
      `SELECT ip.company_name, u.id AS user_id FROM industry_profiles ip
        JOIN users u ON u.id = ip.user_id WHERE ip.id = $1`, [rec.industry_id]);
    const owner = ind.rows[0] || null;

    const { notify } = require('../services/notify');
    let outcome;
    if (rec.recommendation === 'Send Submission Reminder' && owner) {
      await notify({
        userId: owner.user_id, category: 'submission', severity: 'warning',
        title: 'Reminder: outstanding data returns',
        message: `A SIPCOT officer reviewed your profile and requests the outstanding filing period(s). Open Submit Data to file.`,
        link: '/submit-data',
        metadata: { aiRecommendationId: rec.id }
      });
      outcome = 'reminder_sent';
    } else if (rec.recommendation === 'Send Warning Notice' && owner) {
      await notify({
        userId: owner.user_id, category: 'compliance', severity: 'error',
        title: 'Compliance warning',
        message: `Your compliance score requires attention: ${rec.reason}`,
        link: '/compliance',
        metadata: { aiRecommendationId: rec.id }
      });
      outcome = 'warning_notification_sent';
    } else if (rec.recommendation === 'Escalate to Regional Officer' || rec.recommendation === 'Review Lease Violation') {
      await notify({
        roleScope: 'govt', category: 'compliance', severity: 'warning',
        title: `Escalation: ${ind.rows.length ? ind.rows[0].company_name : 'industry ' + rec.industry_id}`,
        message: rec.reason,
        link: '/command-center',
        metadata: { aiRecommendationId: rec.id }
      });
      outcome = 'officer_escalation_notified';
    } else {
      // Consequential actions (show cause, inspection scheduling,
      // payment recovery, lease processing) are NOT auto-executed.
      outcome = 'requires_manual_workflow';
    }

    const { rows } = await db.query(
        `UPDATE ai_recommendations SET status='executed', action=$1, outcome=$2 WHERE id=$3 RETURNING *`,
        [outcome, `by user ${req.user.id}`, rec.id]);

    await recordAudit(req.user.id, 'AI_RECOMMENDATION_EXECUTED', req.ip, {
      entityType: 'ai_recommendation', entityId: rec.id, severity: 'warning',
      payload: { industry_id: rec.industry_id, action: rec.recommendation, outcome }
    });
    res.json({ ...rows[0], note: outcome === 'requires_manual_workflow'
        ? 'This action type must be carried out in its statutory workflow (notices / inspections / billing). The recommendation is marked executed for tracking.'
        : undefined });
  } catch (err) {
    console.error('AI Execute Error:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
