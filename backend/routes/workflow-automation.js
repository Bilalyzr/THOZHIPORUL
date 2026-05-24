const express = require('express');
const router = express.Router();
const db = require('../db');

// ============================================================
// WORKFLOW AUTOMATION ENGINE
// Handles automatic approvals, escalations, and rule-based actions
// ============================================================

// In-memory workflow rules (in production, store in database)
const workflowRules = {
  // Auto-approval rules
  autoApproval: {
    enabled: true,
    rules: [
      {
        id: 'auto-approve-noc-high-compliance',
        name: 'Auto-approve NOC for high compliance industries',
        conditions: {
          compliance_score: { operator: '>=', value: 90 },
          service_type: ['noc_fire', 'noc_pollution'],
          no_critical_violations: true,
          payment_status: 'current'
        },
        actions: ['auto_approve_request', 'send_approval_notification'],
        priority: 1
      },
      {
        id: 'auto-approve-lease-renewal-good-standing',
        name: 'Auto-approve lease renewals for good standing industries',
        conditions: {
          compliance_score: { operator: '>=', value: 85 },
          service_type: ['lease_renewal'],
          lease_within_expiry_limit: 90, // days
          payment_status: 'current'
        },
        actions: ['auto_approve_request', 'update_lease_dates', 'send_approval_notification'],
        priority: 2
      }
    ]
  },

  // Escalation rules
  escalation: {
    enabled: true,
    rules: [
      {
        id: 'escalate-overdue-submissions',
        name: 'Escalate overdue submissions to regional officer',
        conditions: {
          days_overdue: { operator: '>', value: 30 },
          submission_type: ['quarterly', 'annual']
        },
        actions: ['escalate_to_regional_officer', 'send_escalation_notice'],
        priority: 1
      },
      {
        id: 'escalate-critical-violations',
        name: 'Escalate critical violations immediately',
        conditions: {
          violation_severity: 'critical',
          days_open: { operator: '>', value: 7 }
        },
        actions: ['escalate_to_director', 'schedule_emergency_meeting', 'send_legal_notice'],
        priority: 0
      }
    ]
  },

  // Notification rules
  notifications: {
    enabled: true,
    rules: [
      {
        id: 'notify-lease-expiry-60-days',
        name: 'Notify 60 days before lease expiry',
        conditions: {
          days_until_expiry: { operator: '<=', value: 60 },
          days_until_expiry: { operator: '>', value: 30 }
        },
        actions: ['send_email_notification', 'create_system_alert'],
        priority: 3
      },
      {
        id: 'notify-payment-overdue',
        name: 'Notify payment overdue',
        conditions: {
          payment_days_overdue: { operator: '>', value: 15 }
        },
        actions: ['send_payment_reminder', 'add_late_fee_notice'],
        priority: 2
      }
    ]
  }
};

// ============================================================
// RULE ENGINE
// ============================================================

function evaluateCondition(actualValue, condition) {
  const { operator, value } = condition;

  switch (operator) {
    case '>': return actualValue > value;
    case '>=': return actualValue >= value;
    case '<': return actualValue < value;
    case '<=': return actualValue <= value;
    case '==': return actualValue === value;
    case '!=': return actualValue !== value;
    case 'in': return Array.isArray(value) && value.includes(actualValue);
    case 'not_in': return Array.isArray(value) && !value.includes(actualValue);
    default: return false;
  }
}

