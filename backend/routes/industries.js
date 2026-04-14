const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');

// @route   POST /api/industries
// @desc    Register a new industry (Public or Admin created)
// @access  Public (for initial registration) or Private(Admin)
router.post('/', async (req, res) => {
    const { companyName, industryType, location, contactPerson, phoneNumber, email } = req.body;

    try {
        // [Mock Implementation] 
        // In reality: 
        // 1. Create a User entry (Pending status, Industry role)
        // 2. Create the Industry Profile linked to the User ID.
        // await db.query('BEGIN');
        // const userInsert = await db.query('INSERT INTO users(email, password_hash, role) VALUES($1, $2, $3) RETURNING id', [email, hashedPassword, 'industry']);
        // await db.query('INSERT INTO industry_profiles(user_id, company_name, industry_type, location, contact_person, phone_number) VALUES($1, $2, $3, $4, $5, $6)', [userInsert.rows[0].id, companyName, industryType, location, contactPerson, phoneNumber]);
        // await db.query('COMMIT');

        console.log(`[DB Mock] Industry ${companyName} registered with email ${email}`);
        res.status(201).json({ msg: 'Industry Registration Request Submitted Successfully' });
    } catch (err) {
        // await db.query('ROLLBACK');
        console.error("Industry Registration Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/industries
// @desc    Get all industries
// @access  Private (Admin & Govt)
router.get('/', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        // const { rows } = await db.query(`
        //     SELECT ip.*, u.status, u.email 
        //     FROM industry_profiles ip 
        //     JOIN users u ON ip.user_id = u.id
        // `);
        
        // Mock Response
        const mockIndustries = [
            { id: 101, companyName: 'ABC Industries', location: 'Oragadam', status: 'Active' },
            { id: 102, companyName: 'XYZ Manufacturing', location: 'Sriperumbudur', status: 'Active' }
        ];

        res.json(mockIndustries);
    } catch (err) {
        console.error("Fetch Industries Error:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
