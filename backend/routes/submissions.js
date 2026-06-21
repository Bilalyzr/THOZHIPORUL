const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');

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

    try {
        await db.query('BEGIN');
        
        // 1. Create Submission Master Record
        // Using ON CONFLICT to allow updates to a Draft or updating an existing submission
        // But for simplicity, let's assume it's an UPSERT or just INSERT
        const subRes = await db.query(
            `INSERT INTO data_submissions (industry_id, period_year, period_quarter, status, submitted_at) 
             VALUES ($1, $2, $3, $4, NOW()) 
             ON CONFLICT (industry_id, period_year, period_quarter) 
             DO UPDATE SET status = EXCLUDED.status, submitted_at = NOW()
             RETURNING id`,
            [industry_id, periodYear, periodQuarter, 'Submitted']
        );
        const subId = subRes.rows[0].id;
        
        // 2. Insert/Update Sub-tables
        await db.query(
            `INSERT INTO financial_data (submission_id, investment_amount, annual_turnover, export_revenue, rd_expenditure) 
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (submission_id) DO UPDATE SET 
             investment_amount = EXCLUDED.investment_amount, annual_turnover = EXCLUDED.annual_turnover, 
             export_revenue = EXCLUDED.export_revenue, rd_expenditure = EXCLUDED.rd_expenditure`,
            [subId, investmentAmount || 0, annualTurnover || 0, exportRevenue || 0, rdExpenditure || 0]
        );
        
        await db.query(
            `INSERT INTO employment_data (submission_id, permanent_employees, contract_employees, sc_st_employees, women_employees) 
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (submission_id) DO UPDATE SET 
             permanent_employees = EXCLUDED.permanent_employees, contract_employees = EXCLUDED.contract_employees, 
             sc_st_employees = EXCLUDED.sc_st_employees, women_employees = EXCLUDED.women_employees`,
            [subId, permanentEmployees || 0, contractEmployees || 0, scStEmployees || 0, womenEmployees || 0]
        );

        await db.query(
            `INSERT INTO resource_usage (submission_id, water_consumption, power_usage, waste_generated, waste_recycled_pct) 
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (submission_id) DO UPDATE SET 
             water_consumption = EXCLUDED.water_consumption, power_usage = EXCLUDED.power_usage, 
             waste_generated = EXCLUDED.waste_generated, waste_recycled_pct = EXCLUDED.waste_recycled_pct`,
            [subId, waterConsumption || 0, powerUsage || 0, wasteGenerated || 0, wasteRecycledPct || 0]
        );
        
        if (csrActivities || csrSpent) {
            await db.query(
                `INSERT INTO csr_activities (submission_id, description, amount_spent, beneficiary_count) 
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (submission_id) DO UPDATE SET 
                 description = EXCLUDED.description, amount_spent = EXCLUDED.amount_spent, beneficiary_count = EXCLUDED.beneficiary_count`,
                [subId, csrActivities || '', csrSpent || 0, csrBeneficiaries || 0]
            );
        }

        await db.query('COMMIT');

        console.log(`[DB] Industry ID ${industry_id} submitted Data for ${periodYear} Q${periodQuarter}`);
        res.status(201).json({ msg: 'Industrial Data Successfully Submitted and Validated!' });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error("Data Submission Database Transaction Error:", err);
        res.status(500).send('Server Error during Submission Transaction.');
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

module.exports = router;
