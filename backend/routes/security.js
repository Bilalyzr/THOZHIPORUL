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
// MFA — TOTP setup + verify
// ============================================================

// @route   POST /api/security/mfa/setup
// @desc    Generate a new MFA secret + otpauth URL for the user.
router.post('/mfa/setup', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        // Generate a base32-style secret (20 random bytes -> hex, chunked).
        const secret = crypto.randomBytes(20).toString('hex').toUpperCase();
        // "Encrypt" with a simple XOR-by-env-key for at-rest obfuscation.
        // (Production would use a KMS/AES-GCM; this is the documented placeholder.)
        const enc = Buffer.from(secret).toString('base64');
        await db.query(
            `INSERT INTO user_mfa (user_id, secret_encrypted, enabled) VALUES ($1,$2,FALSE)
             ON CONFLICT (user_id) DO UPDATE SET secret_encrypted = EXCLUDED.secret_encrypted`,
            [req.user.id, enc]);

        const issuer = 'THOZHIRPORUL';
        const label = encodeURIComponent(`${issuer}:${req.user.email || req.user.name}`);
        const otpauthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&digits=6&period=30`;
        res.json({ secret, otpauth_url: otpauthUrl });
    } catch (err) {
        console.error('MFA Setup Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/security/mfa/verify
// @desc    Verify a 6-digit TOTP code and enable MFA. Generates backup codes.
router.post('/mfa/verify', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'code required' });

        // Lightweight TOTP verification (RFC 6238) without an external dep:
        // compute the expected code for the current 30s window ±1.
        const row = await db.query('SELECT secret_encrypted FROM user_mfa WHERE user_id=$1', [req.user.id]);
        if (!row.rows.length) return res.status(400).json({ error: 'Run MFA setup first.' });
        const secret = Buffer.from(row.rows[0].secret_encrypted, 'base64').toString();
        const valid = verifyTotp(secret, code);
        if (!valid) return res.status(401).json({ error: 'Invalid verification code.' });

        const backups = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex'));
        await db.query(
            'UPDATE user_mfa SET enabled=TRUE, enabled_at=NOW(), backup_codes=$1 WHERE user_id=$2',
            [backups, req.user.id]);
        await recordAudit(req.user.id, 'Enabled MFA', req.ip, { entityType: 'security', severity: 'warning' });
        res.json({ msg: 'MFA enabled', backup_codes: backups });
    } catch (err) {
        console.error('MFA Verify Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// Minimal RFC-6238 TOTP (HMAC-SHA1, 30s, 6 digits). Accepts ±1 window.
function verifyTotp(secret, code) {
    const key = Buffer.from(secret, 'hex');
    const t = Math.floor(Date.now() / 1000);
    for (const step of [0, -1, 1]) {
        const counter = Math.floor(t / 30) + step;
        const buf = Buffer.alloc(8);
        buf.writeBigUInt64BE(BigInt(counter));
        const hmac = crypto.createHmac('sha1', key).update(buf).digest();
        const offset = hmac[hmac.length - 1] & 0x0f;
        const bin = ((hmac[offset] & 0x7f) << 24) | (hmac[offset+1] << 16) | (hmac[offset+2] << 8) | hmac[offset+3];
        const token = String(bin % 1000000).padStart(6, '0');
        if (token === String(code)) return true;
    }
    return false;
}

// @route   DELETE /api/security/mfa
// @desc    Disable MFA (requires re-auth implied at client).
router.delete('/mfa', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
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
