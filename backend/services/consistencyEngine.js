// ============================================================
// consistencyEngine.js — cross-field / cross-period / quota
// consistency checks (Phase 9).
//
// Runs AFTER a filing commits (and on demand via the batch
// endpoint). Checks are configurable through intelligence_rules
// (C-* rule ids). Findings land in data_findings with observed vs
// expected values + evidence; high-severity quota breaches notify
// government officers. No regulatory thresholds are invented —
// every number comes from the seeded, admin-editable rule config
// or from the industry's own configured allocation/sanction.
// ============================================================

const db = require('../db');
const { getEnabledByCategory } = require('./ruleConfig');
const { notify } = require('./notify');

async function upsertFinding(f) {
    // One OPEN finding per (rule, industry, period); re-detection
    // refreshes the observed values instead of stacking rows.
    await db.query(
        `INSERT INTO data_findings
           (finding_type, rule_id, industry_id, submission_id, period_year, period_quarter,
            metric, observed_value, expected_value, severity, reason, evidence, detected_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (rule_id, industry_id, period_year, COALESCE(period_quarter, 0))
           WHERE status = 'open'
         DO UPDATE SET observed_value = EXCLUDED.observed_value,
                       expected_value = EXCLUDED.expected_value,
                       evidence = EXCLUDED.evidence,
                       reason = EXCLUDED.reason,
                       detected_at = NOW(),
                       submission_id = EXCLUDED.submission_id`,
        [f.findingType, f.ruleId, f.industryId, f.submissionId, f.periodYear, f.periodQuarter,
         f.metric || null, f.observed ?? null, f.expected ?? null, f.severity,
         f.reason, JSON.stringify(f.evidence || {}), f.detectedBy]
    );
}

async function notifyGovIfSevere(finding, companyName) {
    if (finding.severity !== 'high' && finding.severity !== 'critical') return;
    await notify({
        roleScope: 'govt',
        category: 'compliance',
        severity: 'warning',
        title: `Data inconsistency: ${finding.ruleId}`,
        message: `${companyName} — ${finding.reason}`,
        link: '/compliance-engine',
        metadata: { rule: finding.ruleId, industryId: finding.industryId, period: `${finding.periodYear}-Q${finding.periodQuarter ?? 'FY'}` }
    });
}

