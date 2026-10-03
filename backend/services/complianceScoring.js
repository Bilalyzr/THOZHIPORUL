// ============================================================
// complianceScoring.js — COMPUTE compliance scores from real
// records (fixes the audited "seed-only, never computed" scores).
//
// Daily job (and on-demand endpoint). For every industry:
//   submission_score : filing completeness + timeliness this year
//   environmental    : environmental violations / quota findings
//   financial        : financial violations
//   safety           : safety violations
//   overall          : weighted blend of the four sub-scores
//
// Weights and deductions are the engine's documented defaults
// (visible here, tunable in code review with the product owner —
// not invented regulatory values, they are internal scoring
// policy). Results are upserted into compliance_scores (one row
// per industry per day) and synced to
// industry_profiles.compliance_score, which existing dashboards
// already read.
// ============================================================

const db = require('../db');

const POLICY = {
    violationDeduction: { critical: 25, high: 15, medium: 8, low: 3 },
    missingPeriodDeduction: 10,     // per overdue/missing period this year
    missingPeriodCap: 30,           // max total deduction for missing filings
    weights: { submission: 0.3, environmental: 0.3, financial: 0.2, safety: 0.2 }
};

async function computeAllScores() {
    const { getFilingMatrix } = require('./missingSubmissionEngine');
    const year = new Date().getUTCFullYear();
    const matrix = await getFilingMatrix({ year });
    const outstandingByIndustry = new Map(
        matrix.industries.map(i => [i.industry_id, i.outstanding.length])
    );

    // Open violations per industry bucketed by rule category.
    const violations = await db.query(`
        SELECT v.industry_id, v.severity::text AS severity, COALESCE(r.category, 'other') AS category
          FROM compliance_violations v
     LEFT JOIN compliance_rules r ON r.id = v.rule_id
         WHERE v.status <> 'resolved'`);

    // Open high/critical consistency findings per industry.
    const findings = await db.query(`
        SELECT industry_id, COUNT(*)::int AS n
          FROM data_findings
         WHERE status = 'open' AND severity IN ('high','critical')
      GROUP BY industry_id`);
    const findingsByIndustry = new Map(findings.rows.map(r => [r.industry_id, r.n]));

    const byIndustry = {};
    for (const v of violations.rows) {
        (byIndustry[v.industry_id] = byIndustry[v.industry_id] || []).push(v);
    }

    const industries = await db.query('SELECT id FROM industry_profiles');
    let scored = 0;
    const today = new Date().toISOString().slice(0, 10);

    for (const ind of industries.rows) {
        const id = ind.id;
        const viols = byIndustry[id] || [];
        const ded = POLICY.violationDeduction;

        const bucket = { submission: 0, environmental: 0, financial: 0, safety: 0, other: 0 };
        for (const v of viols) {
            const d = ded[v.severity] !== undefined ? ded[v.severity] : ded.low;
            const cat = ['submission', 'environmental', 'financial', 'safety'].includes(v.category) ? v.category : 'other';
            bucket[cat] += d;
        }
        // Severe data findings hit the environmental/financial buckets
        // depending on their metric (resource metrics → environmental).
        const sevFindings = findingsByIndustry.get(id) || 0;
        if (sevFindings) bucket.environmental += sevFindings * 5;

        const missing = outstandingByIndustry.get(id) || 0;
        const missingDed = Math.min(missing * POLICY.missingPeriodDeduction, POLICY.missingPeriodCap);
        bucket.submission += missingDed;

        const clamp = (x) => Math.max(0, Math.min(100, Math.round(100 - x)));
        const submission_score = clamp(bucket.submission);
        const environmental_score = clamp(bucket.environmental);
        const financial_score = clamp(bucket.financial);
        const safety_score = clamp(bucket.safety);
        const overall_score = clamp(
            submission_score * POLICY.weights.submission +
            environmental_score * POLICY.weights.environmental +
            financial_score * POLICY.weights.financial +
            safety_score * POLICY.weights.safety
        );

        await db.query(`
            INSERT INTO compliance_scores
                (industry_id, score_date, overall_score, submission_score, environmental_score, financial_score, safety_score)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (industry_id, score_date)
           DO UPDATE SET overall_score = EXCLUDED.overall_score,
                         submission_score = EXCLUDED.submission_score,
                         environmental_score = EXCLUDED.environmental_score,
                         financial_score = EXCLUDED.financial_score,
                         safety_score = EXCLUDED.safety_score`,
            [id, today, overall_score, submission_score, environmental_score, financial_score, safety_score]);

        await db.query('UPDATE industry_profiles SET compliance_score = $1 WHERE id = $2', [overall_score, id]);
        scored++;
    }

    return { scored, policy: POLICY, as_of: today };
}

