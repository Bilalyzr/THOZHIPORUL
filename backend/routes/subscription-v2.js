// subscription-v2.js — Redesigned subscription plans reflecting the ACTUAL
// current software capabilities (post intelligence upgrade + agentic AI layer).
//
// DESIGN PRINCIPLES:
//   1. Statutory filing is ALWAYS FREE (constitutional — not a feature)
//   2. Value-add features distributed by real capability cost + user benefit
//   3. AI/Agentic features tiered by sophistication (not all-or-nothing)
//   4. Storage sized for real usage (filing PDFs are ~200KB each)
//   5. API access at mid-tier for ERP/scheduled pushing
//
// TIERS:
//   ┌─────────────┬──────────────────┬──────────────────┬────────────────────┐
//   │             │  STARTER (Free)  │  PROFESSIONAL    │  ENTERPRISE         │
//   │             │                  │  ₹4,999/mo       │  ₹24,999/mo         │
//   ├─────────────┼──────────────────┼──────────────────┼────────────────────┤
//   │ Filing      │ Full access      │ Full access      │ Full access         │
//   │ Validation  │ ✅ Server-side   │ ✅ + cross-metric │ ✅ + AI corroboration│
//   │ History     │ ✅ Versioned     │ ✅ + diff export │ ✅ + investigation   │
//   │ Calendar    │ ✅ Deadlines     │ ✅ + auto-remind │ ✅ + escalation      │
//   │ Compliance  │ ✅ Score view    │ ✅ + trends      │ ✅ + AI analysis     │
//   │ Anomaly     │ Basic (POP%)     │ + IQR + version  │ + AI corroboration  │
//   │ Forecasting │ ❌               │ ✅ Quarterly     │ ✅ + ETS + capacity  │
//   │ Analytics   │ Own data only    │ + Park benchmark │ + State-wide + NL   │
//   │ Documents   │ 50MB (≈250 PDFs) │ 5GB             │ 50GB + OCR          │
//   │ Reports     │ Basic CSV        │ PDF + XLSX       │ + Scheduled + AI    │
//   │ API Access  │ ❌               │ ✅ Scoped key    │ ✅ + Webhooks        │
//   │ AI Assistant│ ❌               │ ✅ DB-backed     │ ✅ + Agentic flows   │
//   │ Support     │ Community        │ Priority (24h)   │ Dedicated + SLA     │
//   └─────────────┴──────────────────┴──────────────────┴────────────────────┘
//
// PRICING RATIONALE (based on SIPCOT context):
//   - Professional: ₹4,999/mo — targets SMEs (50-500 employees) who need
//     forecasting + benchmarking + API push. Reasonable for the value.
//   - Enterprise: ₹24,999/mo — targets large units (Hyundai, Foxconn, TCS)
//     with multi-park operations, agentic workflows, ERP integration needs.

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');
const { recordAudit } = require('./audit');

// ============================================================
// PLAN DEFINITIONS — mirrors the actual feature matrix
// ============================================================

