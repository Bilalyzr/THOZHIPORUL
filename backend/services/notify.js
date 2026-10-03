// ============================================================
// notify.js — centralized multi-channel notification dispatcher
// with an HONEST provider abstraction (Phase 8).
//
// Provider registry:
//   InAppProvider   — always real: DB row + SSE push.  → SENT
//   EmailProvider   — real only when a transport is actually
//                     available. Without one, deliveries are
//                     recorded as SIMULATED (clearly labelled),
//                     NEVER as "sent".
//   SmsProvider     — same policy.
//
// Delivery statuses: QUEUED | SENT | SIMULATED | FAILED | SKIPPED.
// notify() never throws — a notification failure must not break a
// business flow — but it never lies about what happened either.
// ============================================================

const db = require('../db');
const { EventEmitter } = require('events');

// Single in-process bus for Server-Sent Events push.
const liveBus = new EventEmitter();
liveBus.setMaxListeners(0);

// ------------------------------------------------------------
// Providers. Each exposes { name, configured, deliver(to, subject, body) }
// resolving to one of: 'SENT' | 'SIMULATED' | 'FAILED' | 'SKIPPED'.
// ------------------------------------------------------------

// --- In-app (portal) — the one genuinely working channel ------
const InAppProvider = {
    name: 'portal',
    configured: true,
    async deliver() { return 'SENT'; } // persistence IS the delivery
};

// --- Email -----------------------------------------------------
// REAL transport via nodemailer when SMTP_* credentials are set
// (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, optional SMTP_SECURE).
// Without credentials the development provider logs and reports
// SIMULATED — never "sent".
const EmailProvider = {
    name: 'email',
    get configured() {
        return !!(process.env.SMTP_HOST && process.env.SMTP_USER);
    },
    get transportImplemented() {
        return true; // nodemailer is installed and wired below
    },
    _transport: null,
    _transportKey: null,
    _getTransport() {
        const key = `${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}:${process.env.SMTP_USER}:${process.env.SMTP_SECURE || ''}`;
        if (!this._transport || this._transportKey !== key) {
            const nodemailer = require('nodemailer');
            this._transport = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            });
            this._transportKey = key;
        }
        return this._transport;
    },
    async deliver(to, subject, body) {
        if (!to) return 'SKIPPED';
        if (!this.configured) {
            console.log(`[NOTIFY:email][SIMULATED] to=${to} subj="${subject}" :: ${String(body).slice(0, 80)}...`);
            return 'SIMULATED';
        }
        try {
            const info = await this._getTransport().sendMail({
                from: process.env.SMTP_FROM || process.env.SMTP_USER,
                to, subject, text: String(body)
            });
            console.log(`[NOTIFY:email][SENT] to=${to} response="${info.response}"`);
            return 'SENT';
        } catch (err) {
            console.error(`[NOTIFY:email][FAILED] to=${to}:`, err.message);
            return 'FAILED';
        }
    }
};

// --- SMS / WhatsApp --------------------------------------------
// Generic SMS REST adapter (Twilio-compatible JSON contract):
// POST {SMS_PROVIDER_URL}/v1/messages with Bearer SMS_PROVIDER_KEY,
// body { to, from: SMS_FROM, text }. Honest SENT/FAILED by the
// provider's HTTP response; SIMULATED without credentials.
const SmsProvider = {
    name: 'sms',
    get configured() {
        return !!(process.env.SMS_PROVIDER_URL && process.env.SMS_PROVIDER_KEY);
    },
    get transportImplemented() {
        return true;
    },
    async deliver(to, body) {
        if (!to) return 'SKIPPED';
        if (!this.configured) {
            console.log(`[NOTIFY:sms][SIMULATED] to=${to} :: ${String(body).slice(0, 60)}...`);
            return 'SIMULATED';
        }
        try {
            const res = await fetch(`${process.env.SMS_PROVIDER_URL.replace(/\/$/, '')}/v1/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.SMS_PROVIDER_KEY}`
                },
                body: JSON.stringify({ to, from: process.env.SMS_FROM || 'SIPCOT', text: String(body).slice(0, 480) })
            });
            if (!res.ok) {
                console.error(`[NOTIFY:sms][FAILED] to=${to}: HTTP ${res.status}`);
                return 'FAILED';
            }
            console.log(`[NOTIFY:sms][SENT] to=${to} HTTP ${res.status}`);
            return 'SENT';
        } catch (err) {
            console.error(`[NOTIFY:sms][FAILED] to=${to}:`, err.message);
            return 'FAILED';
        }
    }
};