// ------------------------------------------------------------
// Evaluate all enabled consistency rules for one submission.
// Returns the number of NEW/refreshed findings.
// ------------------------------------------------------------
async function evaluateSubmission(submissionId, detectedBy = 'ingest') {
    const rules = await getEnabledByCategory('consistency');
    if (!rules.length) return 0;

    const { rows } = await db.query(`
        SELECT ds.id AS submission_id, ds.industry_id, ds.period_year, ds.period_quarter,
               ip.company_name, ip.water_allocated_kl, ip.sanctioned_load_kw, ip.committed_investment_cr,
               f.investment_amount, f.annual_turnover, f.export_revenue,
               e.permanent_employees, e.contract_employees
          FROM data_submissions ds
          JOIN industry_profiles ip ON ip.id = ds.industry_id
     LEFT JOIN financial_data f ON f.submission_id = ds.id
     LEFT JOIN employment_data e ON e.submission_id = ds.id
     LEFT JOIN resource_usage r ON r.submission_id = ds.id
         WHERE ds.id = $1`, [submissionId]);
    if (!rows.length) return 0;
    const s = rows[0];
    const cfg = Object.fromEntries(rules.map(r => [r.rule_id, r]));
    let count = 0;

    const base = {
        industryId: s.industry_id, submissionId, periodYear: s.period_year,
        periodQuarter: s.period_quarter, detectedBy
    };
    const num = (x) => (x === null || x === undefined ? null : Number(x));

    // C-WAT-QUOTA — water usage vs allocated quota (KL).
    if (cfg['C-WAT-QUOTA']) {
        const c = cfg['C-WAT-QUOTA'].config;
        const usage = num((await db.query('SELECT water_consumption FROM resource_usage WHERE submission_id=$1', [submissionId])).rows[0]?.water_consumption);
        const quota = num(s.water_allocated_kl);
        if (usage !== null && quota !== null && quota > 0 && usage > quota * (1 + (c.tolerancePct ?? 20) / 100)) {
            const f = { ...base, findingType: 'consistency', ruleId: 'C-WAT-QUOTA', metric: 'waterConsumption',
                observed: usage, expected: quota, severity: c.severity || 'high',
                reason: `Water usage ${usage.toLocaleString('en-IN')} KL exceeds allocated quota ${quota.toLocaleString('en-IN')} KL by more than ${c.tolerancePct ?? 20}%.`,
                evidence: { usage_kl: usage, quota_kl: quota, tolerance_pct: c.tolerancePct ?? 20 } };
            await upsertFinding(f); await notifyGovIfSevere(f, s.company_name); count++;
        }
    }

    // C-PWR-QUOTA — power usage vs sanctioned load (energy-equivalent).
    if (cfg['C-PWR-QUOTA']) {
        const c = cfg['C-PWR-QUOTA'].config;
        const usage = num((await db.query('SELECT power_usage FROM resource_usage WHERE submission_id=$1', [submissionId])).rows[0]?.power_usage);
        const load = num(s.sanctioned_load_kw);
        const hours = c.hoursPerQuarter ?? 2190;
        if (usage !== null && load !== null && load > 0) {
            const allowable = load * hours * (1 + (c.tolerancePct ?? 20) / 100);
            if (usage > allowable) {
                const f = { ...base, findingType: 'consistency', ruleId: 'C-PWR-QUOTA', metric: 'powerUsage',
                    observed: usage, expected: load * hours, severity: c.severity || 'high',
                    reason: `Power usage ${usage.toLocaleString('en-IN')} kWh exceeds the energy equivalent of sanctioned load ${load.toLocaleString('en-IN')} kW × ${hours}h by more than ${c.tolerancePct ?? 20}%.`,
                    evidence: { usage_kwh: usage, sanctioned_load_kw: load, hours_per_quarter: hours, tolerance_pct: c.tolerancePct ?? 20 } };
                await upsertFinding(f); await notifyGovIfSevere(f, s.company_name); count++;
            }
        }
    }

    // C-EXPORT-TURN — export revenue vs turnover.
    if (cfg['C-EXPORT-TURN']) {
        const c = cfg['C-EXPORT-TURN'].config;
        const exp = num(s.export_revenue), turn = num(s.annual_turnover);
        if (exp !== null && turn !== null && turn > 0 && exp > turn * (1 + (c.tolerancePct ?? 5) / 100)) {
            const f = { ...base, findingType: 'consistency', ruleId: 'C-EXPORT-TURN', metric: 'exportRevenue',
                observed: exp, expected: turn, severity: c.severity || 'warning',
                reason: `Export revenue (₹${exp.toLocaleString('en-IN')}) exceeds total turnover (₹${turn.toLocaleString('en-IN')}).`,
                evidence: { export_inr: exp, turnover_inr: turn } };
            await upsertFinding(f); count++;
        }
    }

    // C-UNIT-SMALL — possible Crore-unit entry (investment below ₹1 lakh).
    if (cfg['C-UNIT-SMALL']) {
        const c = cfg['C-UNIT-SMALL'].config;
        const inv = num(s.investment_amount);
        const threshold = c.threshold ?? 100000;
        if (inv !== null && inv > 0 && inv < threshold) {
            const f = { ...base, findingType: 'consistency', ruleId: 'C-UNIT-SMALL', metric: 'investmentAmount',
                observed: inv, expected: threshold, severity: c.severity || 'warning',
                reason: `Investment ₹${inv.toLocaleString('en-IN')} is unusually small — values must be entered in INR (not Crores). Possible unit error.`,
                evidence: { investment_inr: inv, unit_threshold_inr: threshold, canonical_unit: 'INR' } };
            await upsertFinding(f); count++;
        }
    }

    // C-INV-COMMIT — realised investment vs committed (info-level).
    if (cfg['C-INV-COMMIT']) {
        const c = cfg['C-INV-COMMIT'].config;
        const committedCr = num(s.committed_investment_cr);
        if (committedCr !== null && committedCr > 0) {
            const maxRes = await db.query(
                `SELECT MAX(f.investment_amount) AS realized FROM financial_data f
                   JOIN data_submissions ds ON ds.id = f.submission_id
                  WHERE ds.industry_id = $1`, [s.industry_id]);
            const realized = num(maxRes.rows[0]?.realized);
            const committedInr = committedCr * 1e7;
            if (realized !== null && realized > 0) {
                const pct = Math.round((realized / committedInr) * 1000) / 10;
                if (pct < (c.minRealisationPct ?? 70)) {
                    const f = { ...base, findingType: 'consistency', ruleId: 'C-INV-COMMIT', metric: 'investmentAmount',
                        observed: realized, expected: committedInr, severity: c.severity || 'info',
                        reason: `Realised investment (₹${realized.toLocaleString('en-IN')}) is ${pct}% of the committed ₹${committedCr.toLocaleString('en-IN')} Cr.`,
                        evidence: { realized_inr: realized, committed_cr: committedCr, realisation_pct: pct } };
                    await upsertFinding(f); count++;
                }
            }
        }
    }

    return count;
}

// ------------------------------------------------------------
// Batch: re-evaluate the latest submission of every industry.
// ------------------------------------------------------------
async function evaluateAll(detectedBy = 'batch') {
    const { rows } = await db.query(`
        SELECT DISTINCT ON (industry_id) id FROM data_submissions
         ORDER BY industry_id, submitted_at DESC`);
    let n = 0;
    for (const r of rows) n += await evaluateSubmission(r.id, detectedBy);
    return { submissions: rows.length, findings: n };
}

module.exports = { evaluateSubmission, evaluateAll, upsertFinding };