function evaluateRule(ruleset, industryData, requestData) {
  if (!ruleset.enabled) return { match: false };

  const matchingRules = [];

  for (const rule of ruleset.rules) {
    let allConditionsMet = true;

    // Check each condition
    for (const [key, condition] of Object.entries(rule.conditions)) {
      let actualValue;

      // Map condition key to actual data
      switch (key) {
        case 'compliance_score':
          actualValue = industryData.compliance_score || 0;
          break;
        case 'service_type':
          actualValue = requestData?.service_type;
          break;
        case 'no_critical_violations':
          actualValue = !(industryData.violations || []).some(v => v.severity === 'critical');
          break;
        case 'payment_status':
          actualValue = industryData.payment_status;
          break;
        case 'lease_within_expiry_limit':
          actualValue = industryData.days_until_expiry !== undefined &&
                        industryData.days_until_expiry > condition;
          continue; // Skip standard evaluation
        case 'days_overdue':
          actualValue = requestData?.days_overdue || 0;
          break;
        case 'violation_severity':
          actualValue = requestData?.violation_severity;
          break;
        case 'days_open':
          actualValue = requestData?.days_open || 0;
          break;
        case 'days_until_expiry':
          actualValue = industryData.days_until_expiry || 0;
          break;
        default:
          allConditionsMet = false;
      }

      if (actualValue !== undefined && !evaluateCondition(actualValue, condition)) {
        allConditionsMet = false;
        break;
      }
    }

    if (allConditionsMet) {
      matchingRules.push(rule);
    }
  }

  return {
    match: matchingRules.length > 0,
    rules: matchingRules.sort((a, b) => a.priority - b.priority)
  };
}

// ============================================================
// ENDPOINTS
// ============================================================

