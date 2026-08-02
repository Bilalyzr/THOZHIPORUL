// ============================================================
// ai-assistant.js — VazhiPorul AI v2: context-aware + actionable (Top 3-B)
//
// Mounted at /api/assistant. Gives the existing chatbot REAL user
// context (their compliance score, open violations, pending service
// requests, upcoming deadlines) and lets it perform actions on the
// user's behalf (file a service request, summarise their status).
//
// The chatbot UI in AIChatbot.jsx keeps its static knowledge base —
// this route ADDS live, per-user intelligence. Both coexist.
//
// Intent engine: rule-based (no external LLM dependency). Maps natural
// language to { intent, entities } then resolves the response from the
// database. Cheap, fast, deterministic — perfect for a gov portal.
// ============================================================

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');
const { notify } = require('../services/notify');

// ============================================================
// CONTEXT BUILDER — assemble everything we know about this user.
// The assistant uses this to answer "what's my score?", "any dues?",
// "what should I do next?" without the user spelling it out.
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
// INTENT DETECTION — maps free-text to a structured intent.
// ============================================================
function detectIntent(text) {
    const q = text.toLowerCase();
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
// RESPONSE GENERATORS — turn an intent + context into a reply.
// ============================================================
function scoreReply(ctx) {
    if (!ctx.score) return { text: "You don't have a compliance score on record yet. Scores are generated after your first quarterly submission.", suggestions: ['How do I submit data?', 'What is compliance score?'] };
    const s = ctx.score;
    const band = s.overall_score >= 90 ? 'Compliant 🟢' : s.overall_score >= 70 ? 'Warning 🟡' : 'Non-Compliant 🔴';
    return {
        text: `📊 **Your Compliance Score: ${s.overall_score}/100** — ${band}\n\n` +
              `Breakdown:\n• Submission: ${s.submission_score ?? '—'}\n• Environmental: ${s.environmental_score ?? '—'}\n` +
              `• Financial: ${s.financial_score ?? '—'}\n• Safety: ${s.safety_score ?? '—'}`,
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
    ctx.expiringDocs.forEach(d => items.push(`• 📄 **${d.file_name}** (${String(d.category).replace(/_/g,' ')}) expires ${new Date(d.expiry_date).toLocaleDateString('en-IN')}`));
    ctx.pendingServices.forEach(s => s.sla_deadline && items.push(`• 🔧 **${s.reference_number}** SLA due ${new Date(s.sla_deadline).toLocaleDateString('en-IN')}`));
    if (!items.length) return { text: "✅ Nothing urgent. You have no expiring documents or breached SLAs in the next 60 days.", suggestions: ['Give me a summary', 'Any violations?'] };
    return {
        text: `📌 **Upcoming deadlines / action items:**\n\n${items.slice(0, 8).join('\n')}`,
        suggestions: ['How do I renew?', 'What is my score?']
    };
}

async function duesReply(ctx) {
    // Lease dues come from the plot lease; check if a lease is active.
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

// ============================================================
// ACTION: create_service — file a service request from chat.
// ============================================================
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
        [ctx.industryId, serviceType, ref, `Filed via VazhiPorul AI: "${text.slice(0, 120)}"`]
    );
    return {
        text: `✅ **Request filed!**\n\nReference: **${ins.rows[0].reference_number}**\nType: ${serviceType.replace(/_/g,' ')}\n\nTrack it in the Services Tracker. I'll also notify you on status changes.`,
        suggestions: ['Track this request', 'What is my score?'],
        action: { type: 'service_created', id: ins.rows[0].id, reference: ins.rows[0].reference_number }
    };
}

// ============================================================
// @route   POST /api/assistant/chat
// @desc    Context-aware assistant turn. Returns a reply + optional
//          action payload the UI can act on (e.g. navigate).
// @access  Private (all roles — context adapts)
// ============================================================
router.post('/chat', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || !message.trim()) return res.status(400).json({ error: 'message required' });

        const ctx = await buildContext(req);
        const { intent } = detectIntent(message);
        let reply;

        switch (intent) {
            case 'get_score':      reply = scoreReply(ctx); break;
            case 'get_violations': reply = violationsReply(ctx); break;
            case 'get_services':   reply = servicesReply(ctx); break;
            case 'get_deadlines':  reply = deadlinesReply(ctx); break;
            case 'get_dues':       reply = await duesReply(ctx); break;
            case 'get_summary':    reply = summaryReply(ctx); break;
            case 'create_service': reply = await createService(ctx, message); break;
            default:
                reply = {
                    text: ctx.hasProfile
                        ? `Hi ${ctx.name || ''}! I'm VazhiPorul AI with live access to your account now. Try: *"what's my score?"*, *"any violations?"*, *"file a fire NOC"*, or *"what should I do next?"*.`
                        : `Hi ${ctx.name || ''}! I'm VazhiPorul AI. Ask me about parks, services, compliance, or schemes. (Live account insights unlock for industry users.)`,
                    suggestions: ctx.hasProfile
                        ? ['What is my score?', 'Any deadlines?', 'File a request']
                        : ['Show industrial parks', 'What services are available?', 'How to register?']
                };
        }
        res.json({ reply, intent, contextRole: ctx.role });
    } catch (err) {
        console.error('Assistant Chat Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/assistant/context
// @desc    Return just the live context (for the chatbot sidebar /
//          proactive nudges without a chat turn).
// @access  Private
// ============================================================
router.get('/context', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        res.json(await buildContext(req));
    } catch (err) {
        console.error('Assistant Context Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
