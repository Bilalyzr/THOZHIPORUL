const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');

// ============================================================
// Helpers
// ============================================================
const SERVICE_TYPE_LABELS = {
    noc_fire: 'NOC Fire Safety',
    land_allotment: 'Land Allotment',
    water_connection: 'Water Connection',
    power_connection: 'Power Connection',
    lease_renewal: 'Lease Renewal',
    noc_pollution: 'NOC Pollution',
    building_approval: 'Building Approval',
    transfer_request: 'Transfer Request',
};
const labelForServiceType = (t) => SERVICE_TYPE_LABELS[t] || 'Service Request';

// @route   GET /api/command/kpis
// @desc    Aggregated KPI cards for Command Center
// @access  Private (Admin, Govt)
router.get('/kpis', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        // Financial + employment totals from the latest submission per industry.
        // investment_amount / annual_turnover are stored in rupees -> Crores.
        const { rows: kpiRows } = await db.query(`
            SELECT
                COALESCE(SUM(CASE WHEN f.investment_amount >= 100000 THEN f.investment_amount / 1e7 ELSE f.investment_amount END), 0) AS total_capex_cr,
                COALESCE(SUM(CASE WHEN f.annual_turnover >= 100000 THEN f.annual_turnover / 1e7 ELSE f.annual_turnover END), 0) AS total_revenue_cr,
                COALESCE(SUM(e.permanent_employees), 0) AS direct_employment,
                COALESCE(SUM(e.contract_employees), 0) AS indirect_employment
            FROM industry_profiles i
            LEFT JOIN (
                SELECT DISTINCT ON (industry_id) id, industry_id
                FROM data_submissions ORDER BY industry_id, submitted_at DESC
            ) latest_sub ON latest_sub.industry_id = i.id
            LEFT JOIN financial_data f ON f.submission_id = latest_sub.id
            LEFT JOIN employment_data e ON e.submission_id = latest_sub.id
        `);

        // Red flags = open compliance violations + pending service requests.
        const { rows: flagRows } = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM compliance_violations
                    WHERE status NOT IN ('resolved')) AS open_violations,
                (SELECT COUNT(*) FROM service_requests
                    WHERE current_status NOT IN ('completed', 'approved', 'rejected')) AS pending_srs
        `);

        const k = kpiRows[0];
        const openViolations = parseInt(flagRows[0].open_violations) || 0;
        const pendingSRs = parseInt(flagRows[0].pending_srs) || 0;

        res.json({
            total_capex_cr: Math.round(parseFloat(k.total_capex_cr) || 0),
            capex_growth_pct: 0,
            total_revenue_cr: Math.round(parseFloat(k.total_revenue_cr) || 0),
            revenue_growth_pct: 0,
            direct_employment: parseInt(k.direct_employment) || 0,
            direct_growth_pct: 0,
            indirect_employment: parseInt(k.indirect_employment) || 0,
            indirect_growth_pct: 0,
            red_flags: openViolations + pendingSRs,
            red_flags_change: 0
        });
    } catch (err) {
        console.error('Command KPIs Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/command/heatmap
// @desc    District-level aggregation for state heatmap
// @access  Private (Admin, Govt)
router.get('/heatmap', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT
                p.district AS district,
                COUNT(DISTINCT p.id) AS parks,
                COUNT(i.id) AS industries,
                COALESCE(SUM(CASE WHEN f.investment_amount >= 100000 THEN f.investment_amount / 1e7 ELSE f.investment_amount END), 0) AS investment_cr,
                COALESCE(SUM(e.permanent_employees + e.contract_employees), 0) AS employment
            FROM industrial_parks p
            LEFT JOIN industry_profiles i ON i.park_id = p.id
            LEFT JOIN (
                SELECT DISTINCT ON (industry_id) id, industry_id
                FROM data_submissions ORDER BY industry_id, submitted_at DESC
            ) latest_sub ON latest_sub.industry_id = i.id
            LEFT JOIN financial_data f ON f.submission_id = latest_sub.id
            LEFT JOIN employment_data e ON e.submission_id = latest_sub.id
            GROUP BY p.district
            ORDER BY investment_cr DESC
        `);

        res.json(rows.map(r => ({
            district: r.district,
            parks: parseInt(r.parks) || 0,
            industries: parseInt(r.industries) || 0,
            investment_cr: Math.round((parseFloat(r.investment_cr) || 0) * 10) / 10,
            employment: parseInt(r.employment) || 0
        })));
    } catch (err) {
        console.error('Heatmap Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/command/rankings
// @desc    Park performance rankings (?sort=infrastructure_score|total_investment_cr|total_employment)
// @access  Private (Admin, Govt)
router.get('/rankings', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        // Whitelist sortable columns to avoid injection; default to infra score.
        const sortWhitelist = {
            infrastructure_score: 'infrastructure_score',
            total_investment_cr: 'total_investment_cr',
            total_investment: 'total_investment_cr',
            investment: 'total_investment_cr',
            total_employment: 'total_employment',
            employment: 'total_employment',
            total_industries: 'total_industries'
        };
        const sortCol = sortWhitelist[req.query.sort] || 'infrastructure_score';

        // Pull real park stats. Live investment/employment are computed from the
        // latest submissions of the industries in each park; fall back to the
        // stored park totals when there are no submissions yet.
        const { rows } = await db.query(`
            WITH park_live AS (
                SELECT
                    p.id,
                    COUNT(i.id) AS live_industries,
                    COALESCE(SUM(CASE WHEN f.investment_amount >= 100000 THEN f.investment_amount / 1e7 ELSE f.investment_amount END), 0) AS live_investment_cr,
                    COALESCE(SUM(e.permanent_employees + e.contract_employees), 0) AS live_employment
                FROM industrial_parks p
                LEFT JOIN industry_profiles i ON i.park_id = p.id
                LEFT JOIN (
                    SELECT DISTINCT ON (industry_id) id, industry_id
                    FROM data_submissions ORDER BY industry_id, submitted_at DESC
                ) latest_sub ON latest_sub.industry_id = i.id
                LEFT JOIN financial_data f ON f.submission_id = latest_sub.id
                LEFT JOIN employment_data e ON e.submission_id = latest_sub.id
                GROUP BY p.id
            )
            SELECT
                p.id,
                p.name,
                p.code,
                p.infrastructure_score,
                GREATEST(pl.live_industries, p.total_industries) AS total_industries,
                CASE WHEN pl.live_investment_cr > 0 THEN pl.live_investment_cr
                     ELSE p.total_investment_cr END AS total_investment_cr,
                CASE WHEN pl.live_employment > 0 THEN pl.live_employment
                     ELSE p.total_employment END AS total_employment
            FROM industrial_parks p
            JOIN park_live pl ON pl.id = p.id
            ORDER BY ${sortCol} DESC NULLS LAST
        `);

        res.json(rows.map((r, i) => ({
            rank: i + 1,
            id: r.id,
            name: r.name,
            code: r.code,
            infrastructure_score: parseInt(r.infrastructure_score) || 0,
            total_industries: parseInt(r.total_industries) || 0,
            total_investment_cr: Math.round(parseFloat(r.total_investment_cr) || 0),
            total_employment: parseInt(r.total_employment) || 0
        })));
    } catch (err) {
        console.error('Rankings Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/command/alerts
// @desc    Red-flag alerts for command center (derived from real open issues)
// @access  Private (Admin, Govt)
router.get('/alerts', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const alertsList = [];

        // Critical open compliance violations.
        const { rows: critRows } = await db.query(`
            SELECT COUNT(*) AS count FROM compliance_violations
            WHERE status NOT IN ('resolved') AND severity = 'critical'::violation_severity
        `);
        const critCount = parseInt(critRows[0].count) || 0;
        if (critCount > 0) {
            alertsList.push({
                id: 'viol-critical',
                severity: 'critical',
                category: 'compliance',
                message: `${critCount} critical compliance violation${critCount > 1 ? 's' : ''} require immediate action`,
                count: critCount,
                action_url: '/compliance-engine'
            });
        }

        // High-severity open compliance violations.
        const { rows: highRows } = await db.query(`
            SELECT COUNT(*) AS count FROM compliance_violations
            WHERE status NOT IN ('resolved') AND severity = 'high'::violation_severity
        `);
        const highCount = parseInt(highRows[0].count) || 0;
        if (highCount > 0) {
            alertsList.push({
                id: 'viol-high',
                severity: 'high',
                category: 'compliance',
                message: `${highCount} high-severity compliance violation${highCount > 1 ? 's' : ''} open`,
                count: highCount,
                action_url: '/compliance-engine'
            });
        }

        // Overdue service requests (past expected completion, still not closed).
        const { rows: overdueRows } = await db.query(`
            SELECT COUNT(*) AS count FROM service_requests
            WHERE current_status NOT IN ('completed', 'approved', 'rejected')
              AND expected_completion IS NOT NULL
              AND expected_completion < CURRENT_DATE
        `);
        const overdueCount = parseInt(overdueRows[0].count) || 0;
        if (overdueCount > 0) {
            alertsList.push({
                id: 'sr-overdue',
                severity: 'high',
                category: 'services',
                message: `${overdueCount} service request${overdueCount > 1 ? 's' : ''} overdue past expected completion`,
                count: overdueCount,
                action_url: '/services'
            });
        }

        // Pending service requests (awaiting administrative review).
        const { rows: pendingRows } = await db.query(`
            SELECT COUNT(*) AS count FROM service_requests
            WHERE current_status NOT IN ('completed', 'approved', 'rejected')
        `);
        const pendingCount = parseInt(pendingRows[0].count) || 0;
        if (pendingCount > 0) {
            alertsList.push({
                id: 'sr-pending',
                severity: 'medium',
                category: 'services',
                message: `${pendingCount} pending service request${pendingCount > 1 ? 's' : ''} require administrative review`,
                count: pendingCount,
                action_url: '/services'
            });
        }

        res.json(alertsList);
    } catch (err) {
        console.error('Alerts Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/command/trends
// @desc    Historical trend data for charts (?metric=investment|employment|compliance)
// @access  Private (Admin, Govt)
router.get('/trends', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const metric = req.query.metric || 'investment';

        if (metric === 'compliance') {
            // Average compliance score per year from compliance_scores.
            const { rows } = await db.query(`
                SELECT
                    EXTRACT(YEAR FROM score_date)::int AS year,
                    ROUND(AVG(overall_score), 1) AS value
                FROM compliance_scores
                GROUP BY EXTRACT(YEAR FROM score_date)
                ORDER BY year ASC
            `);
            return res.json(rows.map(r => ({ year: r.year, value: parseFloat(r.value) || 0 })));
        }

        // Investment / employment time series from submissions, bucketed by the
        // submission's reporting year (period_year), using latest submission per
        // industry-year.
        const valueExpr = metric === 'employment'
            ? 'COALESCE(SUM(e.permanent_employees + e.contract_employees), 0)'
            : 'ROUND(COALESCE(SUM(CASE WHEN f.investment_amount >= 100000 THEN f.investment_amount / 1e7 ELSE f.investment_amount END), 0))';

        const { rows } = await db.query(`
            WITH yearly AS (
                SELECT DISTINCT ON (ds.industry_id, ds.period_year)
                    ds.id, ds.industry_id, ds.period_year
                FROM data_submissions ds
                ORDER BY ds.industry_id, ds.period_year, ds.submitted_at DESC
            )
            SELECT
                y.period_year AS year,
                ${valueExpr} AS value
            FROM yearly y
            LEFT JOIN financial_data f ON f.submission_id = y.id
            LEFT JOIN employment_data e ON e.submission_id = y.id
            GROUP BY y.period_year
            ORDER BY y.period_year ASC
        `);

        res.json(rows.map(r => ({ year: parseInt(r.year), value: parseFloat(r.value) || 0 })));
    } catch (err) {
        console.error('Trends Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/command/activity-feed
// @desc    Recent system-wide activity feed (real submissions, violations, service requests)
// @access  Private (Admin, Govt)
router.get('/activity-feed', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        // Union of the most recent real events across three domains, then take
        // the newest overall.
        const { rows } = await db.query(`
            (
                SELECT
                    'sr-' || sr.id AS id,
                    'service' AS type,
                    sr.company_name,
                    sr.service_type::text AS detail,
                    sr.reference_number AS ref,
                    sr.priority AS extra,
                    sr.event_time
                FROM (
                    SELECT sr.id, ip.company_name, sr.service_type, sr.reference_number,
                           sr.priority, sr.created_at AS event_time
                    FROM service_requests sr
                    JOIN industry_profiles ip ON ip.id = sr.industry_id
                    ORDER BY sr.created_at DESC LIMIT 10
                ) sr
            )
            UNION ALL
            (
                SELECT
                    'viol-' || v.id AS id,
                    'violation' AS type,
                    ip.company_name,
                    v.severity::text AS detail,
                    r.rule_name AS ref,
                    NULL AS extra,
                    v.created_at AS event_time
                FROM compliance_violations v
                JOIN industry_profiles ip ON ip.id = v.industry_id
                LEFT JOIN compliance_rules r ON r.id = v.rule_id
                ORDER BY v.created_at DESC LIMIT 10
            )
            UNION ALL
            (
                SELECT
                    'sub-' || ds.id AS id,
                    'submission' AS type,
                    ip.company_name,
                    ds.status::text AS detail,
                    ('Q' || ds.period_quarter || ' ' || ds.period_year) AS ref,
                    NULL AS extra,
                    ds.submitted_at AS event_time
                FROM data_submissions ds
                JOIN industry_profiles ip ON ip.id = ds.industry_id
                WHERE ds.submitted_at IS NOT NULL
                ORDER BY ds.submitted_at DESC LIMIT 10
            )
            ORDER BY event_time DESC NULLS LAST
            LIMIT 15
        `);

        const feed = rows.map(r => {
            let message;
            let severity = 'info';
            if (r.type === 'service') {
                message = `${r.company_name} submitted a new ${labelForServiceType(r.detail)} request (${r.ref})`;
                severity = r.extra === 'urgent' ? 'warning' : 'info';
            } else if (r.type === 'violation') {
                message = `${r.company_name} flagged for ${r.detail} compliance violation${r.ref ? ` (${r.ref})` : ''}`;
                severity = (r.detail === 'critical' || r.detail === 'high') ? 'warning' : 'info';
            } else {
                message = `${r.company_name} ${r.detail === 'Approved' ? 'had its' : 'submitted'} ${r.ref} data ${r.detail === 'Approved' ? 'approved' : `(${r.detail})`}`;
                severity = r.detail === 'Approved' ? 'success' : 'info';
            }
            return {
                id: r.id,
                type: r.type,
                message,
                severity,
                time: r.event_time ? new Date(r.event_time).toLocaleString() : ''
            };
        });

        res.json(feed);
    } catch (err) {
        console.error('Activity Feed Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// === MODULE 7 ENHANCEMENTS — drill-down + thresholds + forecast =
// ============================================================
// Additive. Existing /kpis /heatmap /rankings /alerts /trends
// /activity-feed above are untouched. These add:
//   • Drill-down: given a KPI, return the underlying records.
//   • Alert thresholds: admin-configurable red/amber cutoffs.
//   • Forecast bands: linear projection with a confidence band.
//   • Saved dashboard views (per user).
// ============================================================

// ============================================================
// @route   GET /api/command/drilldown?metric=violations&limit=50
// @desc    Underlying records behind a KPI — click a number, see rows.
// @access  Private (Admin, Govt)
// ============================================================
router.get('/drilldown', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const metric = req.query.metric || 'violations';
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        let rows = [];
        switch (metric) {
            case 'violations':
                rows = (await db.query(`
                    SELECT v.id, ip.company_name, v.severity, v.status, v.description, v.violation_date
                      FROM compliance_violations v JOIN industry_profiles ip ON ip.id=v.industry_id
                     WHERE v.status<>'resolved' ORDER BY v.severity::text, v.violation_date DESC LIMIT $1`, [limit])).rows;
                break;
            case 'overdue_services':
                rows = (await db.query(`
                    SELECT sr.id, sr.reference_number, ip.company_name, sr.service_type,
                           sr.current_status, sr.sla_deadline, sr.deemed_approved
                      FROM service_requests sr JOIN industry_profiles ip ON ip.id=sr.industry_id
                     WHERE sr.current_status NOT IN ('approved','rejected','completed')
                       AND sr.sla_deadline < NOW()
                     ORDER BY sr.sla_deadline ASC LIMIT $1`, [limit])).rows;
                break;
            case 'missing_submissions':
                rows = (await db.query(`
                    SELECT ip.id, ip.company_name, ip.location, MAX(ds.submitted_at) AS last_submission
                      FROM industry_profiles ip LEFT JOIN data_submissions ds ON ds.industry_id=ip.id
                  GROUP BY ip.id, ip.company_name, ip.location
                    HAVING MAX(ds.submitted_at) IS NULL OR MAX(ds.submitted_at) < date_trunc('year', CURRENT_DATE)
                  ORDER BY last_submission ASC NULLS FIRST LIMIT $1`, [limit])).rows;
                break;
            case 'low_infra':
                rows = (await db.query(`
                    SELECT id, name, district, infrastructure_score, status
                      FROM industrial_parks WHERE infrastructure_score < 70
                     ORDER BY infrastructure_score ASC LIMIT $1`, [limit])).rows;
                break;
            default:
                return res.status(400).json({ error: 'unknown metric' });
        }
        res.json({ metric, rows });
    } catch (err) {
        console.error('Drilldown Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/command/thresholds
// @desc    Alert thresholds for the KPIs (red/amber cutoffs).
// @access  Private (Admin, Govt)
// ============================================================
router.get('/thresholds', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM alert_thresholds ORDER BY metric_key');
        res.json(rows);
    } catch (err) {
        console.error('Thresholds Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/command/thresholds/:key
router.put('/thresholds/:key', requireRole(['admin']), async (req, res) => {
    try {
        const { warningValue, criticalValue, direction } = req.body;
        const ins = await db.query(
            `INSERT INTO alert_thresholds (metric_key, warning_value, critical_value, direction, updated_by)
             VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (metric_key) DO UPDATE SET
               warning_value=EXCLUDED.warning_value, critical_value=EXCLUDED.critical_value,
               direction=EXCLUDED.direction, updated_by=EXCLUDED.updated_by, updated_at=NOW()
             RETURNING *`,
            [req.params.key, warningValue, criticalValue, direction || 'below', req.user.id]);
        res.json(ins.rows[0]);
    } catch (err) {
        console.error('Update Threshold Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/command/forecast?metric=investment&horizon=6
// @desc    Linear-regression forecast with a ±band. Returns history +
//          projection + band so charts draw a trend + confidence area.
// @access  Private (Admin, Govt)
// ============================================================
router.get('/forecast', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const metric = ['investment', 'employment', 'compliance'].includes(req.query.metric) ? req.query.metric : 'investment';
        const horizon = Math.min(Math.max(parseInt(req.query.horizon) || 6, 1), 24);

        let sql;
        if (metric === 'investment') {
            sql = `SELECT ds.period_year AS period,
                          SUM(CASE WHEN f.investment_amount>=100000 THEN f.investment_amount/1e7 ELSE f.investment_amount END) AS value
                     FROM data_submissions ds JOIN financial_data f ON f.submission_id=ds.id
                    WHERE ds.period_year IS NOT NULL GROUP BY 1 ORDER BY 1`;
        } else if (metric === 'employment') {
            sql = `SELECT ds.period_year AS period,
                          SUM(COALESCE(e.permanent_employees,0)+COALESCE(e.contract_employees,0)) AS value
                     FROM data_submissions ds JOIN employment_data e ON e.submission_id=ds.id
                    WHERE ds.period_year IS NOT NULL GROUP BY 1 ORDER BY 1`;
        } else {
            sql = `SELECT to_char(score_date,'YYYY-MM') AS period, AVG(overall_score) AS value
                     FROM compliance_scores GROUP BY 1 ORDER BY 1`;
        }
        const { rows } = await db.query(sql);
        const history = rows.map(r => ({ period: r.period, value: parseFloat(r.value) || 0 }));
        if (history.length < 2) return res.json({ metric, history, projection: [], band: [], slope: 0 });

        const n = history.length;
        const xs = history.map((_, i) => i);
        const ys = history.map(h => h.value);
        const meanX = xs.reduce((a, b) => a + b, 0) / n;
        const meanY = ys.reduce((a, b) => a + b, 0) / n;
        let num = 0, den = 0;
        for (let i = 0; i < n; i++) { num += (xs[i] - meanX) * (ys[i] - meanY); den += (xs[i] - meanX) ** 2; }
        const b = den === 0 ? 0 : num / den;
        const a = meanY - b * meanX;
        const resid = history.map((h, i) => h.value - (a + b * i));
        const std = Math.sqrt(resid.reduce((s, r) => s + r * r, 0) / n) || 0;

        const projection = [], band = [];
        for (let h = 1; h <= horizon; h++) {
            const x = n - 1 + h;
            const y = a + b * x;
            projection.push({ period: `+${h}`, value: Math.max(0, Math.round(y)) });
            band.push({ period: `+${h}`, low: Math.max(0, Math.round(y - std)), high: Math.round(y + std) });
        }
        res.json({ metric, history, projection, band, slope: Math.round(b * 1000) / 1000 });
    } catch (err) {
        console.error('Forecast Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET/PUT /api/command/views — saved dashboard layouts
// ============================================================
router.get('/views', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM user_dashboard_prefs WHERE user_id=$1', [req.user.id]);
        res.json(rows[0] || { layout: {}, saved_views: [], preferences: { theme: 'light', language: 'en' } });
    } catch (err) {
        console.error('Get Views Error:', err.message);
        res.status(500).send('Server Error');
    }
});

router.put('/views', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const { layout, savedViews, preferences } = req.body;
        const ins = await db.query(
            `INSERT INTO user_dashboard_prefs (user_id, layout, saved_views, preferences)
             VALUES ($1,$2::jsonb,$3::jsonb,$4::jsonb)
             ON CONFLICT (user_id) DO UPDATE SET
               layout=EXCLUDED.layout, saved_views=EXCLUDED.saved_views,
               preferences=EXCLUDED.preferences, updated_at=NOW()
             RETURNING *`,
            [req.user.id, JSON.stringify(layout || {}), JSON.stringify(savedViews || []),
             JSON.stringify(preferences || { theme: 'light' })]);
        res.json(ins.rows[0]);
    } catch (err) {
        console.error('Save Views Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
