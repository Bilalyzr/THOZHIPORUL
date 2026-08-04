require('dotenv').config();

// Validate required environment variables on startup (env-config.md workflows)
const requiredEnv = ['DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
    console.error(`[SERVER] [FATAL] Startup failed. Missing required environment variables: ${missingEnv.join(', ')}`);
    console.error('[SERVER] Refer to .env.example to configure the required variables. Exiting...');
    process.exit(1);
}

// Production-only JWT_SECRET strength check. A weak/guessable secret lets an
// attacker forge admin tokens, so we refuse to boot in production with one.
const WEAK_SECRETS = new Set([
    'sipcot_sims_super_secret_key_2026',
    'your_long_random_jwt_secret_here',
    'dev_only_insecure_secret_do_not_use_in_prod',
    'secret', 'changeme', 'password',
]);
if (process.env.NODE_ENV === 'production') {
    const secret = process.env.JWT_SECRET;
    if (secret.length < 32) {
        console.error('[SERVER] [FATAL] JWT_SECRET must be at least 32 characters in production.');
        process.exit(1);
    }
    if (WEAK_SECRETS.has(secret)) {
        console.error('[SERVER] [FATAL] JWT_SECRET matches a known weak value. Generate a strong, unique secret.');
        process.exit(1);
    }
}

// Refuse to boot in production if demo login is enabled — seed accounts with
// the '$demo$' placeholder hash accept any password when this is true.
if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEMO_LOGIN === 'true') {
    console.error('[SERVER] [FATAL] ENABLE_DEMO_LOGIN must be false in production.');
    process.exit(1);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5001;
const IS_PROD = process.env.NODE_ENV === 'production';

// Trust the reverse proxy (Caddy/Nginx) so req.ip captures the real client
// IP — critical for audit logs and rate limiting behind a load balancer.
app.set('trust proxy', 1);

// Security headers. In production, enable HSTS (forces HTTPS for 1 year).
app.use(helmet(
    IS_PROD ? { hsts: { maxAge: 31536000, includeSubDomains: true, preload: true } } : {}
));

// Force HTTPS in production (behind Caddy/Nginx). The proxy sets
// X-Forwarded-Proto; if it's http, redirect to the https equivalent.
if (IS_PROD) {
    app.use((req, res, next) => {
        if (req.headers['x-forwarded-proto'] === 'http') {
            return res.redirect(301, `https://${req.headers.host}${req.url}`);
        }
        next();
    });
}

// CORS — restrict to configured frontend origins. In production, reject '*'.
const allowedOrigins = (process.env.CORS_ORIGIN ||
    'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://localhost:3000')
    .split(',').map(s => s.trim());
if (IS_PROD && allowedOrigins.includes('*')) {
    console.error('[SERVER] [FATAL] CORS_ORIGIN cannot be "*" in production. Exiting.');
    process.exit(1);
}
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
}));

app.use(express.json());

// Global rate limiter — protects ALL /api routes from abuse/DoS.
// 300 requests per 5 minutes per IP (generous enough for normal use,
// tight enough to stop a flood). Stricter limiters apply to /api/auth.
const globalLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please slow down.' },
});
app.use('/api/', globalLimiter);

// Stricter limiter on auth endpoints — slows brute-force / credential stuffing.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,                  // per IP per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts. Please try again in a few minutes.' }
});

// Basic Route
app.get('/', (req, res) => {
    res.json({ message: 'SIMS Backend API Running' });
});

// Health check — verifies DB connectivity (used for uptime monitoring / demos)
app.get('/api/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
    } catch (err) {
        // Don't leak DB error details on a public endpoint.
        res.status(503).json({ status: 'degraded', database: 'disconnected' });
    }
});

// NOTE: The public /uploads static mount was REMOVED for security — it let
// anyone download vault files by guessing filenames. Files are now served
// ONLY through the authenticated /api/workspace/documents/:id/download
// route, which checks ownership before streaming the file.

