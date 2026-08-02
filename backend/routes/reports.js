const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');

// Build the per-industry dataset that backs every report type. Numbers are the
// latest submitted/approved filing per industry (real data), with the latest
// compliance score. investment_amount may be stored in rupees OR crores across
// rows, so normalise per-row: values >= 100000 are rupees (÷1e7), else already Cr.
async function fetchReportRows() {
    const { rows } = await db.query(`
        WITH latest_sub AS (
            SELECT DISTINCT ON (industry_id) id, industry_id
            FROM data_submissions
            WHERE lower(status) IN ('approved', 'submitted')
            ORDER BY industry_id, submitted_at DESC
        ),
        latest_scores AS (
            SELECT DISTINCT ON (industry_id) industry_id, overall_score
            FROM compliance_scores
            ORDER BY industry_id, score_date DESC
        )
        SELECT
            ip.company_name,
            ip.location,
            ROUND(CASE WHEN COALESCE(f.investment_amount, 0) >= 100000 THEN f.investment_amount / 1e7 ELSE COALESCE(f.investment_amount, 0) END, 2) AS investment_cr,
            COALESCE(e.permanent_employees + e.contract_employees, 0) AS employment,
            COALESCE(r.water_consumption, 0) AS water_consumption,
            COALESCE(r.power_usage, 0) AS power_usage,
            ls2.overall_score AS compliance
        FROM industry_profiles ip
        LEFT JOIN latest_sub ls ON ls.industry_id = ip.id
        LEFT JOIN financial_data f ON f.submission_id = ls.id
        LEFT JOIN employment_data e ON e.submission_id = ls.id
        LEFT JOIN resource_usage r ON r.submission_id = ls.id
        LEFT JOIN latest_scores ls2 ON ls2.industry_id = ip.id
        ORDER BY investment_cr DESC NULLS LAST, ip.company_name ASC
    `);
    return rows;
}

