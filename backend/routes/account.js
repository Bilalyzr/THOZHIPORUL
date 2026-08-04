// ============================================================
// account.js — unified Profile + Settings for ALL roles.
//
// Mounted at /api/account. ADDITIVE — the existing industry-only
// /api/workspace/profile stays untouched; this is a superset that
// works for admin, govt AND industry. Every endpoint is "self only":
// the caller can read/update their own record (authenticated), no
// role gate beyond that.
//
// Profile : /api/account/profile  (GET read, PUT update)
// Settings: /api/account/settings (GET read, PUT update)
//   - notification preferences (email/sms/portal) -> users.notification_preferences
//   - theme + language                          -> user_dashboard_prefs.preferences
// ============================================================

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');

// ============================================================
// PROFILE — read
// ============================================================
router.get('/profile', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const u = await db.query('SELECT id, email, role, status FROM users WHERE id = $1', [req.user.id]);
        if (!u.rows.length) return res.status(404).json({ error: 'User not found.' });

        const out = {
            id: u.rows[0].id,
            email: u.rows[0].email,
            role: u.rows[0].role,
            status: u.rows[0].status
        };

        if (u.rows[0].role === 'industry') {
            const p = await db.query(
                `SELECT ip.id AS profile_id, ip.company_name, ip.industry_type, ip.location,
                        ip.contact_person, ip.phone_number, ip.compliance_score,
                        ip.total_investment_cr, ip.total_employees,
                        pk.name AS park_name, pp.plot_number
                   FROM industry_profiles ip
              LEFT JOIN industrial_parks pk ON pk.id = ip.park_id
              LEFT JOIN park_plots pp ON pp.id = ip.plot_id
                  WHERE ip.user_id = $1`, [req.user.id]);
            if (p.rows.length) Object.assign(out, {
                profileId: p.rows[0].profile_id,
                companyName: p.rows[0].company_name,
                industryType: p.rows[0].industry_type,
                location: p.rows[0].location,
                contactPerson: p.rows[0].contact_person,
                phoneNumber: p.rows[0].phone_number,
                complianceScore: p.rows[0].compliance_score,
                totalInvestmentCr: p.rows[0].total_investment_cr,
                totalEmployees: p.rows[0].total_employees,
                parkName: p.rows[0].park_name,
                plotNumber: p.rows[0].plot_number
            });
        } else if (u.rows[0].role === 'govt') {
            const g = await db.query(
                `SELECT officer_name, designation, department, jurisdiction
                   FROM govt_profiles WHERE user_id = $1`, [req.user.id]);
            if (g.rows.length) Object.assign(out, {
                officerName: g.rows[0].officer_name,
                designation: g.rows[0].designation,
                department: g.rows[0].department,
                jurisdiction: g.rows[0].jurisdiction
            });
        } else {
            // admin — minimal identity. Surface a friendly "name".
            out.name = 'Administrator';
        }

        res.json(out);
    } catch (err) {
        console.error('Account Profile GET Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// PROFILE — update (per-role editable fields)
// ============================================================
router.put('/profile', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const role = req.user.role;
        if (role === 'industry') {
            const { companyName, industryType, location, contactPerson, phoneNumber } = req.body;
            if (!contactPerson || !phoneNumber) {
                return res.status(400).json({ error: 'Contact person and phone number are required.' });
            }
            await db.query(
                `UPDATE industry_profiles
                    SET company_name   = COALESCE($1, company_name),
                        industry_type  = COALESCE($2, industry_type),
                        location       = COALESCE($3, location),
                        contact_person = $4,
                        phone_number   = $5
                  WHERE user_id = $6`,
                [companyName || null, industryType || null, location || null,
                 contactPerson, phoneNumber, req.user.id]
            );
        } else if (role === 'govt') {
            const { officerName, designation, department, jurisdiction } = req.body;
            if (!officerName) return res.status(400).json({ error: 'Officer name is required.' });
            await db.query(
                `UPDATE govt_profiles
                    SET officer_name = $1,
                        designation  = COALESCE($2, designation),
                        department   = COALESCE($3, department),
                        jurisdiction = COALESCE($4, jurisdiction)
                  WHERE user_id = $5`,
                [officerName, designation || null, department || null, jurisdiction || null, req.user.id]
            );
        }
        // admin: no editable profile fields beyond email (handled by a password-change flow elsewhere).

        try {
            await db.query('INSERT INTO audit_logs (user_id, action) VALUES ($1, $2)', [req.user.id, 'Updated own profile']);
        } catch (_) {}
        res.json({ msg: 'Profile updated successfully' });
    } catch (err) {
        console.error('Account Profile PUT Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// SETTINGS — read (notification prefs + theme/language)
// ============================================================
router.get('/settings', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const u = await db.query('SELECT notification_preferences AS prefs FROM users WHERE id = $1', [req.user.id]);
        const notifPrefs = (u.rows.length && u.rows[0].prefs)
            ? u.rows[0].prefs
            : { email: true, sms: false, portal: true };

        // theme + language live in the dashboard-prefs JSONB (v3 migration).
        let ui = { theme: 'light', language: 'en' };
        try {
            const d = await db.query('SELECT preferences FROM user_dashboard_prefs WHERE user_id = $1', [req.user.id]);
            if (d.rows.length && d.rows[0].preferences) ui = { ...ui, ...d.rows[0].preferences };
        } catch (_) { /* table absent pre-v3 — defaults stand */ }

        res.json({ notifications: notifPrefs, ui });
    } catch (err) {
        console.error('Account Settings GET Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// SETTINGS — update
// ============================================================
router.put('/settings', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    const { notifications, ui } = req.body;
    const saved = { notifications: false, ui: false };

    // 1. Notification preferences — primary store (users.notification_preferences).
    if (notifications) {
        try {
            const prefs = {
                email: notifications.email !== false,
                sms: notifications.sms === true,
                portal: notifications.portal !== false
            };
            await db.query('UPDATE users SET notification_preferences = $1::jsonb WHERE id = $2', [JSON.stringify(prefs), req.user.id]);
            saved.notifications = true;
        } catch (err) {
            console.error('Account Settings PUT (notifications) Error:', err.message);
        }
    }

    // 2. UI prefs (theme/language) — stored in user_dashboard_prefs (v3 migration).
    // Wrapped independently so a missing table never fails the whole save.
    if (ui) {
        try {
            const prefs = {
                theme: ui.theme === 'dark' ? 'dark' : 'light',
                language: ui.language === 'ta' ? 'ta' : 'en'
            };
            await db.query(
                `INSERT INTO user_dashboard_prefs (user_id, preferences)
                 VALUES ($1, $2::jsonb)
                 ON CONFLICT (user_id) DO UPDATE SET preferences = $2::jsonb, updated_at = NOW()`,
                [req.user.id, JSON.stringify(prefs)]
            );
            saved.ui = true;
        } catch (err) {
            // Non-fatal: the UI still works with session-level defaults.
            console.warn('Account Settings PUT (ui prefs) skipped:', err.message);
        }
    }

    res.json({ msg: 'Settings saved successfully', saved });
});

// ============================================================
// PASSWORD — change (current → new)
// ============================================================
router.put('/password', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new passwords are required.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters.' });
        }
        const bcrypt = require('bcrypt');
        const u = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
        if (!u.rows.length) return res.status(404).json({ error: 'User not found.' });

        // Verify current password (handle demo hash gracefully).
        const hash = u.rows[0].password_hash;
        let isMatch = false;
        if (hash === '$demo$') {
            isMatch = true; // demo accounts accept any current password
        } else {
            isMatch = await bcrypt.compare(currentPassword, hash);
        }
        if (!isMatch) return res.status(401).json({ error: 'Current password is incorrect.' });

        const newHash = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);
        try {
            await db.query('INSERT INTO audit_logs (user_id, action, severity) VALUES ($1, $2, $3)',
                [req.user.id, 'Changed account password', 'warning']);
        } catch (_) {}
        res.json({ msg: 'Password changed successfully.' });
    } catch (err) {
        console.error('Password Change Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
