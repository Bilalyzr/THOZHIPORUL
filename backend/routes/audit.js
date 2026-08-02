const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { requireRole } = require('./auth');

// ------------------------------------------------------------
// Detect whether the v3 enhancement columns exist on audit_logs
// (severity/entity_type/entity_id/entry_hash). Cached after first
// probe so we don't hit information_schema on every request. The
// route must keep working on DBs where the v3 migration hasn't been
// applied yet — selecting a missing column would 500 the page.
// ------------------------------------------------------------
let _auditColsCache = null;
async function hasEnhancedAuditCols() {
    if (_auditColsCache !== null) return _auditColsCache;
    try {
        const { rows } = await db.query(
            `SELECT column_name FROM information_schema.columns
              WHERE table_name = 'audit_logs' AND column_name IN
                    ('severity','entity_type','entity_id','entry_hash')`
        );
        _auditColsCache = rows.length === 4;
    } catch (_) { _auditColsCache = false; }
    return _auditColsCache;
}

// ============================================================
// @route   GET /api/audit
// @desc    Recent audit log entries (enhanced when v3 cols present).
// @access  Private (Admin, Govt)
// ============================================================
router.get('/', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 500);
        const enhanced = await hasEnhancedAuditCols();
        const conditions = [];
        const params = [];
        const { userId, role, action, severity, entityType, entityId, from, to } = req.query;

        if (userId)      { params.push(userId);      conditions.push(`a.user_id = $${params.length}`); }
        if (action)      { params.push(`%${action}%`); conditions.push(`a.action ILIKE $${params.length}`); }
        // severity/entity filters only apply when those columns exist.
        if (severity && enhanced)    { params.push(severity);    conditions.push(`a.severity = $${params.length}`); }
        if (entityType && enhanced)  { params.push(entityType);  conditions.push(`a.entity_type = $${params.length}`); }
        if (entityId && enhanced)    { params.push(entityId);    conditions.push(`a.entity_id = $${params.length}`); }
        if (from)        { params.push(from);        conditions.push(`a.created_at >= $${params.length}`); }
        if (to)          { params.push(to);          conditions.push(`a.created_at <= $${params.length}`); }
        if (role)        { params.push(role);        conditions.push(`u.role = $${params.length}`); }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        params.push(limit);

        const extraCols = enhanced
            ? ', a.severity, a.entity_type, a.entity_id, a.entry_hash'
            : '';
        const { rows } = await db.query(`
            SELECT a.id, a.action, a.ip_address, a.created_at${extraCols},
                   u.email AS user_email, u.role AS user_role
              FROM audit_logs a
         LEFT JOIN users u ON u.id = a.user_id
              ${where}
          ORDER BY a.created_at DESC, a.id DESC
             LIMIT $${params.length}`, params);

        const logs = rows.map(r => ({
            id: r.id,
            timestamp: r.created_at,
            action: r.action,
            user: r.user_email || 'System Engine',
            role: r.user_role || 'system',
            ip_address: r.ip_address || '—',
            severity: r.severity || 'info',
            entity: r.entity_type ? { type: r.entity_type, id: r.entity_id } : null,
            hash: r.entry_hash || null,
            status: 'SUCCESS'
        }));

        res.json({ logs, total: logs.length });
    } catch (err) {
        console.error('Audit Log Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/audit/export
// @desc    Export filtered audit log as CSV (Module 15).
// @access  Private (Admin)
// ============================================================
router.get('/export', requireRole(['admin']), async (req, res) => {
    try {
        const enhanced = await hasEnhancedAuditCols();
        const extraSelect = enhanced ? ', a.severity, a.entry_hash' : '';
        const { rows } = await db.query(`
            SELECT a.created_at, a.action, a.ip_address${extraSelect},
                   u.email AS user_email, u.role AS user_role
              FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
          ORDER BY a.created_at DESC LIMIT 5000`);
        const header = enhanced
            ? 'timestamp,action,severity,user,role,ip_address,hash'
            : 'timestamp,action,user,role,ip_address';
        const lines = rows.map(r => {
            const base = `"${r.created_at.toISOString()}","${(r.action||'').replace(/"/g,'""')}","${r.user_email||''}","${r.user_role||''}","${r.ip_address||''}"`;
            return enhanced
                ? `"${r.created_at.toISOString()}","${(r.action||'').replace(/"/g,'""')}","${r.severity||''}","${r.user_email||''}","${r.user_role||''}","${r.ip_address||''}","${r.entry_hash||''}"`
                : base;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=audit_log_${Date.now()}.csv`);
        res.send([header, ...lines].join('\n'));
    } catch (err) {
        console.error('Audit Export Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/audit/verify-chain
// @desc    Verify the tamper-evidence of the hash chain. Returns the
//          count of entries whose stored hash doesn't match a recompute.
// @access  Private (Admin)
// ============================================================
router.get('/verify-chain', requireRole(['admin']), async (req, res) => {
    try {
        // The hash chain requires the v3 columns (entry_hash/prev_hash).
        // If the migration isn't applied, report it clearly instead of 500ing.
        if (!(await hasEnhancedAuditCols())) {
            return res.status(501).json({
                tamper_evident: false,
                available: false,
                message: 'Hash-chain verification requires the v3 audit columns (run schema_v3_enhancements.sql).'
            });
        }
        const { rows } = await db.query(
            `SELECT id, prev_hash, entry_hash, action, user_id, created_at
               FROM audit_logs
              WHERE entry_hash IS NOT NULL
           ORDER BY id ASC LIMIT 5000`);
        let broken = 0;
        for (const r of rows) {
            const computed = crypto.createHash('sha256')
                .update(`${r.prev_hash || ''}|${r.action}|${r.user_id}|${r.created_at.toISOString()}`)
                .digest('hex');
            if (computed !== r.entry_hash) broken++;
        }
        res.json({ chained_entries: rows.length, broken, tamper_evident: broken === 0, available: true });
    } catch (err) {
        console.error('Verify Chain Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/audit/anomalies
// @desc    Simple anomaly scan: unusual volumes by user / IP that may
//          indicate abuse (Module 15 — anomaly detection on the trail).
// @access  Private (Admin)
// ============================================================
router.get('/anomalies', requireRole(['admin']), async (req, res) => {
    try {
        const enhanced = await hasEnhancedAuditCols();
        // Volume scans work on the base columns regardless of migration.
        const byUser = await db.query(`
            SELECT u.email, COUNT(*) AS n
              FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
             WHERE a.created_at > NOW() - INTERVAL '1 hour' AND a.user_id IS NOT NULL
          GROUP BY u.email HAVING COUNT(*) > 50 ORDER BY n DESC`);
        const byIp = await db.query(`
            SELECT ip_address, COUNT(*) AS n
              FROM audit_logs
             WHERE created_at > NOW() - INTERVAL '1 hour' AND ip_address IS NOT NULL
          GROUP BY ip_address HAVING COUNT(*) > 100 ORDER BY n DESC`);
        // Severity breakdown only available with v3 columns.
        let severityRows = [];
        if (enhanced) {
            const severities = await db.query(`
                SELECT severity, COUNT(*) AS n FROM audit_logs
                 WHERE created_at > NOW() - INTERVAL '24 hours'
              GROUP BY severity`);
            severityRows = severities.rows;
        }
        res.json({ high_volume_users: byUser.rows, high_volume_ips: byIp.rows, severity_24h: severityRows });
    } catch (err) {
        console.error('Audit Anomalies Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// Best-effort hash-chained audit recorder (Module 15).
// Other routes call audit.recordAudit(userId, action, ip, {entity...}).
// Each entry's hash chains to the previous entry -> tamper-evident.
// ============================================================
async function recordAudit(userId, action, ipAddress, meta = {}) {
    try {
        // Fetch the latest entry's hash to chain from.
        const prev = await db.query('SELECT entry_hash FROM audit_logs WHERE entry_hash IS NOT NULL ORDER BY id DESC LIMIT 1');
        const prevHash = prev.rows.length ? prev.rows[0].entry_hash : null;

        // We need the created_at to compute the hash, so insert first with a
        // placeholder, then update the hash using the row's own created_at.
        const ins = await db.query(
            `INSERT INTO audit_logs (user_id, action, ip_address, prev_hash, entity_type, entity_id, severity)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, created_at`,
            [userId || null, action, ipAddress || null, prevHash,
             meta.entityType || null, meta.entityId || null, meta.severity || 'info']
        );
        const row = ins.rows[0];
        const hash = crypto.createHash('sha256')
            .update(`${prevHash || ''}|${action}|${userId || ''}|${row.created_at.toISOString()}`)
            .digest('hex');
        await db.query('UPDATE audit_logs SET entry_hash = $1 WHERE id = $2', [hash, row.id]);
    } catch (err) {
        console.warn('[AUDIT] Failed to record action:', err.message);
    }
}

module.exports = router;
module.exports.recordAudit = recordAudit;
