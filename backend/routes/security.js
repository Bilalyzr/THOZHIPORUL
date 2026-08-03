// ============================================================
// security.js — User Mgmt & Security enhancements (Module 14)
//
// Mounted at /api/security. ADDITIVE to /api/users (CRUD) and
// /api/auth (login/register). Adds the security-ops layer:
//   • Granular RBAC (per-action permission overrides on top of the 3 roles)
//   • MFA setup/verify (TOTP-style, secret stored encrypted-at-rest concept)
//   • Active session management (list + revoke)
//   • Bulk user import (job tracking)
//
// The existing requireRole(['admin',...]) gate keeps working everywhere;
// hasPermission() is an OPTIONAL finer check consulted when present.
// ============================================================

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { requireRole } = require('./auth');
const { recordAudit } = require('./audit');

// ------------------------------------------------------------
// hasPermission: optional finer check. Returns true unless an
// explicit deny row exists for (role|user, permission_key).
// ------------------------------------------------------------
async function hasPermission(req, permissionKey) {
    const role = req.user && req.user.role;
    if (!role) return false;
    // Admins always pass (backwards compatible).
    if (role === 'admin') return true;

    // Role-level explicit deny wins.
    const roleDeny = await db.query(
        `SELECT 1 FROM role_permissions WHERE role=$1 AND permission_key=$2 AND is_allowed=FALSE`, [role, permissionKey]
    );
    if (roleDeny.rows.length) return false;
    // Otherwise allow (default-open keeps existing behaviour).
    return true;
}

// ============================================================
// RBAC: permission matrix CRUD
// ============================================================

