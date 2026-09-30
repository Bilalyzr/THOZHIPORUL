const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../db');
const { requireRole } = require('./auth');

// Initialize Razorpay SDK using env variables. In production these SHOULD be
// set — but missing keys DON'T crash the app (payments just 503). This lets
// the stack boot for testing/preview without a real Razorpay account.
// The mock-bypass path is NEVER available in production regardless.
const IS_PROD = process.env.NODE_ENV === 'production';
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (IS_PROD && (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET)) {
    console.warn('[PAYMENTS] RAZORPAY_KEY_ID/SECRET not set — payment endpoints will return 503. Set them to enable subscriptions.');
}
// Mock mode is ONLY available outside production, so a missing/placeholder
// key never enables payment bypass in a live deploy.
const MOCK_MODE = !IS_PROD && (!RAZORPAY_KEY_SECRET || RAZORPAY_KEY_SECRET === 'fallback_secret_for_sandbox');

let razorpay = null;
if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
    try {
        razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
    } catch (err) {
        console.error('[RAZORPAY] Initialization error:', err.message);
    }
}

// Plan definitions (Amounts in INR, Razorpay requires amount in paise)
const PLANS = {
    sme_pro: {
        name: 'SME Professional',
        amount: 4999, // 4999 INR
        paise: 499900
    },
    enterprise_suite: {
        name: 'Enterprise Suite',
        amount: 24999, // 24999 INR
        paise: 2499900
    }
};

// @route   POST /api/payments/order
// @desc    Create a Razorpay order for subscription upgrade
// @access  Private (Industry)
router.post('/order', requireRole(['industry']), async (req, res) => {
    try {
        const { plan } = req.body;
        const industryId = req.user.profile_id;

        if (!industryId) {
            return res.status(400).json({ error: 'No profile associated with this industry account.' });
        }

        if (!plan || !PLANS[plan]) {
            return res.status(400).json({ error: 'Invalid plan selected.' });
        }

        const selectedPlan = PLANS[plan];
        const receiptId = `receipt_sub_${industryId}_${Date.now()}`;

        // Mock checkout is ONLY available outside production, for offline
        // testing. In production, real Razorpay keys are required and a
        // failure returns an error — never a mock order that auto-verifies.
        if (MOCK_MODE) {
            console.log('[RAZORPAY] Using mock checkout order details (offline testing mode).');
            return res.json({
                success: true,
                orderId: `mock_order_${Date.now()}`,
                amount: selectedPlan.paise,
                currency: 'INR',
                keyId: RAZORPAY_KEY_ID,
                mock: true
            });
        }

        if (!razorpay) {
            return res.status(503).json({ error: 'Payment gateway not configured.' });
        }

        const options = {
            amount: selectedPlan.paise,
            currency: 'INR',
            receipt: receiptId,
            // notes bind the order to the buyer + plan so /verify can prove
            // server-side that THIS payment belongs to THIS caller's plan.
            notes: {
                purpose: 'subscription',
                plan: plan,
                industryId: String(industryId)
            }
        };

        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: RAZORPAY_KEY_ID,
            mock: false
        });

    } catch (err) {
        console.error('Create Order Error:', err.message);
        // In production, NEVER fall back to a mock order — return a real error.
        res.status(502).json({ error: 'Payment gateway error. Please try again.' });
    }
});

