const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');

// @route   POST /api/submissions
// @desc    Submit periodic industrial data (The Multi-step Form)
// @access  Private (Industry only)
router.post('/', requireRole(['industry']), async (req, res) => {
    // Expected Payload matches the DataSubmission.jsx state
    const { 
        periodYear, 
        periodQuarter, 
        investmentAmount, 
        annualTurnover, 
        permanentEmployees, 
        contractEmployees, 
        waterConsumption, 
        powerUsage, 
        csrActivities, 
        csrSpent 
    } = req.body;

    // Securely pull profile_id injected from JWT Token payload
    const industry_id = req.user.profile_id || 101; // Fallback for mocking

    try {
        // [Mock Implementation of Atomic Transactions]
        /*
        await db.query('BEGIN');
        
        // 1. Create Submission Master Record
        const subRes = await db.query(
            'INSERT INTO data_submissions (industry_id, period_year, period_quarter, status, submitted_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id',
            [industry_id, periodYear, periodQuarter, 'Submitted']
        );
        const subId = subRes.rows[0].id;
        
        // 2. Insert Sub-tables precisely mapped to the Step-Wizard
        await db.query('INSERT INTO financial_data (submission_id, investment_amount, annual_turnover) VALUES ($1, $2, $3)', [subId, investmentAmount, annualTurnover]);
        await db.query('INSERT INTO employment_data (submission_id, permanent_employees, contract_employees) VALUES ($1, $2, $3)', [subId, permanentEmployees, contractEmployees]);
        await db.query('INSERT INTO resource_usage (submission_id, water_consumption, power_usage) VALUES ($1, $2, $3)', [subId, waterConsumption, powerUsage]);
        
        if (csrActivities || csrSpent) {
            await db.query('INSERT INTO csr_activities (submission_id, description, amount_spent) VALUES ($1, $2, $3)', [subId, csrActivities, csrSpent || 0]);
        }

        await db.query('COMMIT');
        */

        console.log(`[DB Mock] Industry ID ${industry_id} submitted Data for ${periodYear} Q${periodQuarter}`);
        res.status(201).json({ msg: 'Industrial Data Successfully Submitted and Validated!' });
    } catch (err) {
        // await db.query('ROLLBACK');
        console.error("Data Submission Database Transaction Error:", err.message);
        res.status(500).send('Server Error during Submission Transaction.');
    }
});

// @route   GET /api/submissions/me
// @desc    Get the current Industry's own submissions
// @access  Private (Industry only)
router.get('/me', requireRole(['industry']), async (req, res) => {
    try {
        const mockMySubmissions = [
            { id: 1, period_year: 2025, period_quarter: 4, status: 'Approved', submitted_at: '2026-01-15' },
            { id: 2, period_year: 2026, period_quarter: 1, status: 'Submitted', submitted_at: '2026-03-01' },
        ];
        res.json(mockMySubmissions);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/submissions/compliance
// @desc    Get compliance overview (all industries tracking missing vs submitted)
// @access  Private (Admin only)
router.get('/compliance', requireRole(['admin']), async (req, res) => {
    try {
        // Complex query calculating compliance relative to the current fiscal period
        const mockComplianceData = [
            { id: 101, name: "ABC Industries", location: "Oragadam", lastSubmission: "Jan 15, 2026", status: "Compliant" },
            { id: 102, name: "XYZ Manufacturing", location: "Sriperumbudur", lastSubmission: "Missing", status: "Alert" },
        ];
        res.json(mockComplianceData);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