const PLANS_V2 = {
    starter: {
        key: 'starter',
        name: 'Starter',
        tagline: 'Statutory compliance — free forever',
        monthlyPrice: 0,
        annualPrice: 0,
        currency: 'INR',
        targetUser: 'Small units (< 50 employees), new allottees',
        maxSubmissionsPerYear: 12,       // quarterly + amendments
        maxAttachmentsPerFiling: 2,
        storageLimitMB: 50,
        maxApiCallsPerMonth: 0,
        supportSLA: 'community',
        features: {
            filing: { quarterly: true, annual: true, bulkCsv: false, apiPush: false },
            validation: { serverSide: true, crossField: true, crossMetric: false, aiCorroboration: false },
            history: { versioned: true, diffExport: false, investigation: false },
            calendar: { deadlines: true, autoReminders: true, escalation: false },
            compliance: { scoreView: true, trends: false, aiAnalysis: false },
            anomaly: { popChange: true, iqr: false, versionChange: false, corroboration: false },
            forecasting: { enabled: false },
            analytics: { ownData: true, parkBenchmark: false, statewide: false, nlQuery: false },
            documents: { vault: true, ocr: false, autoExpiry: true },
            reports: { basicCsv: true, pdfExport: false, xlsxExport: false, scheduled: false, aiGenerated: false },
            ai: { assistantChat: false, agenticWorkflows: false },
            notifications: { inApp: true, email: true, sms: false, digest: true },
        },
    },
    professional: {
        key: 'professional',
        name: 'Professional',
        tagline: 'For growing industries that need foresight',
        monthlyPrice: 4999,
        annualPrice: 49990,      // 2 months free
        currency: 'INR',
        targetUser: 'SMEs (50-500 employees), established units',
        maxSubmissionsPerYear: 48,       // quarterly + monthly + amendments
        maxAttachmentsPerFiling: 5,
        storageLimitMB: 5120,            // 5 GB
        maxApiCallsPerMonth: 10000,
        supportSLA: 'priority_24h',
        features: {
            filing: { quarterly: true, annual: true, bulkCsv: true, apiPush: true },
            validation: { serverSide: true, crossField: true, crossMetric: true, aiCorroboration: false },
            history: { versioned: true, diffExport: true, investigation: false },
            calendar: { deadlines: true, autoReminders: true, escalation: true },
            compliance: { scoreView: true, trends: true, aiAnalysis: false },
            anomaly: { popChange: true, iqr: true, versionChange: true, corroboration: false },
            forecasting: { enabled: true, models: ['linear_regression', 'moving_average'], horizons: 4 },
            analytics: { ownData: true, parkBenchmark: true, statewide: false, nlQuery: false },
            documents: { vault: true, ocr: false, autoExpiry: true },
            reports: { basicCsv: true, pdfExport: true, xlsxExport: true, scheduled: true, aiGenerated: false },
            ai: { assistantChat: true, agenticWorkflows: false },
            notifications: { inApp: true, email: true, sms: true, digest: true },
        },
    },
    enterprise: {
        key: 'enterprise',
        name: 'Enterprise',
        tagline: 'Full industrial intelligence for large operations',
        monthlyPrice: 24999,
        annualPrice: 249990,     // 2 months free
        currency: 'INR',
        targetUser: 'Large units (500+ employees), multi-park operations',
        maxSubmissionsPerYear: -1,        // unlimited
        maxAttachmentsPerFiling: 10,
        storageLimitMB: 51200,            // 50 GB
        maxApiCallsPerMonth: -1,          // unlimited
        supportSLA: 'dedicated_4h',
        features: {
            filing: { quarterly: true, annual: true, bulkCsv: true, apiPush: true },
            validation: { serverSide: true, crossField: true, crossMetric: true, aiCorroboration: true },
            history: { versioned: true, diffExport: true, investigation: true },
            calendar: { deadlines: true, autoReminders: true, escalation: true },
            compliance: { scoreView: true, trends: true, aiAnalysis: true },
            anomaly: { popChange: true, iqr: true, versionChange: true, corroboration: true },
            forecasting: { enabled: true, models: ['holt_winters_ets', 'linear_regression', 'moving_average'], horizons: 4, capacityPlanning: true },
            analytics: { ownData: true, parkBenchmark: true, statewide: true, nlQuery: true },
            documents: { vault: true, ocr: true, autoExpiry: true },
            reports: { basicCsv: true, pdfExport: true, xlsxExport: true, scheduled: true, aiGenerated: true },
            ai: { assistantChat: true, agenticWorkflows: true, copilotInvestigation: true, decisionSupport: true },
            notifications: { inApp: true, email: true, sms: true, digest: true, whatsapp: 'when_available' },
        },
    },
};

// ============================================================
// FEATURE COMPARISON TABLE (for frontend rendering)
// ============================================================

