// ============================================================
// forecastService.js — quarterly forecasting engine (Phase 14).
//
// Metrics: investment | employment | water | power | turnover |
//          production        Scopes: industry | park | state
// Horizon: 1-4 quarters. Granularity: QUARTERLY (built from the
// period-addressed filings, latest revision per industry+period).
//
// Model selection is honest about data volume:
//   ≥ 8 points & 4 distinct quarters → linear regression with
//       seasonal factors (model "linreg_seasonal")
//   ≥ 4 points                       → linear regression
//   2-3 points                       → moving average (wide band,
//       model flagged low-confidence)
//   < 2 points                       → INSUFFICIENT_DATA (with the
//       stated minimum) — NEVER a fabricated projection
//
// Canonical units in, canonical units out (INR / count / KL / kWh).
// Every generated forecast is persisted to the forecasts table.
// ============================================================

const db = require('../db');

const METRIC_CONFIG = {
    investment: { valueSql: 'SUM(f.investment_amount)', unit: 'INR' },
    turnover:   { valueSql: 'SUM(f.annual_turnover)',   unit: 'INR' },
    employment: { valueSql: 'SUM(COALESCE(e.permanent_employees,0) + COALESCE(e.contract_employees,0))', unit: 'count' },
    water:      { valueSql: 'SUM(r.water_consumption)', unit: 'KL' },
    power:      { valueSql: 'SUM(r.power_usage)',       unit: 'kWh' },
    production: { valueSql: null, unit: 'INR' } // handled separately (production_data)
};

const MINIMUM_DATA = 'at least 2 quarters of filed data for the selected scope';

// ------------------------------------------------------------
// Quarterly series for a metric + scope. Latest revision per
// industry per period — no double counting of amendments.
// ------------------------------------------------------------
async function quarterlySeries(metric, scopeType, scopeId) {
    if (!METRIC_CONFIG[metric]) throw new Error(`Unknown metric: ${metric}`);

    if (metric === 'production') {
        const { rows } = await db.query(`
            WITH latest AS (
                SELECT DISTINCT ON (pd.industry_id, pd.period_year, pd.period_quarter)
                       pd.industry_id, pd.period_year, pd.period_quarter, pd.submission_id
                  FROM production_data pd
              ORDER BY pd.industry_id, pd.period_year, pd.period_quarter, pd.created_at DESC
            )
            SELECT l.period_year AS year, l.period_quarter AS quarter,
                   SUM(pd.production_value) AS value
              FROM latest l
              JOIN production_data pd ON pd.submission_id = l.submission_id
                                   AND pd.industry_id = l.industry_id
             WHERE pd.period_year = l.period_year
               AND pd.period_quarter IS NOT DISTINCT FROM l.period_quarter
          GROUP BY l.period_year, l.period_quarter
        ORDER BY l.period_year, l.period_quarter`);
        return rows.map(r => ({ year: r.year, quarter: r.quarter, value: Number(r.value) || 0 }));
    }

    // Scope join binds to the CTE alias `l` (latest) — ds exists only
    // inside the CTE.
    const scopeJoin = scopeType === 'park'
        ? 'JOIN industry_profiles ip ON ip.id = l.industry_id AND ip.park_id = $1'
        : scopeType === 'industry'
            ? 'JOIN industry_profiles ip ON ip.id = l.industry_id AND l.industry_id = $1'
            : 'LEFT JOIN industry_profiles ip ON ip.id = l.industry_id';
    const params = scopeType === 'state' ? [] : [scopeId];

    const { rows } = await db.query(`
        WITH latest AS (
            SELECT DISTINCT ON (ds.industry_id, ds.period_year, ds.period_quarter)
                   ds.id, ds.industry_id, ds.period_year, ds.period_quarter
              FROM data_submissions ds
          ORDER BY ds.industry_id, ds.period_year, ds.period_quarter, ds.submitted_at DESC
        )
        SELECT l.period_year AS year, l.period_quarter AS quarter,
               COALESCE(${METRIC_CONFIG[metric].valueSql}, 0) AS value
          FROM latest l
          ${scopeJoin}
     LEFT JOIN financial_data f ON f.submission_id = l.id
     LEFT JOIN employment_data e ON e.submission_id = l.id
     LEFT JOIN resource_usage r ON r.submission_id = l.id
      GROUP BY l.period_year, l.period_quarter
      ORDER BY l.period_year, l.period_quarter`, params);

    return rows.filter(r => r.quarter !== null).map(r => ({ year: r.year, quarter: r.quarter, value: Number(r.value) || 0 }));
}

function nextQuarters(last, n) {
    const out = [];
    let { year, quarter } = last;
    for (let i = 0; i < n; i++) {
        quarter += 1;
        if (quarter > 4) { quarter = 1; year += 1; }
        out.push({ year, quarter });
    }
    return out;
}

function linreg(ys) {
    const n = ys.length;
    const xs = ys.map((_, i) => i);
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
    const slope = den === 0 ? 0 : num / den;
    const intercept = my - slope * mx;
    const resid = ys.map((y, i) => y - (intercept + slope * i));
    const sigma = Math.sqrt(resid.reduce((s, r) => s + r * r, 0) / n);
    return { slope, intercept, sigma, predict: (x) => intercept + slope * x };
}

