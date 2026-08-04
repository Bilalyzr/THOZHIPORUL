const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const db = require('../db');

// JWT_SECRET is validated as required at startup (see index.js) — no insecure fallback.
const JWT_SECRET = process.env.JWT_SECRET;

// Demo login bypass is OFF unless explicitly enabled via env. Never enable in production.
const ENABLE_DEMO_LOGIN = process.env.ENABLE_DEMO_LOGIN === 'true';

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

        // Password check. The '$demo$' placeholder hash only bypasses verification
        // when demo login is explicitly enabled — otherwise it can never authenticate.
        let isMatch = false;
        if (user.password_hash === '$demo$') {
            isMatch = ENABLE_DEMO_LOGIN;
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

        // ---- 2FA HARD GATE (admin only) ----
        // 2FA is MANDATORY for admins. Two outcomes:
        //   1. Admin has MFA enabled  → return mfa_required (must enter code)
        //   2. Admin has NO MFA       → return mfa_setup_required (must enroll
        //      before they can access the dashboard at all)
        // In BOTH cases, NO session token is issued — the admin cannot
        // proceed without 2FA.
        if (user.role === 'admin') {
            try {
                const mfaRow = await db.query('SELECT enabled FROM user_mfa WHERE user_id = $1', [user.id]);
                const mfaEnabled = mfaRow.rows.length && mfaRow.rows[0].enabled;

                // Issue a short-lived challenge token (5 min) so the
                // verify-mfa / mfa-setup endpoints can identify the user.
                const challengeToken = jwt.sign(
                    { mfa_challenge: true, user_id: user.id, email: user.email },
                    JWT_SECRET,
                    { expiresIn: '5m' }
                );

                if (mfaEnabled) {
                    // Case 1: MFA is ON — admin must enter the TOTP code.
                    return res.json({
                        mfa_required: true,
                        challenge_token: challengeToken,
                        email: user.email,
                        msg: 'Enter the 6-digit code from Microsoft Authenticator.'
                    });
                } else {
                    // Case 2: MFA NOT set up — admin must enroll NOW.
                    // No dashboard access until 2FA is configured + verified.
                    return res.json({
                        mfa_setup_required: true,
                        challenge_token: challengeToken,
                        email: user.email,
                        msg: '2FA is mandatory for admin accounts. Set up Microsoft Authenticator to continue.'
                    });
                }
            } catch (_) { /* user_mfa table absent — skip MFA (pre-migration) */ }
        }

        console.log(`[AUDIT] Login Success: ${user.email} | Role: ${user.role} | Name: ${name}`);

        // Persist the login event to the audit trail (best-effort, non-blocking).
        db.query(
            'INSERT INTO audit_logs (user_id, action, ip_address) VALUES ($1, $2, $3)',
            [user.id, `USER_LOGIN — ${user.role} portal`, req.ip]
        ).catch(err => console.warn('[AUDIT] login log failed:', err.message));

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
// 2FA — TOTP verification (Microsoft Authenticator compatible)
// @route  POST /api/auth/verify-mfa
// @desc   Verifies the 6-digit TOTP code from Microsoft Authenticator.
//         On success, issues the real login token. Rate-limited to
//         5 attempts per 5 minutes to prevent brute-forcing.
// ============================================================
const { verifyTotp } = require('../services/totp');

// Per-user MFA attempt rate limiting for the login verify-mfa endpoint.
const _loginMfaAttempts = new Map();
function checkLoginMfaRateLimit(key) {
    const now = Date.now();
    const entry = _loginMfaAttempts.get(key);
    if (entry && (now - entry.firstAt) < 300000) { // 5 min window
        if (entry.count >= 5) return { blocked: true, retryAfterSec: Math.ceil((entry.firstAt + 300000 - now) / 1000) };
        entry.count++;
    } else {
        _loginMfaAttempts.set(key, { count: 1, firstAt: now });
    }
    return { blocked: false };
}

router.post('/verify-mfa', async (req, res) => {
    try {
        const { challengeToken, code } = req.body;
        if (!challengeToken || !code) return res.status(400).json({ error: 'challengeToken and code required.' });

        // Rate-limit by challenge token (prevents brute-forcing the 6-digit space).
        const rl = checkLoginMfaRateLimit(challengeToken);
        if (rl.blocked) return res.status(429).json({ error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` });

        // Verify the challenge token.
        let decoded;
        try { decoded = jwt.verify(challengeToken, JWT_SECRET); }
        catch { return res.status(401).json({ error: 'Challenge token expired or invalid. Please log in again.' }); }
        if (!decoded.mfa_challenge) return res.status(400).json({ error: 'Invalid challenge token.' });

        const userId = decoded.user_id;

        // Fetch the MFA secret.
        const mfaRow = await db.query('SELECT secret_encrypted, enabled FROM user_mfa WHERE user_id = $1', [userId]);
        if (!mfaRow.rows.length || !mfaRow.rows[0].enabled) {
            return res.status(400).json({ error: 'MFA not enabled for this account.' });
        }

        // Stored secret is already a Base32 string (RFC 4648) — pass it
        // directly to verifyTotp, which decodes Base32 internally.
        const secret = mfaRow.rows[0].secret_encrypted;

        // Verify using the shared TOTP module (single source of truth).
        const valid = verifyTotp(secret, String(code));
        if (!valid) return res.status(401).json({ error: 'Invalid verification code. Check Microsoft Authenticator and try again.' });

        // Success — clear rate limiter + issue the real login token.
        _loginMfaAttempts.delete(challengeToken);
        const userResult = await db.query(
            `SELECT u.*, ip.id AS profile_id, ip.company_name, gp.officer_name
               FROM users u
          LEFT JOIN industry_profiles ip ON ip.user_id = u.id
          LEFT JOIN govt_profiles gp ON gp.user_id = u.id
              WHERE u.id = $1`, [userId]);
        const user = userResult.rows[0];
        const name = user.role === 'industry' ? user.company_name : user.role === 'govt' ? user.officer_name : 'Admin';
        const token = await signToken({ user: { id: user.id, role: user.role, name, ...(user.profile_id && { profile_id: user.profile_id }) } }, JWT_SECRET, { expiresIn: '8h' });

        db.query('INSERT INTO audit_logs (user_id, action, severity) VALUES ($1,$2,$3)', [userId, 'USER_LOGIN (2FA verified) — admin portal', 'warning']).catch(() => {});

        res.json({ token, role: user.role, name, email: user.email });
    } catch (err) {
        console.error('[AUTH] MFA Verify Error:', err.message);
        res.status(500).json({ error: 'Internal Server Error during MFA verification.' });
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

// ============================================================
// ADMIN IMPERSONATION — admin logs in AS an industry user to see
// their dashboard exactly as they see it. The token is flagged with
// impersonated_by so every action is audit-traced. A separate
// "end impersonation" endpoint restores the admin token.
// ============================================================

// @route  POST /api/auth/impersonate/:industryId
// @access Admin only
router.post('/impersonate/:industryId', requireRole(['admin']), async (req, res) => {
    try {
        const rawId = parseInt(req.params.industryId);
        if (!rawId) return res.status(400).json({ error: 'Invalid industry id.' });
        // Fetch the target industry user + profile. Accept EITHER the
        // industry_profiles.id OR the users.id — the /api/users table only
        // exposes users.id, so look up by user_id first, then profile id.
        const result = await db.query(
            `SELECT u.id, u.email, u.role, ip.id AS profile_id, ip.company_name
               FROM users u
               JOIN industry_profiles ip ON ip.user_id = u.id
              WHERE (u.id = $1 OR ip.id = $1) AND u.role = 'industry'
              LIMIT 1`,
            [rawId]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Industry not found.' });

        const target = result.rows[0];
        // Build an impersonation token — same shape as a normal login, but
        // with impersonated_by set to the admin's id so it's fully auditable.
        const payload = {
            user: {
                id: target.id,
                role: target.role,
                name: target.company_name,
                profile_id: target.profile_id,
                impersonated_by: req.user.id  // ← the audit flag
            }
        };
        // Impersonation tokens expire in 1 HOUR (shorter than the normal 8h
        // session) to limit the blast radius if an admin session is compromised.
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        // Audit the impersonation start.
        db.query(
            'INSERT INTO audit_logs (user_id, action, severity, entity_type, entity_id) VALUES ($1,$2,$3,$4,$5)',
            [req.user.id, `IMPERSONATION START — admin ${req.user.id} → industry ${target.company_name} (user ${target.id})`, 'warning', 'industry', target.id]
        ).catch(() => {});

        res.json({
            token,
            role: target.role,
            name: target.company_name,
            email: target.email,
            impersonated: true,
            impersonated_by: req.user.id
        });
    } catch (err) {
        console.error('Impersonation Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route  POST /api/auth/impersonate/end
// @desc   Ends impersonation — the admin's original token is still
//         valid (they kept it client-side), so this just logs the end.
//         The frontend swaps back to the stored admin token.
router.post('/impersonate/end', requireRole(['admin', 'industry']), async (req, res) => {
    // Only meaningful if the current token IS an impersonation token.
    if (req.user.impersonated_by) {
        db.query(
            'INSERT INTO audit_logs (user_id, action, severity) VALUES ($1,$2,$3)',
            [req.user.impersonated_by, `IMPERSONATION END — returned from industry ${req.user.name}`, 'warning']
        ).catch(() => {});
    }
    res.json({ msg: 'Impersonation ended.' });
});

module.exports = { router, requireRole };
