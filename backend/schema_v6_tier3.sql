-- ============================================================
-- SIPCOT SIMS v6 — TIER 3 (Strategic Differentiation) Enhancements
-- ============================================================
-- Source: BUILD_TODO_Research_Future_Changes.md (Tier 3)
-- Runs AFTER schema.sql, schema_v2.sql, schema_v3_enhancements.sql,
-- schema_v4_research.sql, schema_v5_tier2.sql.
--
-- Purpose : Strategic positioning layer:
--             T3.3 Real government integration framework
--             T3.4 Directory anti-pattern audit (last_verified)
--             T3.5 Circulars / press API + aggregator
--             T3.2 Mission Inaippagam interop (CSR needs cache)
--             T3.1 Subscription repositioning (tier_feature_access)
--
-- Safety  : PURELY ADDITIVE. Every CREATE is IF NOT EXISTS, every
--           ALTER is wrapped in DO/EXCEPTION, every seed is ON
--           CONFLICT DO NOTHING. Safe to auto-run on every boot.
-- ============================================================

-- ============================================================
-- T3.3 — Government Integration Framework
-- ============================================================
-- Credentials + sync status per integration (GSTN, TNPCB, TANGEDCO,
-- MCA, Inaippagam). Secrets stored encrypted-at-app-layer (never
-- returned in clear). The simulated integrations.js/sipcot-sync.js
-- keep working; this is the structured successor.
CREATE TABLE IF NOT EXISTS gov_integration_configs (
    id              SERIAL PRIMARY KEY,
    integration_key VARCHAR(50) UNIQUE NOT NULL,   -- gstn, tnpcb, tangedco, mca, inaippagam
    display_name    VARCHAR(100) NOT NULL,
    base_url        VARCHAR(255),
    auth_type       VARCHAR(30) DEFAULT 'api_key', -- api_key | oauth | none
    credentials_encrypted TEXT,                     -- app-layer encrypted blob
    is_enabled      BOOLEAN DEFAULT FALSE,
    last_sync_at    TIMESTAMP,
    last_sync_status VARCHAR(20),                   -- success | failed | partial | never
    last_sync_error TEXT,
    last_sync_count INTEGER DEFAULT 0,
    updated_by      INTEGER REFERENCES users(id),
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed the 5 priority integrations as disabled stubs (admin enables
-- + adds credentials via the UI).
INSERT INTO gov_integration_configs (integration_key, display_name, is_enabled, last_sync_status)
VALUES
    ('gstn',       'GST Network (Turnover)',       FALSE, 'never'),
    ('tnpcb',      'TNPCB (Consent / OCMMS)',      FALSE, 'never'),
    ('tangedco',   'TANGEDCO (Power)',             FALSE, 'never'),
    ('mca',        'MCA (CSR-2 Filings)',          FALSE, 'never'),
    ('inaippagam', 'Mission Inaippagam (CSR)',     FALSE, 'never')
ON CONFLICT (integration_key) DO NOTHING;

-- Sync run log (one row per sync attempt).
CREATE TABLE IF NOT EXISTS gov_integration_sync_log (
    id              SERIAL PRIMARY KEY,
    integration_key VARCHAR(50) NOT NULL,
    started_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at    TIMESTAMP,
    status          VARCHAR(20),                    -- success | failed | partial
    records_pulled  INTEGER DEFAULT 0,
    records_pushed  INTEGER DEFAULT 0,
    error           TEXT
);
CREATE INDEX IF NOT EXISTS idx_govsync_key ON gov_integration_sync_log(integration_key);

-- ============================================================
-- T3.4 — Directory contacts (anti-pattern audit: last_verified)
-- ============================================================
-- The research flagged that private association sites list dead/
-- outdated phone numbers. This table tracks every contact SIPCOT
-- publishes + a last_verified date so stale entries surface.
CREATE TABLE IF NOT EXISTS directory_contacts (
    id              SERIAL PRIMARY KEY,
    entity_type     VARCHAR(50) NOT NULL,           -- park | association | authority | officer | utility
    entity_name     VARCHAR(255) NOT NULL,
    park_id         INTEGER REFERENCES industrial_parks(id) ON DELETE CASCADE,
    contact_type    VARCHAR(30),                    -- phone | email | address | helpline
    contact_value   VARCHAR(255) NOT NULL,
    designation     VARCHAR(100),
    is_verified     BOOLEAN DEFAULT FALSE,
    last_verified_at TIMESTAMP,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_dir_contacts_park ON directory_contacts(park_id);
CREATE INDEX IF NOT EXISTS idx_dir_contacts_type ON directory_contacts(entity_type);

-- Seed a handful of real SIPCOT HQ + authority contacts (from the
-- research doc) so the directory isn't empty on first load.
INSERT INTO directory_contacts (entity_type, entity_name, contact_type, contact_value, designation, is_verified, last_verified_at)
VALUES
    ('authority', 'SIPCOT Headquarters', 'phone', '044-27253123', 'Main Office', TRUE, CURRENT_DATE),
    ('authority', 'SIPCOT Headquarters', 'email', 'cmd@sipcot.com', 'CMD Office', TRUE, CURRENT_DATE),
    ('authority', 'TNPCB', 'phone', '044-22540003', 'Pollution Control', TRUE, CURRENT_DATE),
    ('authority', 'TANGEDCO', 'phone', '1912', 'Power Helpline', TRUE, CURRENT_DATE),
    ('authority', 'TWAD Board', 'phone', '044-25301021', 'Water Supply', TRUE, CURRENT_DATE),
    ('authority', 'Fire Department', 'phone', '101', 'Emergency', TRUE, CURRENT_DATE),
    ('authority', 'SIPCOT Helpline', 'phone', '1800-425-2211', 'Toll-free Helpline', TRUE, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- T3.5 — Circulars / press API + aggregator
-- ============================================================
-- SIPCOT publishes no RSS feed; this table becomes the machine-
-- readable channel for circulars, tenders, office orders, news.
CREATE TABLE IF NOT EXISTS circulars (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(500) NOT NULL,
    category        VARCHAR(50),                    -- circular | tender | office_order | news | policy
    reference_no    VARCHAR(100),
    published_date  DATE,
    source_url      VARCHAR(500),
    summary         TEXT,
    affected_sectors TEXT[],                        -- which industry sectors it concerns
    affected_parks  INTEGER[],                      -- which park ids (NULL = all)
    is_active       BOOLEAN DEFAULT TRUE,
    ingested_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_circulars_category ON circulars(category);
CREATE INDEX IF NOT EXISTS idx_circulars_published ON circulars(published_date DESC);

-- Seed a couple of realistic circulars so the feed works on first load.
INSERT INTO circulars (title, category, reference_no, published_date, summary, affected_sectors, affected_parks)
VALUES
    ('SIPCOT EV Park Plot Allotment — Manallur, Thiruvallur (300 acres)', 'news', 'SIPCOT/EV/2026/01', CURRENT_DATE - 5, 'SIPCOT invites applications from EV and electronics manufacturers for plot allotment in the dedicated 300-acre EV Park at Manallur, Thiruvallur.', ARRAY['ev','electronics','automotive'], NULL),
    ('Revised Water Tariff for Industrial Consumers — Effective Q3 2026', 'circular', 'SIPCOT/WATER/2026/14', CURRENT_DATE - 12, 'Industrial water tariff revised to Rs.35/KL for all SIPCOT parks. Applicable from 1 July 2026. Industries must update billing preferences.', NULL, NULL),
    ('TN Semiconductor Mission 2030 — Expression of Interest', 'policy', 'SIPCOT/SEMI/2026/03', CURRENT_DATE - 20, 'TN Government invites expressions of interest for semiconductor park development at Coimbatore (Sulur, Palladam) and Thoothukudi. Rs.500 Cr mission budget.', ARRAY['semiconductor','electronics'], NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- T3.2 — Mission Inaippagam interop (CSR needs cache)
-- ============================================================
-- A local cache of verified CSR funding needs pulled from Mission
-- Inaippagam (csr.tn.gov.in). The connector is a scaffold (needs
-- SDGCC/UNDP credentials — architecturally RESTful per Velsof case
-- study, no public docs). Until then, admin can seed manually.
CREATE TABLE IF NOT EXISTS csr_funding_needs (
    id              SERIAL PRIMARY KEY,
    external_id     VARCHAR(100),                   -- Inaippagam project id
    title           VARCHAR(500) NOT NULL,
    department      VARCHAR(255),
    district        VARCHAR(100),
    block           VARCHAR(100),
    sdg_goals       INTEGER[],
    budget_required DECIMAL(15,2),
    status          VARCHAR(30) DEFAULT 'open',     -- open | funded | closed
    source_url      VARCHAR(500),
    pulled_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (external_id)
);

-- ============================================================
-- T3.1 — Subscription tier feature access map
-- ============================================================
-- Makes the gating rules explicit + auditable. Each row says which
-- tier can access which feature. Statutory features are explicitly
-- free for ALL tiers (the research flagged that gating them is wrong).
CREATE TABLE IF NOT EXISTS tier_feature_access (
    id              SERIAL PRIMARY KEY,
    feature_key     VARCHAR(100) NOT NULL,          -- e.g. 'analytics.predictive', 'submission.api'
    feature_name    VARCHAR(200) NOT NULL,
    category        VARCHAR(50),                    -- statutory | value_added | integration
    is_statutory    BOOLEAN DEFAULT FALSE,          -- if true, free for everyone (never gated)
    free_starter    BOOLEAN DEFAULT TRUE,
    sme_pro         BOOLEAN DEFAULT TRUE,
    enterprise_suite BOOLEAN DEFAULT TRUE,
    notes           TEXT,
    UNIQUE (feature_key)
);

-- Seed the access matrix: statutory = free for all; value-added gated.
INSERT INTO tier_feature_access (feature_key, feature_name, category, is_statutory, free_starter, sme_pro, enterprise_suite, notes)
VALUES
    -- STATUTORY (always free — the research mandate)
    ('submission.data_filing', 'Quarterly Data Submission', 'statutory', TRUE, TRUE, TRUE, TRUE, 'Mandatory regulatory filing — never gated'),
    ('compliance.score_view', 'Compliance Score View', 'statutory', TRUE, TRUE, TRUE, TRUE, 'Right to know own compliance status'),
    ('services.basic_tracker', 'Services & NOC Tracker', 'statutory', TRUE, TRUE, TRUE, TRUE, 'Statutory clearance tracking'),
    ('vault.basic_storage', 'Document Vault (10MB)', 'statutory', TRUE, TRUE, TRUE, TRUE, 'Basic statutory document storage'),
    -- VALUE-ADDED (gated by tier)
    ('analytics.predictive', 'Predictive Analytics', 'value_added', FALSE, FALSE, FALSE, TRUE, 'Enterprise only — forecast models'),
    ('reports.scheduled', 'Scheduled Auto-Reports', 'value_added', FALSE, FALSE, TRUE, TRUE, 'SME Pro+ — email PDF on cron'),
    ('submission.excel_upload', 'Excel Bulk Upload', 'value_added', FALSE, FALSE, TRUE, TRUE, 'SME Pro+'),
    ('submission.api_access', 'API / ERP Integration', 'value_added', FALSE, FALSE, FALSE, TRUE, 'Enterprise only'),
    ('vault.ocr', 'Auto-OCR Metadata', 'value_added', FALSE, FALSE, FALSE, TRUE, 'Enterprise only'),
    ('audit.indefinite', 'Indefinite Audit Log Retention', 'value_added', FALSE, FALSE, FALSE, TRUE, 'Enterprise only; SME Pro=14 days'),
    ('analytics.benchmarking', 'Industry Benchmarking', 'value_added', FALSE, FALSE, TRUE, TRUE, 'SME Pro+')
ON CONFLICT (feature_key) DO NOTHING;

-- ============================================================
-- END v6 TIER 3 ENHANCEMENTS SCHEMA
-- ============================================================
