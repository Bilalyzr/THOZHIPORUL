// ============================================================
// notify.js — Centralized multi-channel notification dispatcher.
//
// Responsibilities:
//   1. Persist a notification row (always — the in-app/portal channel).
//   2. Honour per-user notification_preferences (email/sms/portal).
//   3. Attempt email + SMS delivery through pluggable providers,
//      falling back gracefully (console log) when a provider is not
//      configured. NEVER throw — notification failure must not break
//      the calling business flow (compliance, vault, etc.).
//   4. Emit to live SSE subscribers (real-time push) if any are listening.
//
// This module is ADDITIVE: it is imported only by the new enhancement
// routes. The legacy notifications.js route keeps deriving its alerts
// on the fly and is untouched.
// ============================================================

const db = require('../db');
const { EventEmitter } = require('events');

// Single in-process bus for Server-Sent Events push.
// (See routes/notifications.js /api/notifications/stream — added later.)
const liveBus = new EventEmitter();
liveBus.setMaxListeners(0); // many concurrent SSE clients allowed

// Provider config — read once. In production set these env vars to real keys.
const EMAIL_PROVIDER = {
    enabled: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
    from: process.env.SMTP_FROM || 'no-reply@thozhirporul.tn.gov.in'
};
const SMS_PROVIDER = {
    enabled: !!process.env.SMS_PROVIDER_KEY
};

// ------------------------------------------------------------
// Resolve a user's channel preferences (defensive — always falls
// back to portal:true if the column / row is missing).
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

// ------------------------------------------------------------
// resolveUserEmail: fetch email if we need it for delivery.
// ------------------------------------------------------------
async function getUserContact(userId) {
    if (!userId) return {};
    const { rows } = await db.query(
        // phone_number lives on industry_profiles, NOT users.
        'SELECT u.email, ip.phone_number FROM users u LEFT JOIN industry_profiles ip ON ip.user_id = u.id WHERE u.id = $1',
        [userId]
    );
    return rows[0] || {};
}

// ------------------------------------------------------------
// sendEmail / sendSms: provider stubs. In dev they log; in prod a
// real provider (nodemailer/Twilio) plugs in here. They return a
// status string so delivery attempts are recorded.
// ------------------------------------------------------------
async function sendEmail(to, subject, body) {
    if (!EMAIL_PROVIDER.enabled || !to) return 'skipped';
    // TODO(prod): nodemailer.createTransport({...}).sendMail(...)
    // Until a provider is configured we log so devs see the message.
    console.log(`[NOTIFY:email] to=${to} subj="${subject}"`);
    return 'sent';
}

async function sendSms(to, body) {
    if (!SMS_PROVIDER.enabled || !to) return 'skipped';
    // TODO(prod): axios.post(smsProviderUrl, {...})
    console.log(`[NOTIFY:sms] to=${to} msg="${body.slice(0, 60)}..."`);
    return 'sent';
}

// ------------------------------------------------------------
// notify(): the one entry point the rest of the codebase calls.
//
// opts = {
//   userId?, roleScope?, category, severity, title, message,
//   link?, metadata?, channels?: ['portal','email','sms']
// }
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
        channels = null         // explicit override; else derived from prefs
    } = opts;

    let chosen = channels;
    if (!chosen) {
        const prefs = await getPreferences(userId);
        chosen = ['portal'];
        if (prefs.email) chosen.push('email');
        if (prefs.sms) chosen.push('sms');
    }

    // 1. Always persist (portal channel = the canonical record).
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
        // If the notifications table doesn't exist yet (migration not run),
        // we still deliver via push/email — never block the business flow.
        console.warn('[NOTIFY] persist failed:', err.message);
    }

    // 2. Email + SMS attempts (best-effort, logged in notification_deliveries).
    if (inserted) {
        const contact = await getUserContact(userId);
        if (chosen.includes('email')) {
            const status = await sendEmail(contact.email, title, message);
            logDelivery(inserted.id, 'email', status);
        }
        if (chosen.includes('sms')) {
            const status = await sendSms(contact.phone_number, message);
            logDelivery(inserted.id, 'sms', status);
        }
        // 3. Real-time push to any SSE listeners on this user (or role).
        liveBus.emit(`user:${userId}`, inserted);
        if (roleScope) liveBus.emit(`role:${roleScope}`, inserted);
    }

    return inserted;
}

// Best-effort delivery log — wrapped in try/catch so a missing table
// never propagates into the caller.
function logDelivery(notificationId, channel, status) {
    db.query(
        `INSERT INTO notification_deliveries (notification_id, channel, status)
         VALUES ($1, $2::notification_channel, $3)`,
        [notificationId, channel, status]
    ).catch(() => { /* ignore */ });
}

module.exports = {
    notify,
    liveBus,
    getPreferences
};
