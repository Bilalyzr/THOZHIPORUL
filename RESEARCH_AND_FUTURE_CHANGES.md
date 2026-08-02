# Research Synthesis & Future-Changes Roadmap
### THOZHIRPORUL (SIPCOT Industrial OS) — grounded in the Niral Research Doc + external validation

> **Purpose of this document:** The `Niral Research Doc.docx` is a domain-intelligence brief on the *real* SIPCOT ecosystem — the actual companies, the real data-transmission pathways, the legal CSR framework, the private association portals, their business models, and the pain-points users hit today. This file translates that intelligence into **what it means for our problem statement** ("an APP for data updation of allottees on investment/employment/water/power/turnover/CSR") and lays out a prioritized, reality-grounded build plan.
>
> Key claims in the research doc are being cross-checked against live sources (Mission Inaippagam, TNSWP, SIPCOT scale). Where validation is pending, it's marked `[validating]`.

---

## 1. What the research changes about how we read the problem statement

The problem statement sounds like "build a form." The research reveals it's actually: **"build the post-allotment operational nervous system of SIPCOT"** — and that comes with a specific, non-obvious shape.

### 1.1 The critical boundary the doc draws: **pre-allotment vs post-allotment**

This is the single most important insight in the document, and it reframes our scope cleanly. External validation confirms it sharply:

| Phase | Who owns it | What it is | Our role |
|-------|-------------|------------|----------|
| **Pre-allotment** (applying for land/incentives/clearances) | **Tamil Nadu Single Window Portal (TNSWP)** — `tnswp.com`, run by **Guidance Tamil Nadu** under the **TN Business Facilitation Act, 2018** — via the **Combined Application Form (CAF)** | Investor submits corporate profile, investment projections, employment projections, utility requirements. CAF is **7 sections**; **Section 4 = "Employment & Utilities"** (employment, energy, water). | **We do NOT rebuild this.** SIPCOT is downstream of TNSWP. We *consume* the CAF projections as our baseline. |
| **Allotment transaction** (plot selection, lease, allotment order) | **SIPCOT's own portal** — `sipcot.tn.gov.in/portal` (allotment login, GIS land-details dashboard). Allotment went online 2019; ~60-day timeline; lease/long-term lease (not freehold). | The actual plot-allotment *transaction*. | **We sit beside this**, not on top of it. |
| **Post-allotment** (the allottee is now operating inside the park) | **SIPCOT + the allottee** — **and this is the gap nobody fills today** | Periodic *actuals*: real investment spent, real jobs created, real water/power consumed, real turnover, real CSR done | **THIS is our problem statement.** THOZHIRPORUL owns this. |

> **Verification note:** External research confirms verbatim — *"A SIPCOT-internal platform focused on post-allotment operational returns would fill a gap that neither TNSWP nor the current SIPCOT land-allotment portal covers. No evidence that TNSWP or SIPCOT's portal collects ongoing production, employment-actuals, utility-consumption-actuals, or post-allotment compliance returns from established units."* The risk of duplicating TNSWP is low; the real integration concern is *data-definition consistency* (reconciling CAF projections against our actuals).

➡️ **Implication for the build:** Our data model should track **projected vs actual** for investment & employment (the CAF captured the *projection*; we capture the *reality* and let SIPCOT measure the gap). This is currently missing — we store `investment_amount` with no notion of "promised vs realised." **This is a high-value addition, and it's now externally justified.**

➡️ **Bonus — the "deemed approval" feature is the law, not a nice-to-have:** The **TN Business Facilitation Act, 2018, Section 12(1)** defines deemed approval — if a Competent Authority misses its Rule-12 SLA, the clearance is *deemed granted*. **On Nov 14, 2025, TN formally extended this** to building-project NOCs on the single window. So the SLA + deemed-approval logic we already built into the Service Tracker (Module 3) isn't optional polish — it reflects a live statutory mechanism.

