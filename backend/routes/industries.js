const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const { requireRole } = require('./auth');

// @route   POST /api/industries
// @desc    Register a new industry (Public or Admin created)
// @access  Public (for initial registration) or Private(Admin)
router.post('/', async (req, res) => {
    const { companyName, industryType, location, contactPerson, phoneNumber, email, password } = req.body;

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            const userInsert = await client.query(
                'INSERT INTO users(email, password_hash, role) VALUES($1, $2, $3) RETURNING id', 
                [email, hashedPassword, 'industry']
            );
            const userId = userInsert.rows[0].id;

            await client.query(
                'INSERT INTO industry_profiles(user_id, company_name, industry_type, location, contact_person, phone_number) VALUES($1, $2, $3, $4, $5, $6)', 
                [userId, companyName, industryType, location, contactPerson, phoneNumber]
            );
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

        res.status(201).json({ msg: 'Industry Registration Request Submitted Successfully' });
    } catch (err) {
        console.error("Industry Registration Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/industries
// @desc    Get all industries
// @access  Private (Admin & Govt)
router.get('/', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT ip.*, u.status, u.email 
            FROM industry_profiles ip 
            JOIN users u ON ip.user_id = u.id
            ORDER BY ip.company_name
        `);
        
        res.json(rows);
    } catch (err) {
        console.error("Fetch Industries Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/industries/:id
// @desc    Get a single industry's full profile. Accepts EITHER the
//          industry_profiles.id OR the users.id (the /api/users table
//          only exposes users.id, so look up by either).
// @access  Private (Admin & Govt)
router.get('/:id', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT ip.id, ip.user_id, ip.company_name, ip.industry_type, ip.location,
                   ip.contact_person, ip.phone_number, ip.gstin, ip.plot_id,
                   ip.compliance_score, ip.subscription_tier, ip.subscription_status,
                   u.email, u.status, u.created_at
              FROM industry_profiles ip
              JOIN users u ON ip.user_id = u.id
             WHERE ip.id = $1 OR u.id = $1
             LIMIT 1
        `, [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Industry not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error("Fetch Industry Error:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
