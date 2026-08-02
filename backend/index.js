require('dotenv').config();

// Validate required environment variables on startup (env-config.md workflows)
const requiredEnv = ['DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
    console.error(`[SERVER] [FATAL] Startup failed. Missing required environment variables: ${missingEnv.join(', ')}`);
    console.error('[SERVER] Refer to .env.example to configure the required variables. Exiting...');
    process.exit(1);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5001; // changed due to port conflict

// Security headers
app.use(helmet());

// CORS — restrict to configured frontend origins. Set CORS_ORIGIN in production
// to your deployed frontend URL(s), comma-separated. '*' allows any origin.
const allowedOrigins = (process.env.CORS_ORIGIN ||
    'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://localhost:3000')
    .split(',').map(s => s.trim());
app.use(cors({
    origin: (origin, callback) => {
        // Allow non-browser clients (curl, mobile apps) that send no Origin header
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
}));

app.use(express.json());

// Throttle authentication attempts to slow brute-force / credential stuffing
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
        res.status(503).json({ status: 'degraded', database: 'disconnected', error: err.message });
    }
});

// Serve Secure Vault uploaded files from disk. The documents table stores
// file_path as "/uploads/<filename>"; this makes those URLs resolvable.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
// Apply the v3 enhancements migration at boot, if not already done.
// The migration (schema_v3_enhancements.sql) is fully idempotent —
// every CREATE is IF NOT EXISTS, every ALTER column is wrapped in a
// DO/EXCEPTION guard, every seed uses ON CONFLICT DO NOTHING — so it
// is safe to run on every startup. This eliminates a whole class of
// "missing v3 table/column → 500" runtime bugs without requiring a
// manual psql step.
//
// Implementation note: we cannot split the file on ';' because the
// migration contains 36 DO $$ ... END $$ blocks (each with internal
// semicolons). Instead we grab a dedicated pooled client and send the
// whole script in one connection.query() — the underlying libpq
// supports multi-statement execution. Wrapped so any failure is
// non-fatal to server boot.
// ----------------------------------------------------------------
async function applyV3Migration() {
    let client;
    try {
        const sqlPath = path.join(__dirname, 'schema_v3_enhancements.sql');
        if (!fs.existsSync(sqlPath)) return; // file removed in a slim build
        const sql = fs.readFileSync(sqlPath, 'utf8');
        client = await db.pool.connect();
        await client.query(sql);
        console.log('[BOOT] v3 enhancements migration applied successfully.');
    } catch (err) {
        // Idempotent re-runs may report "already exists" for CREATE TYPE etc.
        // — those are expected and non-fatal. Only surface unexpected errors.
        const m = (err.message || '').toLowerCase();
        if (m.includes('already exists')) {
            console.log('[BOOT] v3 enhancements already present (already-exists).');
        } else {
            console.warn('[BOOT] v3 migration skipped:', err.message);
        }
    } finally {
        if (client) client.release();
    }
}

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
app.use('/api/assistant', require('./routes/ai-assistant'));
app.use('/api/gis', require('./routes/gis'));
app.use('/api/inspections', require('./routes/inspections'));
app.use('/api/billing', require('./routes/billing'));
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
    // 1. Apply v3 enhancements schema so enhancement endpoints resolve.
    applyV3Migration().then(() => {
        // 2. After v3 tables exist, backfill seed-doc files + users.name.
        ensureSeedDocuments();
        ensureUsersNameColumn();
    });
});