### 1.2 The "Allottee Login" is a real, distinct user persona

The doc explicitly names the **Allottee Login** as one of SIPCOT's existing gateways — used by existing industries to *"pay water bills, track rents, or apply for product line changes."* That tells us the allottee's relationship with SIPCOT isn't just data filing — it's a **financial + administrative lifecycle**:

```
Allotment (CAF/TNSWP)  →  Lease Deed execution (45 days)  →  Operations
        ↓                                                        ↓
   one-time data                                         recurring: rent bills,
                                                          water bills, NOC renewals,
                                                          product-line changes,
                                                          quarterly returns
```

➡️ **Implication:** Our `industry` role captures the *returns-filing* part but **not the billing/dues part** (lease rent, water charges, maintenance). The doc lists this as core allottee activity. **Lease & utility billing is a gap.**

---

## 2. The six dimensions — what the research adds to each

The problem statement lists six data dimensions. The research deepens every one of them with real-world structure our current schema is too thin to capture:

### Investment
- **Current:** `financial_data.investment_amount` (a single number, no projection baseline).
- **Research insight:** SIPCOT allots land *conditional on a minimum investment commitment* (often ₹X crore/acre). The real question SIPCOT asks is **"did they invest what they promised?"** — i.e. commitment vs realisation.
- **Gap → build:** Add `committed_investment_cr` (from the CAF at allotment) alongside the recurring actual. The dashboard then shows **investment realisation %** — a metric SIPCOT actually governs on.

### Employment
- **Current:** `permanent_employees` + `contract_employees` (+ SC/ST, women from v2).
- **Research insight:** Employment is **the #1 political headline** for the state, and allotments are often conditional on *jobs-per-acre*. Direct vs indirect jobs are reported separately in state figures.
- **Gap → build:** Add `committed_employment` (from allotment) + `jobs_per_acre` (computed) + keep the direct/contract split we already have. The dashboard should surface **employment realisation vs commitment** alongside investment realisation.

### Water
- **Current:** `water_consumption` (KL).
- **Research insight:** Each plot has an **allocated water quota**; over-draw is a violation. Water is also a CSR vector (SIPCOT builds OHTs, borewells, RO plants for nearby villages — see CSR section).
- **Gap → build:** Add `water_allocated_kl` (the quota) to the plot/industry profile so we can flag **over-draw >120% as an auto-compliance violation** (our compliance engine already supports threshold rules — this is a ready-made rule).

### Power
- **Current:** `power_usage` (kWh).
- **Research insight:** HT industrial tariff ~₹6.50/unit; TANGEDCO coordinates substation load. Power is a frequent grievance vector (outages, voltage) routed through the Biz Buddy portal.
- **Gap → build:** Add `sanctioned_load_kw` + tariff for **cost run-rate** calculation and anomaly detection (sudden 2× spike = alert). Our `iot_telemetry` table from the v3 migration already supports live power metering — wire it.

### Turnover
- **Current:** `annual_turnover` (Cr).
- **Research insight:** Turnover is **cross-checkable against GST filings** (GSTN). The doc notes the Government Integration Hub ambition (TNPCB, TANGEDCO, GSTN, MCA).
- **Gap → build:** Add an optional `gstin` field + a "turnover vs GST-declared" reconciliation flag. Even a manual flag ("matches GST return Y/N") adds audit credibility.

### CSR  ← **the biggest gap, and the research is richest here**
- **Current:** `csr_activities` = `description` + `amount_spent` (Lakhs) + `beneficiary_count`. That's it.
- **Research insight:** The doc dedicates ~40% of its content to CSR and reveals a **legally-structured framework** we're completely ignoring:
  - **Section 135 + Schedule VII of the Companies Act, 2013** is the mandate.
  - **2% of average net Profit After Tax (PAT)** of the preceding 3 years is the legal floor.
  - SIPCOT concentrates CSR across **5 named pillars**: (1) Hunger/Health/Sanitation, (2) Education/Skills, (3) Environmental Sustainability, (4) Women's Welfare, (5) Heritage/Culture.
  - **Form CSR-1** — companies can only donate to MCA-registered NGOs (with 12A/80G). Due-diligence is mandatory.
  - **"Local Area" rule** — CSR should prioritise communities *around the company's footprint* (a statutory preference).
  - Every project maps to **UN SDG indicators** (the Mission Inaippagam platform enforces this at state level).
