// ============================================================
// anomalyService.js — genuine statistical anomaly detection
// (Phase 10).
//
// Two detectors, both configurable via intelligence_rules:
//   A-POP-CHANGE : period-over-period % change vs threshold,
//                  compared against the immediately previous
//                  filed quarter (never fabricated when absent).
//   A-IQR        : robust outlier detection — the new value vs
//                  the IQR fence of the industry's own history.
//
// INSUFFICIENT HISTORY IS NEVER SCORED. When a detector lacks its
// configured minimum baseline it records nothing and reports
// INSUFFICIENT_HISTORY to the caller (surfaced via the API so the
// UI can say so honestly).
// ============================================================

const db = require('../db');
const { getEnabledByCategory } = require('./ruleConfig');
const { upsertFinding } = require('./consistencyEngine');
const { notify } = require('./notify');

const METRIC_SELECTS = {
    totalEmployees: `COALESCE(e.permanent_employees,0) + COALESCE(e.contract_employees,0)`,
    permanentEmployees: `e.permanent_employees`,
    waterConsumption: `r.water_consumption`,
    powerUsage: `r.power_usage`,
    annualTurnover: `f.annual_turnover`,
    investmentAmount: `f.investment_amount`
};

// One row per (industry, period): latest revision's metric value.
function seriesSql(metric) {
    return `
        WITH latest AS (
            SELECT DISTINCT ON (ds.industry_id, ds.period_year, ds.period_quarter)
                   ds.id, ds.industry_id, ds.period_year, ds.period_quarter
              FROM data_submissions ds
             ORDER BY ds.industry_id, ds.period_year, ds.period_quarter, ds.submitted_at DESC
        )
        SELECT l.period_year, l.period_quarter, ${METRIC_SELECTS[metric]} AS value
          FROM latest l
     LEFT JOIN financial_data f ON f.submission_id = l.id
     LEFT JOIN employment_data e ON e.submission_id = l.id
     LEFT JOIN resource_usage r ON r.submission_id = l.id
         WHERE l.industry_id = $1
      ORDER BY l.period_year, l.period_quarter NULLS LAST`;
}

function periodKey(y, q) { return y * 4 + (q || 4); }
function prevPeriod(y, q) { return q === 1 ? { y: y - 1, q: 4 } : { y, q: q - 1 }; }

