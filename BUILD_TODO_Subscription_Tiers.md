# BUILD TODO — Subscription Tier System
### Source: `subscription_tier_design.md` → actionable engineering checklist

> **⚠️ Critical repositioning (from the research synthesis):** The research revealed this design was modelled on *private industry associations* (MADITSSIA/SIMA/HOSTIA membership fees), NOT a government regulator. **Statutory filing must NEVER be gated behind a paid tier** — it creates an access-to-justice problem and contradicts the Ease-of-Doing-Business mandate. So this build is re-scoped: the 3 industry tiers become **value-added-feature tiers** (analytics, storage, API, OCR) layered ON TOP of free, unconditional statutory filing. The Government/Admin track stays internal cost-centre (no public billing).

---

## ✅ Status legend
`[ ]` pending · `[~]` in progress · `[x]` done

---

## PHASE 1 — Database & Data Model

- [ ] **1.1 Create `subscription_plans` catalog table** — tier enum (`free_starter`, `sme_pro`, `enterprise_suite`), display name, monthly/annual price (INR), `max_document_storage_mb`, `api_call_limit_per_month`, `has_predictive_analytics`, `has_scheduled_reports`. Idempotent migration (`schema_v4_subscriptions.sql`).
- [ ] **1.2 Create `industry_subscriptions` table** — links `industry_id` → `plan_id`, with `status` (active/past_due/cancelled/trialing), `current_period_start/end`, `cancel_at_period_end`, `stripe/razorpay_subscription_id`, `billing_email`. Unique on industry_id.
- [ ] **1.3 Seed the 3 plan rows** — Free (₹0, 10MB, 0 API), SME Pro (₹4,999/mo, 1GB, 1000 API, scheduled reports), Enterprise (₹24,999/mo, 100GB, unlimited API, predictive analytics).
- [ ] **1.4 Auto-assign every existing `industry_profiles` row to `free_starter`** on a backfill migration (status=active, period_end = +1 year) so nobody loses access during rollout.
- [ ] **1.5 Add performance indexes** — `idx_industry_subscriptions_industry`, `idx_industry_subscriptions_status`.
- [ ] **1.6 Government/Admin track: seed `officer_core` + `state_command` as internal (price=0) plans**, assigned to govt/admin users automatically (cost-centre, not billed).

## PHASE 2 — Backend Subscription Guard

- [ ] **2.1 Build `requireSubscriptionTier(allowedTiers)` middleware** (`backend/src/middleware/subscriptionGuard.js`) — auth check → admin/govt bypass → fetch subscription → validate status (active/trialing only) → validate not expired → tier-match check → inject `req.subscription = { tier, status }`. Return structured error codes: `SUBSCRIPTION_REQUIRED`, `BILLING_FAILED`, `SUBSCRIPTION_EXPIRED`, `UPGRADE_REQUIRED`.
- [ ] **2.2 Map features → tiers** per the matrix (audit which endpoints gate where):
  - [ ] Predictive analytics → `enterprise_suite` only
  - [ ] Scheduled auto-reports → `sme_pro` + `enterprise_suite`
  - [ ] API/ERP integration → `enterprise_suite` only (Excel upload = `sme_pro`)
  - [ ] AI decision support → govt only (not industry)
  - [ ] Workflow auto-reconciliation → `enterprise_suite`
  - [ ] Document Vault auto-OCR → `enterprise_suite`; expiry alerts → `sme_pro`+
  - [ ] Audit logs retention: 14 days (`sme_pro`) / indefinite (`enterprise_suite`)
  - [ ] **DO NOT gate:** Unified Data Submission (statutory), Compliance Score view (overall), basic Services tracker (statutory) — these stay free for all.
