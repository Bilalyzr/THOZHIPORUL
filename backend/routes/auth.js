const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'sipcot_sims_fallback_secret_2026';

// ============================================================
// REGISTER - Industry
// ============================================================
router.post('/register/industry', async (req, res) => {
    const { companyName, industryType, location, contactPerson, phoneNumber, email, password } = req.body;

    try {
        // Check if email already exists in DB
        const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'An account with this email already exists.' });
        }

        // Validate required fields
        if (!email || !password || !companyName) {
            return res.status(400).json({ error: 'Email, password, and company name are required.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Get a client from the pool for a transaction
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            const userInsert = await client.query(
                'INSERT INTO users(email, password_hash, role, status) VALUES($1, $2, $3, $4) RETURNING id',
                [email, password_hash, 'industry', 'Active']
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

        console.log(`[REGISTER] New industry: ${companyName} (${email})`);

        res.status(201).json({ msg: 'Industry registered successfully! You can now log in.', email });
    } catch (err) {
        console.error('Industry Registration Error:', err.message);
        res.status(500).json({ error: 'Server error during registration.' });
    }
});

// ============================================================
// REGISTER - Government Officer
// ============================================================
router.post('/register/govt', async (req, res) => {
    const { officerName, designation, department, jurisdiction, officialEmail, phoneNumber, employeeId, password } = req.body;

    try {
        const userExists = await db.query('SELECT * FROM users WHERE email = $1', [officialEmail]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'An account with this email already exists.' });
        }

        if (!officialEmail || !password || !officerName) {
            return res.status(400).json({ error: 'Email, password, and officer name are required.' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Get a client for the transaction
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            const userInsert = await client.query(
                'INSERT INTO users(email, password_hash, role, status) VALUES($1, $2, $3, $4) RETURNING id',
                [officialEmail, password_hash, 'govt', 'Active']
            );
            const userId = userInsert.rows[0].id;

            await client.query(
                'INSERT INTO govt_profiles(user_id, officer_name, designation, department, jurisdiction) VALUES($1, $2, $3, $4, $5)',
                [userId, officerName, designation, department, jurisdiction]
            );
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

        console.log(`[REGISTER] New govt officer: ${officerName} (${officialEmail})`);

        res.status(201).json({ msg: 'Government officer registered successfully! You can now log in.', email: officialEmail });
    } catch (err) {
        console.error('Govt Registration Error:', err.message);
        res.status(500).json({ error: 'Server error during registration.' });
    }
});

// ============================================================
// LOGIN
// ============================================================
const { promisify } = require('util');
const signToken = promisify(jwt.sign);

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        console.log(`[AUTH] Login attempt: ${email}`);
        
        // Find user in DB
        const result = await db.query(
            `SELECT u.*, ip.id as profile_id, ip.company_name, gp.id as govt_profile_id, gp.officer_name 
             FROM users u 
             LEFT JOIN industry_profiles ip ON u.id = ip.user_id 
             LEFT JOIN govt_profiles gp ON u.id = gp.user_id 
             WHERE u.email = $1`, 
            [email]
        );
        const user = result.rows[0];

        if (!user) {
            console.warn(`[AUTH] User not found: ${email}`);
            return res.status(401).json({ error: 'Invalid credentials. No account found with this email.' });
        }

        // Password check
        let isMatch = false;
        if (user.password_hash === '$demo$') {
            isMatch = true;
        } else {
            isMatch = await bcrypt.compare(password, user.password_hash);
        }

        if (!isMatch) {
            console.warn(`[AUTH] Password mismatch for: ${email}`);
            return res.status(401).json({ error: 'Invalid credentials. Incorrect password.' });
        }

        // Determine display name
        const name = user.role === 'industry' ? user.company_name : 
                    user.role === 'govt' ? user.officer_name : 'Admin';
        
        const payload = {
            user: {
                id: user.id,
                role: user.role,
                name: name,
                ...(user.profile_id && { profile_id: user.profile_id })
            }
        };

        // Sign token
        const token = await signToken(payload, JWT_SECRET, { expiresIn: '8h' });
        
        console.log(`[AUDIT] Login Success: ${user.email} | Role: ${user.role} | Name: ${name}`);
        
        res.json({ 
            token, 
            role: user.role, 
            name: name, 
            email: user.email 
        });

    } catch (err) {
        console.error('[AUTH] Login Exception:', err);
        res.status(500).json({ error: 'Internal Server Error during login.' });
    }
});

// ============================================================
// MIDDLEWARE - Role Protection
// ============================================================
const requireRole = (allowedRoles) => (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded.user;
        if (allowedRoles && !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ msg: 'Access Denied: You do not have the required permissions.' });
        }
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid or has expired.' });
    }
};

module.exports = { router, requireRole };