- **Gap → build (high value):** Restructure `csr_activities` to capture: `pillar` (enum of the 5), `pat_baseline` (the 2% denominator), `mandated_spend`, `actual_spend`, `implementing_partner` + `csr1_registration_no`, `sdg_goals[]`, `location_benefited` (for the local-area rule), `beneficiary_count`, `proof_document`. This turns CSR from a free-text note into an **auditable, legally-compliant record**.

---

## 3. The Mission Inaippagam insight — complement, don't duplicate

The research describes **Mission Inaippagam** (csr.tn.gov.in). External validation confirms the picture precisely and sharpens it:

- **Status: LIVE.** Launched **22 Dec 2025** by the TN Government (Deputy CM Udhayanidhi Stalin, as Vice-Chair of the State Planning Commission), built with **UNDP India** (it's the TN fork of UNDP's Karnataka "Akankya" platform). Current live counts: **182 projects available, 6 in progress, 38 completed**.
- **What it is:** a **statewide discovery/matchmaking + light project-monitoring** platform. Departments post priority projects → SDGCC (UNDP's SDG Coordination Centre, acting as Super Admin) matches them to corporates via ML on sector+geography+budget → NGOs implement with milestone reporting → SDGCC consolidates.
- **What it is NOT:** it is **not the statutory CSR compliance registry**. Legal CSR reporting still flows through the **MCA CSR Portal** (Ministry of Corporate Affairs). Inaippagam only *links out* to MCA/NGO Darpan/NITI Aayog. Companies enter 5-yr historical spend for analytics and track milestones on matched projects — but it's a coordination layer, not the record-of-record.
- **GIS granularity:** district → block → Gram Panchayat, with explicit **Focus Block Development Programme** + **Aspirational Districts** + **SDG indicator** mapping. Its spatial unit is the *civic* unit, **not the industrial estate**.
- **APIs:** architecturally RESTful (per the Velsof vendor case study), but **no public API documentation** — programmatic access would need credentials from SDGCC/UNDP.

➡️ **Strategic implication for us — confirmed and sharp:** We should **NOT** try to be Mission Inaippagam. The clean division of labour:

| Platform | Job | Spatial unit | Record type |
|----------|------|--------------|-------------|
| **Mission Inaippagam** (state) | *Discovery & matching* — "which village school needs a funder?" | District / Block / Gram Panchayat | Coordination + monitoring |
| **MCA CSR Portal** (central) | *Statutory CSR-2/3 filing* | Company | Record-of-record |
| **THOZHIRPORUL CSR module** (SIPCOT) | *Tenant compliance & local-area audit* — "did allottee X spend their mandated 2%? did it benefit the community around their park? is the NGO CSR-1 registered?" | **Industrial park / estate** | Audit + enforcement |

The **industrial-park / tenant-tenant** angle is genuinely uncovered by any existing platform — that's our defensible niche. Interop with Inaippagam is a Tier-3 ambition (pull verified needs; push spend reports), gated on obtaining API credentials.

---

## 4. The "private association portals" warning — don't copy their mistakes

The doc spends a large section cataloguing **private industry-association websites** (SIMA, HOSTIA, MADITSSIA, PSTPA, HIA, SACEM, IWMA, EEDISSIA) and a whole section on their **subscription/membership models** (flat-rate, turnover-based 0.01%, life memberships).

➡️ **This is the most important cautionary finding in the doc for our project:**

1. **These are private associations, not SIPCOT.** Their membership-fee model is a *private association* revenue model — **NOT something a government SIPCOT platform should replicate.** Our existing `subscription_tier_design.md` appears to have modelled our billing on these private associations (free_starter / sme_pro / enterprise_suite tiers). **That's a conceptual error to flag.** A government regulatory platform shouldn't gate statutory filing behind paid tiers — that creates an access-to-justice problem and contradicts the "ease of doing business" mandate.
2. **The doc lists the EXACT user pain-points these private sites suffer** — and they're a checklist of anti-patterns we must avoid:
   - "Outdated directories / dead phone numbers" → **we must keep contact data live + verified**
   - "Static, no transactional features, just redirect" → **we ARE the transactional system** (good — our differentiator)
   - "Unmonitored query forms → lost emails" → **our grievances module must be ticket-tracked, not email-dumped**
   - "Fragmented UX — each estate a different site" → **our single unified platform is the fix** (this is literally our value proposition)
   - "Security inconsistencies (mismatched domains, copy-paste privacy policies)" → **we have helmet + CORS allowlist + audit logs** (good)

➡️ **So the "subscription model" research is valuable as competitive/adjacent-market context, but it should NOT drive our monetisation.** Recommended: reposition our "subscription tiers" as **capacity/feature tiers for value-added (non-statutory) services** (e.g., advanced analytics, extra document storage, API access) — while keeping the *core statutory filing free and unconditional* for every allottee.

---

## 5. Real SIPCOT scale vs our seed data — what to fix for credibility

External validation now pins the real numbers precisely, and they make the case sharper:

- **Real scale: 50 Industrial Parks (incl. 8 SEZs), across 24 districts, ~48,926 acres total, supporting ~3,390 industrial units** over 54 years. (Source: SIPCOT homepage.)
- **Our seed: 8 parks, ~10 industries.** So we model **~16% of the parks and ~0.3% of the units.** The honest framing: *the seed is a representative demo slice, not the production target.* Our analytics must be built to scale to 50 parks / thousands of units, and the demo data should look plausible within that frame.
- **The digital-gap thesis is now externally verified and citable** — the strongest pillar for this whole project: *"There is no evidence of a public, operational portal where existing allottees submit periodic operational returns (investment/employment/water/power/turnover/CSR). The Allottee Login (`sipcot.tn.gov.in/portal/allottee`) is login-walled and only documented for lease/rent/allotment status. Collection appears manual/Excel/email-based."* **This is the white space THOZHIRPORUL fills — and it's now defensible with sources, not assumption.**

### 5.1 Anchor tenants — verified, with location corrections

The doc's named tenants are all real. Two corrections worth applying to our data/AI knowledge base so demos aren't subtly wrong:

| Tenant | Verified location | Correction vs doc |
|--------|-------------------|-------------------|
| Hyundai | Plot H-1, **SIPCOT Irungattukottai**, Sriperumbudur *taluk* | Not "Sriperumbudur park" — Irungattukottai is the specific park |
| Daimler/BharatBenz, Renault-Nissan | SIPCOT **Oragadam** | ✓ |
| TCS, Cognizant | SIPCOT **IT Park, Siruseri** | ✓ (Siruseri is IT/ITES-only) |
| **Foxconn** | **Sriperumbudur Phase II / Sunguvarchatram–Mambakkam** (Hi-Tech SEZ) | **NOT Siruseri** — it's a manufacturing park (iPhone 15 assembly) |
| **Asian Paints** | **Multi-site**: Sriperumbudur Phase II (PPG JV) + Mambakkam + **Cuddalore SIPCOT** (Penta division) | Not a single-park tenant |

➡️ **Build:** (a) Enrich the seed with the real park list incl. **Cuddalore** (chemical complex — notable given SACEM/env-monitoring is highlighted in the doc), Ranipet, Perundurai; (b) seed a handful of **named anchor tenants** as clearly-labelled demo industries with corrected locations; (c) use **realistic magnitudes** (Oragadam ~₹15,000 Cr, not ₹4,200; Siruseri IT Park ~42,000 jobs); (d) fix the AIChatbot knowledge base so it doesn't misplace Foxconn in Siruseri.

### 5.2 Growth thesis — build for the parks of 2026-2030 (new)

The research surfaced a strong, citable growth direction that should shape our sector/park tagging:

- **EV Park at Manallur, Thiruvallur (300 acres)** — SIPCOT's dedicated EV park; 17 EV/Electronics plots allotted in Sriperumbudur Phase II.
- **Semiconductor push** — Polymatech Electronics ₹900 Cr in Oragadam; TN Semiconductor Mission 2030 (₹500 Cr, Budget 2025); parks planned at Coimbatore (Sulur & Palladam) and Thoothukudi (~1,967 acres, tied to a proposed ~₹80,000 Cr investment).
- **8 new multi-acre parks** announced Jun 2024 (TRB Rajaa), incl. Gummidipoondi (1,500 ac) and Ottapidaram (1,000 ac). **Target: 30 new parks by 2030.**
- **Women-centric infrastructure** — crèches in **16 industrial parks** (FICCI FLO, 2025); women's hostels at Siruseri & Bargur (₹70 Cr) and Mega Leather Park, Panapakkam. *(Note: "Gender Park" is a Kerala entity — don't cite it as SIPCOT.)*