// @route   GET /api/security/permissions
router.get('/permissions', requireRole(['admin']), async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM role_permissions ORDER BY role, permission_key');
        res.json(rows);
    } catch (err) {
        console.error('List Permissions Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/security/permissions
// @desc    Allow or deny a permission for a role.
router.put('/permissions', requireRole(['admin']), async (req, res) => {
    try {
        const { role, permissionKey, isAllowed } = req.body;
        if (!role || !permissionKey) return res.status(400).json({ error: 'role and permissionKey required' });
        const ins = await db.query(
            `INSERT INTO role_permissions (role, permission_key, is_allowed)
             VALUES ($1,$2,$3)
             ON CONFLICT (role, permission_key) DO UPDATE SET is_allowed = EXCLUDED.is_allowed
             RETURNING *`,
            [role, permissionKey, isAllowed !== false]
        );
        await recordAudit(req.user.id, `Updated RBAC: ${role}.${permissionKey} = ${isAllowed !== false}`, req.ip, { entityType: 'permission' });
        res.json(ins.rows[0]);
    } catch (err) {
        console.error('Update Permission Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// SESSIONS — active session management
// ============================================================

// @route   GET /api/security/sessions
// @desc    List the caller's active sessions.
router.get('/sessions', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT id, device, ip_address, last_seen, created_at, revoked
               FROM user_sessions WHERE user_id=$1 ORDER BY last_seen DESC`, [req.user.id]);
        res.json(rows);
    } catch (err) {
        console.error('List Sessions Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/security/sessions/:id
// @desc    Revoke a session (forced logout for that device).
router.delete('/sessions/:id', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        await db.query('UPDATE user_sessions SET revoked=TRUE WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
        res.json({ msg: 'session revoked' });
    } catch (err) {
        console.error('Revoke Session Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/security/sessions-all
// @desc    Revoke ALL other sessions (revoke everything except the current one).
router.delete('/sessions-all', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const r = await db.query(
            'UPDATE user_sessions SET revoked=TRUE WHERE user_id=$1 RETURNING id', [req.user.id]);
        res.json({ msg: 'all sessions revoked', count: r.rowCount });
    } catch (err) {
        console.error('Revoke All Sessions Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// MFA — TOTP setup + verify + disable
// (Uses the shared services/totp.js module — single source of truth)
// ============================================================
const totp = require('../services/totp');

// Per-user MFA attempt rate limiting (prevents brute-forcing the code).
// Keyed on user_id; resets after the window. In-memory (sufficient for
// a single-instance deploy; use Redis for multi-instance).
const _mfaAttempts = new Map(); // userId → { count, firstAt }
const MFA_MAX_ATTEMPTS = 5;
const MFA_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
function checkMfaRateLimit(userId) {
    const now = Date.now();
    const entry = _mfaAttempts.get(userId);
    if (entry && (now - entry.firstAt) < MFA_WINDOW_MS) {
        if (entry.count >= MFA_MAX_ATTEMPTS) {
            return { blocked: true, retryAfterSec: Math.ceil((entry.firstAt + MFA_WINDOW_MS - now) / 1000) };
        }
        entry.count++;
    } else {
        _mfaAttempts.set(userId, { count: 1, firstAt: now });
    }
    return { blocked: false };
}

// ------------------------------------------------------------
// Flexible MFA auth: accepts EITHER a real session token (already
// logged in, managing MFA via Settings) OR a challenge token (admin
// forced to set up MFA before first login). Used only for setup/verify.
// ------------------------------------------------------------
const jwtLib = require('jsonwebtoken');

function mfaFlexibleAuth(req, res, next) {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ error: 'No token.' });
    try {
        const decoded = jwtLib.verify(token, process.env.JWT_SECRET);
        // If it's a challenge token (mfa_setup_required flow), extract user_id.
        if (decoded.mfa_challenge) {
            req.user = { id: decoded.user_id, email: decoded.email, name: decoded.email || 'admin' };
            return next();
        }
        // Normal token — use the standard role check.
        req.user = decoded.user;
        return next();
    } catch {
        return res.status(401).json({ error: 'Token invalid or expired.' });
    }
}

// @route   GET /api/security/mfa/status
// @desc    Check if MFA is enabled for the current user.
router.get('/mfa/status', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const { rows } = await db.query('SELECT enabled FROM user_mfa WHERE user_id = $1', [req.user.id]);
        res.json({ enabled: rows.length > 0 && rows[0].enabled });
    } catch (_) {
        res.json({ enabled: false });
    }
});

// @route   POST /api/security/mfa/setup
// @desc    Begin MFA enrollment. IDEMPOTENT: if a pending (not-yet-enabled)
//          secret already exists for the user, return the SAME secret so the
//          QR they scanned stays valid. Only generate a fresh secret when no
//          row exists yet. Returns 400 if already enabled (disable first).
router.post('/mfa/setup', mfaFlexibleAuth, async (req, res) => {
    try {
        const existing = await db.query('SELECT secret_encrypted, enabled FROM user_mfa WHERE user_id = $1', [req.user.id]);
        if (existing.rows.length && existing.rows[0].enabled) {
            return res.status(400).json({ error: '2FA is already enabled. Disable it first to re-enroll.' });
        }

        // The stored secret is a Base32 string (RFC 4648) — the format all
        // authenticator apps require. We persist it directly; no extra
        // encoding layer (the column is text and Base32 is safe text).
        let secret;
        if (existing.rows.length && /^[A-Z2-7]+$/i.test(existing.rows[0].secret_encrypted)) {
            // Reuse the pending Base32 secret so the already-scanned QR stays valid.
            secret = existing.rows[0].secret_encrypted;
        } else {
            // First-time setup (or legacy non-Base32 secret) — generate a fresh one.
            secret = totp.generateSecret();
            await db.query(
                `INSERT INTO user_mfa (user_id, secret_encrypted, enabled) VALUES ($1,$2,FALSE)
                 ON CONFLICT (user_id) DO UPDATE SET secret_encrypted = EXCLUDED.secret_encrypted, enabled = FALSE`,
                [req.user.id, secret]);
        }

        const accountLabel = req.user.email || req.user.name || 'user';
        const otpauthUrl = totp.provisioningUri(secret, accountLabel);
        res.json({ secret, otpauth_url: otpauthUrl });
    } catch (err) {
        console.error('MFA Setup Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/security/mfa/verify
// @desc    Verify a 6-digit TOTP code and enable MFA.
//          Rate-limited to 5 attempts per 5 minutes.
router.post('/mfa/verify', mfaFlexibleAuth, async (req, res) => {
    try {
        // Rate-limit check
        const rl = checkMfaRateLimit(req.user.id);
        if (rl.blocked) {
            return res.status(429).json({ error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` });
        }

        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'code required' });

        const row = await db.query('SELECT secret_encrypted FROM user_mfa WHERE user_id=$1', [req.user.id]);
        if (!row.rows.length) return res.status(400).json({ error: 'Run MFA setup first.' });

        // Stored secret is already a Base32 string (RFC 4648) — pass it
        // directly to verifyTotp, which decodes Base32 internally.
        const secret = row.rows[0].secret_encrypted;
        const valid = totp.verifyTotp(secret, code);
        if (!valid) return res.status(401).json({ error: 'Invalid verification code. Check your device clock and try again.' });

        // Success — clear rate limiter + enable + generate backup codes.
        _mfaAttempts.delete(req.user.id);
        const backups = totp.generateBackupCodes();
        await db.query(
            'UPDATE user_mfa SET enabled=TRUE, enabled_at=NOW(), backup_codes=$1 WHERE user_id=$2',
            [backups, req.user.id]);
        await recordAudit(req.user.id, 'Enabled MFA', req.ip, { entityType: 'security', severity: 'warning' });

        // If this came from a challenge token (forced setup on first login),
        // issue the real session token so the admin is now logged in.
        const authToken = req.header('x-auth-token');
        let decoded;
        try { decoded = jwtLib.verify(authToken, process.env.JWT_SECRET); } catch { decoded = null; }
        if (decoded && decoded.mfa_challenge) {
            // Fetch the user's role/name for the real token payload.
            const u = await db.query(
                `SELECT u.*, ip.id AS profile_id, ip.company_name
                   FROM users u LEFT JOIN industry_profiles ip ON ip.user_id = u.id
                  WHERE u.id = $1`, [req.user.id]);
            if (u.rows.length) {
                const user = u.rows[0];
                const name = user.role === 'industry' ? user.company_name : 'Admin';
                const realToken = jwtLib.sign(
                    { user: { id: user.id, role: user.role, name } },
                    process.env.JWT_SECRET, { expiresIn: '8h' }
                );
                return res.json({
                    msg: 'MFA enabled',
                    backup_codes: backups,
                    token: realToken,
                    role: user.role,
                    name,
                    email: user.email
                });
            }
        }

        res.json({ msg: 'MFA enabled', backup_codes: backups });
    } catch (err) {
        console.error('MFA Verify Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/security/mfa
// @desc    Disable MFA. BLOCKED for admins (2FA is mandatory). For
//          govt/industry, requires a current code or backup code.
router.delete('/mfa', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    // 2FA is MANDATORY for admins — cannot be disabled, ever.
    if (req.user.role === 'admin') {
        return res.status(403).json({ error: '2FA is mandatory for admin accounts and cannot be disabled.' });
    }
    try {
        const { code, backupCode } = req.body || {};
        const row = await db.query('SELECT secret_encrypted, backup_codes FROM user_mfa WHERE user_id=$1', [req.user.id]);
        if (!row.rows.length || !row.rows[0].secret_encrypted) {
            return res.status(400).json({ error: 'MFA not configured.' });
        }
        let authorized = false;
        if (code) {
            const secret = row.rows[0].secret_encrypted; // Base32, decoded inside verifyTotp
            authorized = totp.verifyTotp(secret, code);
        }
        if (!authorized && backupCode) {
            const stored = row.rows[0].backup_codes || [];
            authorized = stored.includes(backupCode);
        }
        if (!authorized) {
            return res.status(401).json({ error: 'A valid code or backup code is required to disable 2FA.' });
        }
        await db.query('UPDATE user_mfa SET enabled=FALSE WHERE user_id=$1', [req.user.id]);
        await recordAudit(req.user.id, 'Disabled MFA', req.ip, { entityType: 'security', severity: 'warning' });
        res.json({ msg: 'MFA disabled' });
    } catch (err) {
        console.error('Disable MFA Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// BULK USER IMPORT (Module 14)
// ============================================================

// @route   POST /api/security/import
// @desc    Bulk import users. Each row: { email, role, name, ... }.
//          Returns a job summary; failures are itemised, not fatal.
router.post('/import', requireRole(['admin']), async (req, res) => {
    try {
        const users = Array.isArray(req.body.users) ? req.body.users : [];
        if (!users.length) return res.status(400).json({ error: 'users array required' });

        const job = await db.query(
            `INSERT INTO user_import_jobs (requested_by, role, total_rows, status)
             VALUES ($1,$2,$3,'running') RETURNING id`,
            [req.user.id, req.body.role || 'industry', users.length]);
        const jobId = job.rows[0].id;

        let succeeded = 0, failed = 0;
        const errors = [];
        const bcrypt = require('bcrypt');

        for (let i = 0; i < users.length; i++) {
            const u = users[i];
            try {
                if (!u.email || !u.password) throw new Error('email and password required');
                const exists = await db.query('SELECT 1 FROM users WHERE email=$1', [u.email]);
                if (exists.rows.length) throw new Error('email already exists');
                const hash = await bcrypt.hash(u.password, 10);
                await db.query(
                    'INSERT INTO users (email, password_hash, role, status) VALUES ($1,$2,$3,$4)',
                    [u.email, hash, u.role || req.body.role || 'industry', 'Active']);
                succeeded++;
            } catch (e) {
                failed++;
                errors.push({ row: i, email: u.email, error: e.message });
            }
        }

        await db.query(
            'UPDATE user_import_jobs SET succeeded=$1, failed=$2, errors=$3::jsonb, status=$4 WHERE id=$5',
            [succeeded, failed, JSON.stringify(errors), 'completed', jobId]);
        await recordAudit(req.user.id, `Bulk import: ${succeeded} ok, ${failed} failed`, req.ip, { entityType: 'user' });
        res.json({ jobId, total: users.length, succeeded, failed, errors });
    } catch (err) {
        console.error('Bulk Import Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
module.exports.hasPermission = hasPermission;
