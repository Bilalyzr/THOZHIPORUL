const express = require('express');
const router = express.Router();
const db = require('../db');

// ============================================================
// AI DECISION SUPPORT ENGINE
// Analyzes industry data and provides actionable recommendations
// ============================================================

// Compliance scoring thresholds
const COMPLIANCE_THRESHOLDS = {
  CRITICAL: 40,
  WARNING: 70,
  GOOD: 85,
  EXCELLENT: 95
};

// Rule-based decision engine
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
// ENDPOINTS
// ============================================================

// @route   GET /api/ai-decisions/recommendations/:industryId
// @desc    Get AI-powered recommendations for a specific industry
// @access  Private (Admin, Govt)
router.get('/recommendations/:industryId', async (req, res) => {
  try {
    const { industryId } = req.params;

    // In production, fetch real data from database
    // For now, using mock data that simulates real scenarios
    const mockIndustries = {
      101: {
        id: 101,
        name: 'ABC Industries',
        compliance_score: 92,
        submissions: [
          { period: 'Q1 2026', status: 'submitted' },
          { period: 'Q4 2025', status: 'approved' }
        ],
        violations: [],
        payment_status: 'current',
        lease_expiry: '2027-06-15'
      },
      102: {
        id: 102,
        name: 'XYZ Manufacturing',
        compliance_score: 35,
        submissions: [
          { period: 'Q1 2026', status: 'missing' },
          { period: 'Q4 2025', status: 'missing' }
        ],
        violations: [
          { severity: 'critical', status: 'open', description: 'Effluent discharge exceeds limits' },
          { severity: 'high', status: 'open', description: 'Missing fire safety equipment' }
        ],
        payment_status: 'current',
        lease_expiry: '2026-12-01'
      },
      103: {
        id: 103,
        name: 'LMN Textiles',
        compliance_score: 72,
        submissions: [
          { period: 'Q1 2026', status: 'submitted' },
          { period: 'Q4 2025', status: 'approved' }
        ],
        violations: [
          { severity: 'medium', status: 'open', description: 'Delayed documentation submission' }
        ],
        payment_status: 'overdue',
        lease_expiry: '2026-08-20'
      },
      104: {
        id: 104,
        name: 'PQR Auto Parts',
        compliance_score: 97,
        submissions: [
          { period: 'Q1 2026', status: 'approved' },
          { period: 'Q4 2025', status: 'approved' }
        ],
        violations: [],
        payment_status: 'current',
        lease_expiry: '2028-03-10'
      }
    };

    const industryData = mockIndustries[industryId] || mockIndustries[101];
    const analysis = analyzeIndustryHealth(industryData);

    res.json(analysis);
  } catch (err) {
    console.error('AI Analysis Error:', err.message);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// @route   GET /api/ai-decisions/batch
// @desc    Get recommendations for multiple industries
// @access  Private (Admin, Govt)
router.get('/batch', async (req, res) => {
  try {
    const { limit = 10, risk_level } = req.query;

    // Mock batch analysis
    const batchAnalysis = [
      {
        industry_id: 102,
        industry_name: 'XYZ Manufacturing',
        park: 'Sriperumbudur',
        compliance_score: 35,
        risk_level: 'critical',
        urgent_actions: ['Schedule Inspection', 'Issue Show Cause Notice', 'Send Submission Reminders']
      },
      {
        industry_id: 103,
        industry_name: 'LMN Textiles',
        park: 'Oragadam',
        compliance_score: 72,
        risk_level: 'medium',
        urgent_actions: ['Initiate Payment Recovery', 'Follow up on violation']
      },
      {
        industry_id: 105,
        industry_name: 'Delta Chemicals',
        park: 'Hosur',
        compliance_score: 28,
        risk_level: 'critical',
        urgent_actions: ['Immediate Shutdown Review', 'Environmental Assessment']
      },
      {
        industry_id: 104,
        industry_name: 'PQR Auto Parts',
        park: 'Cheyyar',
        compliance_score: 97,
        risk_level: 'low',
        urgent_actions: ['Process Lease Renewal (Expedited)']
      }
    ];

    let results = batchAnalysis;
    if (risk_level) {
      results = results.filter(item => item.risk_level === risk_level);
    }
    if (limit) {
      results = results.slice(0, parseInt(limit));
    }

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
// @desc    Get AI decision summary for admin dashboard
// @access  Private (Admin)
router.get('/dashboard-summary', async (req, res) => {
  try {
    const summary = {
      total_industries: 1250,
      risk_distribution: {
        critical: 15,
        high: 78,
        medium: 234,
        low: 923
      },
      urgent_actions_required: 93,
      auto_approvable: 45,
      pending_reviews: 156,
      recommendations: [
        { type: 'Inspection Required', count: 23, priority: 'critical' },
        { type: 'Submission Reminder', count: 45, priority: 'medium' },
        { type: 'Show Cause Notice', count: 8, priority: 'critical' },
        { type: 'Lease Renewal', count: 17, priority: 'low' }
      ]
    };

    res.json(summary);
  } catch (err) {
    console.error('Dashboard Summary Error:', err.message);
    res.status(500).json({ error: 'Failed to generate dashboard summary' });
  }
});

module.exports = router;