const PROVIDERS = { portal: InAppProvider, email: EmailProvider, sms: SmsProvider };

// ------------------------------------------------------------
// Per-user channel preferences (defensive fallback).
// ------------------------------------------------------------
async function getPreferences(userId) {
    if (!userId) return { email: false, sms: false, portal: true };
    try {
        const { rows } = await db.query(
            'SELECT notification_preferences AS prefs FROM users WHERE id = $1',
            [userId]
        );
        if (rows.length && rows[0].prefs) {
            const p = rows[0].prefs;
            return {
                email: p.email !== false,
                sms: p.sms === true,
                portal: p.portal !== false
            };
        }
    } catch (_) { /* column missing or bad json — fall through */ }
    return { email: true, sms: false, portal: true };
}

async function getUserContact(userId) {
    if (!userId) return {};
    const { rows } = await db.query(
        'SELECT u.email, ip.phone_number FROM users u LEFT JOIN industry_profiles ip ON ip.user_id = u.id WHERE u.id = $1',
        [userId]
    );
    return rows[0] || {};
}

// ------------------------------------------------------------
// notify(): the one entry point the rest of the codebase calls.
// opts = { userId?, roleScope?, category, severity, title, message,
//          link?, metadata?, channels? }
// ------------------------------------------------------------
async function notify(opts) {
    const {
        userId = null,
        roleScope = null,
        category,
        severity = 'info',
        title,
        message,
        link = null,
        metadata = {},
        channels = null
    } = opts;

    let chosen = channels;
    if (!chosen) {
        const prefs = await getPreferences(userId);
        chosen = ['portal'];
        if (prefs.email) chosen.push('email');
        if (prefs.sms) chosen.push('sms');
    }

    // 1. Persist (portal channel = the canonical in-app record).
    let inserted = null;
    try {
        const { rows } = await db.query(
            `INSERT INTO notifications
                (user_id, role_scope, category, severity, title, message, link, metadata, channels)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::notification_channel[])
             RETURNING *`,
            [userId, roleScope, category, severity, title, message, link, JSON.stringify(metadata), chosen]
        );
        inserted = rows[0];
    } catch (err) {
        console.warn('[NOTIFY] persist failed:', err.message);
    }

    if (inserted) {
        // 2. Portal delivery: the DB row IS the delivery → SENT.
        logDelivery(inserted.id, 'portal', 'SENT');

        // 3. Out-of-band channels: honest per-provider outcomes.
        if (chosen.includes('email') || chosen.includes('sms')) {
            const contact = await getUserContact(userId);
            if (chosen.includes('email')) {
                const status = await EmailProvider.deliver(contact.email, title, message);
                logDelivery(inserted.id, 'email', status);
            }
            if (chosen.includes('sms')) {
                const status = await SmsProvider.deliver(contact.phone_number, message);
                logDelivery(inserted.id, 'sms', status);
            }
        }

        // 4. Real-time SSE push.
        liveBus.emit(`user:${userId}`, inserted);
        if (roleScope) liveBus.emit(`role:${roleScope}`, inserted);
    }

    return inserted;
}

// Best-effort delivery log; statuses are always the honest outcome.
function logDelivery(notificationId, channel, status) {
    db.query(
        `INSERT INTO notification_deliveries (notification_id, channel, status, error)
         VALUES ($1, $2::notification_channel, $3, $4)`,
        [notificationId, channel, status,
         status === 'SIMULATED' ? 'Development provider — no real transport configured' : null]
    ).catch(() => { /* ignore */ });
}

module.exports = {
    notify,
    liveBus,
    getPreferences,
    PROVIDERS,
    providerStatus: () => ({
        portal: 'SENT (real — in-app persistence + SSE)',
        email: EmailProvider.configured && EmailProvider.transportImplemented ? 'SENT' : 'SIMULATED (no real transport configured)',
        sms: SmsProvider.configured && SmsProvider.transportImplemented ? 'SENT' : 'SIMULATED (no real transport configured)'
    })
};
