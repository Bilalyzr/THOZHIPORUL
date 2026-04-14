const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const JWT_SECRET = process.env.JWT_SECRET || 'sipcot_sims_super_secret_key_2026';

// ============================================================
// IN-MEMORY USER STORE (replaces DB until PostgreSQL is connected)
// Persists for the lifetime of the server process
// ============================================================
let nextId = 100;
const registeredUsers = [
    // Default demo accounts
    { id: 1, email: 'admin@sipcot.com', password_hash: '$demo$', role: 'admin', name: 'SIMS Admin', status: 'Active' },
    { id: 2, email: 'industry@abc.com', password_hash: '$demo$', role: 'industry', name: 'ABC Industries', status: 'Active', profile_id: 101 },
    { id: 3, email: 'govt@tn.gov.in', password_hash: '$demo$', role: 'govt', name: 'Govt Officer', status: 'Active' },
];

// ============================================================
// REGISTER - Industry
// ============================================================
router.post('/register/industry', async (req, res) => {
    const { companyName, industryType, location, contactPerson, phoneNumber, email, password } = req.body;

    try {
        // Check if email already exists
        if (registeredUsers.find(u => u.email === email)) {
            return res.status(400).json({ error: 'An account with this email already exists.' });
        }

        // Validate required fields
        if (!email || !password || !companyName) {
            return res.status(400).json({ error: 'Email, password, and company name are required.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const newUser = {
            id: ++nextId,
            email,
            password_hash,
            role: 'industry',
            name: companyName,
            status: 'Active',
            profile_id: nextId,
            profile: { companyName, industryType, location, contactPerson, phoneNumber }
        };

        registeredUsers.push(newUser);
        console.log(`[REGISTER] New industry: ${companyName} (${email})`);
        console.log(`[USERS] Total registered: ${registeredUsers.length}`);

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
        if (registeredUsers.find(u => u.email === officialEmail)) {
            return res.status(400).json({ error: 'An account with this email already exists.' });
        }

        if (!officialEmail || !password || !officerName) {
            return res.status(400).json({ error: 'Email, password, and officer name are required.' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const newUser = {
            id: ++nextId,
            email: officialEmail,
            password_hash,
            role: 'govt',
            name: officerName,
            status: 'Active',
            profile: { designation, department, jurisdiction, phoneNumber, employeeId }
        };

        registeredUsers.push(newUser);
        console.log(`[REGISTER] New govt officer: ${officerName} (${officialEmail})`);
        console.log(`[USERS] Total registered: ${registeredUsers.length}`);

        res.status(201).json({ msg: 'Government officer registered successfully! You can now log in.', email: officialEmail });
    } catch (err) {
        console.error('Govt Registration Error:', err.message);
        res.status(500).json({ error: 'Server error during registration.' });
    }
});

// ============================================================
// LOGIN
// ============================================================
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user in registered store
        const user = registeredUsers.find(u => u.email === email);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials. No account found with this email.' });
        }

        // Password check
        let isMatch = false;
        if (user.password_hash === '$demo$') {
            // Demo accounts accept any password
            isMatch = true;
        } else {
            // Real registered accounts use bcrypt
            isMatch = await bcrypt.compare(password, user.password_hash);
        }

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials. Incorrect password.' });
        }

        // Create JWT
        const payload = {
            user: {
                id: user.id,
                role: user.role,
                name: user.name,
                ...(user.profile_id && { profile_id: user.profile_id })
            }
        };

        jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' }, (err, token) => {
            if (err) throw err;
            console.log(`[AUDIT] Login: ${user.email} | Role: ${user.role} | Name: ${user.name}`);
            res.json({ token, role: user.role, name: user.name, email: user.email });
        });

    } catch (err) {
        console.error('Login Error:', err.message);
        res.status(500).send('Server Error');
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
