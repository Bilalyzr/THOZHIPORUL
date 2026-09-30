// ============================================================
// missingSubmissionEngine.js — PERIOD-BASED filing tracking
// (Phases 6-7).
//
// Replaces the old timestamp-based logic (which compared
// MAX(submitted_at) to Jan-1 and therefore couldn't see a single
// missed quarter). The engine joins:
//
//   industries expected to file (operational status)
//   × reporting_periods (the calendar)
//   × data_submissions (existence + status + lateness)
//   × submission_reminders (who was chased, how often)
//
// and computes, per industry × period:
//   NOT_DUE | SUBMITTED(UNDER_REVIEW) | APPROVED | REJECTED | LATE
//   | OVERDUE | MISSING
// ============================================================

const db = require('../db');

// Operational statuses expected to file. CLOSED / UNDER_CONSTRUCTION
// units are not chased for quarterly operational returns.
const FILING_STATUSES = ['OPERATING', 'IDLE', 'TEMPORARILY_CLOSED'];

// Normalize pg DATE values (Date objects) to 'YYYY-MM-DD' strings so
// comparisons with `today` are string-to-string (Date-vs-string coerces
// to NaN and silently breaks every branch).
const asDay = (d) => d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);

function statusFor(sub, rp, today) {
    if (sub) {
        const st = String(sub.status || '').toLowerCase();
        if (st === 'approved') return 'APPROVED';
        if (st === 'rejected') return 'REJECTED';
        if (sub.is_late) return 'LATE';
        // submitted but within window (or calendar unknown)
        return 'UNDER_REVIEW';
    }
    if (!rp) return 'NOT_DUE'; // calendar not configured — cannot judge
    const dueOn = asDay(rp.due_on), closesOn = asDay(rp.closes_on);
    if (today <= dueOn) return 'NOT_DUE';
    if (today <= closesOn) return 'OVERDUE';
    return 'MISSING';
}

// ------------------------------------------------------------
// Filing matrix for a year (optionally one quarter).
// → { year, periods: [...], industries: [...], summary }
// ------------------------------------------------------------
async function getFilingMatrix({ year, quarter = null, parkId = null }) {
    const today = new Date().toISOString().slice(0, 10);

    const periods = (await db.query(
        `SELECT * FROM reporting_periods
          WHERE period_year = $1 AND ($2::int IS NULL OR period_quarter = $2)
       ORDER BY period_quarter`, [year, quarter]
    )).rows;

    // Only evaluate periods that have already OPENED (future
    // quarters are NOT_DUE by definition and excluded).
    const currentQ = Math.floor(new Date().getUTCMonth() / 3) + 1;
    const currentY = new Date().getUTCFullYear();
    const relevantPeriods = periods.filter(p =>
        p.period_year < currentY || (p.period_year === currentY && p.period_quarter <= currentQ));

    const industries = (await db.query(
        `SELECT ip.id, ip.company_name, ip.operational_status, p.name AS park_name
           FROM industry_profiles ip
           LEFT JOIN industrial_parks p ON p.id = ip.park_id
          WHERE ip.operational_status = ANY($1::text[])
            AND ($2::int IS NULL OR ip.park_id = $2)
       ORDER BY ip.company_name`, [FILING_STATUSES, parkId]
    )).rows;

    const subs = (await db.query(`
        SELECT industry_id, period_year, period_quarter, status, is_late, submitted_at
          FROM data_submissions
         WHERE period_year = $1`, [year]
    )).rows;
    const subMap = new Map(subs.map(s => [`${s.industry_id}:${s.period_quarter}`, s]));

    const reminders = (await db.query(`
        SELECT industry_id, period_quarter, MAX(reminder_no) AS reminder_no,
               BOOL_OR(gov_notified) AS gov_notified
          FROM submission_reminders WHERE period_year = $1
      GROUP BY industry_id, period_quarter`, [year]
    )).rows;
    const remMap = new Map(reminders.map(r => [`${r.industry_id}:${r.period_quarter}`, r]));

    const summary = {
        expected_industries: industries.length,
        periods_evaluated: relevantPeriods.length,
        total_expected: industries.length * relevantPeriods.length,
        approved: 0, under_review: 0, rejected: 0, late: 0,
        not_due: 0, overdue: 0, missing: 0,
        reminders_sent: 0, gov_escalated: 0
    };

    const rows = [];
    for (const ind of industries) {
        const periodsOut = [];
        for (const rp of relevantPeriods) {
            const sub = subMap.get(`${ind.id}:${rp.period_quarter}`) || null;
            const rem = remMap.get(`${ind.id}:${rp.period_quarter}`) || null;
            const status = statusFor(sub, rp, today);
            summary[status === 'UNDER_REVIEW' ? 'under_review' : status.toLowerCase()] =
                (summary[status === 'UNDER_REVIEW' ? 'under_review' : status.toLowerCase()] || 0) + 1;
            if (rem) { summary.reminders_sent++; if (rem.gov_notified) summary.gov_escalated++; }
            periodsOut.push({
                quarter: rp.period_quarter,
                due_on: rp.due_on,
                closes_on: rp.closes_on,
                status,
                submitted_at: sub ? sub.submitted_at : null,
                submission_id: sub ? sub.id : null,
                reminder_no: rem ? rem.reminder_no : 0,
                gov_notified: rem ? rem.gov_notified : false
            });
        }
        const missingPeriods = periodsOut.filter(p => p.status === 'OVERDUE' || p.status === 'MISSING').map(p => p.quarter);
        rows.push({
            industry_id: ind.id,
            company_name: ind.company_name,
            park_name: ind.park_name || '—',
            operational_status: ind.operational_status,
            periods: periodsOut,
            outstanding: missingPeriods,
            any_overdue: periodsOut.some(p => p.status === 'OVERDUE'),
            all_current: periodsOut.length > 0 && periodsOut.every(p => ['APPROVED', 'UNDER_REVIEW', 'LATE', 'APPROVED'].includes(p.status) || p.status === 'NOT_DUE')
        });
    }

    // Filed-but-pending etc. — derived totals for the dashboard.
    summary.filed = summary.approved + summary.under_review + summary.rejected + summary.late;
    summary.pending = summary.not_due;
    summary.non_compliant = summary.overdue + summary.missing;

    return { year, periods: relevantPeriods, industries: rows, summary };
}

// Convenience: the current-period default view.
async function getCurrentPeriodOverview(parkId = null) {
    const now = new Date();
    const year = now.getUTCFullYear();
    const quarter = Math.floor(now.getUTCMonth() / 3) + 1;
    const matrix = await getFilingMatrix({ year, quarter, parkId });
    return { ...matrix, quarter };
}

module.exports = { getFilingMatrix, getCurrentPeriodOverview, statusFor, FILING_STATUSES };
