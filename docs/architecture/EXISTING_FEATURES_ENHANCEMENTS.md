# THOZHIRPORUL — Enhancements to EXISTING Features
### Level-up roadmap for modules already in the platform

*Scope: make what's already built more powerful, automated and intelligent — NOT new
modules (those live in ADVANCED_FEATURES_ROADMAP.md).*

Legend — Impact: 🔴 High · 🟠 Medium · 🟢 Nice | Effort: ⚙️ (S) · ⚙️⚙️ (M) · ⚙️⚙️⚙️ (L)

---

## 1. Compliance Engine  *(overview / violations / trends / predictions)*
- [ ] **Auto-detection of violations** 🔴 ⚙️⚙️ — rules run automatically against every
  submission (water/power thresholds, missing filing, expired NOC) instead of manual entry.
- [ ] **Admin-configurable rules (no-code)** 🔴 ⚙️⚙️ — add/edit compliance rules, severities
  and thresholds from the UI (today they're seeded rows).
- [ ] **SLA-based auto-escalation matrix** 🔴 ⚙️ — open → acknowledged → escalated → senior
  officer, with timers; auto-escalate on breach.
- [ ] **Notice generation & serving** 🔴 ⚙️⚙️ — one click → show-cause / closure notice PDF
  (using the new report engine) with e-sign + delivery log.
- [ ] **Root-cause drill-down** 🟠 ⚙️ — click a score → which sub-scores/filings dragged it.
- [ ] **Compliance certificate** 🟢 ⚙️ — auto-issue a verifiable "Good Standing" certificate.

## 2. GIS / Industrial Parks Explorer  *(Leaflet map)*
- [ ] **Layered map** 🔴 ⚙️⚙️ — toggle layers: plots, utilities network, zones, environmental,
  investment heatmap, occupancy heatmap.
- [ ] **Plot-level drill-down from map** 🔴 ⚙️⚙️ — click a plot → allottee, lease status,
  area, dues, readiness score.
- [ ] **Live IoT overlay** 🟠 ⚙️⚙️ — color parks/plots by real-time power/water/effluent status.
- [ ] **Measure & buffer tools** 🟠 ⚙️ — distance/area draw, proximity to port/airport/highway.
- [ ] **Satellite / drone imagery + encroachment flagging** 🟢 ⚙️⚙️⚙️.

## 3. Service Request Tracker  *(services / milestones / bottlenecks)*
- [ ] **SLA countdown + deemed approval** 🔴 ⚙️⚙️ — per-service timers, auto-approve on breach.
- [ ] **Visual milestone timeline (stepper)** 🔴 ⚙️ — stage-by-stage with officer + timestamps.
- [ ] **Per-service document checklist + validation** 🟠 ⚙️⚙️ — required docs enforced upfront.
- [ ] **Officer performance & TAT analytics** 🟠 ⚙️ — avg turnaround per service type / officer.
- [ ] **Applicant self-service tracking + auto-updates** 🟠 ⚙️ — public reference-number status page.

## 4. Secure Document Vault  *(SecureVault)*
- [ ] **Real OCR + auto-metadata extraction** 🔴 ⚙️⚙️ — make the simulated OCR real (expiry,
  issuer, doc number).
- [ ] **Expiry alerts & renewal reminders** 🔴 ⚙️ — auto-notify before NOC/licence expiry.
- [ ] **Govt verification workflow** 🟠 ⚙️ — officer verifies/rejects a document, status tracked.
- [ ] **Version control + tamper-evident hash + access audit** 🟠 ⚙️⚙️.
- [ ] **Time-limited secure share links** 🟢 ⚙️.

## 5. VazhiPorul AI Chatbot
- [ ] **Context-aware answers** 🔴 ⚙️⚙️ — knows the logged-in user's compliance, dues, requests.
- [ ] **Actionable chat** 🔴 ⚙️⚙️ — "file a water-connection request", "download my report",
  "what's my compliance score" → performs the action.
- [ ] **Tamil / bilingual + voice input** 🟠 ⚙️⚙️.
- [ ] **RAG over policies & circulars** 🟠 ⚙️⚙️ — answers from real SIPCOT/TN policy documents.

## 6. Reports & Export Center
- [ ] **Scheduled auto-reports** 🔴 ⚙️⚙️ — email board/officers a PDF on a cron (daily/weekly/quarterly).
- [ ] **Charts embedded in PDF** 🟠 ⚙️⚙️ — graphs, not just tables, in the designed report.
- [ ] **Period-over-period comparison reports** 🟠 ⚙️ — this quarter vs last, YoY.
- [ ] **Template library + saved configurations** 🟠 ⚙️ — reuse report setups per role.
- [ ] **Board-ready executive summary deck** 🟢 ⚙️⚙️.

## 7. Command Center & Analytics Dashboards
- [ ] **Drill-down on every KPI/chart** 🔴 ⚙️⚙️ — click a number → the underlying records.
- [ ] **Time-range & comparison selector** 🔴 ⚙️ — global date filter + compare periods.
- [ ] **Configurable alert thresholds** 🟠 ⚙️ — define what turns a KPI red.
- [ ] **Predictive overlays / forecast bands** 🟠 ⚙️⚙️ — trend + projection on the charts.
- [ ] **Customizable widgets / saved dashboard views** 🟢 ⚙️⚙️.

## 8. Notifications
- [ ] **Multi-channel delivery** 🔴 ⚙️⚙️ — email + SMS + WhatsApp + browser push (today: in-app only).
- [ ] **Real-time push (WebSocket/SSE)** 🔴 ⚙️⚙️ — no refresh needed.
- [ ] **Preference centre + read/unread + mark-all + digest** 🟠 ⚙️ — per-user control.
- [ ] **Priority & escalation notifications** 🟠 ⚙️.

## 9. Data Submission  *(UnifiedDataSubmission)*
- [ ] **Bulk import (Excel/CSV)** 🔴 ⚙️⚙️ — large units upload many periods at once.
- [ ] **Prefill from last period + smart validation** 🔴 ⚙️ — fewer errors, faster filing.
- [ ] **Attachment + e-signature on submission** 🟠 ⚙️.
- [ ] **API-based submission** 🟢 ⚙️⚙️ — big industries push data programmatically.

## 10. Grievances
- [ ] **SLA + auto-escalation + reference number tracking** 🔴 ⚙️ — public can track status.
- [ ] **AI auto-classification & routing** 🟠 ⚙️⚙️ — category + right department automatically.
- [ ] **Sentiment analysis + priority** 🟠 ⚙️ — surface angry/urgent tickets.
- [ ] **Post-resolution feedback/rating** 🟢 ⚙️.

## 11. Workflow Automation
- [ ] **Visual no-code workflow builder** 🔴 ⚙️⚙️⚙️ — build triggers→conditions→actions in UI.
- [ ] **Real action execution** 🔴 ⚙️⚙️ — actually send the email/SMS/notice (today simulated).
- [ ] **Multi-step approval chains** 🟠 ⚙️⚙️.

## 12. Mobile Inspection
- [ ] **Real submission to backend + link to compliance** 🔴 ⚙️⚙️ — inspections persist & raise violations.
- [ ] **Geo-tagged photo evidence (offline-first)** 🔴 ⚙️⚙️ — capture in the field, sync later.
- [ ] **AI violation detection from photos** 🟠 ⚙️⚙️.
- [ ] **Digital checklist per inspection type + officer route** 🟠 ⚙️.

## 13. Payments & Subscription
- [ ] **GST invoices + receipts** 🔴 ⚙️ — proper tax invoices auto-generated.
- [ ] **Auto-renewal + dunning + failed-payment retry** 🟠 ⚙️⚙️.
- [ ] **Prorated upgrade/downgrade + usage-based tiers** 🟠 ⚙️⚙️.

## 14. User Management & Security
- [ ] **Granular RBAC / permissions** 🔴 ⚙️⚙️ — beyond 3 fixed roles; per-action permissions.
- [ ] **MFA + session management** 🔴 ⚙️⚙️ — 2FA, active-session control, forced logout.
- [ ] **SSO (Govt e-Sevai / TN login)** 🟠 ⚙️⚙️.
- [ ] **Bulk user import + delegation** 🟢 ⚙️.

## 15. Audit Logs
- [ ] **Tamper-evident hash-chained logs** 🟠 ⚙️⚙️ — provably unaltered (audit credibility).
- [ ] **Advanced filter + export + retention policy** 🟠 ⚙️.
- [ ] **Anomaly detection on the audit trail** 🟢 ⚙️⚙️.

## 16. Platform-wide (cuts across all modules)
- [ ] **Global search** 🔴 ⚙️⚙️ — search industries, plots, requests, docs from one bar.
- [ ] **Tamil (bilingual) UI toggle** 🔴 ⚙️⚙️ — pair with the existing accessibility widget.
- [ ] **Personalized role dashboards (drag widgets)** 🟠 ⚙️⚙️.
- [ ] **Dark mode + saved user preferences (server-side)** 🟢 ⚙️.

---

## ⚡ Quick wins (high value, ≤ small/medium effort) — do these first
1. Compliance **SLA auto-escalation** + **auto-detection** of violations.
2. Service Tracker **SLA countdown + visual milestone timeline**.
3. Vault **expiry alerts & renewal reminders**.
4. **Scheduled auto-reports** (email PDFs on a cron).
5. **Multi-channel notifications** (email/SMS) + read/unread.
6. **Global search** + **Tamil UI toggle**.

## 🥇 Top 3 highest-leverage enhancements
1. **Compliance Engine → auto-detection + configurable rules + auto-escalation** — turns a
   manual log into a self-running enforcement engine.
2. **VazhiPorul AI → context-aware + actionable** — the assistant actually *does* things.
3. **Reports → scheduled delivery + embedded charts** — leadership gets insight without logging in.