// @route   POST /api/payments/verify
// @desc    Verify Razorpay payment signature & update database subscription tier
// @access  Private (Industry)
router.post('/verify', requireRole(['industry']), async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, plan } = req.body;
        const industryId = req.user.profile_id;

        if (!industryId) {
            return res.status(400).json({ error: 'No profile associated with this industry account.' });
        }

        if (!plan || !PLANS[plan]) {
            return res.status(400).json({ error: 'Invalid plan specified.' });
        }

        let isVerified = false;

        // Mock orders only exist (and only auto-verify) outside production.
        // A leaked/forged mock_order_* id can NEVER grant a paid tier in prod.
        if (MOCK_MODE && razorpay_order_id && razorpay_order_id.startsWith('mock_order')) {
            console.log('[RAZORPAY] Payment verified: Mock bypass accepted (non-production).');
            isVerified = true;
        } else if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ error: 'Missing payment verification fields.' });
        } else {
            // Step 1 — timing-safe HMAC check: proves the payment id belongs
            // to this order id (signed by Razorpay with our key secret).
            const body = razorpay_order_id + '|' + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac('sha256', RAZORPAY_KEY_SECRET)
                .update(body.toString())
                .digest('hex');
            const sigBuf = Buffer.from(String(razorpay_signature));
            const expBuf = Buffer.from(expectedSignature);
            const sigOk = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
            if (!sigOk) {
                return res.status(400).json({ error: 'Cryptographic signature mismatch. Payment verification failed.' });
            }

            // Step 2 — server-side binding. The signature alone only proves
            // "a payment happened for some order". Re-fetch the order AND the
            // payment from Razorpay and require that they match each other,
            // the requested plan's price, and the CALLER's industry id (set
            // as order notes/receipt at creation). This closes the
            // pay-cheap-plan / replay-someone-else's-payment holes where the
            // client-controlled `plan` field was trusted directly.
            if (!razorpay) {
                return res.status(503).json({ error: 'Payment gateway not configured.' });
            }
            let order, payment;
            try {
                order = await razorpay.orders.fetch(razorpay_order_id);
                payment = await razorpay.payments.fetch(razorpay_payment_id);
            } catch (fetchErr) {
                console.error('Razorpay fetch during verify failed:', fetchErr.message);
                return res.status(400).json({ error: 'Unable to verify payment with the gateway.' });
            }

            const bindingErrors = [];
            if (payment.order_id !== razorpay_order_id) bindingErrors.push('payment does not belong to this order');
            if (!['captured', 'authorized'].includes(payment.status)) bindingErrors.push(`payment status is ${payment.status}`);
            if (parseInt(payment.amount, 10) !== PLANS[plan].paise) bindingErrors.push('payment amount does not match the selected plan');
            if (parseInt(order.amount, 10) !== PLANS[plan].paise) bindingErrors.push('order amount does not match the selected plan');
            if (!order.receipt || !order.receipt.startsWith(`receipt_sub_${industryId}_`)) bindingErrors.push('order was not created for this account');
            const notes = order.notes || {};
            if (String(notes.industryId) !== String(industryId)) bindingErrors.push('order industry binding mismatch');
            if (notes.plan !== plan) bindingErrors.push('order plan binding mismatch');

            if (bindingErrors.length) {
                console.warn(`[RAZORPAY] Verify rejected for industry ${industryId}: ${bindingErrors.join('; ')}`);
                return res.status(400).json({ error: 'Payment cannot be verified for this account and plan.' });
            }
            isVerified = true;
        }

        if (!isVerified) {
            return res.status(400).json({ error: 'Cryptographic signature mismatch. Payment verification failed.' });
        }

        // Update database profile subscription tier
        await db.query(
            `UPDATE industry_profiles 
             SET subscription_tier = $1, 
                 subscription_status = 'active',
                 payment_gateway_order_id = $2,
                 payment_gateway_payment_id = $3,
                 last_payment_date = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [plan, razorpay_order_id, razorpay_payment_id || 'mock_pay_id', industryId]
        );

        console.log(`[RAZORPAY] Industry ${industryId} successfully upgraded to ${plan}`);
        
        res.json({
            success: true,
            msg: `Successfully upgraded to ${PLANS[plan].name}!`,
            tier: plan
        });

    } catch (err) {
        console.error('Verify Payment Error:', err.message);
        res.status(500).json({ error: 'Server error during payment verification.' });
    }
});

module.exports = router;
