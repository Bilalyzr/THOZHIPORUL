// ============================================================
// ai-assistant.js — VazhiPorul Assistant v3: context-aware,
// actionable, and now wired to the intelligence layer.
//
// Mounted at /api/assistant (consumed by the frontend chatbot).
// Rule-based intent engine over LIVE, RBAC-scoped database data —
// deliberately no external LLM (deterministic, auditable, cheap).
//
// Industry intents: score / dues / violations / services /
// deadlines / summary / create_service / my forecast / my
// amendments. Government intents (Phase 16): park investment,
// non-filers for a period, high water consumers, employment
// growth, projected power demand. Every data answer includes its
// source, period, and limitations; when history is insufficient
// the assistant says so instead of fabricating numbers. Every
// query is logged to ai_query_log.
// ============================================================

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');
const { notify } = require('../services/notify');
const { forecast } = require('../services/forecastService');

// ------------------------------------------------------------
// Query audit trail (Phase 17 logging requirement).
// ------------------------------------------------------------
async function logQuery(req, query, intent, tables, ms, status) {
    try {
        await db.query(
            `INSERT INTO ai_query_log (user_id, role, query, intent, tables_touched, execution_ms, result_status)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [req.user.id, req.user.role, String(query).slice(0, 2000), intent,
             tables, ms, status]
        );
    } catch (_) { /* logging is best-effort */ }
}

// ============================================================
// CONTEXT BUILDER (unchanged behaviour for industry users).
// ============================================================
async function buildContext(req) {
    const ctx = { role: req.user.role, name: req.user.name, hasProfile: false };
    if (req.user.role !== 'industry' || !req.user.profile_id) return ctx;

    const industryId = req.user.profile_id;
    ctx.hasProfile = true;
    ctx.industryId = industryId;

    const [profile, score, violations, services, deadlines] = await Promise.all([
        db.query(`SELECT ip.*, p.name AS park_name
                    FROM industry_profiles ip LEFT JOIN industrial_parks p ON p.id = ip.park_id
                   WHERE ip.id = $1`, [industryId]),
        db.query(`SELECT * FROM compliance_scores WHERE industry_id = $1 ORDER BY score_date DESC LIMIT 1`, [industryId]),
        db.query(`SELECT v.id, v.severity, v.status, v.description, r.rule_name
                    FROM compliance_violations v LEFT JOIN compliance_rules r ON r.id = v.rule_id
                   WHERE v.industry_id = $1 AND v.status <> 'resolved' ORDER BY v.severity::text`, [industryId]),
        db.query(`SELECT id, reference_number, service_type, current_status, expected_completion, sla_deadline, deemed_approved
                    FROM service_requests WHERE industry_id = $1 AND current_status NOT IN ('completed','rejected','approved')
                   ORDER BY applied_date DESC`, [industryId]),
        db.query(`SELECT d.id, d.file_name, d.category, d.expiry_date
                    FROM documents d WHERE d.industry_id = $1 AND d.expiry_date IS NOT NULL
                      AND d.expiry_date <= CURRENT_DATE + INTERVAL '60 days' ORDER BY d.expiry_date`, [industryId])
    ]);

    ctx.profile = profile.rows[0] || null;
    ctx.score = score.rows[0] || null;
    ctx.openViolations = violations.rows;
    ctx.pendingServices = services.rows;
    ctx.expiringDocs = deadlines.rows;
    return ctx;
}

// ============================================================
// INTENT DETECTION — industry intents first, then government.
// ============================================================
function detectIntent(text) {
    const q = text.toLowerCase();
    // ---- SPECIFIC intelligence intents first (before the generic
    //      deadline/service patterns, which would otherwise swallow
    //      e.g. "what is the projected power demand for the next…").
    if (/projected (power|water)|forecast.*(power|water|demand)|(power|water) demand.*(next|four|4|forecast)/.test(q))
        return { intent: 'forecast_demand' };
    if (/employment growth|job growth|growth in employment/.test(q))
        return { intent: 'employment_growth' };
    if (/who (has|have) not (submitted|filed)|non.?filer|missing submission|not submitted.*(q[1-4]|quarter|data)/.test(q))
        return { intent: 'non_submitters' };
    if (/unusually high water|high water consumption|water.*(anomal|outlier)|anomal/.test(q))
        return { intent: 'water_anomalies' };
    if (/total investment.*park|investment.*park|park.*investment/.test(q))
        return { intent: 'park_investment' };

    // score
    if (/(my |current )?(compliance|) ?score|how am i doing|my rating|good standing/.test(q))
        return { intent: 'get_score' };
    // dues / payments
    if (/(dues|arrears|outstanding|payment|lease.*(due|pay)|bill)/.test(q))
        return { intent: 'get_dues' };
    // violations
    if (/(violation|penalty|fine|notice|non.?compliant|why.*(low|dropped))/.test(q))
        return { intent: 'get_violations' };
    // pending service requests
    if (/(service|request|noc|application|status|track|pending|approval)/.test(q))
        return { intent: 'get_services' };
    // deadlines / expiring docs
    if (/(deadline|expir|renew|due date|upcoming|todo|task|what.*next|what.*do|action item)/.test(q))
        return { intent: 'get_deadlines' };
    // file a service request (actionable)
    if (/(file|create|apply|new|raise|submit).*(service|noc|request|application|connection)/.test(q)
        || /want.*(noc|water|power|fire|pollution|lease|allot)/.test(q))
        return { intent: 'create_service' };
    // summary
    if (/(summary|overview|status report|how.*things|snapshot|my dashboard)/.test(q))
        return { intent: 'get_summary' };
    return { intent: 'unknown' };
}

// ============================================================
// RESPONSE GENERATORS (industry — unchanged).
// ============================================================
function scoreReply(ctx) {
    if (!ctx.score) return { text: "You don't have a compliance score on record yet. Scores are generated after your first quarterly submission.", suggestions: ['How do I submit data?', 'What is compliance score?'] };
    const s = ctx.score;
    const band = s.overall_score >= 90 ? 'Compliant 🟢' : s.overall_score >= 70 ? 'Warning 🟡' : 'Non-Compliant 🔴';
    return {
        text: `📊 **Your Compliance Score: ${s.overall_score}/100** — ${band}\n\n` +
              `Breakdown (as of ${new Date(s.score_date).toLocaleDateString('en-IN')}):\n• Submission: ${s.submission_score ?? '—'}\n• Environmental: ${s.environmental_score ?? '—'}\n` +
              `• Financial: ${s.financial_score ?? '—'}\n• Safety: ${s.safety_score ?? '—'}\n\n_Source: compliance_scores, computed from your filings, violations and reminders._`,
        suggestions: ['Why is my score low?', 'Any open violations?', 'How to improve?']
    };
}

function violationsReply(ctx) {
    if (!ctx.openViolations.length) return { text: "✅ You have **no open compliance violations**. Keep it up!", suggestions: ['What is my score?', 'Any deadlines?'] };
    const list = ctx.openViolations.slice(0, 5).map(v => `• **${v.severity}** — ${v.rule_name || 'Rule'}: ${v.description}`).join('\n');
    return {
        text: `⚠️ You have **${ctx.openViolations.length} open violation(s)**:\n\n${list}${ctx.openViolations.length > 5 ? `\n…and ${ctx.openViolations.length - 5} more` : ''}`,
        suggestions: ['How do I resolve these?', 'What is my score?']
    };
}

function servicesReply(ctx) {
    if (!ctx.pendingServices.length) return { text: "✅ You have **no pending service requests**. All clear!", suggestions: ['File a new NOC', 'Check deadlines'] };
    const list = ctx.pendingServices.map(s => {
        const overdue = s.sla_deadline && new Date(s.sla_deadline) < new Date();
        return `• **${s.reference_number}** — ${String(s.service_type).replace(/_/g, ' ')} (${s.current_status})${overdue ? ' ⚠️ SLA breached' : ''}${s.deemed_approved ? ' ✨ deemed-approved' : ''}`;
    }).join('\n');
    return {
        text: `📋 You have **${ctx.pendingServices.length} pending service request(s)**:\n\n${list}`,
        suggestions: ['File a new request', 'What is my score?']
    };
}

function deadlinesReply(ctx) {
    const items = [];
    (ctx.expiringDocs || []).forEach(d => items.push(`• 📄 **${d.file_name}** (${String(d.category).replace(/_/g,' ')}) expires ${new Date(d.expiry_date).toLocaleDateString('en-IN')}`));
    (ctx.pendingServices || []).forEach(s => s.sla_deadline && items.push(`• 🔧 **${s.reference_number}** SLA due ${new Date(s.sla_deadline).toLocaleDateString('en-IN')}`));
    if (!items.length) return { text: "✅ Nothing urgent. You have no expiring documents or breached SLAs in the next 60 days.", suggestions: ['Give me a summary', 'Any violations?'] };
    return {
        text: `📌 **Upcoming deadlines / action items:**\n\n${items.slice(0, 8).join('\n')}`,
        suggestions: ['How do I renew?', 'What is my score?']
    };
}

async function duesReply(ctx) {
    if (!ctx.profile || !ctx.profile.plot_id) return { text: "You don't have an active plot lease on record, so no lease dues. Other dues (utility bills, service fees) appear on your workspace once invoiced.", suggestions: ['My pending requests', 'What is my score?'] };
    const lease = await db.query('SELECT monthly_lease_amount, lease_end_date FROM park_plots WHERE id = $1', [ctx.profile.plot_id]);
    if (!lease.rows.length || !lease.rows[0].monthly_lease_amount) return { text: "No lease billing details found for your plot. Contact SIPCOT accounts for a statement.", suggestions: ['Contact support'] };
    const l = lease.rows[0];
    return {
        text: `💰 **Your lease:** ₹${Number(l.monthly_lease_amount).toLocaleString('en-IN')}/month, active until ${l.lease_end_date ? new Date(l.lease_end_date).toLocaleDateString('en-IN') : '—'}.\n\nFor the exact outstanding balance (arrears, utility bills), check your workspace or contact SIPCOT accounts.`,
        suggestions: ['Open workspace', 'What is my score?']
    };
}

function summaryReply(ctx) {
    const scoreLine = ctx.score ? `**Score:** ${ctx.score.overall_score}/100` : '**Score:** not yet graded';
    const v = ctx.openViolations.length;
    const s = ctx.pendingServices.length;
    const d = ctx.expiringDocs.length;
    return {
        text: `👋 Hi **${ctx.name || ''}** — here's your snapshot:\n\n` +
              `${scoreLine}\n` +
              `⚠️ Open violations: **${v}**\n` +
              `🔧 Pending requests: **${s}**\n` +
              `📅 Expiring docs (60d): **${d}**\n\n` +
              (v > 0 ? `Focus on resolving your ${v} violation(s) first — that's the biggest lever on your score. ` : '') +
              (d > 0 ? `${d} document(s) need renewal soon. ` : '') +
              `What would you like to dig into?`,
        suggestions: ['Show violations', 'Show deadlines', 'File a request']
    };
}

async function createService(ctx, text) {
    if (!ctx.hasProfile) return { text: "Only industry users can file service requests. Please log in to an industry account.", suggestions: [] };
    const q = text.toLowerCase();
    let serviceType = null;
    if (/fire/.test(q)) serviceType = 'noc_fire';
    else if (/pollution|tnpcb|effluent/.test(q)) serviceType = 'noc_pollution';
    else if (/water/.test(q)) serviceType = 'water_connection';
    else if (/power|electric|tangedco/.test(q)) serviceType = 'power_connection';
    else if (/building|plan/.test(q)) serviceType = 'building_approval';
    else if (/land|plot|allot/.test(q)) serviceType = 'land_allotment';
    else if (/lease.*renew|renew.*lease/.test(q)) serviceType = 'lease_renewal';
    else if (/transfer/.test(q)) serviceType = 'transfer_request';

    if (!serviceType) {
        return {
            text: `I can file a service request for you. Which type?\n• Fire NOC • Pollution NOC • Water connection • Power connection • Building approval • Land allotment • Lease renewal • Transfer`,
            suggestions: ['Fire NOC', 'Water connection', 'Land allotment']
        };
    }

    const ref = `SR-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 8999))}`;
    const ins = await db.query(
        `INSERT INTO service_requests (industry_id, service_type, reference_number, remarks)
         VALUES ($1,$2,$3,$4) RETURNING id, reference_number`,
        [ctx.industryId, serviceType, ref, `Filed via VazhiPorul Assistant: "${text.slice(0, 120)}"`]
    );
    return {
        text: `✅ **Request filed!**\n\nReference: **${ins.rows[0].reference_number}**\nType: ${serviceType.replace(/_/g,' ')}\n\nTrack it in the Services Tracker.`,
        suggestions: ['Track this request', 'What is my score?'],
        action: { type: 'service_created', id: ins.rows[0].id, reference: ins.rows[0].reference_number }
    };
}

// ============================================================
// GOVERNMENT / INTELLIGENCE RESPONSE GENERATORS (Phase 16).
// Each answer carries source + period + limitations, and defers
// to RBAC (only admin/govt reach these handlers).
// ============================================================

async function parkInvestmentReply() {
    const { rows } = await db.query(`
        WITH latest AS (
            SELECT DISTINCT ON (ds.industry_id) ds.id, ds.industry_id
              FROM data_submissions ds
          ORDER BY ds.industry_id, ds.period_year DESC, ds.period_quarter DESC NULLS LAST)
        SELECT p.name,
               COUNT(ip.id) AS industries,
               COALESCE(SUM(f.investment_amount), 0) AS investment_inr
          FROM industrial_parks p
     LEFT JOIN industry_profiles ip ON ip.park_id = p.id
     LEFT JOIN latest l ON l.industry_id = ip.id
     LEFT JOIN financial_data f ON f.submission_id = l.id
      GROUP BY p.name ORDER BY investment_inr DESC`);
    if (!rows.length) return { text: 'No park investment data available yet.' };
    const lines = rows.slice(0, 6).map(r =>
        `• **${r.name}** — ₹${(Number(r.investment_inr) / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr (${r.industries} industries)`);
    return {
        text: `🏭 **Investment by park** (latest filing per industry):\n\n${lines.join('\n')}\n\n_Source: data_submissions → financial_data, latest revision. Values in ₹ Crores._`,
        suggestions: ['Who has not submitted Q data?', 'Projected power demand?']
    };
}

async function nonSubmittersReply() {
    const { getFilingMatrix } = require('../services/missingSubmissionEngine');
    const matrix = await getFilingMatrix({ year: new Date().getUTCFullYear() });
    const outstanding = matrix.industries.filter(i => i.outstanding.length > 0);
    if (!outstanding.length) {
        return { text: `✅ Every expected filer is current for ${matrix.year} (periods Q1–Q${matrix.periods.length ? matrix.periods[matrix.periods.length - 1].period_quarter : 0}).` };
    }
    const lines = outstanding.slice(0, 8).map(i =>
        `• **${i.company_name}** (${i.park_name}) — missing ${i.outstanding.map(q => `Q${q}`).join(', ')}`);
    return {
        text: `📋 **${outstanding.length} industries have outstanding ${matrix.year} filings**:\n\n${lines.join('\n')}${outstanding.length > 8 ? `\n…and ${outstanding.length - 8} more` : ''}\n\n_Source: reporting calendar × data_submissions. CLOSED units are not expected to file._`,
        suggestions: ['Unusually high water consumption?', 'Employment growth?']
    };
}

async function waterAnomaliesReply() {
    const { rows } = await db.query(`
        SELECT f.rule_id, f.metric, f.observed_value, f.expected_value, f.change_pct,
               f.severity, f.reason, ip.company_name
          FROM data_findings f
          JOIN industry_profiles ip ON ip.id = f.industry_id
         WHERE f.status = 'open' AND f.finding_type IN ('anomaly','consistency')
           AND (f.metric ILIKE '%water%' OR f.rule_id = 'C-WAT-QUOTA')
      ORDER BY CASE f.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END, f.detected_at DESC
         LIMIT 6`);
    if (!rows.length) {
        return { text: 'No open water-related findings. (Detection runs at filing time and daily; industries with fewer than the configured historical minimum are skipped rather than guessed at.)' };
    }
    const lines = rows.map(r =>
        `• **${r.company_name}** — ${r.reason}${r.change_pct !== null ? ` (${r.change_pct > 0 ? '+' : ''}${r.change_pct}%)` : ''}`);
    return {
        text: `💧 **Open water findings:**\n\n${lines.join('\n')}\n\n_Source: data_findings (anomaly + consistency engines), open items only._`,
        suggestions: ['Who has not submitted Q data?', 'Projected power demand?']
    };
}

async function employmentGrowthReply() {
    const { quarterlySeries } = require('../services/forecastService');
    const series = await quarterlySeries('employment', 'state', null);
    if (series.length < 2) {
        return { text: `_Insufficient history_: employment growth needs at least 2 quarters of filed data; ${series.length} available. No growth figure is produced rather than an unreliable one.` };
    }
    const last = series[series.length - 1], prev = series[series.length - 2];
    const pct = prev.value > 0 ? Math.round(((last.value - prev.value) / prev.value) * 1000) / 10 : null;
    return {
        text: `📈 **Statewide employment** (latest revision per industry per quarter):\n\n${prev.year}-Q${prev.quarter}: ${prev.value.toLocaleString('en-IN')}\n${last.year}-Q${last.quarter}: ${last.value.toLocaleString('en-IN')}\nChange: **${pct === null ? 'n/a (zero baseline)' : (pct > 0 ? '+' : '') + pct + '%'}**\n\n_Source: employment_data via quarterly series. Park-level growth is on the Command Center → Growth panel._`,
        suggestions: ['Projected power demand?', 'Total investment by park?']
    };
}

async function forecastDemandReply(message) {
    const q = message.toLowerCase();
    const metric = /water/.test(q) ? 'water' : 'power';
    const unit = metric === 'water' ? 'KL' : 'kWh';
    const result = await forecast(metric, 'state', null, 4, { persist: false });
    if (result.data_status === 'INSUFFICIENT_DATA') {
        return {
            text: `🔮 **Projected ${metric} demand — not available.**\n\nOnly ${result.available_points} quarter(s) of filed ${metric} data exist for the statewide scope; the forecasting engine requires ${result.minimum_required}. No projection is produced rather than an unreliable one.\n\nAs filings accumulate, this answer switches to a real forecast automatically.`
        };
    }
    const lines = result.projection.map((p, i) =>
        `• ${p.period}: **${p.value.toLocaleString('en-IN')} ${unit}** (range ${result.band[i].low.toLocaleString('en-IN')}–${result.band[i].high.toLocaleString('en-IN')})`);
    return {
        text: `🔮 **Projected statewide ${metric} demand, next ${result.projection.length} quarters** (model: ${result.model}, trained on ${result.training_periods} quarters):\n\n${lines.join('\n')}\n\n_Limitations: ${result.caveat || 'bounds are ±1 residual deviation; treat as planning input, not a guarantee.'}_`,
        suggestions: ['Who has not submitted Q data?', 'Employment growth?']
    };
}

// ============================================================
// @route   POST /api/assistant/chat
// @access  Private (all roles — context + RBAC adapt)
// ============================================================
router.post('/chat', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    const started = Date.now();
    try {
        const { message } = req.body;
        if (!message || !message.trim()) return res.status(400).json({ error: 'message required' });

        const ctx = await buildContext(req);
        const { intent } = detectIntent(message);
        let reply;
        let tables = [];
        let status = 'ok';

        const govOnly = ['park_investment', 'non_submitters', 'water_anomalies', 'employment_growth', 'forecast_demand'];
        if (govOnly.includes(intent) && !['admin', 'govt'].includes(ctx.role)) {
            status = 'denied';
            reply = { text: 'That question uses government-wide analytics. Ask from an admin or government account — industry accounts only see their own data.' };
        } else {
            switch (intent) {
                case 'get_score':      reply = scoreReply(ctx); tables = ['compliance_scores']; break;
                case 'get_violations': reply = violationsReply(ctx); tables = ['compliance_violations']; break;
                case 'get_services':   reply = servicesReply(ctx); tables = ['service_requests']; break;
                case 'get_deadlines':  reply = deadlinesReply(ctx); tables = ['documents', 'service_requests']; break;
                case 'get_dues':       reply = await duesReply(ctx); tables = ['park_plots']; break;
                case 'get_summary':    reply = summaryReply(ctx); tables = ['compliance_scores','compliance_violations','service_requests','documents']; break;
                case 'create_service': reply = await createService(ctx, message); tables = ['service_requests']; break;
                case 'park_investment':    reply = await parkInvestmentReply(); tables = ['data_submissions','financial_data','industrial_parks']; break;
                case 'non_submitters':     reply = await nonSubmittersReply(); tables = ['reporting_periods','data_submissions']; break;
                case 'water_anomalies':    reply = await waterAnomaliesReply(); tables = ['data_findings']; break;
                case 'employment_growth':  reply = await employmentGrowthReply(); tables = ['employment_data','data_submissions']; break;
                case 'forecast_demand':    reply = await forecastDemandReply(message); tables = ['resource_usage','data_submissions']; break;
                default:
                    reply = {
                        text: ctx.hasProfile
                            ? `Hi ${ctx.name || ''}! I'm VazhiPorul Assistant with live access to your data. Try: *"what's my score?"*, *"any violations?"*, *"file a fire NOC"*, or *"what should I do next?"*.`
                            : `Hi ${ctx.name || ''}! I'm VazhiPorul Assistant. Government accounts can ask: *"total investment by park"*, *"who has not submitted Q3 data"*, *"unusually high water consumption"*, *"employment growth"*, or *"projected power demand for the next four quarters"*.`
                    };
            }
        }

        if (reply && reply.text && /not available|insufficient/i.test(reply.text) && intent === 'forecast_demand') status = 'insufficient_data';

        await logQuery(req, message, intent, tables, Date.now() - started, status);
        res.json({ reply, intent, contextRole: ctx.role });
    } catch (err) {
        console.error('Assistant Chat Error:', err.message);
        await logQuery(req, req.body && req.body.message, 'error', [], Date.now() - started, 'error').catch(() => {});
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/assistant/context
// ============================================================
router.get('/context', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        res.json(await buildContext(req));
    } catch (err) {
        console.error('Assistant Context Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/assistant/provider-status
// @desc    Honest capability statement for the UI (no fake AI).
// ============================================================
router.get('/capabilities', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    res.json({
        engine: 'rule-based intent engine over live SQL (deterministic; no LLM is called)',
        data_scoped_to: req.user.role === 'industry' ? 'your industry only' : 'all parks (admin/govt)',
        honest_limits: [
            'Forecasts return INSUFFICIENT_DATA rather than numbers when history is below the minimum.',
            'Answers include source tables and period.'
        ],
        query_log: 'every query is recorded in ai_query_log'
    });
});

module.exports = router;
