# BUILD TODO — Research-Grounded Future Changes
### Source: `RESEARCH_AND_FUTURE_CHANGES.md` → actionable engineering checklist

> This converts the externally-validated research synthesis (Niral Research Doc + live validation of Mission Inaippagam / TNSWP / SIPCOT scale) into a sequenced build plan. Items are grouped by the research doc's **Tier 1 / Tier 2 / Tier 3** priority, each citing the finding that drives it. All changes are **additive** (no existing route/query/page broken).
>
> **One-line grounding:** SIPCOT runs 50 parks / ~3,390 units, yet *no platform collects post-allotment operational actuals* (investment/employment/water/power/turnover/CSR). THOZHIRPORUL is that missing layer.

---

## ✅ Status legend
`[ ]` pending · `[~]` in progress · `[x]` done

---

## 🔴 TIER 1 — Directly serves the problem statement (do first)

### T1.1 Investment & Employment "committed vs actual"
*Driver: research §1.1 (TNSWP CAF captures the projection; we capture actuals; SIPCOT governs on the realisation gap).*
- [ ] Add `committed_investment_cr` + `committed_employment` columns to `industry_profiles` (sourced from the allotment/CAF at onboarding).
- [ ] Add `realisation_pct` (computed) to the workspace + Command Center dashboards — show "Investment: ₹X committed, ₹Y realised (Z%)".
- [ ] Add a "realisation gap" compliance rule — flag if realisation < 70% of commitment after 24 months.
- [ ] Surface the gap on the GovCommandCenter heatmap (colour parks by avg realisation).

### T1.2 CSR module restructure  ← *biggest gap, richest research finding*
*Driver: research §2 CSR — Section 135/Schedule VII mandate, 2% of PAT, 5 named pillars, Form CSR-1, SDG mapping, local-area rule.*
- [ ] Expand `csr_activities`: add `pillar` (enum: health_sanitation, education_skills, environment, women_welfare, heritage_culture), `pat_baseline_cr` (the 2% denominator), `mandated_spend_cr` (computed 2%), `actual_spend_cr`, `implementing_partner`, `csr1_registration_no`, `sdg_goals[]` (int array), `location_benefited` (text/GIS), `proof_document_id` (FK to documents).
- [ ] Build a "CSR compliance" check — `actual_spend >= mandated_spend`? Flag shortfall as a violation.
- [ ] Build a CSR dashboard view: spend by pillar, spend vs mandate, SDG coverage, local-area compliance (% of spend within X km of the park).
- [ ] Update `UnifiedDataSubmission.jsx` Step 5 (CSR) to capture the new structured fields instead of free-text.

### T1.3 Water/power quota + over-draw auto-violation
*Driver: research §2 — plots have allocated water quotas; HT sanctioned load; over-draw is a violation.*
- [ ] Add `water_allocated_kl` (monthly quota) to `industry_profiles` and `sanctioned_load_kw` + `tariff_per_unit` to the profile.
- [ ] Add 2 compliance rules (already supported by the rules engine): water > 120% of allocation = `ENV-WAT` violation; power > 120% of sanctioned = `ENV-PWR` violation.
- [ ] Show quota vs actual on the workspace "Resource Usage" card.

### T1.4 GSTIN + turnover reconciliation
*Driver: research §2 — turnover is cross-checkable against GST filings (GSTN).*
- [ ] Add `gstin` column to `industry_profiles`.
- [ ] Add a `gst_turnover_cr` field per submission + a reconciliation status (`unverified` / `matches` / `mismatch` / `overdue`).
- [ ] Add a manual "mark as reconciled" action for officers (officer verifies against the GST portal).

### T1.5 Realistic seed data
*Driver: research §5 — real scale is 50 parks / ~3,390 units; our seed is a 16% slice with generic names and wrong magnitudes.*
- [ ] Add the missing real parks to the seed: **Cuddalore** (chemical complex), **Ranipet**, **Perundurai**, **Irungattukottai** (distinct from Sriperumbudur), **Gummidipoondi**, **Thoothukudi**.
- [ ] Replace generic "ABC/XYZ/PQR" demo industries with **named anchor tenants** (clearly labelled DEMO): Hyundai (Irungattukottai), BharatBenz + Renault-Nissan (Oragadam), TCS + Cognizant (Siruseri), Foxconn (Sriperumbudur Phase II), Asian Paints (multi-site incl. Cuddalore).
- [ ] Use **realistic magnitudes**: Oragadam ~₹15,000 Cr / ~45,000 jobs; Siruseri ~₹5,600 Cr / ~42,000 jobs; etc. (current seed under-states these ~3-4×).
- [ ] Fix the `AIChatbot.jsx` knowledge base: **Foxconn is in Sriperumbudur Phase II, NOT Siruseri** (Siruseri is IT-only); Asian Paints is multi-site incl. Cuddalore.

