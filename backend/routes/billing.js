// ============================================================
// billing.js — Payments & Subscription enhancements (Module 13)
//
// Mounted at /api/billing. ADDITIVE to /api/payments (which keeps the
// Razorpay order+verify flow). Adds the financial-ops layer:
//   • GST-compliant invoices + receipts
//   • Subscription lifecycle (auto-renew, past_due, prorated upgrades)
//   • Dunning control (failed-payment retry already runs in scheduler)
//   • Usage-based tier evaluation
//
// GST: 18% on SaaS subscriptions (standard rate). Invoice numbers
// follow GSTN convention: TZP/<fy>/<seq>.
// ============================================================

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');
const { notify } = require('../services/notify');

const GST_RATE = 0.18; // 18% GST on SaaS

// Plan catalog (mirrors subscription_tier_design.md).
const PLANS = {
    basic:     { name: 'Basic',      price: 12000,  gst: 12000 * GST_RATE },
    pro:       { name: 'Pro',        price: 36000,  gst: 36000 * GST_RATE },
    enterprise:{ name: 'Enterprise', price: 120000, gst: 120000 * GST_RATE }
};

function financialYear(date = new Date()) {
    const y = date.getFullYear();
    const fy = date.getMonth() >= 3 ? [y, y + 1] : [y - 1, y];
    return `${String(fy[0]).slice(2)}-${String(fy[1]).slice(2)}`;
}

async function nextInvoiceSeq(client) {
    const fy = financialYear();
    const { rows } = await client.query(
        `SELECT COUNT(*)::int + 1 AS seq FROM invoices WHERE invoice_no LIKE $1`,
        [`TZP/${fy}/%`]);
    return { fy, seq: rows[0].seq };
}