// ------------------------------------------------------------
// forecast(metric, scopeType, scopeId, horizon)
// → { metric, scope, unit, history, model, projection, band,
//     training_periods, data_status, generated_at, caveat }
// ------------------------------------------------------------
async function forecast(metric, scopeType, scopeId, horizon = 4, { persist = true, generatedBy = 'system' } = {}) {
    const h = Math.min(Math.max(parseInt(horizon) || 4, 1), 4);
    const history = await quarterlySeries(metric, scopeType, scopeId);

    const base = {
        metric,
        scope: { type: scopeType, id: scopeType === 'state' ? null : scopeId },
        unit: METRIC_CONFIG[metric].unit,
        history,
        training_periods: history.length,
        generated_at: new Date().toISOString()
    };

    if (history.length < 2) {
        return {
            ...base,
            data_status: 'INSUFFICIENT_DATA',
            minimum_required: MINIMUM_DATA,
            available_points: history.length,
            projection: [], band: [], model: null,
            caveat: `Only ${history.length} quarter(s) of filed data exist for this scope. A minimum of 2 is required; no projection is produced rather than an unreliable one.`
        };
    }

    const ys = history.map(p => p.value);
    const quartersSeen = new Set(history.map(p => p.quarter));
    let model, projection, band, caveat = null;

    if (history.length >= 8 && quartersSeen.size >= 4) {
        // Linear regression + multiplicative seasonal factors.
        const reg = linreg(ys);
        // Seasonal ratio: actual / trend per quarter.
        const ratios = {};
        const counts = {};
        history.forEach((p, i) => {
            const trend = Math.max(reg.predict(i), 1e-9);
            const r = p.value / trend;
            (ratios[p.quarter] = ratios[p.quarter] || []).push(r);
            counts[p.quarter] = (counts[p.quarter] || 0) + 1;
        });
        const seasonal = {};
        for (const q of Object.keys(ratios)) {
            seasonal[q] = ratios[q].reduce((a, b) => a + b, 0) / ratios[q].length;
        }
        model = 'linreg_seasonal';
        const future = nextQuarters(history[history.length - 1], h);
        projection = future.map((f, i) => ({
            period: `${f.year}-Q${f.quarter}`,
            value: Math.max(0, Math.round(reg.predict(ys.length + i) * (seasonal[f.quarter] || 1)))
        }));
        band = future.map((f, i) => {
            const v = projection[i].value;
            const w = Math.max(reg.sigma, v * 0.1);
            return { period: `${f.year}-Q${f.quarter}`, low: Math.max(0, Math.round(v - w)), high: Math.round(v + w) };
        });
    } else if (history.length >= 4) {
        const reg = linreg(ys);
        model = 'linear_regression';
        const future = nextQuarters(history[history.length - 1], h);
        projection = future.map((f, i) => ({
            period: `${f.year}-Q${f.quarter}`,
            value: Math.max(0, Math.round(reg.predict(ys.length + i)))
        }));
        band = future.map((f, i) => {
            const v = projection[i].value;
            const w = Math.max(reg.sigma, v * 0.15);
            return { period: `${f.year}-Q${f.quarter}`, low: Math.max(0, Math.round(v - w)), high: Math.round(v + w) };
        });
    } else {
        // 2-3 points: flat moving average, wide honest band.
        model = 'moving_average';
        const avg = ys.reduce((a, b) => a + b, 0) / ys.length;
        const spread = Math.max(...ys) - Math.min(...ys);
        const future = nextQuarters(history[history.length - 1], h);
        projection = future.map(f => ({ period: `${f.year}-Q${f.quarter}`, value: Math.round(avg) }));
        band = future.map(f => ({
            period: `${f.year}-Q${f.quarter}`,
            low: Math.max(0, Math.round(avg - spread)),
            high: Math.round(avg + spread)
        }));
        caveat = 'Low training volume (2-3 quarters): a flat moving average with a wide band. Treat as indicative only.';
    }

    const result = {
        ...base,
        data_status: 'OK',
        model,
        projection,
        band,
        caveat
    };

    // Persist (replace previous batch for this metric+scope).
    if (persist && projection.length) {
        try {
            const client = await db.pool.connect();
            try {
                await client.query('BEGIN');
                await client.query(
                    'DELETE FROM forecasts WHERE metric=$1 AND scope_type=$2 AND COALESCE(scope_id,0)=COALESCE($3,0)',
                    [metric, scopeType, scopeId]);
                for (const p of projection) {
                    const [y, q] = p.period.split('-Q').map((x, i) => i === 0 ? parseInt(x) : parseInt(x));
                    const b = band.find(x => x.period === p.period);
                    await client.query(
                        `INSERT INTO forecasts
                           (metric, scope_type, scope_id, period_year, period_quarter,
                            predicted_value, lower_bound, upper_bound, model, training_periods, generated_by)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
                        [metric, scopeType, scopeId, y, q, p.value, b ? b.low : null, b ? b.high : null,
                         model, history.length, generatedBy]);
                }
                await client.query('COMMIT');
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally { client.release(); }
        } catch (e) {
            console.warn('[forecast] persist skipped:', e.message);
        }
    }

    return result;
}

module.exports = { forecast, quarterlySeries, METRIC_CONFIG, MINIMUM_DATA };