➡️ **Build:** Add `sector_tag` (automotive, electronics, EV, semiconductor, IT/ITES, textile, chemical, pharma, leather, food) and `is_women_focused` flags to parks/industries so the platform can group the new-economy sectors SIPCOT is actively courting. This also makes the GIS + analytics far more useful for investment attraction.

### 5.3 No RSS / press feed exists (new)

- SIPCOT publishes **no machine-readable RSS/Atom feed**. The closest analogues are the homepage "What's New" strip, `/Tenders`, and `/Compendium_of_Circulars_and_Office_Orders`.
- ➡️ **Build (Tier 3):** A lightweight **notifications/press API** + circulars aggregator would itself be a value-add — and our `notifications` + `scheduled_reports` infrastructure is ready to drive it.

---

## 6. Data-transmission pathways — the workflow the platform must support

The doc maps how data *actually* moves in SIPCOT today. Our platform should formalise these into tracked workflows:

1. **Allottee → SIPCOT (returns)** — our `UnifiedDataSubmission`. ✓ Have it. Note: this is the **post-allotment** channel. The **pre-allotment CAF** (TNSWP, 7 sections incl. Sec 4 "Employment & Utilities") feeds us the *projected* baselines we measure actuals against.
2. **Project Officer (PO) Status Report → Head Office** — for NOCs/sub-leasing, the local PO does an on-site eval and uploads a Status Report. Our `inspections` module (v3) covers this — **needs the "PO Status Report → HO forwarding" workflow** layered on.
3. **Inspection Committee → funds release** — for incentives, an inspection report justifies disbursement. **Our inspections + a new `incentive_disbursements` link** would close this loop.
4. **System-generated MIS reports** — TNSWP auto-compiles pending-clearances/timelines. Our `scheduled_reports` + Command Center cover this. ✓
5. **SMS + Email alerts on every status change** — our `notify.js` + scheduler cover this. ✓ (the doc confirms this is expected behaviour, not optional)
6. **Digital Query Resolution** — admin raises a query inside the portal; applicant must respond. **This is a gap** — we have grievances (public) but not an in-app *filing deficiency query* loop between officer and allottee. **Worth building.**
7. **Biz Buddy escalation → MD's desk** — operational grievances escalate to the Managing Director. Our `grievances` module could tag a `escalated_to_md` severity.
8. **Allotment Committee viva** — large allotments go before an MD-chaired committee via video conf. Out of scope for a returns platform, but the *outcome* (allotment conditions) should be the source of our "committed investment/employment" baseline.

