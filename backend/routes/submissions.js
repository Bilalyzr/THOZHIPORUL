const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');
const { requireFeature, TIER_FEATURES } = require('../middleware/subscriptionGuard');

// @route   POST /api/submissions
// @desc    Submit periodic industrial data (The Multi-step Form)
// @access  Private (Industry only)
router.post('/', requireRole(['industry']), async (req, res) => {
    const { 
        periodYear, 
        periodQuarter, 
        investmentAmount, 
        annualTurnover, 
        exportRevenue,
        rdExpenditure,
        permanentEmployees, 
        contractEmployees, 
        scStEmployees,
        womenEmployees,
        waterConsumption, 
        powerUsage, 
        wasteGenerated,
        wasteRecycledPct,
        csrActivities, 
        csrSpent,
        csrBeneficiaries
    } = req.body;

    const industry_id = req.user.profile_id || 101;

    // Use a single pooled client so BEGIN/INSERT/COMMIT form a real
    // transaction (db.query() checks out a NEW client each call, which
    // would break the transaction boundary and leave partial rows).
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Create Submission Master Record
        const subRes = await client.query(
            `INSERT INTO data_submissions (industry_id, period_year, period_quarter, status, submitted_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (industry_id, period_year, period_quarter)
             DO UPDATE SET status = EXCLUDED.status, submitted_at = NOW()
             RETURNING id`,
            [industry_id, periodYear, periodQuarter, 'Submitted']
        );
        if (!subRes.rows.length) throw new Error('Submission upsert returned no row.');
        const subId = subRes.rows[0].id;

        // 2. Insert/Update Sub-tables
        await client.query(
            `INSERT INTO financial_data (submission_id, investment_amount, annual_turnover, export_revenue, rd_expenditure)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (submission_id) DO UPDATE SET
             investment_amount = EXCLUDED.investment_amount, annual_turnover = EXCLUDED.annual_turnover,
             export_revenue = EXCLUDED.export_revenue, rd_expenditure = EXCLUDED.rd_expenditure`,
            [subId, investmentAmount || 0, annualTurnover || 0, exportRevenue || 0, rdExpenditure || 0]
        );

        await client.query(
            `INSERT INTO employment_data (submission_id, permanent_employees, contract_employees, sc_st_employees, women_employees)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (submission_id) DO UPDATE SET
             permanent_employees = EXCLUDED.permanent_employees, contract_employees = EXCLUDED.contract_employees,
             sc_st_employees = EXCLUDED.sc_st_employees, women_employees = EXCLUDED.women_employees`,
            [subId, permanentEmployees || 0, contractEmployees || 0, scStEmployees || 0, womenEmployees || 0]
        );

        await client.query(
            `INSERT INTO resource_usage (submission_id, water_consumption, power_usage, waste_generated, waste_recycled_pct)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (submission_id) DO UPDATE SET
             water_consumption = EXCLUDED.water_consumption, power_usage = EXCLUDED.power_usage,
             waste_generated = EXCLUDED.waste_generated, waste_recycled_pct = EXCLUDED.waste_recycled_pct`,
            [subId, waterConsumption || 0, powerUsage || 0, wasteGenerated || 0, wasteRecycledPct || 0]
        );

        if (csrActivities || csrSpent) {
            await client.query(
                `INSERT INTO csr_activities (submission_id, description, amount_spent, beneficiary_count)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (submission_id) DO UPDATE SET
                 description = EXCLUDED.description, amount_spent = EXCLUDED.amount_spent, beneficiary_count = EXCLUDED.beneficiary_count`,
                [subId, csrActivities || '', csrSpent || 0, csrBeneficiaries || 0]
            );
        }

        await client.query('COMMIT');

        console.log(`[DB] Industry ID ${industry_id} submitted Data for ${periodYear} Q${periodQuarter}`);
        res.status(201).json({ msg: 'Industrial Data Successfully Submitted and Validated!' });
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch (_) { /* already rolled back or client lost */ }
        console.error("Data Submission Database Transaction Error:", err);
        res.status(500).send('Server Error during Submission Transaction.');
    } finally {
        client.release();
    }
});

