// ============================================================
// totp.js — Shared TOTP (RFC 6238) utilities.
//
// Used by BOTH auth.js (login verify-mfa) and security.js (setup/
// enable/disable). Single source of truth for TOTP logic.
//
// SECRET FORMAT: secrets are stored and exchanged in **Base32**
// (RFC 4648), the format required by the otpauth:// provisioning
// URI standard and ALL authenticator apps (Microsoft, Google,
// Authy, etc.). This is critical — authenticators cannot decode a
// raw hex secret; using hex silently produces mismatched codes.
//
// Zero external dependencies — uses Node's built-in crypto module.
// ============================================================

const crypto = require('crypto');

const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Base32-encode a Buffer (RFC 4648, no padding).
 */
function base32Encode(buf) {
    let bits = 0, value = 0, output = '';
    for (const byte of buf) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            output += B32_ALPHABET[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) {
        output += B32_ALPHABET[(value << (5 - bits)) & 31];
    }
    return output;
}

/**
 * Base32-decode a string (RFC 4648) into a Buffer.
 * Tolerates whitespace and ignores trailing '=' padding.
 */
function base32Decode(str) {
    const clean = String(str).replace(/[\s=]/g, '').toUpperCase();
    let bits = 0, value = 0, bytes = [];
    for (const ch of clean) {
        const idx = B32_ALPHABET.indexOf(ch);
        if (idx === -1) throw new Error(`Invalid Base32 char: ${ch}`);
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }
    return Buffer.from(bytes);
}

/**
 * Generate a fresh TOTP secret.
 * 20 random bytes → Base32 (32 chars). This is the exact format
 * Microsoft Authenticator, Google Authenticator, etc. expect.
 * @returns {string} Base32 secret (32 chars)
 */
function generateSecret() {
    return base32Encode(crypto.randomBytes(20));
}

/**
 * Build the otpauth:// provisioning URI that QR codes encode.
 * The `secret` MUST already be Base32 (per the otpauth standard).
 */
function provisioningUri(secret, accountLabel, issuer = 'THOZHIPORUL') {
    const label = encodeURIComponent(`${issuer}:${accountLabel}`);
    return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generate 8 single-use backup codes (hex, for recovery).
 */
function generateBackupCodes() {
    return Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex'));
}

/**
 * Verify a 6-digit TOTP code against the Base32 secret.
 * Accepts the current 30s window ±2 (5 windows = ~150s tolerance)
 * to accommodate realistic clock drift between phones and servers.
 *
 * @param {string} secret  Base32 secret (32 chars)
 * @param {string} code    6-digit code from the authenticator app
 * @returns {boolean}
 */
function verifyTotp(secret, code) {
    if (!secret || !code) return false;
    let key;
    try { key = base32Decode(secret); }
    catch { return false; } // malformed stored secret — never accept
    const t = Math.floor(Date.now() / 1000);
    for (const step of [0, -1, 1, -2, 2]) {
        const counter = Math.floor(t / 30) + step;
        const buf = Buffer.alloc(8);
        buf.writeBigUInt64BE(BigInt(counter));
        const hmac = crypto.createHmac('sha1', key).update(buf).digest();
        const offset = hmac[hmac.length - 1] & 0x0f;
        const bin = ((hmac[offset] & 0x7f) << 24) |
                    (hmac[offset + 1] << 16) |
                    (hmac[offset + 2] << 8) |
                     hmac[offset + 3];
        const token = String(bin % 1000000).padStart(6, '0');
        if (token === String(code)) return true;
    }
    return false;
}

module.exports = {
    generateSecret, provisioningUri, generateBackupCodes, verifyTotp,
    base32Encode, base32Decode
};
