const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');
const cache = require('../services/cache');
const CACHE_TTL = parseInt(process.env.DASHBOARD_CACHE_TTL_MS) || 60_000;
const { forecast, quarterlySeries, METRIC_CONFIG } = require('../services/forecastService');

// ============================================================
// intelligence.js — park-level resource intelligence, growth
// analytics, forecasting and capacity-vs-demand planning
// (Phases 11-15). Every number originates from real filings;
// when data is insufficient the API says so instead of
// fabricating values.
// ============================================================

// ------------------------------------------------------------
// GET /api/intelligence/park-resources?parkId=&metric=water|power
// Quarterly demand series derived FROM INDUSTRY FILINGS (replaces
// the disconnected park_infrastructure_metrics view for demand).
// Includes QoQ growth % and quota totals.
// ------------------------------------------------------------
router.get('/park-resources', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const metric = req.query.metric === 'water' ? 'water' : 'power';
        const parkId = req.query.parkId ? parseInt(req.query.parkId) : null;

        const scope = parkId ? 'park' : 'state';
        const series = await quarterlySeries(metric, scope, parkId);

        // Latest quarter per-industry breakdown for drill-down.
        // NOTE: inside the CTE the profiles alias is `ipx` — the outer
        // alias `ip` is only visible outside the CTE.
        const params = [];
        let where = '';
        if (parkId) { params.push(parkId); where = 'AND ipx.park_id = $1'; }
        const { rows } = await db.query(`
            WITH latest AS (
                SELECT DISTINCT ON (ds.industry_id) ds.id, ds.industry_id
                  FROM data_submissions ds
                  JOIN industry_profiles ipx ON ipx.id = ds.industry_id
                  WHERE ds.period_quarter IS NOT NULL ${where.replace('$1', `$${params.length}`)}
              ORDER BY ds.industry_id, ds.period_year DESC, ds.period_quarter DESC
            )
            SELECT ip.company_name, ip.park_id,
                   ${metric === 'water' ? 'r.water_consumption' : 'r.power_usage'} AS usage,
                   ${metric === 'water' ? 'ip.water_allocated_kl' : 'ip.sanctioned_load_kw'} AS quota
              FROM latest l
              JOIN industry_profiles ip ON ip.id = l.industry_id
         LEFT JOIN resource_usage r ON r.submission_id = l.id
             WHERE COALESCE(${metric === 'water' ? 'r.water_consumption' : 'r.power_usage'}, 0) > 0
          ORDER BY 3 DESC`, params);

        const enriched = series.map((p, i) => {
            const prev = series[i - 1];
            const qoq = prev && prev.value > 0
                ? Math.round(((p.value - prev.value) / prev.value) * 1000) / 10
                : null;
            return { ...p, period: `${p.year}-Q${p.quarter}`, qoq_growth_pct: qoq };
        });

        const totalQuota = rows.reduce((s, r) => s + (Number(r.quota) || 0), 0);
        const latest = enriched[enriched.length - 1] || null;

        res.json({
            metric,
            unit: metric === 'water' ? 'KL' : 'kWh',
            source: 'industry filings (latest revision per period)',
            series: enriched,
            latest_quarter: latest,
            industries: rows.map(r => ({
                company_name: r.company_name,
                usage: Number(r.usage) || 0,
                quota: r.quota === null ? null : Number(r.quota)
            })),
            total_quota: totalQuota > 0 ? {
                value: totalQuota,
                unit: metric === 'water' ? 'KL (allocation)' : 'kW (sanctioned load)'
            } : null,
            note: totalQuota === 0 && rows.length
                ? 'No allocations/sanctioned loads configured for these industries — quota comparison unavailable (configure on industry profiles).'
                : null
        });
    } catch (err) {
        console.error('Park Resources Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ------------------------------------------------------------
// GET /api/intelligence/growth?metric=&scope=state|park|industry
// Quarter-over-quarter and year-over-year growth from real data
// (SQL window functions). No hardcoded percentages.
// ------------------------------------------------------------
router.get('/growth', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const metric = METRIC_CONFIG[req.query.metric] ? req.query.metric : 'investment';
        let scope = 'state', scopeId = null;
        if (req.user.role === 'industry') { scope = 'industry'; scopeId = req.user.profile_id; }
        else if (req.query.scope === 'park' && req.query.parkId) { scope = 'park'; scopeId = parseInt(req.query.parkId); }
        else if (req.query.scope === 'industry' && req.query.industryId) { scope = 'industry'; scopeId = parseInt(req.query.industryId); }

        const series = await quarterlySeries(metric, scope, scopeId);
        const withGrowth = series.map((p, i) => {
            const prevQ = series[i - 1];
            // YoY: same quarter previous year.
            const prevY = series.find(x => x.year === p.year - 1 && x.quarter === p.quarter);
            const qoq = prevQ && prevQ.value > 0 ? Math.round(((p.value - prevQ.value) / prevQ.value) * 1000) / 10 : null;
            const yoy = prevY && prevY.value > 0 ? Math.round(((p.value - prevY.value) / prevY.value) * 1000) / 10 : null;
            return { ...p, period: `${p.year}-Q${p.quarter}`, qoq_growth_pct: qoq, yoy_growth_pct: yoy };
        });

        const latest = withGrowth[withGrowth.length - 1] || null;
        res.json({
            metric,
            unit: METRIC_CONFIG[metric].unit,
            scope: { type: scope, id: scopeId },
            series: withGrowth,
            latest,
            data_status: series.length ? 'OK' : 'NO_DATA'
        });
    } catch (err) {
        console.error('Growth Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ------------------------------------------------------------
// GET /api/intelligence/forecast?metric=&scope=&scopeId=&horizon=
// Quarterly forecast, 1-4 quarters, persisted. Honest
// INSUFFICIENT_DATA when history is too thin.
// ------------------------------------------------------------
router.get('/forecast', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const metric = METRIC_CONFIG[req.query.metric] ? req.query.metric : 'employment';
        const horizon = parseInt(req.query.horizon) || 4;
        let scope = 'state', scopeId = null;
        if (req.user.role === 'industry') { scope = 'industry'; scopeId = req.user.profile_id; }
        else if (req.query.scope === 'park' && req.query.parkId) { scope = 'park'; scopeId = parseInt(req.query.parkId); }
        else if (req.query.scope === 'industry' && req.query.industryId) { scope = 'industry'; scopeId = parseInt(req.query.industryId); }

        const result = await forecast(metric, scope, scopeId, horizon, { generatedBy: `user:${req.user.id}` });
        res.json(result);
    } catch (err) {
        console.error('Forecast Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ------------------------------------------------------------
// GET /api/intelligence/park-overview — one card per park with
// every intelligence dimension (Phase 12). All values from real
// records; counts that cannot be derived return 0 honestly.
// ------------------------------------------------------------
router.get('/park-overview', requireRole(['admin', 'govt']), cache.middleware(CACHE_TTL), async (req, res) => {
    try {
        const { rows } = await db.query(`
            WITH latest AS (
                SELECT DISTINCT ON (ds.industry_id) ds.id, ds.industry_id
                  FROM data_submissions ds
              ORDER BY ds.industry_id, ds.period_year DESC, ds.period_quarter DESC NULLS LAST
            ),
            latest_scores AS (
                SELECT DISTINCT ON (industry_id) industry_id, overall_score
                  FROM compliance_scores ORDER BY industry_id, score_date DESC
            )
            SELECT p.id, p.name, p.code, p.district, p.infrastructure_score,
                   p.water_capacity_kl, p.power_capacity_mw,
                   COUNT(ip.id) FILTER (WHERE ip.operational_status = 'OPERATING') AS operating,
                   COUNT(ip.id) AS industries,
                   COALESCE(SUM(f.investment_amount), 0) AS investment_inr,
                   COALESCE(SUM(f.annual_turnover), 0) AS turnover_inr,
                   COALESCE(SUM(e.permanent_employees + e.contract_employees), 0) AS employment,
                   COALESCE(SUM(r.water_consumption), 0) AS water_kl,
                   COALESCE(SUM(r.power_usage), 0) AS power_kwh,
                   COALESCE(SUM(c.amount_spent), 0) AS csr_inr,
                   ROUND(AVG(ls.overall_score), 1) AS avg_compliance,
                   (SELECT COUNT(*)::int FROM data_findings df
                     JOIN industry_profiles i2 ON i2.id = df.industry_id
                    WHERE i2.park_id = p.id AND df.status = 'open' AND df.severity IN ('high','critical')) AS open_anomalies
              FROM industrial_parks p
              LEFT JOIN industry_profiles ip ON ip.park_id = p.id
              LEFT JOIN latest l ON l.industry_id = ip.id
              LEFT JOIN financial_data f ON f.submission_id = l.id
              LEFT JOIN employment_data e ON e.submission_id = l.id
              LEFT JOIN resource_usage r ON r.submission_id = l.id
              LEFT JOIN csr_activities c ON c.submission_id = l.id
              LEFT JOIN latest_scores ls ON ls.industry_id = ip.id
          GROUP BY p.id
          ORDER BY investment_inr DESC`);

        // Latest-quarter production value per park.
        const prod = await db.query(`
            WITH latest AS (
                SELECT DISTINCT ON (pd.industry_id, pd.period_year, pd.period_quarter)
                       pd.industry_id, pd.period_year, pd.period_quarter, pd.submission_id
                  FROM production_data pd
              ORDER BY pd.industry_id, pd.period_year, pd.period_quarter, pd.created_at DESC
            )
            SELECT ip.park_id, SUM(pd.production_value) AS production_inr
              FROM latest l
              JOIN production_data pd ON pd.submission_id = l.submission_id AND pd.industry_id = l.industry_id
              JOIN industry_profiles ip ON ip.id = l.industry_id
          GROUP BY ip.park_id`);
        const prodMap = new Map(prod.rows.map(r => [r.park_id, Number(r.production_inr) || 0]));

        // Filing compliance (missing/overdue this year) per park.
        const { getFilingMatrix } = require('../services/missingSubmissionEngine');
        const year = new Date().getUTCFullYear();
        const parkIds = rows.map(r => r.id);
        const missingByPark = new Map();
        for (const pid of parkIds) {
            try {
                const m = await getFilingMatrix({ year, parkId: pid });
                missingByPark.set(pid, { overdue: m.summary.overdue, missing: m.summary.missing, expected: m.summary.expected_industries });
            } catch (_) { missingByPark.set(pid, null); }
        }

        res.json(rows.map(r => ({
            park_id: r.id, name: r.name, code: r.code, district: r.district,
            infrastructure_score: r.infrastructure_score,
            capacity: {
                water_kl_per_day: r.water_capacity_kl === null ? null : Number(r.water_capacity_kl),
                power_mw: r.power_capacity_mw === null ? null : Number(r.power_capacity_mw)
            },
            industries: parseInt(r.industries) || 0,
            operating: parseInt(r.operating) || 0,
            investment_inr: Number(r.investment_inr) || 0,
            turnover_inr: Number(r.turnover_inr) || 0,
            employment: parseInt(r.employment) || 0,
            water_kl_latest_quarter: Number(r.water_kl) || 0,
            power_kwh_latest_quarter: Number(r.power_kwh) || 0,
            csr_inr: Number(r.csr_inr) || 0,
            production_inr_latest_quarter: prodMap.get(r.id) || 0,
            avg_compliance: r.avg_compliance === null ? null : Number(r.avg_compliance),
            open_anomalies: parseInt(r.open_anomalies) || 0,
            filing_compliance: missingByPark.get(r.id) || null,
            basis: 'latest filing per industry (latest revision)'
        })));
    } catch (err) {
        console.error('Park Overview Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ------------------------------------------------------------
// GET /api/intelligence/capacity?parkId= — CURRENT vs PROJECTED
// vs CAPACITY vs GAP vs RISK (Phase 15). Capacity comes from the
// park's configured infrastructure columns; conversions are
// stated explicitly. No capacity configured → honest NOT_CONFIGURED.
// ------------------------------------------------------------
router.get('/capacity', requireRole(['admin', 'govt']), cache.middleware(CACHE_TTL), async (req, res) => {
    try {
        const parkId = req.query.parkId ? parseInt(req.query.parkId) : null;
        const DAYS_PER_QUARTER = 91, HOURS_PER_QUARTER = 2190;

        const parks = (await db.query(
            parkId ? 'SELECT * FROM industrial_parks WHERE id = $1' : 'SELECT * FROM industrial_parks ORDER BY id',
            parkId ? [parkId] : [])).rows;

        const out = [];
        for (const p of parks) {
            const entry = { park_id: p.id, name: p.name, resources: {} };
            for (const metric of ['water', 'power']) {
                const series = await quarterlySeries(metric, 'park', p.id);
                const current = series.length ? series[series.length - 1].value : null;
                const fc = await forecast(metric, 'park', p.id, 4, { persist: false });

                let projected = null, projection_source = 'forecast (4-quarter mean)';
                if (fc.data_status === 'OK') {
                    projected = Math.round(fc.projection.reduce((s, x) => s + x.value, 0) / fc.projection.length);
                } else if (current !== null) {
                    projected = current; projection_source = 'latest actual (forecast unavailable — insufficient history)';
                }

                let capacity = null, unit = '';
                if (metric === 'water') {
                    capacity = p.water_capacity_kl !== null && Number(p.water_capacity_kl) > 0
                        ? Math.round(Number(p.water_capacity_kl) * DAYS_PER_QUARTER) : null; // KL/qtr
                    unit = 'KL/quarter';
                } else {
                    capacity = p.power_capacity_mw !== null && Number(p.power_capacity_mw) > 0
                        ? Math.round(Number(p.power_capacity_mw) * 1000 * HOURS_PER_QUARTER) : null; // kWh/qtr
                    unit = 'kWh/quarter';
                }

                let gap = null, risk = 'UNKNOWN';
                if (capacity === null) {
                    risk = 'NOT_CONFIGURED';
                } else if (projected === null) {
                    risk = 'NO_DEMAND_DATA';
                } else {
                    gap = projected - capacity;
                    const util = capacity > 0 ? projected / capacity : 0;
                    risk = util > 1.0 ? 'HIGH' : util > 0.85 ? 'MEDIUM' : 'LOW';
                }

                entry.resources[metric] = {
                    unit,
                    current_demand: current,
                    projected_demand: projected,
                    projection_source,
                    capacity,
                    capacity_basis: capacity === null
                        ? 'NOT_CONFIGURED'
                        : (metric === 'water'
                            ? `configured ${p.water_capacity_kl} KL/day × ${DAYS_PER_QUARTER} days`
                            : `configured ${p.power_capacity_mw} MW × 1000 kW × ${HOURS_PER_QUARTER} h`),
                    gap,
                    risk
                };
            }
            out.push(entry);
        }
        res.json({
            parks: out,
            notes: [
                'Capacity values are the park\'s configured infrastructure figures (industrial_parks.water_capacity_kl per day / power_capacity_mw).',
                'Demand is quarterly, derived from industry filings; projections average the 4-quarter forecast when history permits.'
            ]
        });
    } catch (err) {
        console.error('Capacity Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ------------------------------------------------------------
// GET /api/intelligence/production?year=&quarter= — production
// analytics by park/industry/product (Phase 3 analytics side).
// ------------------------------------------------------------
router.get('/production', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const params = [];
        const conditions = [];
        if (req.query.year) { params.push(parseInt(req.query.year)); conditions.push(`pd.period_year = $${params.length}`); }
        if (req.query.quarter) { params.push(parseInt(req.query.quarter)); conditions.push(`pd.period_quarter = $${params.length}`); }
        if (req.user.role === 'industry') {
            if (!req.user.profile_id) return res.status(400).json({ error: 'No industry profile.' });
            params.push(req.user.profile_id);
            conditions.push(`pd.industry_id = $${params.length}`);
        }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const byIndustry = await db.query(`
            SELECT ip.company_name, p.name AS park_name, pd.period_year, pd.period_quarter,
                   COUNT(*)::int AS products, SUM(pd.quantity) AS total_quantity,
                   SUM(pd.production_value) AS total_value_inr
              FROM production_data pd
              JOIN industry_profiles ip ON ip.id = pd.industry_id
         LEFT JOIN industrial_parks p ON p.id = ip.park_id
              ${where}
          GROUP BY ip.company_name, p.name, pd.period_year, pd.period_quarter
          ORDER BY pd.period_year DESC, pd.period_quarter DESC, total_value_inr DESC`, params);

        const byProduct = await db.query(`
            SELECT pd.product_name, pd.unit, SUM(pd.quantity) AS total_quantity, SUM(pd.production_value) AS total_value_inr
              FROM production_data pd ${where}
          GROUP BY pd.product_name, pd.unit
          ORDER BY total_value_inr DESC LIMIT 50`, params);

        res.json({
            by_industry: byIndustry.rows.map(r => ({ ...r, period: `${r.period_year}-Q${r.period_quarter}` })),
            by_product: byProduct.rows,
            count: byIndustry.rows.length
        });
    } catch (err) {
        console.error('Production Analytics Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