---

## 7. Prioritized future-changes roadmap (grounded in the above)

Sequenced by **impact on the core problem statement × effort**. Each item cites which research finding drives it.

### 🔴 Tier 1 — Directly serves the problem statement (do first)

| # | Change | Driver | Effort |
|---|--------|--------|--------|
| 1 | **Investment & Employment "committed vs actual"** — add `committed_investment_cr`, `committed_employment` to industry profile (sourced from allotment); show realisation % in dashboards | §1.1 boundary; §2 investment/employment | S |
| 2 | **CSR module restructure** — 5-pillar enum, PAT/2% mandate calc, CSR-1 partner field, SDG tags, local-area beneficiary location, proof doc | §2 CSR (richest gap) | M |
| 3 | **Water/power quota + over-draw auto-violation** — add `water_allocated_kl`, `sanctioned_load_kw`; wire compliance rules | §2 water/power | S |
| 4 | **GSTIN + turnover reconciliation flag** | §2 turnover | S |
| 5 | **Realistic seed data** — real parks (incl. Cuddalore/Ranipet/Perundurai), named anchor tenants with corrected locations, realistic magnitudes | §5 | S |
| 5b | **Sector tagging** — `sector_tag` (auto/EV/semiconductor/IT/textile/chemical…) + women-focused flags, to group the new-economy sectors SIPCOT is courting | §5.2 | S |

