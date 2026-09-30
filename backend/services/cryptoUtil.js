// ============================================================
// cryptoUtil.js — symmetric secret encryption at rest (Phase 22).
//
// AES-256-GCM. Key source (first available):
//   1. ENCRYPTION_KEY env (recommended: 32+ random bytes hex/base64)
//   2. scrypt(JWT_SECRET, 'thozhirporul-secret-encryption') — so
//      every deployment has working encryption without new config.
//
// Ciphertext format: enc:v1:<iv-b64>:<tag-b64>:<data-b64>
// Legacy values without the prefix are treated as plaintext by
// callers (lazy migration: re-encrypted on next write).
// ============================================================

const crypto = require('crypto');

const PREFIX = 'enc:v1:';

let _keyCache = null;
function getKey() {
    if (_keyCache) return _keyCache;
    const raw = process.env.ENCRYPTION_KEY;
    if (raw) {
        const buf = /^[0-9a-fA-F]{64}$/.test(raw.trim())
            ? Buffer.from(raw.trim(), 'hex')
            : Buffer.from(raw);
        _keyCache = buf.length === 32 ? buf : crypto.scryptSync(raw, 'thozhirporul-secret-encryption', 32);
    } else {
        _keyCache = crypto.scryptSync(
            process.env.JWT_SECRET || 'insecure-dev-only', 'thozhirporul-secret-encryption', 32);
    }
    return _keyCache;
}

function encryptString(plaintext) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
    const data = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${data.toString('base64')}`;
}

function decryptString(ciphertext) {
    if (!String(ciphertext).startsWith(PREFIX)) return null; // not our format
    const [, , ivB64, tagB64, dataB64] = String(ciphertext).split(':');
    try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
        decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
        return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
    } catch (_) {
        return null;
    }
}

const isEncrypted = (v) => typeof v === 'string' && v.startsWith(PREFIX);

module.exports = { encryptString, decryptString, isEncrypted, PREFIX };
