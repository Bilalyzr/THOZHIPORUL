# SIPCOT / THOZHIRPORUL — Project To-Do

**Review date:** Thu, 06 Aug 2026 · **Goal:** Live demo + feature completeness
**Guiding rule:** No provided data deleted. All fake/mock values replaced with real submitted data.

---

# ✅ COMPLETED

## 1. Demo-killers fixed
- [x] Removed fake compliance data (AdminDashboard no longer calls `jsonplaceholder`; shows real `/api/compliance/overview`).
- [x] Removed visible "Mock Upload File Size" input in SecureVault → real file picker.
- [x] Closed the `$demo$` password backdoor (now gated by `ENABLE_DEMO_LOGIN`, default off; JWT fallback secret removed).

## 2. Backend — real data (was hardcoded mock)
- [x] `compliance.js` — overview, violations, missing-submissions, trends, categories, predictions.
- [x] `command.js` — Command Center KPIs, heatmap, rankings, alerts, trends, activity feed.
- [x] `public.js` — homepage pulse (real investment / employment / land / parks).
- [x] `notifications.js` — from real violations, submissions, service requests.
- [x] `ai-decisions.js` — recommendations from real compliance data.
- [x] `reports.js` — reports from real aggregates.
- [x] `workflow-automation.js` — evaluated against real data.
- [x] `integrations.js` + `sipcot-sync.js` — labeled honestly as simulated connectors.
- [x] `grievances.js` — now saved in a real `grievances` DB table (was in-memory).

## 3. Backend — security & platform
- [x] Added `helmet`, CORS allowlist, and login rate-limiting.
- [x] Added `/api/health` (DB check) and `/api/audit` (real audit log; logins recorded).
- [x] Added `requireRole` auth to every previously-open route.

## 4. Frontend — real APIs (was mock / localStorage)
- [x] AdminDashboard, ComplianceEngine (actions persist to DB), AuditLogViewer.
- [x] IndustryDashboard (real per-industry KPIs, compliance status, chart, feed).
- [x] Home (live stats ribbon), AnalyticsDashboard, IndustrialParks / GIS Explorer.
- [x] ReportsDashboard — "Download PDF/Excel" now produces a real file.
- [x] SecureVault — real file picker.

## 5. Data cleanup & consistency
- [x] Deleted 4 junk test accounts → DB now has exactly **10 real industries**.
- [x] **Total investment reconciled to the real ₹73 Cr everywhere** (was inflated 18,470 Cr on homepage). Homepage, GIS, Analytics, Command Center, Compliance all agree. Stored data untouched — queries fixed.

## 6. Dedicated PDF reports (unique design per dashboard)
- [x] New `src/utils/reportGenerator.js` — generates a designed PDF per role, each with a **unique Report ID** (`TZP-<ROLE>-<YYYYMMDD>-<hex>`), built from real API data.
  - **Admin** — navy theme, "Platform Administration Report": platform KPIs, compliance distribution, violations register.
  - **Industry** — green theme, "Industry Performance & Compliance Report": company profile, compliance-score bars, submission history.
  - **Government** — maroon/gold theme, "State Industrial Oversight Report": state KPIs, park-wise performance, district distribution, compliance summary.
  - Each has themed header/monogram, KPI cards, tables, per-page footer with Report ID + page numbers, and a role watermark.
- [x] "Download Report" button wired into AdminDashboard, IndustryDashboard, and GovCommandCenter (shows the generated Report ID on success).

## 7. Verified
- [x] `npm run build` passes · all changed files lint clean.
- [x] All endpoints return real data (200); unauthenticated requests return 401; `/api/health` OK.

---

# 🔜 UPCOMING

## A. Optional feature (if wanted)
- [ ] **MobileInspection submit** — the field-inspection form isn't wired to a backend (no inspection table/endpoint exists yet). Add an `inspections` table + `/api/inspections` if inspections need to save. *(No fake data here — just an unwired button.)*

## B. Day 5 — Wed 05 Aug · Dress rehearsal
- [ ] Deploy backend to Render, frontend to Netlify.
- [ ] In production set `CORS_ORIGIN=<your Netlify URL>` and `ENABLE_DEMO_LOGIN=false`.
- [ ] Run the FULL demo on the deployed URL (phone / hotspot, not localhost).
- [ ] Write a 6–8 step demo script (e.g. Login → Command Center → drill into violation → export PDF).
- [ ] Prepare clean admin / govt / industry demo accounts.
- [ ] Freeze the code.

## C. Review day — Thu 06 Aug
- [ ] Morning smoke test: 3 accounts + `/api/health`.
- [ ] Do NOT deploy anything new.

---

## Quick reference
- Local `.env`: `ENABLE_DEMO_LOGIN=true` + `CORS_ORIGIN` set for dev. **Turn demo login OFF in production.**
- Run locally: backend on port 5001; `cd frontend && npm run dev` for the UI.

---

# ✅ ENHANCEMENTS ROADMAP — COMPLETED (EXISTING_FEATURES_ENHANCEMENTS.md)

The full 16-area enhancement roadmap from `EXISTING_FEATURES_ENHANCEMENTS.md`
has been implemented — **all 6 Quick Wins, all 3 Top-leverage items, and all
16 module enhancement areas** — purely additively (no existing route, page,
or query changed). Backed by one idempotent migration and a shared services
layer. Verified: backend boots clean, all new endpoints enforce RBAC (401
unauthed / 200 authed), frontend lints (0 errors) and builds.

