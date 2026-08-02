// ============================================================
// i18n-routes.js — Tamil / bilingual UI string service (Quick Win 6)
//
// Mounted at /api/i18n. Powers the frontend LanguageContext: the app
// bootstraps with /dictionary?lang=ta to get the whole Tamil dictionary
// in one round trip. Admins can add/edit strings so the dictionary
// grows without code changes.
//
// ADDITIVE + standalone. No existing route depends on these.
// ============================================================

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');
const i18n = require('../services/i18n');

// ============================================================
// @route   GET /api/i18n/dictionary?lang=ta|en
// @desc    Full dictionary for a language (frontend bootstrap).
// @access  Public (used pre-login too, so the login page can render Tamil)
// ============================================================
router.get('/dictionary', async (req, res) => {
    try {
        const lang = ['ta', 'en'].includes(req.query.lang) ? req.query.lang : 'en';
        res.json(await i18n.dictionary(lang));
    } catch (err) {
        console.error('Dictionary Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/i18n/translate?keys=a,b,c&lang=ta
// @desc    Batch translate a few keys (for incremental UI updates).
// @access  Public
// ============================================================
router.get('/translate', async (req, res) => {
    try {
        const keys = (req.query.keys || '').split(',').map(s => s.trim()).filter(Boolean);
        const lang = ['ta', 'en'].includes(req.query.lang) ? req.query.lang : 'en';
        if (!keys.length) return res.json({});
        res.json(await i18n.tBatch(keys, lang));
    } catch (err) {
        console.error('Translate Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/i18n/strings
// @desc    Admin: list all strings (paginated, filterable).
// @access  Private (Admin)
// ============================================================
router.get('/strings', requireRole(['admin']), async (req, res) => {
    try {
        const lang = req.query.lang;
        const params = [];
        let where = '';
        if (lang) { params.push(lang); where = 'WHERE language = $1'; }
        const { rows } = await db.query(
            `SELECT id, string_key, language, value, updated_at
               FROM i18n_strings ${where}
            ORDER BY string_key LIMIT 1000`, params);
        res.json(rows);
    } catch (err) {
        console.error('List Strings Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   POST /api/i18n/strings
// @desc    Admin: create or update a translation.
// @access  Private (Admin)
// ============================================================
router.post('/strings', requireRole(['admin']), async (req, res) => {
    try {
        const { string_key, language = 'ta', value } = req.body;
        if (!string_key || !value) return res.status(400).json({ error: 'string_key and value required' });
        if (!['ta', 'en'].includes(language)) return res.status(400).json({ error: 'language must be ta or en' });

        const ins = await db.query(
            `INSERT INTO i18n_strings (string_key, language, value)
             VALUES ($1,$2,$3)
             ON CONFLICT (string_key, language)
             DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
             RETURNING *`,
            [string_key, language, value]
        );
        // Invalidate the cache so the new value is served immediately.
        i18n.load();
        res.status(201).json(ins.rows[0]);
    } catch (err) {
        console.error('Upsert String Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/i18n/strings/:id
router.delete('/strings/:id', requireRole(['admin']), async (req, res) => {
    try {
        await db.query('DELETE FROM i18n_strings WHERE id = $1', [req.params.id]);
        i18n.load();
        res.json({ msg: 'string deleted' });
    } catch (err) {
        console.error('Delete String Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