### 🟠 Tier 2 — Strengthens the allottee lifecycle (do next)

| # | Change | Driver | Effort |
|---|--------|--------|--------|
| 6 | **Lease & utility billing** — lease rent, water charges, maintenance dues, arrears dashboard (the "Allottee Login" reality) | §1.2 | M |
| 7 | **Filing-deficiency query loop** — officer raises an in-portal query on a submission; allottee must respond before approval | §6 #6 | S |
| 8 | **PO Status Report → HO forwarding workflow** on inspections | §6 #2 | S |
| 9 | **Incentive disbursement link** — inspection report → disbursement record | §6 #3 | M |
| 10 | **Biz Buddy-style MD escalation** flag on grievances | §6 #7 | S |

### 🟢 Tier 3 — Strategic differentiation (later)

| # | Change | Driver | Effort |
|---|--------|--------|--------|
| 11 | **Reposition "subscription tiers"** as value-added-feature tiers (analytics, API, storage) — keep statutory filing free | §4 cautionary | S |
| 12 | **Mission Inaippagam interop** — pull verified CSR needs; push spend reports (if API exists) | §3 | M-L |
| 13 | **Real government integrations** — GSTN/MCA/TNPCB/TANGEDCO (replacing simulated connectors) | §2 turnover; ADV roadmap | L |
| 14 | **Association-portal anti-pattern audit** — ensure our directories stay live, queries are ticketed, grievances never silently email | §4 | S (ongoing) |
| 15 | **Notifications/press API + circulars aggregator** — SIPCOT publishes no RSS feed; our infra can become the machine-readable channel | §5.3 | S-M |

---

## 8. What this research does NOT justify building

Equally important — the doc could tempt scope-creep. Explicitly **out of scope** for our problem statement:

- ❌ Rebuilding the **TNSWP / Combined Application Form** (pre-allotment, `tnswp.com`). That's a different platform run by Guidance TN under the Business Facilitation Act; we consume its CAF projections as baselines, we don't re-collect them.
- ❌ A **CSR matchmaking marketplace** — **Mission Inaippagam already does this at state level** (live since Dec 2025, UNDP-backed, 182+ projects). We'd be building a worse duplicate.
- ❌ **Statutory CSR-2/3 e-filing** — that's the **MCA CSR Portal's** job (central, legal record-of-record). We track *compliance* against it, we don't replace it.
- ❌ **Association membership billing** — that's a private-association business model, not a government platform's job.
- ❌ **Video-conferencing the Allotment Committee** — out of scope for a returns platform.