- [ ] **2.3 Apply the guard to the chosen routes** — additive (each guarded route gets the middleware added); no existing public/statutory endpoint changes.
- [ ] **2.4 Add a `/api/subscriptions/me` endpoint** — returns the caller's current tier, status, period end, storage used vs limit, API calls used vs limit (for the frontend gating UI).
- [ ] **2.5 Storage-quota enforcement in the Vault upload** — the existing Secure Vault upload already reads file size; add a tier check that sums current usage and rejects with `QUOTA_EXCEEDED` (the frontend already has an upgrade dialog for this).

## PHASE 3 — Billing & Payment Integration

- [ ] **3.1 Razorpay plan + subscription creation** — when an industry upgrades, create a Razorpay subscription for the chosen plan; store the `razorpay_subscription_id`.
- [ ] **3.2 Webhook listener `/api/payments/webhook`** — handle `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `payment.failed`; update `industry_subscriptions.status` + period end in real time. Must verify the Razorpay signature.
- [ ] **3.3 Dunning logic** — on `payment.failed`, set status=`past_due`, increment `dunning_retries` (the scheduler already has a dunning job from the v3 work — wire it to this).
- [ ] **3.4 Proration on upgrade/downgrade** — reuse the proration math already in `billing.js` (`/api/billing/subscriptions`): credit unused time on old plan toward new plan.
- [ ] **3.5 Invoice generation** — GST-compliant invoice (18% GST) on every successful charge (the `invoices` table + `/api/billing/invoices` already exist from Module 13).

## PHASE 4 — Frontend Gating & Upgrade UX

- [ ] **4.1 Build `<GatedFeature>` wrapper component** — takes `requiredTiers` + optional `fallbackUI`; bypasses for admin/govt; renders a premium upgrade card otherwise (lock icon, value pitch, "Upgrade" CTA → `/subscriptions`). Note: rewrite the design-doc's Tailwind example in **MUI** to match the codebase (the design doc used Tailwind classes that don't exist in this project).
- [ ] **4.2 Fetch subscription into a React context/hook** (`useSubscription()`) — loads `/api/subscriptions/me` on login; exposes `{ tier, status, storageUsedMb, storageLimitMb }` app-wide.
- [ ] **4.3 Wrap the gated dashboards/widgets** in `<GatedFeature>` — predictive analytics, scheduled-reports manager, AI mitigation tips, benchmark charts, auto-OCR, advanced audit retention view.
- [ ] **4.4 Build the pricing/upgrade page** (`SubscriptionPlans.jsx` already exists) — wire it to real Razorpay checkout (it currently has the SDK loaded + mock flow). Show the 3 tiers, feature comparison, and an "Upgrade" → Razorpay modal.
- [ ] **4.5 Tier badges in the nav/profile menu** — show a chip ("Starter" / "Pro" / "Enterprise") next to the company name so users know their tier.
- [ ] **4.6 Quota-exceeded upgrade modal** — when an upload or API call hits the limit, surface a friendly upgrade modal (the SecureVault already has a stub of this; generalize it).

## PHASE 5 — Rollout & Safeguards

- [ ] **5.1 Grandfather existing demo industries** onto SME Pro for the demo/review period (so reviewers see paid features without paying).
- [ ] **5.2 Audit-trail every tier change** — record `SUBSCRIPTION_UPGRADED` / `DOWNGRADED` / `CANCELLED` in `audit_logs` (use the hash-chained `recordAudit` from Module 15).
- [ ] **5.3 Never break statutory filing** — add a test that confirms an `industry` on `free_starter` can still submit quarterly data, view their compliance score, and file service requests. This is the non-negotiable guardrail.
- [ ] **5.4 Grace period on `past_due`** — keep features live for 7 days after a failed payment before hard-gating (avoids locking a paying customer out mid-quarter).

---

## 🎯 Definition of Done
- 3 industry tiers live with real Razorpay billing + webhooks.
- Value-added features (predictive analytics, scheduled reports, OCR, API) gated by tier.
- **Statutory filing (data submission, compliance score, basic services) free for every allottee, always.**
- Govt/Admin on internal cost-centre plans (not billed).
- Frontend shows tier badges + upgrade flow + quota modals.
