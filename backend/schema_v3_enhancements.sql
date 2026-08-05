-- ============================================================
-- SIPCOT SIMS v3 — ENHANCEMENTS SCHEMA
-- ============================================================
-- Run AFTER schema.sql and schema_v2.sql
--
-- Purpose : Backing storage for the EXISTING_FEATURES_ENHANCEMENTS roadmap
--           (16 enhancement areas). One additive, idempotent migration.
-- Safety  : PURELY ADDITIVE. No existing table/column dropped or renamed.
--           Every CREATE is guarded with IF NOT EXISTS and every ALTER
--           column is guarded so re-running is safe. All existing routes
--           and queries keep working unchanged.
-- ============================================================

-- ============================================================
-- 0. SHARED EXTENSION + ENUMS
-- ============================================================
-- pgcrypto provides gen_random_uuid() for tamper-evident tokens.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
    CREATE TYPE notification_channel AS ENUM ('portal', 'email', 'sms', 'push');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE notice_type AS ENUM ('show_cause', 'closure', 'warning', 'compliance_direction', 'penalty');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE inspection_outcome AS ENUM ('compliant', 'minor_issues', 'violation', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'paid', 'overdue', 'cancelled', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE workflow_trigger_type AS ENUM ('submission', 'compliance', 'service', 'document', 'schedule', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE escalation_state AS ENUM ('normal', 'first_reminder', 'escalated', 'final_notice', 'auto_actioned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- 1. NOTIFICATIONS MODULE (Quick Win 5)
--    Persistent notifications with read/unread, channels, preferences.
--    (The current notifications route derives alerts on the fly; this
--    table ADDS persistence on top, the route keeps working.)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_scope      VARCHAR(20),                    -- optional: broadcast to a role
    category        VARCHAR(50) NOT NULL,           -- violation, submission, service, document, system, payment
    severity        VARCHAR(20) DEFAULT 'info',     -- info, warning, error, success
    title           VARCHAR(255) NOT NULL,
    message         TEXT NOT NULL,
    link            VARCHAR(255),                   -- optional in-app route to open
    metadata        JSONB DEFAULT '{}'::jsonb,      -- arbitrary payload (ids, etc.)
    channels        notification_channel[] DEFAULT ARRAY['portal']::notification_channel[],
    read_at         TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user      ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read      ON notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created   ON notifications(created_at DESC);

-- Notification delivery log (which channel fired, status) — for multi-channel reliability.
CREATE TABLE IF NOT EXISTS notification_deliveries (
    id                SERIAL PRIMARY KEY,
    notification_id   INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
    channel           notification_channel NOT NULL,
    status            VARCHAR(20) DEFAULT 'queued', -- queued, sent, failed, skipped
    provider_message_id VARCHAR(255),               -- email/sms provider id
    error             TEXT,
    attempted_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 2. AUDIT LOG ENHANCEMENT (Module 15) — tamper-evident hash chain
--    We do NOT touch the existing audit_logs table; we add a sibling
--    column that, when present, links each entry to the previous one.
--    Existing inserts (without a hash) keep working.
-- ============================================================
DO $$ BEGIN
    ALTER TABLE audit_logs ADD COLUMN prev_hash CHAR(64);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE audit_logs ADD COLUMN entry_hash CHAR(64);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE audit_logs ADD COLUMN entity_type VARCHAR(50);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE audit_logs ADD COLUMN entity_id   INTEGER;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE audit_logs ADD COLUMN severity    VARCHAR(20) DEFAULT 'info';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_audit_entity   ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_severity ON audit_logs(severity);


-- ============================================================
-- 3. COMPLIANCE ENGINE — configurable rules + escalation matrix
--    (Quick Win 1 + Top 3-A). Existing compliance_rules stays; we add
--    machine-checkable columns + an escalation timeline per violation.
-- ============================================================
DO $$ BEGIN
    ALTER TABLE compliance_rules ADD COLUMN threshold_value NUMERIC;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE compliance_rules ADD COLUMN threshold_operator VARCHAR(10); -- gt, lt, gte, lte, eq, missing
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE compliance_rules ADD COLUMN target_metric VARCHAR(100);      -- e.g. resource_usage.water_consumed
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE compliance_rules ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE compliance_rules ADD COLUMN updated_by INTEGER REFERENCES users(id);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
-- severity: the create/edit-rule endpoints (POST/PUT /api/compliance/rules)
-- and the auto-detection engine all read/write compliance_rules.severity, but
-- the base table never defined it — so every rule create/edit was 500'ing on
-- "column severity does not exist". Add it (free-form text to match the
-- 'low'/'medium'/'high'/'critical' values the API and UI use).
DO $$ BEGIN
    ALTER TABLE compliance_rules ADD COLUMN severity VARCHAR(20) DEFAULT 'medium';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Escalation matrix: how long a violation can stay in each state before auto-escalating.
CREATE TABLE IF NOT EXISTS compliance_escalation_matrix (
    id                SERIAL PRIMARY KEY,
    severity          violation_severity NOT NULL,
    from_state        violation_status  NOT NULL,
    to_state          violation_status  NOT NULL,
    sla_hours         INTEGER NOT NULL,             -- max time allowed in from_state
    auto_action       VARCHAR(100),                 -- e.g. 'notify_officer', 'raise_notice', 'lock_services'
    is_active         BOOLEAN DEFAULT TRUE,
    UNIQUE (severity, from_state)
);

-- Seed a sensible default matrix (open -> escalated after SLA breach).
INSERT INTO compliance_escalation_matrix (severity, from_state, to_state, sla_hours, auto_action)
VALUES
    ('critical', 'open',         'escalated', 24,   'notify_officer'),
    ('high',     'open',         'escalated', 72,   'notify_officer'),
    ('medium',   'open',         'acknowledged', 168, 'auto_acknowledge'),
    ('low',      'open',         'acknowledged', 336, 'auto_acknowledge'),
    ('critical', 'acknowledged', 'escalated', 48,   'raise_notice'),
    ('high',     'acknowledged', 'escalated', 120,  'raise_notice')
ON CONFLICT (severity, from_state) DO NOTHING;

-- Track the SLA clock per violation (additive; existing columns untouched).
DO $$ BEGIN
    ALTER TABLE compliance_violations ADD COLUMN sla_deadline  TIMESTAMP;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE compliance_violations ADD COLUMN escalation_state escalation_state DEFAULT 'normal';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE compliance_violations ADD COLUMN last_state_change TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE compliance_violations ADD COLUMN auto_flags JSONB DEFAULT '{}'::jsonb;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Official notices generated from violations (show-cause, closure, etc.)
CREATE TABLE IF NOT EXISTS compliance_notices (
    id              SERIAL PRIMARY KEY,
    violation_id    INTEGER REFERENCES compliance_violations(id) ON DELETE CASCADE,
    industry_id     INTEGER REFERENCES industry_profiles(id) ON DELETE CASCADE,
    notice_type     notice_type NOT NULL,
    reference_no    VARCHAR(50) UNIQUE NOT NULL,
    subject         VARCHAR(255),
    body            TEXT,
    issued_by       INTEGER REFERENCES users(id),
    served_at       TIMESTAMP,
    acknowledged_at TIMESTAMP,
    status          VARCHAR(30) DEFAULT 'issued',   -- issued, served, acknowledged, withdrawn
    pdf_path        VARCHAR(500),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notices_industry ON compliance_notices(industry_id);

-- Verifiable "Good Standing" compliance certificate (Module: compliance certificate).
CREATE TABLE IF NOT EXISTS compliance_certificates (
    id              SERIAL PRIMARY KEY,
    industry_id     INTEGER REFERENCES industry_profiles(id) ON DELETE CASCADE,
    certificate_no  VARCHAR(50) UNIQUE NOT NULL,
    score_snapshot  INTEGER,
    issued_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until     DATE,
    issued_by       INTEGER REFERENCES users(id),
    revoked         BOOLEAN DEFAULT FALSE,
    verification_code VARCHAR(64) UNIQUE NOT NULL   -- public verify token
);
CREATE INDEX IF NOT EXISTS idx_cert_industry ON compliance_certificates(industry_id);


-- ============================================================
-- 4. SERVICE TRACKER — SLA + deemed approval + public tracking (Module 3)
-- ============================================================
-- Per-service-type SLA definitions (drives the SLA countdown + deemed approval).
CREATE TABLE IF NOT EXISTS service_sla_definitions (
    id              SERIAL PRIMARY KEY,
    service_type    service_type NOT NULL UNIQUE,
    sla_days        INTEGER NOT NULL,               -- statutory turnaround
    deemed_approval BOOLEAN DEFAULT FALSE,          -- auto-approve if SLA breached
    checklist       JSONB DEFAULT '[]'::jsonb       -- required-document list
);

-- Seed SLAs per the documented processing times.
INSERT INTO service_sla_definitions (service_type, sla_days, deemed_approval, checklist) VALUES
    ('noc_fire',          7,  FALSE, '["Building Plan","Fire Safety Layout","Equipment List","Owner ID"]'),
    ('noc_pollution',    10,  FALSE, '["Site Plan","Process Flow Chart","Water Balance Statement","Hazardous Waste Plan"]'),
    ('building_approval',14,  FALSE, '["Architectural Drawings","Structural Certificate","Land Documents","Foundation Plan"]'),
    ('land_allotment',   30,  FALSE, '["Project Report","Capacity Statement","Financial Proofs","Company Registration","PAN Card"]'),
    ('lease_renewal',     5,  TRUE,  '["Existing Lease Document","Compliance Certificate","Payment Receipts"]'),
    ('water_connection',  7,  FALSE, '["Application Form","Water Requirement Assessment","Plumbing Certificate"]'),
    ('power_connection', 10,  FALSE, '["Load Requirement","Transformer Capacity","Sanctioned Plan","Contractor License"]'),
    ('transfer_request', 21,  FALSE, '["No-objection from Allottee","Buyer Financial Proofs","Clearance Certificate","Board Resolution"]'),
    ('expansion_request',21,  FALSE, '["Expansion Plan","Revised Project Report","Additional Land Proof"]')
ON CONFLICT (service_type) DO NOTHING;

-- Track SLA clock + escalation on service requests.
DO $$ BEGIN
    ALTER TABLE service_requests ADD COLUMN sla_deadline    TIMESTAMP;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE service_requests ADD COLUMN deemed_approved BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE service_requests ADD COLUMN escalation_state escalation_state DEFAULT 'normal';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE service_requests ADD COLUMN public_tracking_token VARCHAR(64);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Officer turnaround analytics (one row updated per status transition).
CREATE TABLE IF NOT EXISTS service_tat_log (
    id              SERIAL PRIMARY KEY,
    request_id      INTEGER REFERENCES service_requests(id) ON DELETE CASCADE,
    officer_id      INTEGER REFERENCES users(id),
    from_status     VARCHAR(50),
    to_status       VARCHAR(50),
    duration_hours  NUMERIC(10,2),
    logged_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tat_officer ON service_tat_log(officer_id);


-- ============================================================
-- 5. SECURE VAULT — expiry alerts, versions, OCR, verification, share (Module 4)
-- ============================================================
DO $$ BEGIN
    ALTER TABLE documents ADD COLUMN content_hash CHAR(64);          -- tamper-evidence
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE documents ADD COLUMN version INTEGER DEFAULT 1;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE documents ADD COLUMN ocr_metadata JSONB;             -- extracted expiry/issuer/number
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE documents ADD COLUMN parent_document_id INTEGER REFERENCES documents(id); -- version history
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Expiry reminders already scheduled (dedupe so we don't spam the same doc).
CREATE TABLE IF NOT EXISTS document_expiry_reminders (
    id            SERIAL PRIMARY KEY,
    document_id   INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    remind_date   DATE NOT NULL,
    days_before   INTEGER NOT NULL,
    sent          BOOLEAN DEFAULT FALSE,
    sent_at       TIMESTAMP,
    UNIQUE (document_id, days_before)
);

-- Verification workflow log (officer verifies/rejects a document).
CREATE TABLE IF NOT EXISTS document_verifications (
    id            SERIAL PRIMARY KEY,
    document_id   INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    officer_id    INTEGER REFERENCES users(id),
    decision      VARCHAR(20) NOT NULL,            -- verified, rejected
    notes         TEXT,
    decided_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Time-limited secure share links.
CREATE TABLE IF NOT EXISTS document_share_links (
    id            SERIAL PRIMARY KEY,
    document_id   INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    token         VARCHAR(64) UNIQUE NOT NULL,
    created_by    INTEGER REFERENCES users(id),
    expires_at    TIMESTAMP NOT NULL,
    max_views     INTEGER DEFAULT 1,
    views         INTEGER DEFAULT 0,
    revoked       BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 6. REPORTS — scheduled auto-reports, templates, saved configs (Quick Win 4 + Top 3-C)
-- ============================================================
CREATE TABLE IF NOT EXISTS scheduled_reports (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    owner_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
    report_type     VARCHAR(50) NOT NULL,           -- investment, employment, compliance, etc.
    frequency       VARCHAR(20) NOT NULL,           -- daily, weekly, monthly, quarterly
    recipients      TEXT[],                         -- email list
    filters         JSONB DEFAULT '{}'::jsonb,
    next_run_at     TIMESTAMP,
    last_run_at     TIMESTAMP,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sched_reports_next ON scheduled_reports(next_run_at) WHERE is_active = TRUE;

-- Saved report configurations (template library / saved setups).
CREATE TABLE IF NOT EXISTS saved_report_configs (
    id              SERIAL PRIMARY KEY,
    owner_id        INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    report_type     VARCHAR(50) NOT NULL,
    config          JSONB NOT NULL,
    is_template     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit of every report generation (history of produced files).
CREATE TABLE IF NOT EXISTS report_generation_log (
    id              SERIAL PRIMARY KEY,
    generated_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    report_type     VARCHAR(50),
    format          VARCHAR(10),                    -- pdf, xlsx, csv
    report_id_code  VARCHAR(50),                    -- the TZP-... unique id
    row_count       INTEGER,
    file_size_kb    INTEGER,
    filters         JSONB,
    generated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 7. WORKFLOW AUTOMATION — builder + action execution log (Module 11)
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_definitions (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    trigger_type    workflow_trigger_type NOT NULL,
    trigger_config  JSONB DEFAULT '{}'::jsonb,       -- event matchers
    condition_json  JSONB DEFAULT '[]'::jsonb,       -- AND conditions
    action_json     JSONB DEFAULT '[]'::jsonb,       -- ordered actions
    is_active       BOOLEAN DEFAULT TRUE,
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflow_executions (
    id              SERIAL PRIMARY KEY,
    workflow_id     INTEGER REFERENCES workflow_definitions(id) ON DELETE CASCADE,
    trigger_type    workflow_trigger_type,
    entity_type     VARCHAR(50),
    entity_id       INTEGER,
    status          VARCHAR(20) DEFAULT 'pending',   -- pending, running, completed, failed, skipped
    context         JSONB DEFAULT '{}'::jsonb,
    started_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at    TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflow_action_log (
    id              SERIAL PRIMARY KEY,
    execution_id    INTEGER REFERENCES workflow_executions(id) ON DELETE CASCADE,
    action_type     VARCHAR(50) NOT NULL,            -- email, sms, notice, status_change, etc.
    target          VARCHAR(255),
    payload         JSONB DEFAULT '{}'::jsonb,
    status          VARCHAR(20) DEFAULT 'pending',   -- pending, success, failed
    error           TEXT,
    executed_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 8. MOBILE INSPECTION (Module 12)
-- ============================================================
CREATE TABLE IF NOT EXISTS inspections (
    id              SERIAL PRIMARY KEY,
    industry_id     INTEGER REFERENCES industry_profiles(id) ON DELETE CASCADE,
    park_id         INTEGER REFERENCES industrial_parks(id),
    officer_id      INTEGER REFERENCES users(id),
    inspection_type VARCHAR(50) NOT NULL,            -- environmental, safety, fire, financial, routine
    scheduled_date  DATE,
    conducted_at    TIMESTAMP,
    outcome         inspection_outcome,
    latitude        DECIMAL(10,7),
    longitude       DECIMAL(10,7),
    geo_accuracy_m  NUMERIC(8,2),
    checklist       JSONB DEFAULT '{}'::jsonb,       -- {item: pass/fail/na, notes}
    findings        TEXT,
    photo_paths     TEXT[],                          -- stored evidence paths
    offline_payload JSONB,                           -- raw submission for offline-first replay
    linked_violation_id INTEGER REFERENCES compliance_violations(id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_inspections_industry ON inspections(industry_id);
CREATE INDEX IF NOT EXISTS idx_inspections_officer  ON inspections(officer_id);
CREATE INDEX IF NOT EXISTS idx_inspections_outcome  ON inspections(outcome);


-- ============================================================
-- 9. PAYMENTS & SUBSCRIPTION — invoices, receipts, dunning (Module 13)
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    industry_id     INTEGER REFERENCES industry_profiles(id) ON DELETE SET NULL,
    invoice_no      VARCHAR(50) UNIQUE NOT NULL,
    invoice_type    VARCHAR(30) NOT NULL,            -- subscription, lease, service_fee, penalty
    amount          DECIMAL(12,2) NOT NULL,
    gst_amount      DECIMAL(12,2) DEFAULT 0,
    total_amount    DECIMAL(12,2) NOT NULL,
    currency        VARCHAR(10) DEFAULT 'INR',
    status          invoice_status DEFAULT 'draft',
    issued_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date        DATE,
    paid_at         TIMESTAMP,
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_invoices_industry ON invoices(industry_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status   ON invoices(status);

CREATE TABLE IF NOT EXISTS subscription_subscriptions (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    industry_id     INTEGER REFERENCES industry_profiles(id) ON DELETE SET NULL,
    plan            VARCHAR(50) NOT NULL,            -- basic, pro, enterprise
    status          VARCHAR(20) DEFAULT 'active',    -- active, past_due, cancelled, trialing
    started_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    current_period_end TIMESTAMP,
    auto_renew      BOOLEAN DEFAULT TRUE,
    payment_provider VARCHAR(30) DEFAULT 'razorpay',
    provider_subscription_id VARCHAR(255),
    dunning_retries INTEGER DEFAULT 0,
    metadata        JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_subs_user ON subscription_subscriptions(user_id);


-- ============================================================
-- 10. USER MGMT & SECURITY — granular permissions, sessions, MFA (Module 14)
-- ============================================================
-- Fine-grained permissions layered ON TOP of the 3 fixed roles; the existing
-- requireRole() gate still works — this is consulted only when present.
CREATE TABLE IF NOT EXISTS role_permissions (
    id              SERIAL PRIMARY KEY,
    role            VARCHAR(20) NOT NULL,
    permission_key  VARCHAR(100) NOT NULL,           -- e.g. 'compliance.notice.issue'
    is_allowed      BOOLEAN DEFAULT TRUE,
    UNIQUE (role, permission_key)
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token_jti       VARCHAR(64) UNIQUE,              -- JWT id for forced logout
    device          VARCHAR(255),
    ip_address      VARCHAR(45),
    last_seen       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);

-- MFA secrets (TOTP). Stored encrypted at app layer; never returned in clear.
CREATE TABLE IF NOT EXISTS user_mfa (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    secret_encrypted TEXT NOT NULL,
    enabled         BOOLEAN DEFAULT FALSE,
    backup_codes    TEXT[],
    enabled_at      TIMESTAMP
);

-- Bulk-import job tracking.
CREATE TABLE IF NOT EXISTS user_import_jobs (
    id              SERIAL PRIMARY KEY,
    requested_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    role            VARCHAR(20),
    total_rows      INTEGER DEFAULT 0,
    succeeded       INTEGER DEFAULT 0,
    failed          INTEGER DEFAULT 0,
    errors          JSONB DEFAULT '[]'::jsonb,
    status          VARCHAR(20) DEFAULT 'pending',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 11. GRIEVANCES ENHANCEMENT (Module 10)
-- ============================================================
DO $$ BEGIN
    ALTER TABLE grievances ADD COLUMN reference_number VARCHAR(50) UNIQUE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE grievances ADD COLUMN category      VARCHAR(50);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE grievances ADD COLUMN department     VARCHAR(100);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE grievances ADD COLUMN priority       VARCHAR(20) DEFAULT 'normal';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE grievances ADD COLUMN sentiment      VARCHAR(20);   -- positive, neutral, negative
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE grievances ADD COLUMN sla_deadline   TIMESTAMP;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE grievances ADD COLUMN resolved_at    TIMESTAMP;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE grievances ADD COLUMN assigned_to    INTEGER REFERENCES users(id);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS grievance_feedback (
    id              SERIAL PRIMARY KEY,
    grievance_id    INTEGER REFERENCES grievances(id) ON DELETE CASCADE,
    rating          INTEGER,                         -- 1-5
    comment         TEXT,
    submitted_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (grievance_id)
);


-- ============================================================
-- 12. PLATFORM-WIDE — i18n strings, global search, dashboard prefs (Quick Win 6 + Module 16)
-- ============================================================
-- Tamil (bilingual) UI dictionary. Keyed by string id.
CREATE TABLE IF NOT EXISTS i18n_strings (
    id              SERIAL PRIMARY KEY,
    string_key      VARCHAR(150) NOT NULL,
    language        VARCHAR(5)  NOT NULL DEFAULT 'ta', -- ta, en
    value           TEXT NOT NULL,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (string_key, language)
);

-- Search index (denormalized, populated by backend on insert/update). One row
-- per searchable entity so global search is a single indexed LIKE/FTS query.
CREATE TABLE IF NOT EXISTS search_index (
    id              SERIAL PRIMARY KEY,
    entity_type     VARCHAR(50) NOT NULL,            -- industry, park, plot, service, document, grievance, user
    entity_id       INTEGER NOT NULL,
    title           VARCHAR(255) NOT NULL,
    subtitle        VARCHAR(255),
    description     TEXT,
    payload         JSONB DEFAULT '{}'::jsonb,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_search_title ON search_index USING gin (to_tsvector('english', title || ' ' || COALESCE(subtitle,'') || ' ' || COALESCE(description,'')));

-- Per-user dashboard widget preferences + saved views (drag widgets, dark mode).
CREATE TABLE IF NOT EXISTS user_dashboard_prefs (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    layout          JSONB DEFAULT '{}'::jsonb,        -- widget order/visibility
    saved_views     JSONB DEFAULT '[]'::jsonb,
    preferences     JSONB DEFAULT '{"theme":"light","language":"en"}'::jsonb,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Configurable alert thresholds (Command Center KPIs turn red when breached).
CREATE TABLE IF NOT EXISTS alert_thresholds (
    id              SERIAL PRIMARY KEY,
    metric_key      VARCHAR(100) UNIQUE NOT NULL,    -- e.g. compliance.overall, services.overdue
    warning_value   NUMERIC,
    critical_value  NUMERIC,
    direction       VARCHAR(10) DEFAULT 'below',     -- below = bad when lower; above = bad when higher
    updated_by      INTEGER REFERENCES users(id),
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- IoT telemetry stream (placeholder for live smart-meter / SCADA integration).
CREATE TABLE IF NOT EXISTS iot_telemetry (
    id              SERIAL PRIMARY KEY,
    park_id         INTEGER REFERENCES industrial_parks(id) ON DELETE CASCADE,
    plot_id         INTEGER REFERENCES park_plots(id),
    metric          VARCHAR(50) NOT NULL,            -- power_kwh, water_kl, effluent_ph, etc.
    value           NUMERIC(14,3) NOT NULL,
    unit            VARCHAR(20),
    recorded_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_anomaly      BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_iot_park_time ON iot_telemetry(park_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_iot_anomaly   ON iot_telemetry(is_anomaly) WHERE is_anomaly = TRUE;

-- GIS layer definitions (layered map: utilities, zones, heatmaps, etc.)
CREATE TABLE IF NOT EXISTS gis_layers (
    id              SERIAL PRIMARY KEY,
    layer_key       VARCHAR(50) UNIQUE NOT NULL,     -- plots, utilities, zones, investment_heat, occupancy_heat, environmental
    display_name    VARCHAR(100) NOT NULL,
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    config          JSONB DEFAULT '{}'::jsonb
);
INSERT INTO gis_layers (layer_key, display_name, description) VALUES
    ('plots',            'Plot Availability',   'Color plots by availability status'),
    ('utilities',        'Utility Network',      'Water, power, drainage networks'),
    ('zones',            'Zoning',               'Industrial / IT / Mixed / Green zones'),
    ('investment_heat',  'Investment Heatmap',   'Investment density across parks'),
    ('occupancy_heat',   'Occupancy Heatmap',    'Land occupancy / yield'),
    ('environmental',    'Environmental',        'Green belt, CETP, effluent points'),
    ('iot_live',         'Live IoT Status',      'Real-time power/water/effluent overlay')
ON CONFLICT (layer_key) DO NOTHING;


-- ============================================================
-- 13. SEED — a few default i18n strings (Tamil) to prove the toggle works
-- ============================================================
INSERT INTO i18n_strings (string_key, language, value) VALUES
    ('nav.home',               'ta', 'முகப்பு'),
    ('nav.parks',              'ta', 'தொழில்துறை பூங்காக்கள்'),
    ('nav.services',           'ta', 'சேவைகள்'),
    ('nav.compliance',         'ta', 'இணக்கம்'),
    ('nav.reports',            'ta', 'அறிக்கைகள்'),
    ('nav.workspace',          'ta', 'எனது பணியிடம்'),
    ('nav.command_center',     'ta', 'கட்டளை மையம்'),
    ('nav.analytics',          'ta', 'பகுப்பாய்வு'),
    ('common.search',          'ta', 'தேடு'),
    ('common.submit',          'ta', 'சமர்ப்பி'),
    ('common.download',        'ta', 'பதிவிறக்கம்'),
    ('compliance.score',       'ta', 'இணக்க மதிப்பெண்'),
    ('compliance.violations',  'ta', 'மீறல்கள்'),
    ('service.sla',            'ta', 'SLA காலக்கெடு'),
    ('service.deemed_approval','ta', 'கருதப்பட்ட ஒப்புதல்'),
    ('vault.expiry_alert',     'ta', 'காலாவதி எச்சரிக்கை'),
    ('notification.mark_all_read', 'ta', 'அனைத்தையும் படித்ததாக குறி')
ON CONFLICT (string_key, language) DO NOTHING;

-- Seed default alert thresholds for the Command Center.
INSERT INTO alert_thresholds (metric_key, warning_value, critical_value, direction) VALUES
    ('compliance.overall',   80, 60, 'below'),
    ('compliance.violations', 5, 15, 'above'),
    ('services.overdue',      3, 10, 'above'),
    ('infra.score',          70, 50, 'below')
ON CONFLICT (metric_key) DO NOTHING;

-- ============================================================
-- END v3 ENHANCEMENTS SCHEMA
-- ============================================================
