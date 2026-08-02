const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');

// ============================================================
// AI DECISION SUPPORT ENGINE
// Analyzes real industry data and provides actionable recommendations.
// ============================================================

// Compliance scoring thresholds
const COMPLIANCE_THRESHOLDS = {
  CRITICAL: 40,
  WARNING: 70,
  GOOD: 85,
  EXCELLENT: 95
};

// Rule-based decision engine (pure function over a normalised industry object).
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

  // 2. Missing Submissions Check
  const missingSubmissions = submissions?.filter(s => s.status === 'missing') || [];
  if (missingSubmissions.length > 0) {
    recommendations.push({
      action: 'Send Submission Reminder',
      reason: `${missingSubmissions.length} mandatory data submission(s) are pending.`,
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

  // 4. Payment Status Check
  if (payment_status === 'overdue') {
    recommendations.push({
      action: 'Initiate Payment Recovery',
      reason: 'Lease payments are overdue. Follow legal recovery process.',
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
// Data access helpers — build a normalised industry object from real tables
// so analyzeIndustryHealth() operates on live data instead of mocks.
// ============================================================

// Fetch one industry's profile + latest compliance score.
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

// Load open violations grouped by industry_id.
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

// Load the lease_end_date (latest) per industry from allotted plots.
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

// Combine a DB industry row + related events into the shape the engine wants.
function buildIndustryData(row, violations, leaseExpiry) {
  const score = row.latest_score != null
    ? Number(row.latest_score)
    : (row.profile_score != null ? Number(row.profile_score) : 0);
  return {
    id: row.id,
    name: row.company_name,
    park: row.park_name || null,
    compliance_score: score,
    submissions: [],
    violations: violations[row.id] || [],
    payment_status: 'current',
    lease_expiry: leaseExpiry[row.id] || null
  };
}

// ============================================================
// ENDPOINTS
// ============================================================

// @route   GET /api/ai-decisions/recommendations/:industryId
// @desc    AI-powered recommendations for a specific industry (real data)
// @access  Private (Admin, Govt)
router.get('/recommendations/:industryId', requireRole(['admin', 'govt']), async (req, res) => {
  try {
    const industryId = parseInt(req.params.industryId, 10);
    if (Number.isNaN(industryId)) {
      return res.status(400).json({ error: 'Invalid industry id.' });
    }

    const industries = await fetchIndustries('WHERE ip.id = $1', [industryId]);
    if (industries.length === 0) {
      return res.status(404).json({ error: 'Industry not found.' });
    }

    const [violations, leaseExpiry] = await Promise.all([
      fetchOpenViolations(industryId),
      fetchLeaseExpiry(industryId)
    ]);

    const industryData = buildIndustryData(industries[0], violations, leaseExpiry);
    const analysis = analyzeIndustryHealth(industryData);

    res.json(analysis);
  } catch (err) {
    console.error('AI Analysis Error:', err.message);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// @route   GET /api/ai-decisions/batch
// @desc    Recommendations across many industries (real data), lowest-scoring
//          first, optionally filtered by risk_level.
// @access  Private (Admin, Govt)
router.get('/batch', requireRole(['admin', 'govt']), async (req, res) => {
  try {
    const { risk_level } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

    const [industries, violations, leaseExpiry] = await Promise.all([
      fetchIndustries(),
      fetchOpenViolations(),
      fetchLeaseExpiry()
    ]);

    let results = industries.map(row => {
      const analysis = analyzeIndustryHealth(buildIndustryData(row, violations, leaseExpiry));
      return {
        industry_id: analysis.industry_id,
        industry_name: analysis.industry_name,
        park: row.park_name || null,
        compliance_score: analysis.compliance_score,
        risk_level: analysis.risk_level,
        urgent_actions: analysis.recommendations
          .filter(r => !r.positive)
          .map(r => r.action)
      };
    });

    if (risk_level) {
      results = results.filter(item => item.risk_level === risk_level);
    }
    results = results.slice(0, limit);

    res.json({
      total: results.length,
      filtered_by: risk_level || 'none',
      recommendations: results
    });
  } catch (err) {
    console.error('Batch Analysis Error:', err.message);
    res.status(500).json({ error: 'Failed to generate batch recommendations' });
  }
});

// @route   GET /api/ai-decisions/dashboard-summary
// @desc    AI decision summary for the admin dashboard (real aggregates).
// @access  Private (Admin, Govt)
router.get('/dashboard-summary', requireRole(['admin', 'govt']), async (req, res) => {
  try {
    const [industries, violations, leaseExpiry] = await Promise.all([
      fetchIndustries(),
      fetchOpenViolations(),
      fetchLeaseExpiry()
    ]);

    const riskDistribution = { critical: 0, high: 0, medium: 0, low: 0 };
    let urgentActions = 0;
    let autoApprovable = 0;
    let pendingReviews = 0;
    // Aggregate recommendation types across all industries.
    const typeCounts = {}; // action -> { count, priority }

    for (const row of industries) {
      const analysis = analyzeIndustryHealth(buildIndustryData(row, violations, leaseExpiry));

      // Bucket by risk level. analyzeIndustryHealth only emits low/medium/critical,
      // so promote industries carrying a 'high' priority rec into the 'high' bucket.
      const hasHigh = analysis.recommendations.some(r => r.priority === 'high');
      if (analysis.risk_level === 'critical') riskDistribution.critical += 1;
      else if (hasHigh) riskDistribution.high += 1;
      else if (analysis.risk_level === 'medium') riskDistribution.medium += 1;
      else riskDistribution.low += 1;

      const nonPositive = analysis.recommendations.filter(r => !r.positive);
      if (nonPositive.length > 0) {
        urgentActions += 1;
        pendingReviews += 1;
      } else {
        // No outstanding issues -> eligible for automated approval.
        autoApprovable += 1;
      }

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

module.exports = router;
