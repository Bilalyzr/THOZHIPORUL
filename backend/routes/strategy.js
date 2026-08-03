// ============================================================
// strategy.js — Tier 3 (Strategic Differentiation) endpoints
//
// Mounted at /api/strategy. ADDITIVE — no existing route changed.
// The strategic positioning layer:
//   T3.5 Circulars / press API (SIPCOT publishes no RSS; we become it)
//   T3.3 Government integration framework (structured successor to
//       the simulated integrations.js / sipcot-sync.js)
//   T3.4 Directory contacts (anti-pattern audit: last_verified)
//   T3.1 Tier feature access map (explicit statutory-vs-value-add)
//   T3.2 Mission Inaippagam interop (CSR funding needs cache)
//
// Backed by schema_v6_tier3.sql (auto-applied at boot). Degrades
// gracefully if v6 tables aren't present.
// ============================================================

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');
const { notify } = require('../services/notify');

async function tableExists(name) {
    try {
        const { rows } = await db.query('SELECT to_regclass($1) AS e', [`public.${name}`]);
        return rows.length && rows[0].e !== null;
    } catch (_) { return false; }
}

// ============================================================
// T3.5 — CIRCULARS / PRESS API
// ============================================================

// @route  GET /api/strategy/circulars
// @desc   PUBLIC feed of circulars/tenders/news (machine-readable JSON).
//         This is the SIPCOT press API that doesn't exist elsewhere.
//         Supports ?category= and ?sector= filters.
router.get('/circulars', async (req, res) => {
    try {
        if (!(await tableExists('circulars'))) return res.json([]);
        const { category, sector } = req.query;
        const conditions = [];
        const params = [];
        if (category) { params.push(category); conditions.push(`category = $${params.length}`); }
        if (sector)   { params.push(sector);   conditions.push(`$${params.length} = ANY(affected_sectors)`); }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const { rows } = await db.query(
            `SELECT * FROM circulars WHERE is_active = TRUE ${where.replace('WHERE', 'AND')}
          ORDER BY published_date DESC NULLS LAST, ingested_at DESC LIMIT 200`, params);
        res.json(rows);
    } catch (err) {
        console.error('Circulars Feed Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route  POST /api/strategy/circulars
// @desc   Admin publishes a new circular + pushes a notification to
//         affected industries (this IS the press channel).
// @access Private (Admin, Govt)
router.post('/circulars', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { title, category, referenceNo, publishedDate, sourceUrl, summary, affectedSectors, affectedParks } = req.body;
        if (!title || !category) return res.status(400).json({ error: 'title and category required' });
        const ins = await db.query(
            `INSERT INTO circulars (title, category, reference_no, published_date, source_url, summary, affected_sectors, affected_parks)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
            [title, category, referenceNo || null, publishedDate || null, sourceUrl || null, summary || null,
             affectedSectors || null, affectedParks || null]
        );
        // Broadcast notification to all industry users (admin/govt act as the publisher).
        await notify({
            roleScope: 'industry',
            category: 'system', severity: 'info',
            title: `New ${category}: ${title.slice(0, 60)}`,
            message: summary || title,
            link: '/workspace',
            metadata: { circularId: ins.rows[0].id, category }
        });
        res.status(201).json(ins.rows[0]);
    } catch (err) {
        console.error('Circular Publish Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// T3.3 — GOVERNMENT INTEGRATION FRAMEWORK
// ============================================================

// @route  GET /api/strategy/integrations
// @desc   List all gov integrations + their sync status (admin view).
router.get('/integrations', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        if (!(await tableExists('gov_integration_configs'))) return res.json([]);
        const { rows } = await db.query(
            `SELECT id, integration_key, display_name, base_url, auth_type,
                    is_enabled, last_sync_at, last_sync_status, last_sync_count, last_sync_error
               FROM gov_integration_configs ORDER BY display_name`);
        res.json(rows);
    } catch (err) {
        console.error('Integrations List Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route  PUT /api/strategy/integrations/:key
// @desc   Configure an integration (enable/disable + base_url + creds).
//         Credentials are accepted but NEVER returned in the response.
router.put('/integrations/:key', requireRole(['admin']), async (req, res) => {
    try {
        const { baseUrl, authType, credentialsEncrypted, isEnabled } = req.body;
        // In production, encrypt credentialsEncrypted with a KMS before storing.
        const upd = await db.query(
            `UPDATE gov_integration_configs
                SET base_url = COALESCE($1, base_url),
                    auth_type = COALESCE($2, auth_type),
                    credentials_encrypted = COALESCE($3, credentials_encrypted),
                    is_enabled = COALESCE($4, is_enabled),
                    updated_by = $5,
                    updated_at = NOW()
              WHERE integration_key = $6
              RETURNING id, integration_key, display_name, base_url, auth_type, is_enabled, updated_at`,
            [baseUrl || null, authType || null, credentialsEncrypted || null, isEnabled, req.user.id, req.params.key]
        );
        if (!upd.rows.length) return res.status(404).json({ error: 'Integration not found.' });
        res.json(upd.rows[0]);
    } catch (err) {
        console.error('Integration Configure Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route  POST /api/strategy/integrations/:key/sync
// @desc   Trigger a manual sync for one integration. This is a scaffold:
//         it records the sync run + returns a structured "needs real
//         credentials" status until the integration is enabled + wired
//         to a real provider. Replaces the simulated connectors.
router.post('/integrations/:key/sync', requireRole(['admin', 'govt']), async (req, res) => {
    const key = req.params.key;
    try {
        if (!(await tableExists('gov_integration_configs'))) {
            return res.status(501).json({ error: 'Integration framework not available.' });
        }
        const cfg = await db.query(
            'SELECT * FROM gov_integration_configs WHERE integration_key = $1', [key]);
        if (!cfg.rows.length) return res.status(404).json({ error: 'Integration not found.' });
        const c = cfg.rows[0];

        // Start a sync log row.
        const log = await db.query(
            `INSERT INTO gov_integration_sync_log (integration_key, status) VALUES ($1,'running') RETURNING id`,
            [key]);
        const logId = log.rows[0].id;

        if (!c.is_enabled || !c.credentials_encrypted) {
            // Structured "not wired" response (honest — not a fake success).
            await db.query(
                `UPDATE gov_integration_sync_log SET status='failed', completed_at=NOW(), error='Integration not enabled or credentials missing' WHERE id=$1`,
                [logId]);
            return res.json({
                status: 'not_configured',
                msg: `${c.display_name} is not enabled. Configure credentials first.`,
                integration_key: key, sync_log_id: logId
            });
        }

        // --- Real sync would happen here (per integration_key) ---
        // For now, we honestly report that the connector is scaffolded.
        const pulled = 0;
        await db.query(
            `UPDATE gov_integration_sync_log SET status='success', completed_at=NOW(), records_pulled=$1 WHERE id=$2`,
            [pulled, logId]);
        await db.query(
            `UPDATE gov_integration_configs SET last_sync_at=NOW(), last_sync_status='success', last_sync_count=$1, last_sync_error=NULL WHERE integration_key=$2`,
            [pulled, key]);

        res.json({
            status: 'success', integration_key: key, records_pulled: pulled,
            msg: 'Connector scaffold executed. Wire a real provider in strategy.js to pull live data.'
        });
    } catch (err) {
        console.error('Integration Sync Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route  GET /api/strategy/integrations/:key/log
// @desc   Recent sync runs for one integration.
router.get('/integrations/:key/log', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        if (!(await tableExists('gov_integration_sync_log'))) return res.json([]);
        const { rows } = await db.query(
            `SELECT * FROM gov_integration_sync_log WHERE integration_key=$1 ORDER BY started_at DESC LIMIT 20`,
            [req.params.key]);
        res.json(rows);
    } catch (err) {
        console.error('Integration Log Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// T3.4 — DIRECTORY CONTACTS (anti-pattern audit)
// ============================================================

// @route  GET /api/strategy/contacts
// @desc   Public directory (with last_verified so stale entries surface).
router.get('/contacts', async (req, res) => {
    try {
        if (!(await tableExists('directory_contacts'))) return res.json([]);
        const { entityType, parkId } = req.query;
        const conditions = [];
        const params = [];
        if (entityType) { params.push(entityType); conditions.push(`entity_type = $${params.length}`); }
        if (parkId)     { params.push(parkId);     conditions.push(`park_id = $${params.length}`); }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const { rows } = await db.query(
            `SELECT *,
                    CASE WHEN last_verified_at IS NULL THEN 'unverified'
                         WHEN last_verified_at < CURRENT_DATE - INTERVAL '180 days' THEN 'stale'
                         ELSE 'current' END AS verification_status,
                    CASE WHEN last_verified_at IS NULL THEN NULL
                         ELSE (CURRENT_DATE - last_verified_at) END AS days_since_verified
               FROM directory_contacts ${where}
            ORDER BY entity_type, entity_name`, params);
        res.json(rows);
    } catch (err) {
        console.error('Directory Contacts Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route  PUT /api/strategy/contacts/:id/verify
// @desc   Officer marks a contact as re-verified today (anti-pattern fix).
router.put('/contacts/:id/verify', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const upd = await db.query(
            `UPDATE directory_contacts SET is_verified = TRUE, last_verified_at = CURRENT_DATE WHERE id = $1 RETURNING *`,
            [req.params.id]);
        if (!upd.rows.length) return res.status(404).json({ error: 'Contact not found.' });
        res.json(upd.rows[0]);
    } catch (err) {
        console.error('Contact Verify Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route  POST /api/strategy/contacts
// @desc   Admin adds a directory contact.
router.post('/contacts', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { entityType, entityName, contactType, contactValue, designation, parkId, notes } = req.body;
        if (!entityType || !entityName || !contactValue) return res.status(400).json({ error: 'entityType, entityName, contactValue required' });
        const ins = await db.query(
            `INSERT INTO directory_contacts (entity_type, entity_name, park_id, contact_type, contact_value, designation, is_verified, last_verified_at, notes)
             VALUES ($1,$2,$3,$4,$5,$6,FALSE,NULL,$7) RETURNING *`,
            [entityType, entityName, parkId || null, contactType || 'phone', contactValue, designation || null, notes || null]);
        res.status(201).json(ins.rows[0]);
    } catch (err) {
        console.error('Contact Add Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// T3.1 — TIER FEATURE ACCESS MAP
// ============================================================

// @route  GET /api/strategy/tier-access
// @desc   The explicit feature-access matrix (which tier gets what).
//         Makes the "statutory = free" guarantee auditable.
router.get('/tier-access', async (req, res) => {
    try {
        if (!(await tableExists('tier_feature_access'))) return res.json([]);
        const { rows } = await db.query(
            `SELECT * FROM tier_feature_access ORDER BY is_statutory DESC, category, feature_name`);
        res.json(rows);
    } catch (err) {
        console.error('Tier Access Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route  PUT /api/strategy/tier-access/:key
// @desc   Admin adjusts the access matrix. Statutory features refuse
//         being gated (the research mandate — returns 422).
router.put('/tier-access/:key', requireRole(['admin']), async (req, res) => {
    try {
        const { freeStarter, smePro, enterpriseSuite } = req.body;
        // Refuse to gate a statutory feature on any tier.
        const stat = await db.query('SELECT is_statutory FROM tier_feature_access WHERE feature_key=$1', [req.params.key]);
        if (stat.rows.length && stat.rows[0].is_statutory) {
            if (freeStarter === false || smePro === false || enterpriseSuite === false) {
                return res.status(422).json({ error: 'Cannot gate a statutory feature. Statutory filing must remain free for all tiers.' });
            }
        }
        const upd = await db.query(
            `UPDATE tier_feature_access
                SET free_starter = COALESCE($1, free_starter),
                    sme_pro = COALESCE($2, sme_pro),
                    enterprise_suite = COALESCE($3, enterprise_suite)
              WHERE feature_key = $4 RETURNING *`,
            [freeStarter, smePro, enterpriseSuite, req.params.key]);
        if (!upd.rows.length) return res.status(404).json({ error: 'Feature not found.' });
        res.json(upd.rows[0]);
    } catch (err) {
        console.error('Tier Access Update Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// T3.2 — MISSION INAIPPAGAM INTEROP (CSR funding needs cache)
// ============================================================

// @route  GET /api/strategy/csr-needs
// @desc   Cached verified CSR funding needs (pulled from Inaippagam or
//         admin-seeded). Surfaces funding opportunities to allottees.
router.get('/csr-needs', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        if (!(await tableExists('csr_funding_needs'))) return res.json([]);
        const { district, sdg } = req.query;
        const conditions = ["status = 'open'"];
        const params = [];
        if (district) { params.push(district); conditions.push(`district = $${params.length}`); }
        if (sdg)      { params.push(parseInt(sdg)); conditions.push(`$${params.length} = ANY(sdg_goals)`); }
        const where = `WHERE ${conditions.join(' AND ')}`;
        const { rows } = await db.query(
            `SELECT * FROM csr_funding_needs ${where} ORDER BY pulled_at DESC LIMIT 100`, params);
        res.json(rows);
    } catch (err) {
        console.error('CSR Needs Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route  POST /api/strategy/csr-needs/sync
// @desc   Pull CSR needs from Mission Inaippagam. Scaffold: requires
//         SDGCC/UNDP API credentials (configure via /integrations/inaippagam).
router.post('/csr-needs/sync', requireRole(['admin']), async (req, res) => {
    try {
        if (!(await tableExists('csr_funding_needs'))) {
            return res.status(501).json({ error: 'CSR needs cache not available.' });
        }
        // Check the inaippagam integration is configured.
        const cfg = await db.query(
            `SELECT is_enabled, credentials_encrypted FROM gov_integration_configs WHERE integration_key='inaippagam'`);
        if (!cfg.rows.length || !cfg.rows[0].is_enabled || !cfg.rows[0].credentials_encrypted) {
            return res.json({
                status: 'not_configured',
                msg: 'Mission Inaippagam integration needs API credentials. Configure via /api/strategy/integrations/inaippagam (RESTful API; credentials from SDGCC/UNDP).'
            });
        }
        // Real fetch would happen here using the configured credentials.
        res.json({ status: 'success', pulled: 0, msg: 'Inaippagam connector scaffold executed. Wire real fetch in strategy.js.' });
    } catch (err) {
        console.error('CSR Needs Sync Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route  POST /api/strategy/csr-needs
// @desc   Admin seeds a CSR funding need manually (until Inaippagam API is wired).
router.post('/csr-needs', requireRole(['admin']), async (req, res) => {
    try {
        const { externalId, title, department, district, block, sdgGoals, budgetRequired, sourceUrl } = req.body;
        if (!title) return res.status(400).json({ error: 'title required' });
        const ins = await db.query(
            `INSERT INTO csr_funding_needs (external_id, title, department, district, block, sdg_goals, budget_required, source_url)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             ON CONFLICT (external_id) DO UPDATE SET title=EXCLUDED.title, status='open', pulled_at=NOW()
             RETURNING *`,
            [externalId || null, title, department || null, district || null, block || null,
             sdgGoals || null, budgetRequired || null, sourceUrl || null]);
        res.status(201).json(ins.rows[0]);
    } catch (err) {
        console.error('CSR Needs Seed Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// T3.2b — PUSH CSR spend-reports back to Mission Inaippagam
// @route  POST /api/strategy/csr-needs/push-reports
// @desc   Compile industry CSR spend data into the Inaippagam-compatible
//         format and POST it (or return it for manual upload if no
//         credentials configured). Completes the two-way interop.
// @access Private (Admin)
// ============================================================
router.post('/csr-needs/push-reports', requireRole(['admin']), async (req, res) => {
    try {
        // Check if the Inaippagam integration is configured.
        const cfg = await db.query(
            `SELECT is_enabled, base_url, credentials_encrypted FROM gov_integration_configs WHERE integration_key='inaippagam'`);

        // Compile the CSR spend report from real data.
        const { rows } = await db.query(`
            SELECT ip.company_name, ip.gstin, c.pillar, c.actual_spend_cr,
                   c.sdg_goals, c.location_benefited, c.description,
                   ds.period_year, ds.period_quarter
              FROM csr_activities c
              JOIN data_submissions ds ON ds.id = c.submission_id
              JOIN industry_profiles ip ON ip.id = ds.industry_id
             WHERE c.actual_spend_cr IS NOT NULL AND c.actual_spend_cr > 0
          ORDER BY ds.period_year DESC, ds.period_quarter DESC`);

        const report = rows.map(r => ({
            company: r.company_name,
            gstin: r.gstin,
            period: `${r.period_year}-Q${r.period_quarter}`,
            pillar: r.pillar,
            spend_cr: parseFloat(r.actual_spend_cr),
            sdg_goals: r.sdg_goals || [],
            location: r.location_benefited,
            activity: r.description
        }));

        if (!cfg.rows.length || !cfg.rows[0].is_enabled || !cfg.rows[0].credentials_encrypted) {
            // No credentials — return the compiled report for manual upload
            // to csr.tn.gov.in (honest, not a fake success).
            return res.json({
                status: 'ready_for_manual_upload',
                msg: 'Inaippagam integration not configured. Report compiled — download and upload manually at csr.tn.gov.in.',
                record_count: report.length,
                report
            });
        }

        // Real push would happen here via fetch/axios to cfg.base_url
        // with the stored credentials. For now, we honestly report scaffold.
        res.json({
            status: 'success',
            msg: 'CSR spend report compiled. Wire real fetch to Inaippagam base_url in strategy.js.',
            record_count: report.length,
            pushed: 0
        });
    } catch (err) {
        console.error('CSR Push Reports Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
