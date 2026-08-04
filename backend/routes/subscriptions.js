// ============================================================
// subscriptions.js — Subscription state endpoint.
//
// Mounted at /api/subscriptions. Exposes the caller's current tier,
// status, storage usage, and the full feature-access matrix filtered
// to their tier — so the frontend can gate UI without hardcoding.
//
// Additive to /api/payments (Razorpay order+verify) and
// /api/billing (invoices + lifecycle).
// ============================================================

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');
const { STORAGE_LIMITS_MB, tierColumn } = require('../middleware/subscriptionGuard');

// Display metadata for each tier (used by the frontend for badges/labels).
const TIER_META = {
    free_starter:     { display_name: 'Starter',     plan_name: 'Free Starter',     color: '#64748b', monthly_price: 0 },
    sme_pro:          { display_name: 'Pro',         plan_name: 'SME Professional', color: '#1F4E79', monthly_price: 4999 },
    enterprise_suite: { display_name: 'Enterprise',  plan_name: 'Enterprise Suite', color: '#2E7D32', monthly_price: 24999 },
};

/**
 * GET /api/subscriptions/me
 * Returns the caller's subscription state + feature matrix.
 * Admin/govt get an "internal" tier with all features.
 */
router.get('/me', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        // Admin & govt are internal cost-centres — not billed, all features.
        if (req.user.role !== 'industry') {
            const allFeatures = await db.query(
                `SELECT feature_key, feature_name, is_statutory, TRUE AS enabled
                   FROM tier_feature_access ORDER BY is_statutory DESC, category, feature_name`
            );
            return res.json({
                tier: 'internal',
                status: 'active',
                display_name: req.user.role === 'admin' ? 'Administrator' : 'Government Officer',
                plan_name: 'Internal (Government Cost-Centre)',
                color: '#1F4E79',
                monthly_price: 0,
                storage_used_mb: 0,
                storage_limit_mb: null, // unlimited for internal
                features: allFeatures.rows.map(f => ({
                    key: f.feature_key,
                    name: f.feature_name,
                    statutory: f.is_statutory,
                    enabled: true,
                })),
            });
        }

        // Industry — fetch real tier + status.
        const subRow = await db.query(
            `SELECT subscription_tier, subscription_status, last_payment_date
               FROM industry_profiles WHERE user_id = $1 LIMIT 1`,
            [req.user.id]
        );

        if (!subRow.rows.length) {
            return res.status(400).json({ error: 'No industry profile found for this account.' });
        }

        const s = subRow.rows[0];
        const tier = s.subscription_tier || 'free_starter';
        const status = s.subscription_status || 'active';
        const meta = TIER_META[tier] || TIER_META.free_starter;
        const col = tierColumn(tier);

        // Storage usage: sum of document file sizes for this industry.
        // The documents table stores file_size_kb; fall back to 0 if missing.
        let storageUsedMb = 0;
        try {
            const usage = await db.query(
                `SELECT COALESCE(SUM(file_size_kb), 0)::float / 1024 AS used_mb
                   FROM documents WHERE industry_id = $1`,
                [req.user.profile_id || req.user.id]
            );
            storageUsedMb = parseFloat(usage.rows[0].used_mb) || 0;
        } catch (_) { /* documents table shape may vary — degrade gracefully */ }

        // Feature matrix filtered to this tier's column.
        const features = await db.query(
            `SELECT feature_key, feature_name, category, is_statutory, ${col} AS enabled
               FROM tier_feature_access ORDER BY is_statutory DESC, category, feature_name`
        );

        res.json({
            tier,
            status,
            display_name: meta.display_name,
            plan_name: meta.plan_name,
            color: meta.color,
            monthly_price: meta.monthly_price,
            storage_used_mb: Math.round(storageUsedMb * 100) / 100,
            storage_limit_mb: STORAGE_LIMITS_MB[tier] || STORAGE_LIMITS_MB.free_starter,
            features: features.rows.map(f => ({
                key: f.feature_key,
                name: f.feature_name,
                category: f.category,
                statutory: f.is_statutory,
                enabled: f.enabled,
            })),
        });
    } catch (err) {
        console.error('Subscription /me Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