// ============================================================
// @route   POST /api/billing/invoices
// @desc    Create a GST invoice. Computes GST, total, invoice number.
// @access  Private (Admin)
// ============================================================
router.post('/invoices', requireRole(['admin']), async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { userId, industryId, invoiceType, amount, dueDate, metadata } = req.body;
        if (!invoiceType || amount == null) return res.status(400).json({ error: 'invoiceType and amount required' });

        await client.query('BEGIN');
        const { fy, seq } = await nextInvoiceSeq(client);
        const invoiceNo = `TZP/${fy}/${String(seq).padStart(4, '0')}`;
        const gst = Math.round(amount * GST_RATE);
        const total = amount + gst;

        const ins = await client.query(
            `INSERT INTO invoices
                (user_id, industry_id, invoice_no, invoice_type, amount, gst_amount, total_amount, due_date, status, metadata)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'issued',$9::jsonb) RETURNING *`,
            [userId || null, industryId || null, invoiceNo, invoiceType, amount, gst, total,
             dueDate || null, JSON.stringify(metadata || {})]
        );
        await client.query('COMMIT');

        // Notify the customer.
        if (userId) {
            await notify({
                userId, category: 'payment', severity: 'info',
                title: `Invoice ${invoiceNo} issued`,
                message: `A ${invoiceType} invoice for ₹${total.toLocaleString('en-IN')} (incl. 18% GST) has been raised.`,
                link: '/subscriptions',
                metadata: { invoiceNo }
            });
        }
        res.status(201).json(ins.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Create Invoice Error:', err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});

// ============================================================
// @route   GET /api/billing/invoices
// @desc    List invoices. Industry users see only their own; admin sees all.
// @access  Private
// ============================================================
router.get('/invoices', requireRole(['admin', 'govt', 'industry']), async (req, res) => {
    try {
        let where = '', params = [];
        if (req.user.role === 'industry') {
            // Industry users resolve via their profile's user_id.
            where = 'WHERE i.user_id = $1';
            params = [req.user.id];
        }
        const { rows } = await db.query(`
            SELECT inv.*, ip.company_name
              FROM invoices inv
         LEFT JOIN industry_profiles ip ON ip.id = inv.industry_id
              ${where}
          ORDER BY inv.issued_at DESC LIMIT 200`, params);
        res.json(rows);
    } catch (err) {
        console.error('List Invoices Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   POST /api/billing/invoices/:id/pay
// @desc    Mark an invoice paid + issue a receipt (returns the row).
// @access  Private (Admin)
// ============================================================
router.post('/invoices/:id/pay', requireRole(['admin']), async (req, res) => {
    try {
        const upd = await db.query(
            `UPDATE invoices SET status='paid', paid_at=NOW() WHERE id=$1 RETURNING *`,
            [req.params.id]);
        if (!upd.rows.length) return res.status(404).json({ error: 'Invoice not found' });
        const inv = upd.rows[0];

        // Mark the linked subscription active if this was a subscription invoice.
        if (inv.invoice_type === 'subscription' && inv.industry_id) {
            const periodEnd = new Date();
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
            await db.query(
                `UPDATE subscription_subscriptions SET status='active', current_period_end=$1, dunning_retries=0
                  WHERE industry_id=$2`,
                [periodEnd, inv.industry_id]);
        }
        if (inv.user_id) {
            await notify({
                userId: inv.user_id, category: 'payment', severity: 'success',
                title: 'Payment received',
                message: `Your payment for invoice ${inv.invoice_no} (₹${Number(inv.total_amount).toLocaleString('en-IN')}) has been received. Thank you!`,
                metadata: { invoiceNo: inv.invoice_no }
            });
        }
        res.json({ msg: 'Invoice paid', receipt: inv });
    } catch (err) {
        console.error('Pay Invoice Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   POST /api/billing/subscriptions
// @desc    Create/upgrade a subscription with proration. Proration =
//          credit the unused time on the old plan toward the new one.
// @access  Private (Admin, Industry)
// ============================================================
router.post('/subscriptions', requireRole(['admin', 'industry']), async (req, res) => {
    try {
        const { plan } = req.body;
        if (!PLANS[plan]) return res.status(400).json({ error: `plan must be one of ${Object.keys(PLANS).join(',')}` });

        const industryId = req.user.profile_id;
        if (req.user.role === 'industry' && !industryId) return res.status(400).json({ error: 'No industry profile' });

        // Look up existing subscription to compute proration.
        const existing = req.user.role === 'admin'
            ? await db.query('SELECT * FROM subscription_subscriptions WHERE industry_id=$1 AND status IN ($2,$3)', [req.query.industryId, 'active', 'trialing'])
            : await db.query('SELECT * FROM subscription_subscriptions WHERE industry_id=$1 AND status IN ($2,$3)', [industryId, 'active', 'trialing']);

        let prorationCredit = 0;
        if (existing.rows.length) {
            const cur = existing.rows[0];
            const curPlan = PLANS[cur.plan];
            if (curPlan && cur.current_period_end) {
                const now = Date.now();
                const end = new Date(cur.current_period_end).getTime();
                const remaining = Math.max(end - now, 0);
                const totalPeriod = 365 * 24 * 3600 * 1000;
                prorationCredit = Math.round((remaining / totalPeriod) * curPlan.price);
            }
            // End the old sub.
            await db.query("UPDATE subscription_subscriptions SET status='cancelled' WHERE id=$1", [cur.id]);
        }

        const newPlan = PLANS[plan];
        const net = Math.max(newPlan.price - prorationCredit, 0);
        const periodEnd = new Date();
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);

        const ins = await db.query(
            `INSERT INTO subscription_subscriptions
                (user_id, industry_id, plan, status, current_period_end, auto_renew)
             VALUES ($1,$2,$3,'active',$4,TRUE) RETURNING *`,
            [req.user.id, industryId || req.query.industryId, plan, periodEnd]);

        res.status(201).json({
            subscription: ins.rows[0],
            proration: { credit_applied: prorationCredit, net_due: net, gst: Math.round(net * GST_RATE), total: net + Math.round(net * GST_RATE) }
        });
    } catch (err) {
        console.error('Create Subscription Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/billing/subscriptions/me
// @desc    The caller's subscription + outstanding invoices summary.
// @access  Private (Industry)
// ============================================================
router.get('/subscriptions/me', requireRole(['industry']), async (req, res) => {
    try {
        const sub = await db.query(
            'SELECT * FROM subscription_subscriptions WHERE industry_id=$1 ORDER BY started_at DESC LIMIT 1',
            [req.user.profile_id]);
        const outstanding = await db.query(
            `SELECT COUNT(*)::int AS n, COALESCE(SUM(total_amount),0) AS total
               FROM invoices WHERE industry_id=$1 AND status IN ('issued','overdue')`,
            [req.user.profile_id]);
        res.json({
            subscription: sub.rows[0] || null,
            outstanding: { count: outstanding.rows[0].n, total: parseFloat(outstanding.rows[0].total) }
        });
    } catch (err) {
        console.error('My Subscription Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// ============================================================
// @route   GET /api/billing/plans
// @desc    Plan catalog (price + GST) for the upgrade UI.
// @access  Private
// ============================================================
router.get('/plans', requireRole(['admin', 'industry']), (req, res) => {
    res.json(Object.entries(PLANS).map(([key, p]) => ({
        key, name: p.name, price: p.price, gst: p.gst, total: p.price + p.gst
    })));
});

module.exports = router;