### T1.5b Sector tagging
*Driver: research §5.2 — EV/semiconductor/women-centric parks are SIPCOT's growth direction.*
- [ ] Add `sector_tag` (array: automotive, electronics, EV, semiconductor, IT_ITES, textile, chemical, pharma, leather, food) to `industrial_parks` + `industry_profiles`.
- [ ] Add `is_women_focused` boolean to parks (crèches, women's hostels).
- [ ] Add sector-based grouping/filters to the GIS Explorer + Analytics.

---

## 🟠 TIER 2 — Strengthens the allottee lifecycle

### T2.1 Lease & utility billing (the "Allottee Login" reality)
*Driver: research §1.2 — the real Allottee Login is used to pay water bills, track rent, request product-line changes.*
- [ ] Add a `lease_billing` module: monthly lease rent + maintenance charges per plot, `arrears` tracking, a dues dashboard.
- [ ] Add water-charges billing (computed from `water_consumption` × tariff).
- [ ] Add an "Allottee Billing" view to the industry workspace (statement, due date, pay online via Razorpay).
- [ ] Wire unpaid rent > 90 days to a compliance violation (lease-default).

### T2.2 Filing-deficiency query loop
*Driver: research §6 #6 — TNSWP has in-portal digital query resolution between officer and applicant.*
- [ ] New `submission_queries` table: `submission_id`, `raised_by` (officer), `query_text`, `responded_by` (industry), `response_text`, `status` (open/responded/resolved), timestamps.
- [ ] Add a "Raise Query" action on the submissions review screen (officer side) and a "Respond" action (industry side).
- [ ] Notification on query raise + response (use the existing `notify` service).
- [ ] Block approval while an open query exists on a submission.

### T2.3 PO Status Report → HO forwarding workflow
*Driver: research §6 #2 — Project Officer does on-site eval, drafts a Status Report, forwards the file to Head Office.*
- [ ] Add a "status_report" doc type to inspections + a `forwarded_to_ho` flag + `ho_decision` field.
- [ ] Build the PO → HO forwarding step in the inspections workflow (PO submits → HO receives → HO approves/rejects).

### T2.4 Incentive disbursement link
*Driver: research §6 #3 — inspection report justifies incentive fund release.*
- [ ] New `incentive_disbursements` table: `industry_id`, `incentive_scheme`, `inspection_id` (FK), `amount_sanctioned`, `amount_disbursed`, `disbursement_date`, `status`.
- [ ] Link an inspection's "approved" outcome to a disbursement record.

### T2.5 Biz Buddy-style MD escalation
*Driver: research §6 #7 — operational grievances escalate to the Managing Director's desk.*
- [ ] Add an `escalated_to_md` boolean + `escalated_at` to `grievances`.
- [ ] Add an "Escalate to MD" action (auto-trigger after SLA breach, or manual by an officer).
- [ ] Add an "MD Escalations" filtered view in the Command Center.

---

## 🟢 TIER 3 — Strategic differentiation (later)

### T3.1 Reposition "subscription tiers" (cross-ref the subscription build doc)
*Driver: research §4 — current tiers were modelled on private associations; a regulator must not gate statutory filing.*
- [ ] Audit every gated endpoint: confirm **no statutory feature** (data submission, compliance score, basic services) is behind a paywall.
- [ ] Reposition paid tiers as **value-added** (predictive analytics, scheduled reports, OCR, API, extra storage) only.
- [ ] Update the pricing page copy to make "free for statutory compliance" explicit.

### T3.2 Mission Inaippagam interop
*Driver: research §3 — Inaippagam (live Dec 2025, UNDP) does CSR matchmaking but has no industrial-park concept; we complement it.*
- [ ] Request API credentials from SDGCC/UNDP (no public docs exist — architecturally RESTful per Velsof case study).
- [ ] Build a one-way sync: pull verified CSR needs near our parks; surface to allottees as "funding opportunities".
- [ ] (Later) push our CSR spend-reports to Inaippagam for state-level visibility.

### T3.3 Real government integrations
*Driver: research §2 turnover + the existing simulated connectors.*
- [ ] Replace the simulated `integrations.js` / `sipcot-sync.js` connectors with real ones, prioritised: **GSTN** (turnover reconcile), **TNPCB** (consent/OCMMS), **TANGEDCO** (power), **MCA** (CSR-2 filings).
- [ ] Each integration: a credentials store, a sync job (scheduler), a last-sync status, and a manual "sync now" button.

### T3.4 Association-portal anti-pattern audit (ongoing)
*Driver: research §4 — the private sites suffer dead directories, lost email queries, fragmented UX; we must avoid the same.*
- [ ] Add a "last verified" date to all directory/contact data; surface stale (>6mo) entries for review.
- [ ] Confirm every grievance/query creates a tracked ticket (never a raw email).
- [ ] Keep a single unified UX across all parks (no per-park fragmented portal).

### T3.5 Notifications/press API + circulars aggregator
*Driver: research §5.3 — SIPCOT publishes no RSS feed; our infra can be the machine-readable channel.*
- [ ] Scrape/aggregate SIPCOT "What's New" + circulars + tenders into a `circulars` table.
- [ ] Expose a public `/api/circulars` feed (JSON) + push new circulars as notifications to affected industries.

---

## 🎯 Definition of Done (research track)
- **Tier 1 complete** = the 6 problem-statement dimensions are captured with real-world structure (committed-vs-actual, 5-pillar CSR, quotas, GST reconciliation) + the seed data is credible.
- **Tier 2 complete** = the allottee lifecycle (billing, queries, inspections→HO, incentives, MD escalation) is closed-loop.
- **Tier 3 complete** = strategic positioning (free statutory filing + paid value-add, Inaippagam interop, real govt integrations, press API) is in place.
- Throughout: nothing existing breaks; every change is additive and verified (lint + build + boot test).