---

## 9. TL;DR for the team

The research validates that our core bet is right — **SIPCOT needs a unified post-allotment operational platform**, and the fragmented private association sites prove the unified-platform thesis. But it sharpens three things we're currently getting wrong or missing:

1. **CSR is under-built** — it's the most legally-structured dimension (2% PAT, 5 pillars, CSR-1, SDG) and we treat it as free-text. Fix this first.
2. **We measure actuals without baselines** — investment/employment should always be *vs the allotment commitment*, giving SIPCOT the realisation metric it actually governs on.
3. **Our "subscription tiers" were modelled on private associations, not a government platform** — reposition them as value-added tiers so statutory filing stays free.

Do Tier 1 first; it's the highest credibility-per-effort and maps 1:1 to the problem statement's six dimensions.

---

## 10. The one-sentence pitch this research gives us

> *"SIPCOT runs 50 parks / ~3,390 units across Tamil Nadu, yet there is **no operational portal where allottees file their actual investment, employment, water, power, turnover and CSR returns** — TNSWP handles pre-allotment clearances, SIPCOT's portal handles the allotment transaction, Mission Inaippagam handles CSR matchmaking, and the MCA portal handles statutory CSR filing, but **nobody collects the post-allotment operational actuals** that SIPCOT actually governs on. THOZHIRPORUL is that missing layer."*

That's the externally-verified, source-backed justification for the entire build.

---

## Appendix A — Research confidence & sources

This synthesis combines the `Niral Research Doc.docx` (domain intelligence) with live web validation. Confidence levels:

| Finding | Confidence | Basis |
|---------|------------|-------|
| Post-allotment returns gap (no official portal) | **High** | SIPCOT/Guidance/TNSWP portals all examined; no returns module advertised or indexed |
| Pre/post-allotment boundary | **High** | TNSWP CAF manual + Business Facilitation Act verified |
| Mission Inaippagam scope (matchmaking, not compliance) | **High** | Official portal + UNDP + Velsof case study |
| Deemed-approval is statutory | **High** | TN Business Facilitation Act §12(1) + Nov 2025 notification |
| Real scale (50 parks / ~3,390 units) | **High** | SIPCOT homepage |
| Anchor tenants + locations | **High** | Per-tenant sources; 2 doc corrections noted |
| Growth thesis (EV/semiconductor/women parks) | **High** | Multiple 2024-2025 news + SIPCOT sector page |
| Inaippagam public API exists | **Low** | Architecturally claimed by vendor; no public docs found |
| Exact matchmaking algorithm | **Low** | Marketing-level only; not documented |

### Key sources
- **SIPCOT:** `sipcotweb.tn.gov.in` (homepage, What's New, Tenders, Circulars); `sipcot.tn.gov.in/portal/allottee` (Allottee Login); SIPCOT sector page (EV park, semiconductor)
- **TNSWP:** `tnswp.com`; official CAF Applicant Manual; TN Business Facilitation Act 2018 (PRS India); Business Facilitation Rules 2017; Nov 14 2025 deemed-approval notification (New Indian Express)
- **Mission Inaippagam:** `csr.tn.gov.in` (+ /about); Velsof vendor case study; UNDP India Newsletter; New Indian Express (Dec 23 2025 launch)
- **Tenants:** hyundai.com/in, Wikipedia SIPCOT IT Park, Time (Foxconn), penta.asianpaints.com, myoragadam.com
- **Growth:** TRB Rajaa 8-parks announcement (Jun 2024); TN Semiconductor Mission; SIPCOT crèches (Deccan Herald); 30-parks-by-2030 (Times of India)

---
*Synthesis complete. All `[validating]` markers resolved via the three live research passes. This document supersedes ad-hoc feature lists as the grounding for THOZHIRPORUL's roadmap.*