const COMPARISON = [
    { category: 'Statutory Filing', statutory: true, rows: [
        { feature: 'Quarterly data submission', starter: true, professional: true, enterprise: true },
        { feature: 'Server-side validation', starter: true, professional: true, enterprise: true },
        { feature: 'Version history (never lose data)', starter: true, professional: true, enterprise: true },
        { feature: 'Compliance score', starter: true, professional: true, enterprise: true },
        { feature: 'Reporting calendar + reminders', starter: true, professional: true, enterprise: true },
        { feature: 'Document vault', starter: true, professional: true, enterprise: true },
    ]},
    { category: 'Data Quality', statutory: false, rows: [
        { feature: 'Cross-field validation', starter: true, professional: true, enterprise: true },
        { feature: 'Cross-metric consistency checks', starter: false, professional: true, enterprise: true },
        { feature: 'Anomaly detection (POP%)', starter: true, professional: true, enterprise: true },
        { feature: 'Anomaly detection (IQR + version change)', starter: false, professional: true, enterprise: true },
        { feature: 'AI corroboration (expansion coherence)', starter: false, professional: false, enterprise: true },
        { feature: 'Investigation workflow', starter: false, professional: false, enterprise: true },
    ]},
    { category: 'Forecasting & Intelligence', statutory: false, rows: [
        { feature: 'Quarterly forecasting (unit level)', starter: false, professional: true, enterprise: true },
        { feature: 'Holt-Winters ETS (seasonal patterns)', starter: false, professional: false, enterprise: true },
        { feature: 'Park-level demand forecasting', starter: false, professional: false, enterprise: true },
        { feature: 'Capacity planning (water/power gap)', starter: false, professional: false, enterprise: true },
        { feature: 'Natural-language query (ask in English)', starter: false, professional: false, enterprise: true },
    ]},
    { category: 'Analytics', statutory: false, rows: [
        { feature: 'Own industry data + trends', starter: true, professional: true, enterprise: true },
        { feature: 'Park-level benchmarking', starter: false, professional: true, enterprise: true },
        { feature: 'State-wide analytics', starter: false, professional: false, enterprise: true },
        { feature: 'AI assistant (DB-backed chat)', starter: false, professional: true, enterprise: true },
        { feature: 'Agentic workflows (automated investigations)', starter: false, professional: false, enterprise: true },
    ]},
    { category: 'Reports & Export', statutory: false, rows: [
        { feature: 'Basic CSV export', starter: true, professional: true, enterprise: true },
        { feature: 'PDF report export', starter: false, professional: true, enterprise: true },
        { feature: 'Real XLSX (Excel) export', starter: false, professional: true, enterprise: true },
        { feature: 'Scheduled auto-reports', starter: false, professional: true, enterprise: true },
        { feature: 'AI-generated decision reports', starter: false, professional: false, enterprise: true },
    ]},
    { category: 'Integration', statutory: false, rows: [
        { feature: 'Bulk CSV upload', starter: false, professional: true, enterprise: true },
        { feature: 'API access (scoped per-industry key)', starter: false, professional: true, enterprise: true },
        { feature: 'ERP data push (scheduled)', starter: false, professional: true, enterprise: true },
        { feature: 'Document OCR (auto-extract)', starter: false, professional: false, enterprise: true },
    ]},
    { category: 'Notifications', statutory: false, rows: [
        { feature: 'In-app notifications', starter: true, professional: true, enterprise: true },
        { feature: 'Email notifications', starter: true, professional: true, enterprise: true },
        { feature: 'Daily digest batching', starter: true, professional: true, enterprise: true },
        { feature: 'SMS notifications', starter: false, professional: true, enterprise: true },
        { feature: 'WhatsApp (when available)', starter: false, professional: false, enterprise: true },
    ]},
    { category: 'Support', statutory: false, rows: [
        { feature: 'Community support', starter: true, professional: true, enterprise: true },
        { feature: 'Priority support (24h SLA)', starter: false, professional: true, enterprise: true },
        { feature: 'Dedicated account manager', starter: false, professional: false, enterprise: true },
        { feature: 'Custom workflow configuration', starter: false, professional: false, enterprise: true },
    ]},
    { category: 'Limits', statutory: false, rows: [
        { feature: 'Document storage', starter: '50 MB', professional: '5 GB', enterprise: '50 GB' },
        { feature: 'Attachments per filing', starter: '2', professional: '5', enterprise: '10' },
        { feature: 'API calls per month', starter: '—', professional: '10,000', enterprise: 'Unlimited' },
        { feature: 'Submissions per year', starter: '12', professional: '48', enterprise: 'Unlimited' },
    ]},
];

// ============================================================
// API ENDPOINTS
// ============================================================