// @route   GET /api/submissions/me
// @desc    Get the current Industry's own submissions
// @access  Private (Industry only)
router.get('/me', requireRole(['industry']), async (req, res) => {
    const industry_id = req.user.profile_id || 101;
    try {
        const query = `
            SELECT 
                ds.id, ds.period_year, ds.period_quarter, ds.status, ds.submitted_at, 
                ds.approved_by, u.email as approver_email,
                f.investment_amount, f.annual_turnover, f.export_revenue, f.rd_expenditure,
                e.permanent_employees, e.contract_employees, e.sc_st_employees, e.women_employees,
                r.water_consumption, r.power_usage, r.waste_generated, r.waste_recycled_pct,
                c.description as csr_activities, c.amount_spent as csr_spent, c.beneficiary_count as csr_beneficiaries
            FROM data_submissions ds
            LEFT JOIN financial_data f ON ds.id = f.submission_id
            LEFT JOIN employment_data e ON ds.id = e.submission_id
            LEFT JOIN resource_usage r ON ds.id = r.submission_id
            LEFT JOIN csr_activities c ON ds.id = c.submission_id
            LEFT JOIN users u ON ds.approved_by = u.id
            WHERE ds.industry_id = $1
            ORDER BY ds.period_year DESC, ds.period_quarter DESC
        `;
        const result = await db.query(query, [industry_id]);
        
        // Map to frontend expected format
        const mappedSubmissions = result.rows.map(row => ({
            id: row.id,
            period: row.period_quarter ? `Q${row.period_quarter} ${row.period_year}` : `FY ${row.period_year}`,
            periodYear: row.period_year,
            periodQuarter: row.period_quarter,
            status: row.status,
            submitted: row.submitted_at ? new Date(row.submitted_at).toISOString().split('T')[0] : '-',
            approved_by: row.approver_email || 'Pending',
            data: {
                investmentAmount: row.investment_amount,
                annualTurnover: row.annual_turnover,
                exportRevenue: row.export_revenue,
                rdExpenditure: row.rd_expenditure,
                permanentEmployees: row.permanent_employees,
                contractEmployees: row.contract_employees,
                scStEmployees: row.sc_st_employees,
                womenEmployees: row.women_employees,
                waterConsumption: row.water_consumption,
                powerUsage: row.power_usage,
                wasteGenerated: row.waste_generated,
                wasteRecycledPct: row.waste_recycled_pct,
                csrActivities: row.csr_activities,
                csrSpent: row.csr_spent,
                csrBeneficiaries: row.csr_beneficiaries
            }
        }));

        res.json(mappedSubmissions);
    } catch (err) {
        console.error("Error fetching submissions:", err);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/submissions/compliance
// @desc    Get compliance overview (all industries tracking missing vs submitted)
// @access  Private (Admin & Govt)
router.get('/compliance', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        // Find latest submission for each industry
        const query = `
            SELECT 
                i.id as industry_id, i.company_name as name, i.location,
                ds.period_year, ds.period_quarter, ds.status as submission_status, ds.submitted_at,
                ds.id as submission_id,
                f.investment_amount, f.annual_turnover,
                r.water_consumption, r.power_usage,
                e.permanent_employees, e.contract_employees
            FROM industry_profiles i
            LEFT JOIN LATERAL (
                SELECT * FROM data_submissions 
                WHERE industry_id = i.id 
                ORDER BY period_year DESC, period_quarter DESC LIMIT 1
            ) ds ON true
            LEFT JOIN financial_data f ON ds.id = f.submission_id
            LEFT JOIN resource_usage r ON ds.id = r.submission_id
            LEFT JOIN employment_data e ON ds.id = e.submission_id
        `;
        const result = await db.query(query);
        
        const mappedCompliance = result.rows.map(row => ({
            id: row.industry_id,
            name: row.name,
            location: row.location,
            lastSubmission: row.submitted_at ? new Date(row.submitted_at).toLocaleDateString() : 'Missing',
            status: row.submission_status === 'Approved' ? 'Compliant' : row.submission_status === 'Submitted' ? 'Pending Review' : row.submission_status || 'Alert',
            period: row.period_quarter ? `Q${row.period_quarter} ${row.period_year}` : '-',
            investmentAmount: row.investment_amount,
            annualTurnover: row.annual_turnover,
            waterConsumption: row.water_consumption,
            powerUsage: row.power_usage,
            totalEmployees: (row.permanent_employees || 0) + (row.contract_employees || 0),
            submissionId: row.submission_id
        }));

        res.json(mappedCompliance);
    } catch (err) {
        console.error("Error fetching compliance:", err);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/submissions/:id/status
// @desc    Approve or Reject an industrial compliance submission
// @access  Private (Admin, Govt)
router.put('/:id/status', requireRole(['admin', 'govt']), async (req, res) => {
    const { status } = req.body;
    const submissionId = req.params.id;
    const userId = req.user.id;

    if (!['Approved', 'Rejected', 'Submitted'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be Approved, Rejected, or Submitted.' });
    }

    try {
        // T2.2 — Block approval if there are open filing-deficiency queries.
        if (status === 'Approved') {
            try {
                const openQ = await db.query(
                    `SELECT COUNT(*)::int AS n FROM submission_queries
                      WHERE submission_id = $1 AND status IN ('open','responded')`,
                    [submissionId]
                );
                if (openQ.rows.length && openQ.rows[0].n > 0) {
                    return res.status(409).json({
                        error: `Cannot approve: ${openQ.rows[0].n} open filing-deficiency query/queries must be resolved first.`,
                        code: 'OPEN_QUERIES_BLOCK_APPROVAL'
                    });
                }
            } catch (_) { /* submission_queries table may be absent pre-v5 — allow */ }
        }

        const updateQuery = `
            UPDATE data_submissions
            SET status = $1, approved_by = $2
            WHERE id = $3
            RETURNING id, status
        `;
        const result = await db.query(updateQuery, [status, userId, submissionId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        res.json({ msg: `Submission status successfully updated to ${status}!`, submission: result.rows[0] });
    } catch (err) {
        console.error("Error updating submission status:", err);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// === MODULE 9 ENHANCEMENTS — bulk import + prefill + API =======
// ============================================================
// Additive. The POST / above (single submission) and /me /:id/status
// are untouched. These add:
//   • Prefill from the last period (fewer errors, faster filing)
//   • Bulk import — many periods at once (big units, Excel upload)
//   • API-based submission (programmatic, API-key gated)
// ============================================================

// ------------------------------------------------------------
// Core writer used by both single, bulk, and API submission paths.
// Takes an industryId + a normalised payload + status.
// ------------------------------------------------------------
async function writeSubmission(client, industryId, p, status) {
    const subRes = await client.query(
        `INSERT INTO data_submissions (industry_id, period_year, period_quarter, status, submitted_at)
         VALUES ($1,$2,$3,$4,NOW())
         ON CONFLICT (industry_id, period_year, period_quarter)
         DO UPDATE SET status = EXCLUDED.status, submitted_at = NOW()
         RETURNING id`,
        [industryId, p.periodYear, p.periodQuarter, status]
    );
    if (!subRes.rows.length) throw new Error('Submission upsert returned no row.');
    const subId = subRes.rows[0].id;

    await client.query(
        `INSERT INTO financial_data (submission_id, investment_amount, annual_turnover, export_revenue, rd_expenditure)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (submission_id) DO UPDATE SET
           investment_amount=EXCLUDED.investment_amount, annual_turnover=EXCLUDED.annual_turnover,
           export_revenue=EXCLUDED.export_revenue, rd_expenditure=EXCLUDED.rd_expenditure`,
        [subId, p.investmentAmount || 0, p.annualTurnover || 0, p.exportRevenue || 0, p.rdExpenditure || 0]
    );
    await client.query(
        `INSERT INTO employment_data (submission_id, permanent_employees, contract_employees, sc_st_employees, women_employees)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (submission_id) DO UPDATE SET
           permanent_employees=EXCLUDED.permanent_employees, contract_employees=EXCLUDED.contract_employees,
           sc_st_employees=EXCLUDED.sc_st_employees, women_employees=EXCLUDED.women_employees`,
        [subId, p.permanentEmployees || 0, p.contractEmployees || 0, p.scStEmployees || 0, p.womenEmployees || 0]
    );
    await client.query(
        `INSERT INTO resource_usage (submission_id, water_consumption, power_usage, waste_generated, waste_recycled_pct)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (submission_id) DO UPDATE SET
           water_consumption=EXCLUDED.water_consumption, power_usage=EXCLUDED.power_usage,
           waste_generated=EXCLUDED.waste_generated, waste_recycled_pct=EXCLUDED.waste_recycled_pct`,
        [subId, p.waterConsumption || 0, p.powerUsage || 0, p.wasteGenerated || 0, p.wasteRecycledPct || 0]
    );
    if (p.csrActivities || p.csrSpent) {
        await client.query(
            `INSERT INTO csr_activities (submission_id, description, amount_spent, beneficiary_count)
             VALUES ($1,$2,$3,$4)
             ON CONFLICT (submission_id) DO UPDATE SET
               description=EXCLUDED.description, amount_spent=EXCLUDED.amount_spent, beneficiary_count=EXCLUDED.beneficiary_count`,
            [subId, p.csrActivities || '', p.csrSpent || 0, p.csrBeneficiaries || 0]
        );
    }
    return subId;
}

// Smart validation: returns { ok, errors[] }. Non-fatal missing fields
// are tolerated; hard errors (bad types, missing period) are surfaced.
function validate(p) {
    const errors = [];
    if (!p.periodYear || !p.periodQuarter) errors.push('periodYear & periodQuarter required');
    if (p.periodYear && (p.periodYear < 2000 || p.periodYear > 2100)) errors.push('periodYear out of range');
    if (p.periodQuarter && ![1,2,3,4].includes(Number(p.periodQuarter))) errors.push('periodQuarter must be 1-4');
    for (const k of ['investmentAmount','annualTurnover','permanentEmployees']) {
        if (p[k] != null && Number.isNaN(Number(p[k]))) errors.push(`${k} must be numeric`);
    }
    return { ok: errors.length === 0, errors };
}

// ============================================================
// @route   GET /api/submissions/prefill
// @desc    Prefill from the industry's last approved/submitted period.
//          Frontend uses this to seed the form so re-filing is fast.
// @access  Private (Industry)
// ============================================================
router.get('/prefill', requireRole(['industry']), async (req, res) => {
    try {
        const industryId = req.user.profile_id;
        if (!industryId) return res.status(400).json({ error: 'No industry profile' });

        const last = await db.query(`
            SELECT ds.id, ds.period_year, ds.period_quarter,
                   f.investment_amount, f.annual_turnover, f.export_revenue, f.rd_expenditure,
                   e.permanent_employees, e.contract_employees, e.sc_st_employees, e.women_employees,
                   r.water_consumption, r.power_usage, r.waste_generated, r.waste_recycled_pct,
                   c.description AS csr_activities, c.amount_spent AS csr_spent, c.beneficiary_count AS csr_beneficiaries
              FROM data_submissions ds
         LEFT JOIN financial_data f ON f.submission_id = ds.id
         LEFT JOIN employment_data e ON e.submission_id = ds.id
         LEFT JOIN resource_usage r ON r.submission_id = ds.id
         LEFT JOIN csr_activities c ON c.submission_id = ds.id
             WHERE ds.industry_id = $1 AND lower(ds.status) IN ('approved','submitted')
          ORDER BY ds.submitted_at DESC LIMIT 1`, [industryId]);
        if (!last.rows.length) return res.json({ prefill: null, msg: 'No prior submission to prefill from.' });
        res.json({ prefill: last.rows[0] });
    } catch (err) {
        console.error('Prefill Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   POST /api/submissions/bulk
// @desc    Bulk import — many periods at once. Each item runs its own
//          validation; valid rows commit, invalid rows are itemised.
// @access  Private (Industry)
// ============================================================
router.post('/bulk', requireRole(['industry']), requireFeature(TIER_FEATURES.EXCEL_UPLOAD), async (req, res) => {
    const industryId = req.user.profile_id;
    if (!industryId) return res.status(400).json({ error: 'No industry profile' });
    const periods = Array.isArray(req.body.periods) ? req.body.periods : [];
    if (!periods.length) return res.status(400).json({ error: 'periods array required' });

    const client = await db.pool.connect();
    const succeeded = [], failed = [];
    try {
        for (let i = 0; i < periods.length; i++) {
            const p = periods[i];
            const v = validate(p);
            if (!v.ok) { failed.push({ row: i, errors: v.errors }); continue; }
            try {
                await client.query('BEGIN');
                const id = await writeSubmission(client, industryId, p, 'Submitted');
                await client.query('COMMIT');
                succeeded.push({ row: i, submissionId: id, period: `${p.periodYear}-Q${p.periodQuarter}` });
            } catch (e) {
                await client.query('ROLLBACK');
                failed.push({ row: i, errors: [e.message] });
            }
        }
        res.json({ total: periods.length, succeeded: succeeded.length, failed: failed.length, succeeded_rows: succeeded, failed_rows: failed });
    } catch (err) {
        console.error('Bulk Submission Error:', err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});

// ============================================================
// @route   POST /api/submissions/api-submit
// @desc    Programmatic submission via API key (for big industries /
//          ERP integrations). Header: x-api-key. The key maps to an
//          industry profile. In production keys live in a dedicated
//          table; here we accept the env-configured master key OR
//          resolve by profile id passed in the body.
// @access  API-key gated (no JWT)
// ============================================================
router.post('/api-submit', async (req, res) => {
    try {
        const apiKey = req.header('x-api-key');
        const validKey = process.env.SUBMISSION_API_KEY && apiKey === process.env.SUBMISSION_API_KEY;
        if (!validKey) return res.status(401).json({ error: 'Invalid or missing API key (x-api-key header).' });

        const { industryId, periodYear, periodQuarter, ...rest } = req.body;
        if (!industryId || !periodYear || !periodQuarter) {
            return res.status(400).json({ error: 'industryId, periodYear, periodQuarter required' });
        }
        const v = validate({ periodYear, periodQuarter, ...rest });
        if (!v.ok) return res.status(400).json({ error: 'validation failed', errors: v.errors });

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            const id = await writeSubmission(client, industryId, { periodYear, periodQuarter, ...rest }, 'Submitted');
            await client.query('COMMIT');
            res.status(201).json({ msg: 'submitted', submissionId: id });
        } catch (e) {
            await client.query('ROLLBACK'); throw e;
        } finally { client.release(); }
    } catch (err) {
        console.error('API Submit Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
