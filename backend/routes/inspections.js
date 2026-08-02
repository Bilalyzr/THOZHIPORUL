// ============================================================
// inspections.js — Mobile Inspection (Module 12)
//
// Mounted at /api/inspections. This wires up the previously-unwired
// MobileInspection.jsx submit button (flagged in REVIEW_READINESS_TODO
// as "no inspection table/endpoint exists yet"). Backed by the
// `inspections` table from schema_v3.
//
// Features:
//   • Create + list + detail (offline-first: accepts a stored payload)
//   • Geo-tagged photo evidence (paths stored; files handled by upload layer)
//   • Digital checklist per inspection type
//   • Outcome -> auto-links to compliance (raises a violation on
//     'violation'/'critical' outcomes so inspections feed enforcement)
// ============================================================

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');
const { notify } = require('../services/notify');

// Default checklist templates per inspection type. The officer sees
// these as toggleable items; results land in the checklist JSONB.
const CHECKLIST_TEMPLATES = {
    environmental: ['Air emissions within limits', 'Effluent treated to standard', 'Hazardous waste stored correctly', 'Green belt maintained'],
    safety:        ['Fire NOC valid', 'Emergency exits clear', 'PPE worn by workers', 'Mock drill conducted'],
    fire:          ['Fire extinguishers serviced', 'Sprinkler system functional', 'Alarm tested', 'Hydrant accessible'],
    financial:     ['Lease payments up to date', 'Statutory returns filed', 'Books maintained'],
    routine:       ['Premises clean', 'Signage intact', 'Security deployed', 'Records produced']
};

// ============================================================
// @route   GET /api/inspections/templates
// @desc    Checklist templates per inspection type (drives the form).
// @access  Private (Admin, Govt)
// ============================================================
router.get('/templates', requireRole(['admin', 'govt']), (req, res) => {
    res.json(CHECKLIST_TEMPLATES);
});

// ============================================================
// @route   POST /api/inspections
// @desc    Submit a field inspection (offline-first: client may pass
//          an offline_payload captured earlier with a client timestamp).
// @access  Private (Admin, Govt)
// ============================================================
router.post('/', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { industryId, parkId, inspectionType, scheduledDate, conductedAt,
                outcome, latitude, longitude, geoAccuracyM, checklist,
                findings, photoPaths, offlinePayload } = req.body;

        if (!industryId || !inspectionType) return res.status(400).json({ error: 'industryId and inspectionType required' });
        const validOutcomes = ['compliant', 'minor_issues', 'violation', 'critical', null];
        if (outcome && !validOutcomes.includes(outcome)) return res.status(400).json({ error: 'invalid outcome' });

        const ins = await db.query(
            `INSERT INTO inspections
                (industry_id, park_id, officer_id, inspection_type, scheduled_date, conducted_at,
                 outcome, latitude, longitude, geo_accuracy_m, checklist, findings,
                 photo_paths, offline_payload)
             VALUES ($1,$2,$3,$4,$5,COALESCE($6,NOW()),$7,$8,$9,$10,$11::jsonb,$12,$13,$14::jsonb)
             RETURNING *`,
            [industryId, parkId || null, req.user.id, inspectionType,
             scheduledDate || null, conductedAt || null, outcome || null,
             latitude || null, longitude || null, geoAccuracyM || null,
             JSON.stringify(checklist || {}), findings || null,
             photoPaths || null, offlinePayload ? JSON.stringify(offlinePayload) : null]
        );
        const inspection = ins.rows[0];

        // If the inspection found a breach, raise a compliance violation so
        // enforcement flows are continuous (inspection -> violation -> notice).
        if (outcome === 'violation' || outcome === 'critical') {
            // Find a relevant rule or fall back to a safety category.
            const rule = await db.query(
                `SELECT id FROM compliance_rules WHERE category = $1 AND is_active = TRUE LIMIT 1`,
                [inspectionType === 'environmental' ? 'environmental' : 'safety']
            );
            const v = await db.query(
                `INSERT INTO compliance_violations
                    (industry_id, rule_id, violation_date, severity, description, auto_detected)
                 VALUES ($1,$2,CURRENT_DATE,$3,$4,FALSE) RETURNING id`,
                [industryId, rule.rows.length ? rule.rows[0].id : null,
                 outcome === 'critical' ? 'critical' : 'high',
                 `Field inspection (${inspectionType}) on ${new Date().toLocaleDateString('en-IN')}: ${findings || 'breach detected'}`]
            );
            await db.query('UPDATE inspections SET linked_violation_id = $1 WHERE id = $2', [v.rows[0].id, inspection.id]);

            // Notify the industry owner.
            const u = await db.query(
                'SELECT u.id FROM users u JOIN industry_profiles ip ON ip.user_id = u.id WHERE ip.id = $1', [industryId]
            );
            await notify({
                userId: u.rows.length ? u.rows[0].id : null,
                category: 'compliance',
                severity: outcome === 'critical' ? 'error' : 'warning',
                title: `Inspection found a ${outcome}`,
                message: `A ${inspectionType} inspection resulted in a ${outcome} finding. A compliance violation has been raised.`,
                link: '/workspace',
                metadata: { inspectionId: inspection.id, violationId: v.rows[0].id }
            });
        }

        res.status(201).json(inspection);
    } catch (err) {
        console.error('Inspection Submit Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/inspections
// @desc    List inspections (admin/govt see all; scoped by industry/park filters).
// @access  Private (Admin, Govt)
// ============================================================
router.get('/', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { industryId, parkId, outcome } = req.query;
        const conditions = [];
        const params = [];
        if (industryId) { params.push(industryId); conditions.push(`i.industry_id = $${params.length}`); }
        if (parkId)     { params.push(parkId);     conditions.push(`i.park_id = $${params.length}`); }
        if (outcome)    { params.push(outcome);    conditions.push(`i.outcome = $${params.length}::inspection_outcome`); }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const { rows } = await db.query(`
            SELECT i.*, ip.company_name, p.name AS park_name, u.name AS officer_name
              FROM inspections i
              JOIN industry_profiles ip ON ip.id = i.industry_id
         LEFT JOIN industrial_parks p ON p.id = i.park_id
         LEFT JOIN users u ON u.id = i.officer_id
              ${where}
          ORDER BY i.conducted_at DESC NULLS LAST, i.created_at DESC LIMIT 200`, params);
        res.json(rows);
    } catch (err) {
        console.error('List Inspections Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/inspections/:id
// @desc    Inspection detail incl. checklist + photos + linked violation.
// @access  Private (Admin, Govt)
// ============================================================
router.get('/:id', requireRole(['admin', 'govt']), async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT i.*, ip.company_name, u.name AS officer_name,
                   v.severity AS linked_violation_severity, v.status AS linked_violation_status
              FROM inspections i
              JOIN industry_profiles ip ON ip.id = i.industry_id
         LEFT JOIN users u ON u.id = i.officer_id
         LEFT JOIN compliance_violations v ON v.id = i.linked_violation_id
             WHERE i.id = $1`, [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Inspection not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('Inspection Detail Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