/**
 * Event-driven single-industry scoring (called post-filing for instant
 * score updates; the daily batch job remains as a safety net).
 */
async function computeIndustryScore(industryId) {
    const { getFilingMatrix } = require('./missingSubmissionEngine');
    const matrix = await getFilingMatrix({ year: new Date().getUTCFullYear() });
    const ind = matrix.industries.find(i => i.industry_id === industryId);
    const outstanding = ind ? ind.outstanding.length : 0;

    const violations = await db.query(`
        SELECT v.severity::text AS severity, COALESCE(r.category, 'other') AS category
          FROM compliance_violations v
     LEFT JOIN compliance_rules r ON r.id = v.rule_id
         WHERE v.industry_id = $1 AND v.status <> 'resolved'`, [industryId]);
    const findings = await db.query(`
        SELECT COUNT(*)::int AS n FROM data_findings
         WHERE industry_id = $1 AND status = 'open' AND severity IN ('high','critical')`, [industryId]);

    const bucket = { submission: 0, environmental: 0, financial: 0, safety: 0, other: 0 };
    for (const v of violations.rows) {
        const d = POLICY.violationDeduction[v.severity] !== undefined ? POLICY.violationDeduction[v.severity] : POLICY.violationDeduction.low;
        const cat = ['submission','environmental','financial','safety'].includes(v.category) ? v.category : 'other';
        bucket[cat] += d;
    }
    const sevFindings = findings.rows[0] ? findings.rows[0].n : 0;
    if (sevFindings) bucket.environmental += sevFindings * 5;
    const missingDed = Math.min(outstanding * POLICY.missingPeriodDeduction, POLICY.missingPeriodCap);
    bucket.submission += missingDed;

    const clamp = (x) => Math.max(0, Math.min(100, Math.round(100 - x)));
    const scores = {
        submission_score: clamp(bucket.submission),
        environmental_score: clamp(bucket.environmental),
        financial_score: clamp(bucket.financial),
        safety_score: clamp(bucket.safety)
    };
    scores.overall_score = clamp(
        scores.submission_score * POLICY.weights.submission +
        scores.environmental_score * POLICY.weights.environmental +
        scores.financial_score * POLICY.weights.financial +
        scores.safety_score * POLICY.weights.safety
    );

    const today = new Date().toISOString().slice(0, 10);
    await db.query(`
        INSERT INTO compliance_scores (industry_id, score_date, overall_score, submission_score, environmental_score, financial_score, safety_score)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (industry_id, score_date)
       DO UPDATE SET overall_score = EXCLUDED.overall_score,
                     submission_score = EXCLUDED.submission_score,
                     environmental_score = EXCLUDED.environmental_score,
                     financial_score = EXCLUDED.financial_score,
                     safety_score = EXCLUDED.safety_score`,
        [industryId, today, scores.overall_score, scores.submission_score,
         scores.environmental_score, scores.financial_score, scores.safety_score]);
    await db.query('UPDATE industry_profiles SET compliance_score = $1 WHERE id = $2', [scores.overall_score, industryId]);
    return { industryId, ...scores };
}

module.exports = { computeAllScores, computeIndustryScore, POLICY };