function quantile(sorted, p) {
    if (!sorted.length) return null;
    const pos = (sorted.length - 1) * p;
    const lo = Math.floor(pos), hi = Math.ceil(pos);
    return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

// ------------------------------------------------------------
// evaluateSubmission — runs both detectors for one submission.
// Returns { findings, skipped: [{metric, detector, reason}] }.
// ------------------------------------------------------------
async function evaluateSubmission(submissionId, detectedBy = 'ingest') {
    const rules = await getEnabledByCategory('anomaly');
    const popRule = rules.find(r => r.rule_id === 'A-POP-CHANGE');
    const iqrRule = rules.find(r => r.rule_id === 'A-IQR');

    const { rows } = await db.query(`
        SELECT ds.id, ds.industry_id, ds.period_year, ds.period_quarter, ip.company_name
          FROM data_submissions ds
          JOIN industry_profiles ip ON ip.id = ds.industry_id
         WHERE ds.id = $1`, [submissionId]);
    if (!rows.length) return { findings: 0, skipped: [] };
    const s = rows[0];

    let findings = 0;
    const skipped = [];

    // ---- Detector 1: period-over-period change ----------------
    if (popRule) {
        const c = popRule.config;
        const metrics = c.metrics || ['totalEmployees', 'waterConsumption', 'powerUsage', 'annualTurnover'];
        for (const metric of metrics) {
            if (!METRIC_SELECTS[metric]) continue;
            const { rows: series } = await db.query(seriesSql(metric), [s.industry_id]);
            const cur = series.find(x => x.period_year === s.period_year && x.period_quarter === s.period_quarter);
            if (!cur || cur.value === null) continue;
            const pp = prevPeriod(s.period_year, s.period_quarter);
            const prev = series.find(x => x.period_year === pp.y && x.period_quarter === pp.q);
            const baseline = (c.minBaseline ?? 1);
            if (!prev || prev.value === null || Math.abs(Number(prev.value)) < baseline) {
                skipped.push({ metric, detector: 'A-POP-CHANGE', reason: 'INSUFFICIENT_HISTORY',
                    detail: 'No previous-period value above the configured baseline.' });
                continue; // honest skip — never fabricate a score
            }
            const oldV = Number(prev.value), newV = Number(cur.value);
            if (oldV === 0) continue;
            const pct = Math.round(((newV - oldV) / Math.abs(oldV)) * 1000) / 10;
            if (Math.abs(pct) > (c.maxChangePct ?? 100)) {
                const f = {
                    findingType: 'anomaly', ruleId: 'A-POP-CHANGE', industryId: s.industry_id,
                    submissionId, periodYear: s.period_year, periodQuarter: s.period_quarter,
                    metric, observed: newV, expected: oldV, changePct: pct,
                    severity: c.severity || 'high', detectedBy,
                    reason: `${metric} changed ${pct > 0 ? '+' : ''}${pct}% vs the previous filed quarter (${oldV.toLocaleString('en-IN')} → ${newV.toLocaleString('en-IN')}). Review required.`,
                    evidence: {
                        what_changed: metric, old_value: oldV, new_value: newV, change_pct: pct,
                        compared_with: `${pp.y}-Q${pp.q}`, threshold_pct: c.maxChangePct ?? 100,
                        status: 'REVIEW_REQUIRED'
                    }
                };
                await upsertFinding(f); findings++;
                if ((c.severity || 'high') === 'high') {
                    await notify({
                        roleScope: 'govt', category: 'compliance', severity: 'warning',
                        title: `Anomaly: ${pct > 0 ? '+' : ''}${pct}% ${metric}`,
                        message: `${s.company_name} — ${f.reason}`,
                        link: '/compliance-engine',
                        metadata: { rule: 'A-POP-CHANGE', industryId: s.industry_id, metric, changePct: pct }
                    });
                }
            }
        }
    }

    // ---- Detector 2: IQR fence vs own history ------------------
    if (iqrRule) {
        const c = iqrRule.config;
        const minHistory = c.minHistory ?? 4;
        const lookback = c.lookbackQuarters ?? 8;
        const factor = c.factor ?? 3.0;
        for (const metric of (c.metrics || [])) {
            if (!METRIC_SELECTS[metric]) continue;
            const { rows: series } = await db.query(seriesSql(metric), [s.industry_id]);
            const cur = series.find(x => x.period_year === s.period_year && x.period_quarter === s.period_quarter);
            if (!cur || cur.value === null) continue;
            // History = prior periods only, capped at lookback.
            const curKey = periodKey(s.period_year, s.period_quarter);
            const hist = series
                .filter(x => periodKey(x.period_year, x.period_quarter) < curKey && x.value !== null)
                .map(x => Number(x.value))
                .sort((a, b) => a - b);
            if (hist.length < minHistory) {
                skipped.push({ metric, detector: 'A-IQR', reason: 'INSUFFICIENT_HISTORY',
                    detail: `Has ${hist.length} historical value(s); requires ${minHistory}.` });
                continue;
            }
            const q1 = quantile(hist, 0.25), q3 = quantile(hist, 0.75);
            const iqr = q3 - q1;
            const lo = q1 - factor * iqr, hi = q3 + factor * iqr;
            const v = Number(cur.value);
            if (v < lo || v > hi) {
                const f = {
                    findingType: 'anomaly', ruleId: 'A-IQR', industryId: s.industry_id,
                    submissionId, periodYear: s.period_year, periodQuarter: s.period_quarter,
                    metric, observed: v, expected: null, changePct: null,
                    severity: c.severity || 'warning', detectedBy,
                    reason: `${metric} value ${v.toLocaleString('en-IN')} lies outside the robust IQR fence [${Math.round(lo).toLocaleString('en-IN')} … ${Math.round(hi).toLocaleString('en-IN')}] of this industry's own ${hist.length}-period history.`,
                    evidence: {
                        value: v, fence_low: lo, fence_high: hi, q1, q3, iqr, factor,
                        history_points: hist.length, status: 'REVIEW_REQUIRED'
                    }
                };
                await upsertFinding(f); findings++;
            }
        }
    }

    return { findings, skipped };
}

// Availability probe — used by APIs to answer honestly when a
// metric cannot be scored yet (never fabricates).
async function dataAvailability(industryId) {
    const { rows } = await db.query(
        `SELECT COUNT(*)::int AS n,
                COUNT(DISTINCT period_year || '-' || COALESCE(period_quarter, 0))::int AS periods
           FROM data_submissions WHERE industry_id = $1`, [industryId]);
    return { submissions: rows[0].n, distinct_periods: rows[0].periods };
}

// Domain metrics the version-diff detector scores.
const SNAPSHOT_METRICS = [
    'investmentAmount', 'annualTurnover', 'exportRevenue', 'rdExpenditure',
    'permanentEmployees', 'contractEmployees', 'scStEmployees', 'womenEmployees',
    'waterConsumption', 'powerUsage', 'wasteGenerated', 'wasteRecycledPct', 'csrSpent'
];

// Related metrics for Yes.docx's expansion-coherence question: a major
// change in one domain should normally be corroborated by movement in
// its related domains (investment ↔ employment ↔ water/power ↔ production).
const RELATED_METRICS = {
    permanentEmployees: ['investmentAmount', 'powerUsage', 'waterConsumption'],
    contractEmployees: ['investmentAmount', 'powerUsage', 'waterConsumption'],
    womenEmployees: ['permanentEmployees', 'contractEmployees'],
    scStEmployees: ['permanentEmployees', 'contractEmployees'],
    investmentAmount: ['permanentEmployees', 'contractEmployees', 'powerUsage'],
    powerUsage: ['production:*', 'permanentEmployees', 'contractEmployees'],
    waterConsumption: ['production:*', 'powerUsage'],
    annualTurnover: ['production:*', 'permanentEmployees'],
};

// Summarize corroboration for a diff: { related: {fieldOrPrefix: {pct, direction}}, corroborated: bool }
function correlationSummary(diff, changedField, minPct) {
    const relations = RELATED_METRICS[changedField] || [];
    const related = {};
    let corroborated = false;
    for (const rel of relations) {
        if (rel.endsWith('*')) {
            // Production line items: any product quantity/value change counts.
            const prodChanges = diff.filter(d => d.field.startsWith('production:'))
                .map(d => d.change_pct).filter(p => p !== null && p !== undefined);
            if (prodChanges.length) {
                const max = Math.max(...prodChanges.map(Math.abs));
                related['production'] = { pct: prodChanges.find(p => Math.abs(p) === max), count: prodChanges.length };
                if (max >= minPct) corroborated = true;
            } else {
                related['production'] = null;
            }
            continue;
        }
        const d = diff.find(x => x.field === rel);
        if (!d || d.change_pct === null || d.change_pct === undefined) { related[rel] = null; continue; }
        related[rel] = { pct: d.change_pct };
        if (Math.abs(d.change_pct) >= minPct) corroborated = true;
    }
    return { related, corroborated };
}

// ------------------------------------------------------------
// evaluateVersionChange — anomaly evaluation of an AMENDMENT's
// diff (old version → new version of the SAME period). This is
// separate from period-over-period detection: a +68.9% revision
// within one quarter is exactly the change the audit requires the
// system to notice, even with no prior quarter filed.
//
// Also answers Yes.docx's cross-metric question: a major change in
// one domain is CHECKED for corroborating movement in related
// domains in the same revision. Corroborated changes carry the
// evidence; uncorroborated ones raise an A-CORROBORATION finding
// ("expansion appears unbalanced or single-field error").
// ------------------------------------------------------------
async function evaluateVersionChange(submissionId, diff, detectedBy = 'ingest') {
    if (!Array.isArray(diff) || diff.length === 0) return 0;
    const anomalyRules = await getEnabledByCategory('anomaly');
    const popRule = anomalyRules.find(r => r.rule_id === 'A-POP-CHANGE');
    const corrobRule = anomalyRules.find(r => r.rule_id === 'A-CORROBORATION');
    if (!popRule) return 0;
    const c = popRule.config;
    const threshold = c.maxChangePct ?? 50;
    const minBaseline = c.minBaseline ?? 1;
    const corrobCfg = (corrobRule && corrobRule.config) || {};
    const relatedMinPct = corrobCfg.relatedMinPct ?? 10;
    const corrobSeverity = corrobCfg.severity || 'warning';

    const { rows } = await db.query(`
        SELECT ds.industry_id, ds.period_year, ds.period_quarter, ip.company_name
          FROM data_submissions ds JOIN industry_profiles ip ON ip.id = ds.industry_id
         WHERE ds.id = $1`, [submissionId]);
    if (!rows.length) return 0;
    const s = rows[0];

    let findings = 0;
    for (const d of diff) {
        if (d.change_pct === null || d.change_pct === undefined) continue;
        if (!SNAPSHOT_METRICS.includes(d.field)) continue;
        const oldV = Number(d.old), newV = Number(d.new);
        if (!Number.isFinite(oldV) || !Number.isFinite(newV)) continue;
        if (Math.abs(oldV) < minBaseline) continue;
        if (Math.abs(d.change_pct) <= threshold) continue;

        // Cross-metric corroboration (Yes.docx expansion-coherence).
        const corr = correlationSummary(diff, d.field, relatedMinPct);

        const f = {
            findingType: 'anomaly', ruleId: 'A-POP-CHANGE', industryId: s.industry_id,
            submissionId, periodYear: s.period_year, periodQuarter: s.period_quarter,
            metric: d.field, observed: newV, expected: oldV, changePct: d.change_pct,
            severity: c.severity || 'high', detectedBy,
            reason: `${d.field} changed ${d.change_pct > 0 ? '+' : ''}${d.change_pct}% in an amendment (${oldV.toLocaleString('en-IN')} → ${newV.toLocaleString('en-IN')}). Review required.`,
            evidence: {
                what_changed: d.field, old_value: oldV, new_value: newV,
                change_pct: d.change_pct, compared_with: 'previous version of this filing',
                threshold_pct: threshold, status: 'REVIEW_REQUIRED',
                corroborated_by_related_metrics: corr.corroborated,
                related_changes: corr.related
            }
        };
        await upsertFinding(f);
        findings++;
        if ((c.severity || 'high') === 'high') {
            await notify({
                roleScope: 'govt', category: 'compliance', severity: 'warning',
                title: `Anomaly: ${d.change_pct > 0 ? '+' : ''}${d.change_pct}% ${d.field} (amendment)`,
                message: `${s.company_name} — ${f.reason}${corr.corroborated ? ' Related metrics moved in the same revision (corroborated expansion).' : ' No corroborating movement in related metrics.'}`,
                link: '/compliance-engine',
                metadata: { rule: 'A-POP-CHANGE', industryId: s.industry_id, metric: d.field, changePct: d.change_pct, corroborated: corr.corroborated }
            });
        }

        // Uncorroborated major change → dedicated review finding.
        if (!corr.corroborated && corrobRule && Object.keys(corr.related).length) {
            const cf = {
                findingType: 'anomaly', ruleId: 'A-CORROBORATION', industryId: s.industry_id,
                submissionId, periodYear: s.period_year, periodQuarter: s.period_quarter,
                metric: d.field, observed: newV, expected: oldV, changePct: d.change_pct,
                severity: corrobSeverity, detectedBy,
                reason: `Major change in ${d.field} (${d.change_pct > 0 ? '+' : ''}${d.change_pct}%) has no corroborating movement (≥${relatedMinPct}%) in related metrics (${Object.keys(corr.related).join(', ')}) — expansion appears unbalanced or this may be a single-field error.`,
                evidence: {
                    changed_metric: d.field, change_pct: d.change_pct,
                    related_min_pct: relatedMinPct, related_changes: corr.related,
                    question: 'Does this change correspond to increased investment, power, water or production?'
                }
            };
            await upsertFinding(cf);
            findings++;
        }
    }
    return findings;
}

module.exports = { evaluateSubmission, evaluateVersionChange, dataAvailability, correlationSummary, SNAPSHOT_METRICS, RELATED_METRICS };
