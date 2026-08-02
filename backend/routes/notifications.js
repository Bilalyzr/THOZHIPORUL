const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');

// ============================================================
// Helpers
// ============================================================
// Human-friendly relative time (e.g. "2 hours ago", "3 days ago").
// The UI renders this string directly as the notification timestamp.
const timeAgo = (date) => {
    if (!date) return '';
    const then = new Date(date).getTime();
    if (Number.isNaN(then)) return '';
    const diffMs = Date.now() - then;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? '' : 's'} ago`;
};

// Map violation severity -> UI severity ('error' | 'warning' | 'info').
const severityFor = (violationSeverity) => {
    switch (violationSeverity) {
        case 'critical':
        case 'high':
            return 'error';
        case 'medium':
            return 'warning';
        default:
            return 'info';
    }
};

// ============================================================
// @route   GET /api/notifications
// @desc    System alerts derived from real events (open compliance
//          violations, recent data submissions, pending service requests).
//          There is no notifications table — this list is generated on the
//          fly. Admin/Govt see system-wide alerts; an industry user (with a
//          profile_id in their token) sees only alerts for their own company.
// @access  Private (Admin, Govt, Industry)
// ============================================================
router.get('/', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        // If the caller is an industry user we can scope alerts to their own
        // industry_profiles.id (carried in the token as profile_id). Admin/Govt
        // callers, or any caller without a resolvable industry, get system-wide.
        const industryId = req.user && req.user.role === 'industry' ? req.user.profile_id : null;
        const scoped = !!industryId;
        const idParam = scoped ? [industryId] : [];
        // Reusable "$1 filter or nothing" fragment builder.
        const filter = (col) => (scoped ? `AND ${col} = $1` : '');

        // 1. Open compliance violations (the most serious alerts).
        const violations = await db.query(`
            SELECT
                v.id,
                ip.company_name,
                r.rule_name,
                v.severity,
                v.violation_date
            FROM compliance_violations v
            JOIN industry_profiles ip ON ip.id = v.industry_id
            LEFT JOIN compliance_rules r ON r.id = v.rule_id
            WHERE v.status <> 'resolved' ${filter('v.industry_id')}
            ORDER BY v.violation_date DESC
        `, idParam);

        // 2. Recently submitted data filings awaiting review.
        const submissions = await db.query(`
            SELECT
                ds.id,
                ip.company_name,
                ds.period_year,
                ds.period_quarter,
                ds.submitted_at
            FROM data_submissions ds
            JOIN industry_profiles ip ON ip.id = ds.industry_id
            WHERE lower(ds.status) = 'submitted'
              AND ds.submitted_at IS NOT NULL
              ${filter('ds.industry_id')}
            ORDER BY ds.submitted_at DESC
            LIMIT 10
        `, idParam);

        // 3. Pending / in-progress service requests (some past expected date).
        const serviceRequests = await db.query(`
            SELECT
                sr.id,
                ip.company_name,
                sr.service_type,
                sr.reference_number,
                sr.current_status,
                sr.priority,
                sr.applied_date,
                sr.expected_completion
            FROM service_requests sr
            JOIN industry_profiles ip ON ip.id = sr.industry_id
            WHERE sr.current_status NOT IN ('approved', 'rejected', 'completed')
              ${filter('sr.industry_id')}
            ORDER BY sr.applied_date DESC
            LIMIT 10
        `, idParam);

        const notifications = [];

        for (const v of violations.rows) {
            const label = v.severity === 'critical' ? 'Critical violation' : 'Violation';
            const rule = v.rule_name ? ` — ${v.rule_name}` : '';
            notifications.push({
                id: `violation-${v.id}`,
                type: 'Violation',
                message: `${label}: ${v.company_name}${rule}`,
                severity: severityFor(v.severity),
                time: timeAgo(v.violation_date),
                date: v.violation_date,
                read: false
            });
        }

        for (const s of submissions.rows) {
            notifications.push({
                id: `submission-${s.id}`,
                type: 'Submission',
                message: `${s.company_name} submitted Q${s.period_quarter} ${s.period_year} data for review`,
                severity: 'info',
                time: timeAgo(s.submitted_at),
                date: s.submitted_at,
                read: false
            });
        }

        const now = Date.now();
        for (const sr of serviceRequests.rows) {
            const overdue = sr.expected_completion && new Date(sr.expected_completion).getTime() < now;
            const service = String(sr.service_type || 'service').replace(/_/g, ' ');
            notifications.push({
                id: `service-${sr.id}`,
                type: 'Service Request',
                message: overdue
                    ? `Overdue ${service} request (${sr.reference_number}) for ${sr.company_name}`
                    : `Pending ${service} request (${sr.reference_number}) for ${sr.company_name}`,
                severity: overdue ? 'warning' : 'info',
                time: timeAgo(sr.applied_date),
                date: sr.applied_date,
                read: false
            });
        }

        // Newest first across all event types.
        notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        res.json(notifications);
    } catch (err) {
        console.error('Notifications Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