// GET /api/subscription-v2/plans — full plan definitions + comparison
router.get('/plans', async (req, res) => {
    try {
        res.json({
            plans: Object.values(PLANS_V2),
            comparison: COMPARISON,
            principles: [
                'Statutory filing is always FREE — this is a constitutional obligation, not a feature',
                'Value-add features are priced by the intelligence they unlock',
                'No tier gates access to your own data — only to analytical capabilities',
                'Upgrade/downgrade anytime; no lock-in; pro-rated refunds',
            ],
        });
    } catch (err) {
        console.error('Plans Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// GET /api/subscription-v2/me — current tier + usage + upgrade suggestions
router.get('/me', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT ip.subscription_tier, ip.subscription_status,
                    ip.company_name, ip.subscription_tier as current_plan
               FROM industry_profiles ip
              WHERE ip.user_id = $1`,
            [req.user.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'No industry profile' });

        const profile = rows[0];
        const tierKey = profile.subscription_tier === 'free_starter' ? 'starter'
            : profile.subscription_tier === 'sme_pro' ? 'professional'
            : profile.subscription_tier === 'enterprise_suite' ? 'enterprise'
            : 'starter';
        const plan = PLANS_V2[tierKey];

        // Usage stats
        const usage = await db.query(`
            SELECT
                (SELECT COUNT(*)::int FROM documents d JOIN industry_profiles ip ON ip.id = d.industry_id
                  WHERE ip.user_id = $1) AS document_count,
                (SELECT COALESCE(SUM(d.file_size_kb), 0)::int FROM documents d JOIN industry_profiles ip ON ip.id = d.industry_id
                  WHERE ip.user_id = $1) AS storage_used_kb,
                (SELECT COUNT(*)::int FROM data_submissions ds JOIN industry_profiles ip ON ip.id = ds.industry_id
                  WHERE ip.user_id = $1 AND ds.submitted_at > NOW() - INTERVAL '1 year') AS submissions_this_year,
                (SELECT COUNT(*)::int FROM agent_tool_calls atc
                  JOIN agent_workflows aw ON aw.workflow_id = atc.workflow_id
                  WHERE aw.initiated_by = $1 AND atc.created_at > NOW() - INTERVAL '30 days') AS api_calls_this_month`,
            [req.user.id]
        ).catch(() => ({ rows: [{ document_count: 0, storage_used_kb: 0, submissions_this_year: 0, api_calls_this_month: 0 }] }));

        const u = usage.rows[0];
        const storageUsedMB = Math.round((u.storage_used_kb || 0) / 1024);

        // Suggest upgrade if hitting limits
        const suggestions = [];
        if (tierKey === 'starter') {
            if (u.submissions_this_year >= 10) suggestions.push('You are near your annual submission limit — Professional offers 48/year');
            if (storageUsedMB > 40) suggestions.push('Your vault is nearly full — Professional includes 5 GB');
        }
        if (tierKey === 'professional' && u.api_calls_this_month > 8000) {
            suggestions.push('You are approaching your API limit — Enterprise offers unlimited calls');
        }

        res.json({
            current_plan: tierKey,
            plan_details: plan,
            status: profile.subscription_status,
            usage: {
                storage_used_mb: storageUsedMB,
                storage_limit_mb: plan.storageLimitMB,
                storage_pct: Math.round(storageUsedMB / plan.storageLimitMB * 100),
                submissions_this_year: u.submissions_this_year,
                submissions_limit: plan.maxSubmissionsPerYear,
                api_calls_this_month: u.api_calls_this_month,
                api_calls_limit: plan.maxApiCallsPerMonth,
            },
            upgrade_suggestions: suggestions,
        });
    } catch (err) {
        console.error('Subscription Me Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// GET /api/subscription-v2/compare — just the comparison table (lightweight)
router.get('/compare', async (req, res) => {
    res.json({ comparison: COMPARISON });
});

// GET /api/subscription-v2/feature/:key — check a specific feature for a tier
router.get('/feature/:key', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    const { key } = req.params;
    const tier = req.query.tier || 'starter';
    const plan = PLANS_V2[tier];
    if (!plan) return res.status(400).json({ error: 'Invalid tier' });

    // Navigate dot-notation key (e.g., "forecasting.enabled", "ai.assistantChat")
    const parts = key.split('.');
    let value = plan.features;
    for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
            value = value[part];
        } else {
            value = undefined;
            break;
        }
    }
    res.json({ feature: key, tier, enabled: !!value, value });
});

module.exports = router;
module.exports.PLANS_V2 = PLANS_V2;
module.exports.COMPARISON = COMPARISON;