// @route   GET /api/reports/data
// @desc    Real per-industry dataset for client-side report generation
// @access  Private (Admin & Govt)
router.get('/data', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const rows = await fetchReportRows();
        const totals = rows.reduce((acc, r) => {
            acc.investment += parseFloat(r.investment_cr) || 0;
            acc.employment += parseInt(r.employment) || 0;
            acc.water += parseFloat(r.water_consumption) || 0;
            acc.power += parseFloat(r.power_usage) || 0;
            return acc;
        }, { investment: 0, employment: 0, water: 0, power: 0 });
        res.json({ rows, totals, count: rows.length, generatedAt: new Date().toISOString() });
    } catch (err) {
        console.error('Report Data Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/reports/generate
// @desc    Generate a report based on type and time period (real DB aggregates)
// @access  Private (Admin & Govt)
router.post('/generate', requireRole(['admin', 'govt']), async (req, res) => {
    const { reportType, timePeriod, period, format } = req.body;
    const reportPeriod = timePeriod || period || 'current';

    try {
        console.log(`[Reports engine] Generating ${reportType} for ${reportPeriod} in ${format} format...`);

        const rows = await fetchReportRows();

        // Totals across all industries for the report footer.
        const totals = rows.reduce((acc, r) => {
            acc.investment += parseFloat(r.investment_cr) || 0;
            acc.employment += parseInt(r.employment) || 0;
            acc.water += parseFloat(r.water_consumption) || 0;
            acc.power += parseFloat(r.power_usage) || 0;
            return acc;
        }, { investment: 0, employment: 0, water: 0, power: 0 });

        const reportTitle = ({
            investment: 'Investment Summary',
            employment: 'Employment Report',
            compliance: 'Compliance Status',
            park_performance: 'Park Performance',
            resource: 'Resource Utilization'
        })[reportType] || 'Industrial Report';

        const generatedAt = new Date().toISOString();

        if (format === 'PDF') {
            // Minimal valid PDF built from real data (no external PDF lib installed).
            const lines = [
                'THOZHIRPORUL - Industrial OS',
                'SIPCOT Compliance & Investment Reporting',
                `Report: ${reportTitle}   Period: ${reportPeriod}`,
                `Generated: ${generatedAt}`,
                '',
                'Company | Location | Investment(Cr) | Employment | Compliance'
            ];
            rows.forEach(r => {
                lines.push(`${r.company_name} | ${r.location || '-'} | ${r.investment_cr} | ${r.employment} | ${r.compliance != null ? r.compliance + '%' : 'N/A'}`);
            });
            lines.push('');
            lines.push(`TOTAL Investment: ${totals.investment.toFixed(2)} Cr | Employment: ${totals.employment} | Industries: ${rows.length}`);

            const textBody = lines.map(l => `(${l.replace(/([()\\])/g, '\\$1')}) Tj 0 -16 Td`).join('\n');
            const content = `BT /F1 10 Tf 40 800 Td\n${textBody}\nET`;
            const objects = [
                '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
                '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
                '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
                `4 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
                '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj'
            ];
            const pdf = `%PDF-1.4\n${objects.join('\n')}\ntrailer << /Root 1 0 R /Size 6 >>\n%%EOF`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=Report_${reportType}_${reportPeriod}.pdf`);
            res.send(Buffer.from(pdf, 'utf-8'));
        } else if (format === 'Excel' || format === 'CSV') {
            // CSV payload (also served for the Excel option, as before there is no
            // xlsx generator installed; the frontend downloads it as a blob).
            const header = 'Company,Location,Investment (Cr),Employment,Water Consumption,Power Usage,Compliance (%)';
            const dataLines = rows.map(r =>
                `"${r.company_name}","${r.location || ''}",${r.investment_cr},${r.employment},${r.water_consumption},${r.power_usage},${r.compliance != null ? r.compliance : ''}`
            );
            const footer = `"TOTAL","",${totals.investment.toFixed(2)},${totals.employment},${totals.water},${totals.power},`;
            const csv = [header, ...dataLines, footer].join('\n');

            const ext = format === 'Excel' ? 'xlsx' : 'csv';
            const contentType = format === 'Excel'
                ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                : 'text/csv';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename=Report_${reportType}_${reportPeriod}.${ext}`);
            res.send(Buffer.from(csv, 'utf-8'));
        } else {
            res.status(400).json({ msg: 'Unsupported format requested' });
        }

    } catch (err) {
        console.error("Report Generation Error:", err.message);
        res.status(500).send('Server Error during Report Generation.');
    }
});

// ============================================================
// === TOP 3-C: Embedded charts + period-over-period ===========
// ============================================================
// Additive endpoints. The existing /data and /generate above are
// untouched. These supply chart-ready timeseries and YoY/QoQ
// comparison data so reports can embed real graphs, not just tables.
// ============================================================

// ------------------------------------------------------------
// Helper: parse a period string like "2025-Q1" / "2024" into
// { year, quarter } for grouping.
// ------------------------------------------------------------
function parsePeriod(p) {
    if (!p) return {};
    const m = String(p).match(/^(\d{4})(?:[-/](Q[1-4]|S[12]))?$/i);
    if (!m) return {};
    return { year: parseInt(m[1]), quarter: m[2] ? m[2].toUpperCase() : null };
}

// ============================================================
// @route   GET /api/reports/chart-data?metric=investment|employment|compliance
// @desc    Timeseries ready to drop into a Recharts <LineChart>.
//          One point per year, aggregated across all industries.
// @access  Private (Admin, Govt)
// ============================================================
router.get('/chart-data', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const metric = ['investment', 'employment', 'compliance'].includes(req.query.metric)
            ? req.query.metric : 'investment';

        let sql, valueExpr;
        if (metric === 'investment') {
            valueExpr = `SUM(CASE WHEN f.investment_amount >= 100000 THEN f.investment_amount/1e7 ELSE f.investment_amount END)`;
            sql = `SELECT ds.period_year AS period, ROUND(COALESCE(${valueExpr},0),2) AS value
                     FROM data_submissions ds JOIN financial_data f ON f.submission_id = ds.id
                    WHERE ds.period_year IS NOT NULL
                 GROUP BY ds.period_year ORDER BY ds.period_year`;
        } else if (metric === 'employment') {
            valueExpr = `SUM(COALESCE(e.permanent_employees,0) + COALESCE(e.contract_employees,0))`;
            sql = `SELECT ds.period_year AS period, COALESCE(${valueExpr},0) AS value
                     FROM data_submissions ds JOIN employment_data e ON e.submission_id = ds.id
                    WHERE ds.period_year IS NOT NULL
                 GROUP BY ds.period_year ORDER BY ds.period_year`;
        } else { // compliance — avg score per month from compliance_scores
            sql = `SELECT to_char(score_date,'YYYY-MM') AS period, ROUND(AVG(overall_score),1) AS value
                     FROM compliance_scores GROUP BY 1 ORDER BY 1`;
        }

        const { rows } = await db.query(sql);
        res.json({ metric, points: rows });
    } catch (err) {
        console.error('Chart Data Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/reports/comparison?metric=investment&periodA=2024&periodB=2025
// @desc    Period-over-period comparison. Returns totals for each
//          period + the delta %, so reports can show "this yr vs last".
// @access  Private (Admin, Govt)
// ============================================================
router.get('/comparison', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const metric = ['investment', 'employment', 'compliance'].includes(req.query.metric)
            ? req.query.metric : 'investment';
        const a = req.query.periodA;
        const b = req.query.periodB;
        if (!a || !b) return res.status(400).json({ error: 'periodA and periodB required (e.g. 2024, 2025-Q1)' });

        async function totalFor(period) {
            const { year, quarter } = parsePeriod(period);
            if (!year) return 0;
            const qFilter = quarter ? `AND UPPER(ds.period_quarter) = '${quarter}'` : '';
            if (metric === 'investment') {
                const r = await db.query(
                    `SELECT COALESCE(SUM(CASE WHEN f.investment_amount>=100000 THEN f.investment_amount/1e7 ELSE f.investment_amount END),0) AS v
                       FROM data_submissions ds JOIN financial_data f ON f.submission_id=ds.id
                      WHERE ds.period_year=$1 ${qFilter}`, [year]);
                return parseFloat(r.rows[0].v) || 0;
            }
            if (metric === 'employment') {
                const r = await db.query(
                    `SELECT COALESCE(SUM(COALESCE(e.permanent_employees,0)+COALESCE(e.contract_employees,0)),0) AS v
                       FROM data_submissions ds JOIN employment_data e ON e.submission_id=ds.id
                      WHERE ds.period_year=$1 ${qFilter}`, [year]);
                return parseInt(r.rows[0].v) || 0;
            }
            // compliance: avg score in that year
            const r = await db.query(
                `SELECT COALESCE(AVG(overall_score),0) AS v FROM compliance_scores WHERE EXTRACT(YEAR FROM score_date)=$1`, [year]);
            return parseFloat(r.rows[0].v) || 0;
        }

        const valA = await totalFor(a);
        const valB = await totalFor(b);
        const deltaPct = valA === 0 ? null : Math.round(((valB - valA) / valA) * 1000) / 10;

        res.json({ metric, periodA: a, periodB: b, valueA: valA, valueB: valB, delta_pct: deltaPct });
    } catch (err) {
        console.error('Comparison Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   POST /api/reports/log
// @desc    Record a report generation in report_generation_log
//          (so the history page reflects client-side PDF builds).
// @access  Private (Admin, Govt, Industry)
// ============================================================
router.post('/log', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const { reportType, format, reportIdCode, rowCount, fileSizeKb, filters } = req.body;
        const ins = await db.query(
            `INSERT INTO report_generation_log
                (generated_by, report_type, format, report_id_code, row_count, file_size_kb, filters)
             VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb) RETURNING id`,
            [req.user.id, reportType || null, format || null, reportIdCode || null,
             rowCount || null, fileSizeKb || null, JSON.stringify(filters || {})]
        );
        res.status(201).json(ins.rows[0]);
    } catch (err) {
        console.error('Report Log Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/reports/executive-summary
// @desc    Board-ready one-page snapshot: headline KPIs, top parks,
//          compliance distribution, YoY change. Used by the exec deck.
// @access  Private (Admin, Govt)
// ============================================================
router.get('/executive-summary', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const totals = await db.query(`
            SELECT
              (SELECT COUNT(*) FROM industry_profiles) AS industries,
              (SELECT COUNT(*) FROM industrial_parks WHERE status='active') AS active_parks,
              (SELECT ROUND(COALESCE(SUM(total_investment_cr),0),2) FROM industrial_parks) AS investment_cr,
              (SELECT COALESCE(SUM(total_employment),0) FROM industrial_parks) AS employment`);

        const compliance = await db.query(`
            WITH latest AS (
              SELECT DISTINCT ON (industry_id) industry_id, overall_score
                FROM compliance_scores ORDER BY industry_id, score_date DESC)
            SELECT
              COUNT(*) FILTER (WHERE overall_score >= 80) AS compliant,
              COUNT(*) FILTER (WHERE overall_score >= 60 AND overall_score < 80) AS warning,
              COUNT(*) FILTER (WHERE overall_score < 60) AS non_compliant
              FROM latest`);

        const topParks = await db.query(`
            SELECT name, district, infrastructure_score, total_industries, total_investment_cr
              FROM industrial_parks ORDER BY infrastructure_score DESC NULLS LAST LIMIT 5`);

        const openViolations = await db.query(
            `SELECT COUNT(*) AS n FROM compliance_violations WHERE status <> 'resolved'`);

        res.json({
            as_of: new Date().toISOString(),
            headline: {
                industries: parseInt(totals.rows[0].industries),
                active_parks: parseInt(totals.rows[0].active_parks),
                investment_cr: parseFloat(totals.rows[0].investment_cr),
                employment: parseInt(totals.rows[0].employment),
                open_violations: parseInt(openViolations.rows[0].n)
            },
            compliance: {
                compliant: parseInt(compliance.rows[0].compliant),
                warning: parseInt(compliance.rows[0].warning),
                non_compliant: parseInt(compliance.rows[0].non_compliant)
            },
            top_parks: topParks.rows
        });
    } catch (err) {
        console.error('Executive Summary Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
