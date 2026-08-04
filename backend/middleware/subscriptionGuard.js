// ============================================================
// subscriptionGuard.js — Tier-based feature gating middleware.
//
// Runs AFTER requireRole (so req.user is populated). Enforces the
// tier_feature_access matrix: value-added features are gated by the
// caller's subscription tier; STATUTORY features are always allowed
// (the research mandate — never gate regulatory filing).
//
// Source of truth for tier vocabulary: free_starter / sme_pro /
// enterprise_suite (matches the DB column default, the
// tier_feature_access matrix columns, and industry_profiles data).
// ============================================================

const db = require('../db');

// ─── Feature key constants ────────────────────────────────────
// Route files use these named constants instead of magic strings.
const TIER_FEATURES = {
    PREDICTIVE_ANALYTICS: 'analytics.predictive',
    SCHEDULED_REPORTS: 'reports.scheduled',
    EXCEL_UPLOAD: 'submission.excel_upload',
    API_ACCESS: 'submission.api_access',
    VAULT_OCR: 'vault.ocr',
    AUDIT_INDEFINITE: 'audit.indefinite',
    BENCHMARKING: 'analytics.benchmarking',
    // Statutory (always free — listed for documentation; never gate these)
    DATA_FILING: 'submission.data_filing',
    COMPLIANCE_SCORE: 'compliance.score_view',
    SERVICES_TRACKER: 'services.basic_tracker',
    VAULT_BASIC: 'vault.basic_storage',
};

// Tier rank ordering — used to compute "required tier" for upgrade messaging.
const TIER_RANK = { free_starter: 0, sme_pro: 1, enterprise_suite: 2 };

// Storage limits per tier (MB). Mirror the SubscriptionPlans frontend.
const STORAGE_LIMITS_MB = {
    free_starter: 10,
    sme_pro: 1024,       // 1 GB
    enterprise_suite: 102400, // 100 GB
};

const GRACE_PERIOD_DAYS = 7; // past_due grace before hard-gating

/**
 * resolveTierColumn — given a tier string, return the matching boolean
 * column name in tier_feature_access. Falls back to free_starter.
 */
function tierColumn(tier) {
    if (tier === 'sme_pro') return 'sme_pro';
    if (tier === 'enterprise_suite') return 'enterprise_suite';
    return 'free_starter'; // default + unknown tiers get the free column
}

/**
 * requireFeature(featureKey) — Express middleware.
 * Place it AFTER requireRole on any value-added route:
 *   router.post('/bulk', requireRole(['industry']), requireFeature(TIER_FEATURES.EXCEL_UPLOAD), handler)
 *
 * Admin/govt always bypass (internal cost-centre). Statutory features
 * always pass. Industry callers are checked against their tier.
 */
function requireFeature(featureKey) {
    return async (req, res, next) => {
        // No user (unauthenticated route) — shouldn't happen if requireRole
        // ran first, but fail safe.
        if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

        // Admin & govt are internal cost-centres — never billed, never gated.
        if (req.user.role === 'admin' || req.user.role === 'govt') {
            return next();
        }

        // Non-industry roles that aren't admin/govt — allow (defensive).
        if (req.user.role !== 'industry') {
            return next();
        }

        try {
            // Fetch the caller's tier + status in one query.
            const subRow = await db.query(
                `SELECT subscription_tier, subscription_status, last_payment_date
                   FROM industry_profiles WHERE user_id = $1 LIMIT 1`,
                [req.user.id]
            );
            if (!subRow.rows.length) {
                // No profile — treat as free_starter (safest default).
                req.subscription = { tier: 'free_starter', status: 'active' };
            } else {
                const s = subRow.rows[0];
                req.subscription = {
                    tier: s.subscription_tier || 'free_starter',
                    status: s.subscription_status || 'active',
                    lastPaymentDate: s.last_payment_date,
                };
            }

            const { tier, status, lastPaymentDate } = req.subscription;

            // Grace-period check: if past_due, allow for GRACE_PERIOD_DAYS
            // after the last payment, then hard-gate with BILLING_FAILED.
            if (status === 'past_due' && lastPaymentDate) {
                const daysSince = (Date.now() - new Date(lastPaymentDate).getTime()) / (1000 * 60 * 60 * 24);
                if (daysSince > GRACE_PERIOD_DAYS) {
                    return res.status(402).json({
                        code: 'BILLING_FAILED',
                        message: 'Payment is overdue. Please update your billing to restore access.',
                        current_tier: tier,
                    });
                }
            }
            // Cancelled subscriptions lose value-added access immediately.
            if (status === 'cancelled') {
                return res.status(403).json({
                    code: 'SUBSCRIPTION_CANCELLED',
                    message: 'Your subscription has been cancelled.',
                    current_tier: 'free_starter',
                });
            }

            // Look up the feature in the access matrix.
            const col = tierColumn(tier);
            const feat = await db.query(
                `SELECT feature_name, is_statutory, ${col} AS allowed
                   FROM tier_feature_access WHERE feature_key = $1`,
                [featureKey]
            );

            // Unknown feature key — fail open (don't block on a misconfigured
            // gate; log it so an admin notices).
            if (!feat.rows.length) {
                console.warn(`[subscriptionGuard] Unknown feature key: ${featureKey} — allowing.`);
                return next();
            }

            const f = feat.rows[0];

            // Statutory features are ALWAYS allowed — the non-negotiable guardrail.
            if (f.is_statutory) return next();

            // Value-added feature — check the tier's boolean column.
            if (f.allowed) return next();

            // Denied — figure out the minimum tier that HAS this feature,
            // for a helpful upgrade message.
            const minTier = await db.query(
                `SELECT
                    CASE
                        WHEN enterprise_suite THEN 'enterprise_suite'
                        WHEN sme_pro THEN 'sme_pro'
                        ELSE 'free_starter'
                    END AS required_tier
                   FROM tier_feature_access WHERE feature_key = $1`,
                [featureKey]
            );

            return res.status(403).json({
                code: 'UPGRADE_REQUIRED',
                message: `${f.feature_name} requires a higher subscription tier.`,
                feature: featureKey,
                feature_name: f.feature_name,
                current_tier: tier,
                required_tier: minTier.rows.length ? minTier.rows[0].required_tier : 'enterprise_suite',
            });
        } catch (err) {
            console.error('[subscriptionGuard] Error:', err.message);
            // Fail open on infrastructure errors — never block statutory work
            // because the gating query failed. Log loudly so it's noticed.
            return next();
        }
    };
}

module.exports = {
    requireFeature,
    TIER_FEATURES,
    TIER_RANK,
    STORAGE_LIMITS_MB,
    tierColumn,
};