// @route   POST /api/workflow/evaluate
// @desc    Evaluate workflow rules for a given scenario
// @access  Private (Admin, System)
router.post('/evaluate', async (req, res) => {
  try {
    const { industry_id, service_type, ruleset = 'autoApproval' } = req.body;

    // Mock industry data - in production, fetch from database
    const mockIndustryData = {
      101: { compliance_score: 92, payment_status: 'current', violations: [], days_until_expiry: 120 },
      102: { compliance_score: 35, payment_status: 'overdue', violations: [{ severity: 'critical' }] },
      103: { compliance_score: 88, payment_status: 'current', violations: [], days_until_expiry: 45 },
      104: { compliance_score: 97, payment_status: 'current', violations: [], days_until_expiry: 365 }
    };

    const industryData = mockIndustryData[industry_id] || mockIndustryData[101];
    const requestData = { service_type };

    const result = evaluateRule(workflowRules[ruleset], industryData, requestData);

    if (result.match) {
      const actions = result.rules.flatMap(r => r.actions);
      res.json({
        triggered: true,
        ruleset: ruleset,
        matched_rules: result.rules.map(r => ({ id: r.id, name: r.name })),
        actions_to_execute: actions,
        industry_id,
        evaluated_at: new Date().toISOString()
      });
    } else {
      res.json({
        triggered: false,
        ruleset: ruleset,
        reason: 'No matching rules found for current conditions',
        industry_id,
        evaluated_at: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error('Workflow Evaluation Error:', err.message);
    res.status(500).json({ error: 'Failed to evaluate workflow rules' });
  }
});

// @route   GET /api/workflow/rules
// @desc    Get all workflow rules
// @access  Private (Admin)
router.get('/rules', (req, res) => {
  const { type } = req.query;

  if (type && workflowRules[type]) {
    res.json({ type, rules: workflowRules[type] });
  } else if (type) {
    res.status(404).json({ error: 'Ruleset not found' });
  } else {
    res.json(workflowRules);
  }
});

// @route   PUT /api/workflow/rules/:ruleset/:ruleId
// @desc    Update a specific workflow rule
// @access  Private (Admin)
router.put('/rules/:ruleset/:ruleId', (req, res) => {
  try {
    const { ruleset, ruleId } = req.params;
    const { enabled } = req.body;

    if (!workflowRules[ruleset]) {
      return res.status(404).json({ error: 'Ruleset not found' });
    }

    if (enabled !== undefined) {
      workflowRules[ruleset].enabled = enabled;
    }

    res.json({
      success: true,
      ruleset,
      enabled: workflowRules[ruleset].enabled,
      message: `Ruleset "${ruleset}" updated successfully`
    });
  } catch (err) {
    console.error('Rule Update Error:', err.message);
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

// @route   POST /api/workflow/execute-action
// @desc    Execute a workflow action
// @access  Private (Admin, System)
router.post('/execute-action', async (req, res) => {
  try {
    const { action, industry_id, request_id, params } = req.body;

    // Log the action execution
    console.log(`[Workflow Engine] Executing action: ${action} for industry: ${industry_id}`);

    // Mock execution based on action type
    const executionResults = {
      auto_approve_request: {
        success: true,
        message: 'Request auto-approved successfully',
        approved_at: new Date().toISOString(),
        approved_by: 'Workflow Automation Engine'
      },
      send_approval_notification: {
        success: true,
        message: 'Approval notification sent via email and SMS',
        sent_at: new Date().toISOString()
      },
      escalate_to_regional_officer: {
        success: true,
        message: 'Case escalated to Regional Officer',
        escalated_at: new Date().toISOString(),
        assigned_to: 'Regional Officer - Chennai'
      },
      send_escalation_notice: {
        success: true,
        message: 'Escalation notice sent to industry',
        sent_at: new Date().toISOString()
      },
      create_system_alert: {
        success: true,
        message: 'System alert created',
        alert_id: `ALT-${Date.now()}`
      }
    };

    const result = executionResults[action] || {
      success: true,
      message: `Action "${action}" executed successfully`,
      executed_at: new Date().toISOString()
    };

    res.json(result);
  } catch (err) {
    console.error('Action Execution Error:', err.message);
    res.status(500).json({ error: 'Failed to execute action' });
  }
});

// @route   GET /api/workflow/activity-log
// @desc    Get workflow automation activity log
// @access  Private (Admin)
router.get('/activity-log', async (req, res) => {
  try {
    const { limit = 50, industry_id } = req.query;

    // Mock activity log - in production, fetch from database
    const activityLog = [
      {
        id: 1,
        timestamp: '2026-05-07T14:32:00Z',
        ruleset: 'autoApproval',
        rule_id: 'auto-approve-noc-high-compliance',
        industry_id: 104,
        industry_name: 'PQR Auto Parts',
        action: 'auto_approve_request',
        status: 'executed',
        result: 'Fire NOC approved automatically'
      },
      {
        id: 2,
        timestamp: '2026-05-07T12:15:00Z',
        ruleset: 'escalation',
        rule_id: 'escalate-critical-violations',
        industry_id: 102,
        industry_name: 'XYZ Manufacturing',
        action: 'escalate_to_director',
        status: 'executed',
        result: 'Escalated to Director due to critical violation open for 10 days'
      },
      {
        id: 3,
        timestamp: '2026-05-07T10:45:00Z',
        ruleset: 'notifications',
        rule_id: 'notify-lease-expiry-60-days',
        industry_id: 103,
        industry_name: 'LMN Textiles',
        action: 'send_email_notification',
        status: 'executed',
        result: 'Lease expiry reminder sent'
      },
      {
        id: 4,
        timestamp: '2026-05-06T16:20:00Z',
        ruleset: 'autoApproval',
        rule_id: 'auto-approve-lease-renewal-good-standing',
        industry_id: 101,
        industry_name: 'ABC Industries',
        action: 'update_lease_dates',
        status: 'executed',
        result: 'Lease renewed until 2029-06-15'
      }
    ];

    let results = activityLog;
    if (industry_id) {
      results = results.filter(log => log.industry_id === parseInt(industry_id));
    }
    if (limit) {
      results = results.slice(0, parseInt(limit));
    }

    res.json({
      total: results.length,
      activities: results
    });
  } catch (err) {
    console.error('Activity Log Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

// @route   GET /api/workflow/stats
// @desc    Get workflow automation statistics
// @access  Private (Admin)
router.get('/stats', (req, res) => {
  const stats = {
    today: {
      auto_approved: 12,
      escalated: 3,
      notifications_sent: 45
    },
    this_week: {
      auto_approved: 78,
      escalated: 18,
      notifications_sent: 312
    },
    this_month: {
      auto_approved: 285,
      escalated: 52,
      notifications_sent: 1245
    },
    rules_status: {
      autoApproval: { enabled: true, rules_count: 2 },
      escalation: { enabled: true, rules_count: 2 },
      notifications: { enabled: true, rules_count: 2 }
    },
    time_saved: {
      auto_approvals: '235 hours',
      total_efficiency: '38%'
    }
  };

  res.json(stats);
});

module.exports = router;
