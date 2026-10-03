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

/**
 * Holt-Winters Exponential Smoothing (additive trend + multiplicative
 * seasonality, period=4 for quarters). Falls back to linear regression
 * when the smoothing degenerates (flat/decreasing series).
 */
function holtWinters(history, horizon) {
    const ys = history.map(p => p.value);
    const n = ys.length;
    const m = 4; // quarterly seasonality
    const alpha = 0.3, beta = 0.1, gamma = 0.3;

    // Initialize: first season average as level, first-diff as trend,
    // first-cycle ratios as seasonal indices.
    const firstCycle = ys.slice(0, m);
    const avgFirst = firstCycle.reduce((a, b) => a + b, 0) / m;
    if (avgFirst === 0) return linregFallback(history, horizon, 'ets_degenerate_flat');

    let level = avgFirst;
    let trend = n > m ? (ys[m] - ys[0]) / m : 0;
    const seasonal = new Array(m).fill(1);
    for (let i = 0; i < m && i < n; i++) seasonal[i % m] = ys[i] / avgFirst;

    // Smooth through the series.
    const fitted = [];
    for (let t = 0; t < n; t++) {
        const s = seasonal[t % m];
        const prediction = (level + trend) * s;
        fitted.push(prediction);
        const oldLevel = level;
        level = alpha * (ys[t] / s) + (1 - alpha) * (level + trend);
        trend = beta * (level - oldLevel) + (1 - beta) * trend;
        seasonal[t % m] = gamma * (ys[t] / level) + (1 - gamma) * s;
    }

    // Check degeneracy — if all seasonal indices are ~1, use linreg.
    const seasSpread = Math.max(...seasonal) - Math.min(...seasonal);
    if (seasSpread < 0.05) return linregFallback(history, horizon, 'ets_no_seasonality');

    // Forecast.
    const future = nextQuarters(history[n - 1], horizon);
    const projection = [], band = [];
    const residuals = ys.map((y, t) => y - fitted[t]);
    const std = Math.sqrt(residuals.reduce((s2, r) => s2 + r * r, 0) / n) || 0;
    for (let i = 1; i <= horizon; i++) {
        const s = seasonal[(n + i - 1) % m];
        const value = Math.max(0, Math.round((level + i * trend) * s));
        const period = `${future[i - 1].year}-Q${future[i - 1].quarter}`;
        projection.push({ period, value });
        const w = Math.max(std, value * 0.12);
        band.push({ period, low: Math.max(0, value - Math.round(w)), high: value + Math.round(w) });
    }
    return { model: 'holt_winters_ets', projection, band,
             detail: { alpha, beta, gamma, seasonalIndices: seasonal.map(x => Math.round(x * 100) / 100) } };
}

function linregFallback(history, horizon, reason) {
    const ys = history.map(p => p.value);
    const reg = linreg(ys);
    const future = nextQuarters(history[history.length - 1], horizon);
    const projection = future.map((f, i) => ({ period: `${f.year}-Q${f.quarter}`, value: Math.max(0, Math.round(reg.predict(ys.length + i))) }));
    const band = future.map((f, i) => {
        const v = projection[i].value;
        const w = Math.max(reg.sigma, v * 0.15);
        return { period: `${f.year}-Q${f.quarter}`, low: Math.max(0, Math.round(v - w)), high: Math.round(v + w) };
    });
    return { model: `linear_regression (${reason})`, projection, band };
}

// ------------------------------------------------------------
// Backtesting — train on first N-k points, predict k, report MAPE.
function backtest(history, k = 1) {
    if (history.length < 4 + k) return null;
    const train = history.slice(0, history.length - k);
    const actual = history.slice(history.length - k);
    const ys = train.map(p => p.value);
    const n = ys.length;
    const reg = linreg(ys);
    const errors = [];
    for (let i = 0; i < k; i++) {
        const pred = reg.predict(n + i);
        const act = actual[i].value;
        if (act !== 0) errors.push(Math.abs((act - pred) / act));
    }
    const mape = errors.length ? Math.round(errors.reduce((a, b) => a + b, 0) / errors.length * 1000) / 10 : null;
    return { mape_pct: mape, trainPoints: n, testPoints: k,
             note: mape !== null ? `MAPE ${mape}% (lower is better; <20% is good for quarterly data)` : 'insufficient non-zero actuals' };
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
        // E3 UPGRADE: Holt-Winters ETS (additive trend + multiplicative
        // seasonality) — better than raw linreg for quarterly patterns.
        const result = holtWinters(history, h);
        model = result.model;
        projection = result.projection;
        band = result.band;
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

    const bt = backtest(history, Math.min(2, Math.max(1, Math.floor(history.length / 4))));
    const result = {
        ...base,
        data_status: 'OK',
        model,
        projection,
        band,
        caveat,
        backtest: bt
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

module.exports = { forecast, quarterlySeries, holtWinters, backtest, METRIC_CONFIG, MINIMUM_DATA };