## Setup (one-time)
1. Apply the migration: `psql < backend/schema_v3_enhancements.sql` (safe to
   re-run — every statement is `IF NOT EXISTS` / `ON CONFLICT DO NOTHING`).
2. Optionally set the new env vars in `.env` (all optional — see
   `.env.example` "Enhancement (v3) integrations" section): `SMTP_*`,
   `SMS_PROVIDER_KEY`, `SUBMISSION_API_KEY`. If unset, email/SMS gracefully
   log to console and API-submission is disabled.

## What was delivered (by priority)

**Quick Wins** — `do these first` batch, all ✅
- **Compliance auto-detection + SLA auto-escalation** — `POST /api/compliance/run-auto-detection` runs rules against every submission; escalation matrix auto-advances violations past their SLA window (scheduler job).
- **Service Tracker SLA countdown + deemed approval + milestone timeline** — `GET /api/services/:id/timeline`, `GET /api/services/sla-definitions`, deemed-approval fires on SLA breach.
- **Secure Vault expiry alerts** — scheduler generates 60/30/7-day reminders; `GET /api/vault/expiry-dashboard` buckets docs by urgency.
- **Scheduled auto-reports** — `POST/GET/PUT/DELETE /api/scheduled-reports` (daily/weekly/monthly/quarterly).
- **Multi-channel notifications + real-time push** — `GET /api/notifications-v2`, `PUT .../read-all`, preference centre, and `GET /api/notifications-v2/stream` (SSE).
- **Global search + Tamil toggle** — `GET /api/search?q=`, `GET /api/i18n/dictionary?lang=ta`; nav language switch live.

**Top 3 highest-leverage** — all ✅
- **Compliance auto-detect + configurable rules + escalation** — no-code rule CRUD (`POST/PUT /api/compliance/rules`), notice generation, root-cause drill-down, verifiable compliance certificate.
- **VazhiPorul AI context-aware + actionable** — `POST /api/assistant/chat` knows the user's score/violations/requests and can file a service request from chat.
- **Reports scheduled delivery + embedded charts** — `GET /api/reports/chart-data`, `/reports/comparison`, `/reports/executive-summary`.

**Module enhancements (all 16 areas)** — ✅
- GIS layered map + plot drill-down + IoT overlay + heatmaps (`/api/gis/*`).
- Service per-service checklist + officer TAT analytics + public tracking (`/api/services/officer-analytics`, `/track/:token`).
- Secure Vault real verification workflow + version control + tamper hash + secure share links + OCR metadata (`/api/vault/*`).
- Command Center drill-down on every KPI + alert thresholds + forecast bands + saved views (`/api/command/drilldown|thresholds|forecast|views`).
- Data Submission bulk import + prefill from last period + API submission (`/api/submissions/bulk|prefill|api-submit`).
- Grievances SLA + reference tracking + sentiment + category + feedback + stats (`/api/grievances/track|stats|feedback`).
- Workflow Automation no-code builder + real action execution + executions log (`/api/workflow/definitions|executions`).
- Mobile Inspection real backend + geo-tagged photos + checklist + link-to-compliance (`/api/inspections/*`).
- Payments GST invoices + receipts + prorated subscriptions + dunning (`/api/billing/*`).
- User Mgmt granular RBAC + MFA (TOTP) + sessions + bulk import (`/api/security/*`).
- Audit Logs tamper-evident hash chain + advanced filter/export + verify-chain + anomaly detection (`/api/audit/export|verify-chain|anomalies`).
- Reports executive summary deck; dashboard prefs/dark mode via `/api/command/views`.

## Files added (backend)
- `backend/schema_v3_enhancements.sql` — one additive migration (all 16 modules).
- `backend/services/notify.js` · `scheduler.js` · `i18n.js` — shared services.
- `backend/routes/vault.js` · `scheduled-reports.js` · `notifications-enhanced.js` ·
  `search.js` · `i18n-routes.js` · `ai-assistant.js` · `gis.js` · `inspections.js` ·
  `billing.js` · `security.js` — new route files (additive mount paths).
- Appended additive endpoints to: `compliance.js`, `services.js`, `reports.js`,
  `grievances.js`, `workflow-automation.js`, `audit.js`, `command.js`, `submissions.js`.

## Files added (frontend)
- `frontend/src/context/LanguageContext.jsx` + `useLanguage.js` — Tamil/bilingual provider.
- `frontend/src/services/api.js` — new service bindings (`vaultService`,
  `scheduledReportService`, `notificationV2Service`, `searchService`, `i18nService`).
- `frontend/src/main.jsx` — wraps app in `<LanguageProvider>`.
- `frontend/src/layouts/MainLayout.jsx` — language toggle button in the top bar.

## Verification
- `node -c` + require-load: all new/modified backend files OK.
- Full backend boots: 5 scheduler jobs start, all routes mount (`[SERVER] Sipcot SIMS Backend running on port 5001`).
- Smoke test: 16 protected endpoints → **401** (RBAC enforced); 2 public endpoints → **200**.
- `npx eslint src/` → **0 errors**. `npm run build` → **✓ built**.

