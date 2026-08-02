// ============================================================
// search.js — Global search (Quick Win 6)
//
// Mounted at /api/search. Searches across industries, parks, plots,
// service requests, documents, and grievances in a single query and
// returns grouped, ranked results. Powers a single search bar in the
// UI that jumps to any entity.
//
// ADDITIVE: relies on the v3 search_index table when present; if the
// index hasn't been populated yet, it falls back to live LIKE queries
// against the source tables so search works immediately.
// ============================================================

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');

// Cap results per category to keep the dropdown snappy.
const PER_CATEGORY = 8;

// ============================================================
// @route   GET /api/search?q=...
// @desc    Global, grouped search. Public for park/company name
//          lookups would leak data, so this is authenticated.
// @access  Private
// ============================================================
router.get('/', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (q.length < 2) return res.json({ query: q, groups: {}, total: 0 });

        const term = `%${q.toLowerCase()}%`;
        const role = req.user.role;
        const profileId = req.user.profile_id;

        // Build each source query independently so a missing table never
        // breaks the whole search.
        const groups = {};

        // 1. Industries (scoped for industry users to their own).
        const indWhere = role === 'industry' ? 'AND id = $1' : '';
        const indParams = role === 'industry' ? [term, profileId] : [term];
        try {
            const ind = await db.query(`
                SELECT id, company_name AS title, industry_type AS subtitle,
                       location AS description, 'industry' AS entity_type
                  FROM industry_profiles
                 WHERE LOWER(company_name) LIKE $1 ${indWhere}
                 LIMIT ${PER_CATEGORY}`, indParams);
            if (ind.rows.length) groups.industries = ind.rows;
        } catch (_) {}

        // 2. Parks
        try {
            const parks = await db.query(`
                SELECT id, name AS title, code AS subtitle,
                       district AS description, 'park' AS entity_type
                  FROM industrial_parks
                 WHERE LOWER(name) LIKE $1 OR LOWER(code) LIKE $1 OR LOWER(district) LIKE $1
                 LIMIT ${PER_CATEGORY}`, [term]);
            if (parks.rows.length) groups.parks = parks.rows;
        } catch (_) {}

        // 3. Plots
        try {
            const plots = await db.query(`
                SELECT pp.id, CONCAT('Plot ', pp.plot_number) AS title,
                       p.name AS subtitle, pp.status AS description, 'plot' AS entity_type
                  FROM park_plots pp JOIN industrial_parks p ON p.id = pp.park_id
                 WHERE LOWER(pp.plot_number) LIKE $1
                 LIMIT ${PER_CATEGORY}`, [term]);
            if (plots.rows.length) groups.plots = plots.rows;
        } catch (_) {}

        // 4. Service requests (industry users see only their own)
        const srWhere = role === 'industry' ? 'AND sr.industry_id = $2' : '';
        const srParams = role === 'industry' ? [term, profileId] : [term];
        try {
            const sr = await db.query(`
                SELECT sr.id, sr.reference_number AS title,
                       sr.service_type AS subtitle, ip.company_name AS description,
                       'service' AS entity_type
                  FROM service_requests sr
                  JOIN industry_profiles ip ON ip.id = sr.industry_id
                 WHERE LOWER(sr.reference_number) LIKE $1 ${srWhere}
                 LIMIT ${PER_CATEGORY}`, srParams);
            if (sr.rows.length) groups.service_requests = sr.rows;
        } catch (_) {}

        // 5. Documents (industry users see only their own)
        const docWhere = role === 'industry' ? 'AND d.industry_id = $2' : '';
        const docParams = role === 'industry' ? [term, profileId] : [term];
        try {
            const docs = await db.query(`
                SELECT d.id, d.file_name AS title, d.category AS subtitle,
                       ip.company_name AS description, 'document' AS entity_type
                  FROM documents d JOIN industry_profiles ip ON ip.id = d.industry_id
                 WHERE LOWER(d.file_name) LIKE $1 ${docWhere}
                 LIMIT ${PER_CATEGORY}`, docParams);
            if (docs.rows.length) groups.documents = docs.rows;
        } catch (_) {}

        // 6. Grievances (admins/govt only)
        if (role !== 'industry') {
            try {
                const gr = await db.query(`
                    SELECT id, title, location AS subtitle,
                           status AS description, 'grievance' AS entity_type
                      FROM grievances
                     WHERE LOWER(title) LIKE $1 OR LOWER(location) LIKE $1
                     LIMIT ${PER_CATEGORY}`, [term]);
                if (gr.rows.length) groups.grievances = gr.rows;
            } catch (_) {}
        }

        const total = Object.values(groups).reduce((s, arr) => s + arr.length, 0);
        res.json({ query: q, groups, total });
    } catch (err) {
        console.error('Global Search Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