// ----------------------------------------------------------------
// Ensure every documents row has a real, downloadable file on disk.
// The legacy seed.sql inserts document metadata with fake paths
// (e.g. /uploads/gst_reg_abc.pdf) that were never actual files, which
// made the Secure Vault download button 404. On boot we scan for any
// row whose target file is missing and write a small valid placeholder
// PDF for it. Idempotent: rows whose file already exists are skipped,
// and new uploads (which always create real files) are never touched.
// ----------------------------------------------------------------
const fs = require('fs');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
async function ensureSeedDocuments() {
    try {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        const { rows } = await db.query('SELECT id, file_name, file_path, category FROM documents');
        let created = 0;
        for (const d of rows) {
            const diskName = path.basename(d.file_path || '');
            if (!diskName) continue;
            const abs = path.join(UPLOADS_DIR, diskName);
            if (fs.existsSync(abs)) continue;             // real file present (new uploads)

            // Build a minimal valid PDF whose visible text describes the doc.
            const label = (d.file_name || diskName).replace(/([()\\])/g, '\\$1');
            const cat = String(d.category || 'document').replace(/_/g, ' ');
            const lines = [
                'THOZHIRPORUL - Secure Vault (System-Seeded Document)',
                '',
                `File: ${label}`,
                `Category: ${cat}`,
                `Document ID: ${d.id}`,
                '',
                'This is an auto-generated placeholder so the record remains',
                'downloadable. Replace it by uploading the real certificate.'
            ];
            const textBody = lines.map(l => `(${l}) Tj 0 -16 Td`).join('\n');
            const content = `BT /F1 11 Tf 50 780 Td\n${textBody}\nET`;
            const objects = [
                '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
                '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
                '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
                `4 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
                '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj'
            ];
            const pdf = `%PDF-1.4\n${objects.join('\n')}\ntrailer << /Root 1 0 R /Size 6 >>\n%%EOF`;
            fs.writeFileSync(abs, pdf, 'utf8');
            created++;
        }
        if (created > 0) console.log(`[VAULT] Generated ${created} placeholder file(s) for legacy seed documents.`);
    } catch (err) {
        // Non-fatal: a missing DB or table just means nothing to seed.
        console.warn('[VAULT] Seed document check skipped:', err.message);
    }
}

// ----------------------------------------------------------------
// Ensure the users table has a `name` column (additive). Several
// enhancement routes join `users.name` for display (officer name,
// audit actor, etc.), but the base schema only stores email/role and
// derives the name at login. This guarded ALTER + backfill makes those
// joins work on every DB without requiring a manual migration. Safe to
// re-run (IF NOT EXISTS + only backfills NULL names).
// ----------------------------------------------------------------
async function ensureUsersNameColumn() {
    try {
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255)`);
        // Backfill from the role-specific profile tables where name is NULL.
        await db.query(`
            UPDATE users u SET name = ip.company_name
              FROM industry_profiles ip
             WHERE ip.user_id = u.id AND (u.name IS NULL OR u.name = '')`);
        await db.query(`
            UPDATE users u SET name = gp.officer_name
              FROM govt_profiles gp
             WHERE gp.user_id = u.id AND (u.name IS NULL OR u.name = '')`);
        // Admins (and anyone else) get a friendly default from their email.
        await db.query(`
            UPDATE users SET name = split_part(email, '@', 1)
             WHERE (name IS NULL OR name = '')`);
    } catch (err) {
        console.warn('[BOOT] users.name column check skipped:', err.message);
    }
}

// ----------------------------------------------------------------
// Apply an idempotent SQL migration at boot, if not already done.
// Each migration file is fully idempotent — every CREATE is IF NOT
// EXISTS, every ALTER column is wrapped in a DO/EXCEPTION guard, every
// seed uses ON CONFLICT DO NOTHING — so it is safe to run on every
// startup. This eliminates a whole class of "missing table/column →
// 500" runtime bugs without requiring a manual psql step.
//
// Implementation note: we cannot split the file on ';' because the
// migrations contain DO $$ ... END $$ blocks (each with internal
// semicolons). Instead we grab a dedicated pooled client and send the
// whole script in one connection.query() — the underlying libpq
// supports multi-statement execution. Wrapped so any failure is
// non-fatal to server boot.
// ----------------------------------------------------------------
async function applyMigration(label, filename) {
    let client;
    try {
        const sqlPath = path.join(__dirname, filename);
        if (!fs.existsSync(sqlPath)) return; // file removed in a slim build
        const sql = fs.readFileSync(sqlPath, 'utf8');
        client = await db.pool.connect();
        await client.query(sql);
        console.log(`[BOOT] ${label} migration applied successfully.`);
    } catch (err) {
        const m = (err.message || '').toLowerCase();
        if (m.includes('already exists')) {
            console.log(`[BOOT] ${label} already present (already-exists).`);
        } else {
            console.warn(`[BOOT] ${label} migration skipped:`, err.message);
        }
    } finally {
        if (client) client.release();
    }
}

// Convenience wrappers for each migration (order matters: v3 -> v4 -> v5).
const applyGrievancesMigration = () => applyMigration('grievances', 'migrations_grievances.sql');
const applyV3Migration = () => applyMigration('v3 enhancements', 'schema_v3_enhancements.sql');
const applyV4Migration = () => applyMigration('v4 research (Tier 1)', 'schema_v4_research.sql');
const applyV4bMigration = () => applyMigration('v4b real tenants', 'schema_v4b_realtenants.sql');
const applyV5Migration = () => applyMigration('v5 Tier 2 (allottee lifecycle)', 'schema_v5_tier2.sql');
const applyV6Migration = () => applyMigration('v6 Tier 3 (strategic)', 'schema_v6_tier3.sql');

// Auth Routes
const auth = require('./routes/auth');
app.use('/api/auth', authLimiter, auth.router);

// Core Business Routes
app.use('/api/industries', require('./routes/industries'));
app.use('/api/submissions', require('./routes/submissions'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/users', require('./routes/users'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/audit', require('./routes/audit'));

// Industrial OS v2 Routes
app.use('/api/public', require('./routes/public'));
app.use('/api/parks', require('./routes/parks'));
app.use('/api/services', require('./routes/services'));
app.use('/api/command', require('./routes/command'));
app.use('/api/compliance', require('./routes/compliance'));
app.use('/api/workspace', require('./routes/workspace'));

// Advanced / Integrations
app.use('/api/ai-decisions', require('./routes/ai-decisions'));
app.use('/api/workflow', require('./routes/workflow-automation'));
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/grievances', require('./routes/grievances'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/sipcot-sync', require('./routes/sipcot-sync'));

// Enhancements (v3) — additive routes from EXISTING_FEATURES_ENHANCEMENTS roadmap.
// Each is a NEW mount path; no existing route is changed.
app.use('/api/vault', require('./routes/vault'));
app.use('/api/scheduled-reports', require('./routes/scheduled-reports'));
app.use('/api/notifications-v2', require('./routes/notifications-enhanced'));
app.use('/api/search', require('./routes/search'));
app.use('/api/i18n', require('./routes/i18n-routes'));
// Unified Profile + Settings (works for admin/govt/industry).
app.use('/api/account', require('./routes/account'));
// Research-grounded Tier 1 (committed-vs-actual, CSR, GST, quotas).
app.use('/api/research', require('./routes/research'));
// Tier 2 allottee lifecycle (billing, queries, inspections HO, incentives, MD escalation).
app.use('/api/lifecycle', require('./routes/lifecycle'));
// Tier 3 strategic (circulars, gov integrations, directory, tier access, Inaippagam).
app.use('/api/strategy', require('./routes/strategy'));
app.use('/api/assistant', require('./routes/ai-assistant'));
app.use('/api/gis', require('./routes/gis'));
app.use('/api/inspections', require('./routes/inspections'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/security', require('./routes/security'));

// Background scheduler — starts SLA escalation, doc-expiry reminders,
// scheduled-report generation, and subscription dunning jobs. Safe to
// start at any time: each job no-ops until its backing table exists.
require('./services/scheduler').start();

// Protected Test Route Ensure RBAC System is functional
app.get('/api/admin-test', auth.requireRole(['admin']), (req, res) => {
    res.json({ message: "Admin Access Granted" });
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================
app.use((err, req, res, next) => {
    console.error('[SERVER] Unhandled Error:', err);
    res.status(500).json({ 
        error: 'Something went wrong on our end!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`[SERVER] Sipcot SIMS Backend running on port ${PORT}`);
    // Boot-time migrations (all idempotent + best-effort):
    // 0. Create the grievances table FIRST — v3 migration ALTERs it, so it
    //    must exist before v3 runs. Without this, every grievance endpoint 500s.
    applyGrievancesMigration().then(async () => {
        // 1. Apply v3 enhancements schema so enhancement endpoints resolve.
        await applyV3Migration();
        // 2. v4 research-grounded schema (Tier 1): committed-vs-actual,
        //    CSR restructure, water/power quotas, GSTIN, sector tags.
        await applyV4Migration();
        await applyV4bMigration();
        // 3. v5 Tier 2 (allottee lifecycle): lease billing, submission
        //    queries, incentive disbursements, MD escalation, inspections HO.
        await applyV5Migration();
        // 4. v6 Tier 3 (strategic): gov integration framework, circulars,
        //    directory contacts, Inaippagam cache, tier feature access.
        await applyV6Migration();
        // 5. After all migrations, backfill seed-doc files + users.name.
        ensureSeedDocuments();
        ensureUsersNameColumn();
    }).catch(err => console.warn('[BOOT] Migration chain error:', err.message));
});
