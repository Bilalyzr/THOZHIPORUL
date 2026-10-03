// scripts/seed_operational_data.js — populate the operational tables the
// real-industry seed left empty, so Services Tracker, Secure Vault,
// Billing, and Subscriptions render live data instead of blank states.
// Idempotent per table: skips anything that already has rows.
// Run from backend/:  node scripts/seed_operational_data.js
require('dotenv').config();
const db = require('../db');
const crypto = require('crypto');

let seed = 20261003;
const rnd = (min, max) => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return min + (seed % 1000) / 1000 * (max - min);
};
const pick = (arr) => arr[Math.floor(rnd(0, arr.length)) % arr.length];
const daysAgo = (n) => new Date(Date.now() - n * 86400e3);
const daysAhead = (n) => new Date(Date.now() + n * 86400e3);

(async () => {
  const industries = await db.query('SELECT id, park_id FROM industry_profiles ORDER BY id');
  const userIdByProfile = {};
  const users = await db.query("SELECT id FROM users WHERE role='industry' ORDER BY id");
  industries.rows.forEach((ind, i) => { userIdByProfile[ind.id] = users.rows[i].id; });

  // ── 1. Service requests ──
  const svcTypes = ['land_allotment', 'noc_fire', 'noc_pollution', 'water_connection',
    'power_connection', 'building_approval', 'lease_renewal', 'expansion_request'];
  const svcStatuses = ['applied', 'document_review', 'field_inspection', 'pending_approval', 'approved', 'completed'];
  const svcCount = await db.query('SELECT COUNT(*)::int AS n FROM service_requests');
  if (svcCount.rows[0].n === 0) {
    let ref = 1;
    for (const ind of industries.rows) {
      const n = 1 + Math.floor(rnd(0, 2)); // 1-2 requests per industry
      for (let i = 0; i < n; i++) {
        const status = pick(svcStatuses);
        const applied = daysAgo(Math.floor(rnd(5, 120)));
        const slaDays = pick([15, 30, 45, 60]);
        const sla = new Date(applied.getTime() + slaDays * 86400e3);
        const overdue = status !== 'completed' && status !== 'approved' && sla < new Date();
        await db.query(
          `INSERT INTO service_requests
             (industry_id, park_id, service_type, reference_number, requested_area_acres,
              current_status, priority, applied_date, expected_completion,
              sla_deadline, escalation_state, deemed_approved, remarks)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [
            ind.id, ind.park_id, pick(svcTypes),
            `SVC-2026-${String(ref++).padStart(4, '0')}`,
            rnd(1, 12).toFixed(1),
            status, pick(['High', 'Medium', 'Normal']),
            applied,
            new Date(applied.getTime() + slaDays * 86400e3),
            sla,
            overdue ? 'escalated' : 'normal',
            overdue && rnd(0, 1) > 0.5,
            overdue ? 'SLA breached — pending deemed-approval review' : 'Processing as per standard timeline',
          ]
        );
      }
    }
    const total = await db.query('SELECT COUNT(*)::int AS n FROM service_requests');
    console.log(`service_requests: seeded ${total.rows[0].n}`);
  } else {
    console.log(`service_requests: already ${svcCount.rows[0].n} rows, skipped`);
  }

  // ── 2. Vault documents ──
  const docCount = await db.query('SELECT COUNT(*)::int AS n FROM documents');
  if (docCount.rows[0].n === 0) {
    const docsByIndustry = [
      ['gst_certificate', 'GST_Certificate_2026.pdf', 220, 320],       // expiring soon
      ['pollution_clearance', 'TNPCB_Consent_Renewal.pdf', 540, 180],
      ['fire_noc', 'Fire_NOC_Valid_2027.pdf', 310, 400],
      ['lease_agreement', 'SIPCOT_Lease_Agreement.pdf', 1250, null],
      ['incorporation', 'Certificate_of_Incorporation.pdf', 180, null],
    ];
    for (const ind of industries.rows) {
      for (const [category, fileName, sizeKb, expiresInDays] of docsByIndustry) {
        await db.query(
          `INSERT INTO documents
             (industry_id, uploaded_by, category, file_name, file_path, file_size_kb,
              mime_type, expiry_date, verified, verified_by, verified_at, content_hash, version)
           VALUES ($1,$2,$3,$4,$5,$6,'application/pdf',$7,$8,1,$9,$10,1)`,
          [
            ind.id, userIdByProfile[ind.id], category, fileName,
            `uploads/${ind.id}/${fileName}`, sizeKb,
            expiresInDays ? daysAhead(expiresInDays).toISOString().split('T')[0] : null,
            rnd(0, 1) > 0.3, daysAgo(Math.floor(rnd(10, 90))),
            crypto.createHash('sha256').update(`${ind.id}:${fileName}`).digest('hex'),
          ]
        );
      }
    }
    const total = await db.query('SELECT COUNT(*)::int AS n FROM documents');
    console.log(`documents: seeded ${total.rows[0].n}`);
  } else {
    console.log(`documents: already ${docCount.rows[0].n} rows, skipped`);
  }

  // ── 3. Subscriptions (tier by company scale) ──
  const subCount = await db.query('SELECT COUNT(*)::int AS n FROM subscription_subscriptions');
  if (subCount.rows[0].n === 0) {
    // industries 1-6 (Hyundai, Foxconn, TataElec, Renault, TVS, AshokLey) → enterprise;
    // 7-9 (TCS, Asian Paints, Saint-Gobain) → professional; 10-11 → starter/professional mix
    const tierByIndustry = { 1: 'enterprise', 2: 'enterprise', 3: 'enterprise', 4: 'enterprise', 5: 'professional', 6: 'professional', 7: 'enterprise', 8: 'professional', 9: 'professional', 10: 'starter', 11: 'starter' };
    const priceByTier = { starter: 1499, professional: 4999, enterprise: 24999 };
    for (const ind of industries.rows) {
      const tier = tierByIndustry[ind.id] || 'starter';
      await db.query(
        `INSERT INTO subscription_subscriptions
           (user_id, industry_id, plan, status, started_at, current_period_end,
            auto_renew, payment_provider, dunning_retries)
         VALUES ($1,$2,$3,'active',$4,$5,true,'razorpay',0)`,
        [
          userIdByProfile[ind.id], ind.id, tier,
          daysAgo(Math.floor(rnd(30, 300))),
          daysAhead(Math.floor(rnd(5, 30))),
        ]
      );
    }
    const total = await db.query('SELECT COUNT(*)::int AS n FROM subscription_subscriptions');
    console.log(`subscription_subscriptions: seeded ${total.rows[0].n}`);
  } else {
    console.log(`subscription_subscriptions: already ${subCount.rows[0].n} rows, skipped`);
  }

  // ── 4. Invoices ──
  const invCount = await db.query('SELECT COUNT(*)::int AS n FROM invoices');
  if (invCount.rows[0].n === 0) {
    const tiers = await db.query(
      'SELECT industry_id, user_id, plan FROM subscription_subscriptions'
    );
    const priceByTier = { starter: 1499, professional: 4999, enterprise: 24999 };
    let invNo = 1;
    for (const sub of tiers.rows) {
      // three monthly invoices each: two older paid, the newest issued/overdue
      for (let m = 2; m >= 0; m--) {
        const base = priceByTier[sub.plan] || 1499;
        const gst = Math.round(base * 0.18);
        const issued = new Date();
        issued.setMonth(issued.getMonth() - m);
        const status = m === 0 ? (rnd(0, 1) > 0.5 ? 'issued' : 'overdue') : 'paid';
        await db.query(
          `INSERT INTO invoices
             (user_id, industry_id, invoice_no, invoice_type, amount, gst_amount,
              total_amount, currency, status, issued_at, due_date, paid_at)
           VALUES ($1,$2,$3,'subscription',$4,$5,$6,'INR',$7,$8,$9,$10)`,
          [
            sub.user_id, sub.industry_id,
            `INV-2026-${String(invNo++).padStart(4, '0')}`,
            base, gst, base + gst,
            status, issued,
            new Date(issued.getTime() + 15 * 86400e3),
            status === 'paid' ? new Date(issued.getTime() + 5 * 86400e3) : null,
          ]
        );
      }
    }
    const total = await db.query('SELECT COUNT(*)::int AS n FROM invoices');
    console.log(`invoices: seeded ${total.rows[0].n}`);
  } else {
    console.log(`invoices: already ${invCount.rows[0].n} rows, skipped`);
  }

  console.log('operational data seeding complete');
  process.exit(0);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
