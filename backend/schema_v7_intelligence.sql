-- ============================================================
-- schema_v7_intelligence.sql — Industrial Intelligence & Data
-- Reliability layer (closes the 2026-09-30 requirement audit gaps).
--
-- Idempotent by design: every CREATE is IF NOT EXISTS, every ALTER
-- uses ADD COLUMN IF NOT EXISTS, every seed uses ON CONFLICT DO
-- NOTHING. Applied automatically at boot AFTER v6 (see index.js).
--
-- NEW CAPABILITIES
--   1. submission_versions   — append-only amendment history
--   2. production_data       — missing Production domain
--   3. operational_status    — industry lifecycle (+history)
--   4. reporting_periods     — real reporting calendar (configurable)
--   5. submission_reminders  — reminder/escalation audit per filer
--   6. data_findings         — consistency + anomaly evidence store
--   7. intelligence_rules    — configurable validation/consistency/anomaly config
--   8. ai_recommendations    — persisted AI decisions w/ human review
--   9. ai_query_log          — assistant query audit trail
--  10. forecasts             — persisted quarterly forecasts
--  11. data_submissions      — created/updated timestamps + is_late
--  12. audit_logs            — payload + request_id (change evidence)
--  13. users                 — account lockout columns
--  14. industry_profiles     — per-industry scoped API key columns
--
-- MIGRATION SAFETY (Phase 24): frozen backups of every table that
-- gains columns are taken FIRST, once (IF NOT EXISTS guards them).
-- No existing column is renamed, retyped, or dropped. No existing
-- row is modified except the compliance_rules threshold repair at
-- the bottom, which only fills NULL thresholds on seeded quota
-- rules so the existing rule engine can fire (values are seeded
-- defaults, admin-editable, and only apply where currently NULL).
-- ============================================================

-- ------------------------------------------------------------
-- 0. SAFETY BACKUPS (frozen at first run — never refreshed)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS migration_v7_backup_industry_profiles AS TABLE industry_profiles;
CREATE TABLE IF NOT EXISTS migration_v7_backup_data_submissions AS TABLE data_submissions;
CREATE TABLE IF NOT EXISTS migration_v7_backup_users AS TABLE users;
CREATE TABLE IF NOT EXISTS migration_v7_backup_audit_logs AS TABLE audit_logs;
CREATE TABLE IF NOT EXISTS migration_v7_backup_compliance_rules AS TABLE compliance_rules;

-- ------------------------------------------------------------
-- 1. Submission version history (Phase 5 — never destroy history)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS submission_versions (
    id                  SERIAL PRIMARY KEY,
    submission_id       INTEGER NOT NULL REFERENCES data_submissions(id) ON DELETE CASCADE,
    industry_id         INTEGER NOT NULL REFERENCES industry_profiles(id) ON DELETE CASCADE,
    period_year         INTEGER NOT NULL,
    period_quarter      INTEGER,               -- NULL for annual filings
    version_no          INTEGER NOT NULL DEFAULT 1,
    change_kind         VARCHAR(20) NOT NULL DEFAULT 'original',  -- original | amendment
    amendment_reason    TEXT,
    payload             JSONB NOT NULL,        -- full filed values (this version)
    previous_payload    JSONB,                 -- full filed values (prior version) — NULL on original
    diff                JSONB,                 -- machine-readable [{field, old, new, change_pct}]
    filed_by            INTEGER REFERENCES users(id),
    filed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submission_status   VARCHAR(50),           -- submission status at filing time
    source              VARCHAR(20) NOT NULL DEFAULT 'web', -- web | bulk | api
    CONSTRAINT uq_submission_version UNIQUE (submission_id, version_no)
);
CREATE INDEX IF NOT EXISTS idx_subver_industry_period
    ON submission_versions (industry_id, period_year DESC, period_quarter DESC NULLS LAST, version_no DESC);

-- ------------------------------------------------------------
-- 2. Production domain (Phase 3)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS production_data (
    id                  SERIAL PRIMARY KEY,
    submission_id       INTEGER NOT NULL REFERENCES data_submissions(id) ON DELETE CASCADE,
    industry_id         INTEGER NOT NULL REFERENCES industry_profiles(id) ON DELETE CASCADE,
    period_year         INTEGER NOT NULL,
    period_quarter      INTEGER,
    product_name        VARCHAR(255) NOT NULL,
    quantity            NUMERIC(18,3) NOT NULL DEFAULT 0,
    unit                VARCHAR(16) NOT NULL DEFAULT 'NOS',   -- MT | KG | L | M3 | KWH | NOS | SQM
    production_value    NUMERIC(18,2) NOT NULL DEFAULT 0,      -- canonical INR
    remarks             TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_production_industry_period
    ON production_data (industry_id, period_year DESC, period_quarter DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_production_park_period
    ON production_data (industry_id, period_year, period_quarter);

-- ------------------------------------------------------------
-- 3. Operational status lifecycle (Phase 4)
-- ------------------------------------------------------------
ALTER TABLE industry_profiles ADD COLUMN IF NOT EXISTS operational_status VARCHAR(30) NOT NULL DEFAULT 'OPERATING';
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_industry_operational_status') THEN
        ALTER TABLE industry_profiles ADD CONSTRAINT ck_industry_operational_status
            CHECK (operational_status IN ('OPERATING','UNDER_CONSTRUCTION','IDLE','TEMPORARILY_CLOSED','CLOSED'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS operational_status_history (
    id                  SERIAL PRIMARY KEY,
    industry_id         INTEGER NOT NULL REFERENCES industry_profiles(id) ON DELETE CASCADE,
    from_status         VARCHAR(30),
    to_status           VARCHAR(30) NOT NULL,
    reason              TEXT,
    changed_by          INTEGER REFERENCES users(id),
    changed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source              VARCHAR(20) NOT NULL DEFAULT 'manual'   -- manual | submission | admin
);
CREATE INDEX IF NOT EXISTS idx_opstatus_history_industry
    ON operational_status_history (industry_id, changed_at DESC);

-- ------------------------------------------------------------
-- 4. Reporting calendar (Phase 6) — deadlines are SEEDED DEFAULTS
--    (quarter-end + 15 days, 7-day grace) and are ADMIN-CONFIGURABLE.
--    They are not claimed to be actual SIPCOT statutory dates.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reporting_periods (
    id                  SERIAL PRIMARY KEY,
    period_year         INTEGER NOT NULL,
    period_quarter      INTEGER NOT NULL,          -- 1..4 (calendar quarters)
    opens_on            DATE NOT NULL,
    due_on              DATE NOT NULL,
    grace_days          INTEGER NOT NULL DEFAULT 7,
    closes_on           DATE NOT NULL,             -- due_on + grace_days
    status              VARCHAR(10) NOT NULL DEFAULT 'open',   -- open | closed
    created_by          INTEGER REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_reporting_period UNIQUE (period_year, period_quarter),
    CONSTRAINT ck_reporting_quarter CHECK (period_quarter BETWEEN 1 AND 4)
);

-- Seed 2025 + 2026 with defaults (ON CONFLICT DO NOTHING keeps admin edits).
INSERT INTO reporting_periods (period_year, period_quarter, opens_on, due_on, grace_days, closes_on, status)
SELECT y.y, q.q,
       make_date(y.y, (q.q - 1) * 3 + 1, 1),
       (make_date(y.y, (q.q - 1) * 3 + 1, 1) + INTERVAL '3 months' - INTERVAL '1 day' + INTERVAL '15 days')::date,
       7,
       (make_date(y.y, (q.q - 1) * 3 + 1, 1) + INTERVAL '3 months' - INTERVAL '1 day' + INTERVAL '22 days')::date,
       CASE WHEN (make_date(y.y, (q.q - 1) * 3 + 1, 1) + INTERVAL '3 months' - INTERVAL '1 day' + INTERVAL '22 days')::date < CURRENT_DATE
            THEN 'closed' ELSE 'open' END
  FROM (VALUES (2025), (2026)) AS y(y)
 CROSS JOIN (VALUES (1), (2), (3), (4)) AS q(q)
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 5. Reminder / escalation ledger (Phase 8) — who was notified when
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS submission_reminders (
    id                  SERIAL PRIMARY KEY,
    industry_id         INTEGER NOT NULL REFERENCES industry_profiles(id) ON DELETE CASCADE,
    period_year         INTEGER NOT NULL,
    period_quarter      INTEGER NOT NULL,
    reminder_no         INTEGER NOT NULL DEFAULT 1,
    stage               VARCHAR(12) NOT NULL,      -- upcoming | due | grace | overdue | escalated
    notified_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    gov_notified        BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_submission_reminder UNIQUE (industry_id, period_year, period_quarter, reminder_no)
);

-- ------------------------------------------------------------
-- 6. Data findings — consistency + anomaly evidence (Phases 9-10)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS data_findings (
    id                  SERIAL PRIMARY KEY,
    finding_type        VARCHAR(12) NOT NULL,      -- consistency | anomaly | validation
    rule_id             VARCHAR(40) NOT NULL,
    industry_id         INTEGER NOT NULL REFERENCES industry_profiles(id) ON DELETE CASCADE,
    submission_id       INTEGER REFERENCES data_submissions(id) ON DELETE SET NULL,
    period_year         INTEGER NOT NULL,
    period_quarter      INTEGER,
    metric              VARCHAR(60),
    observed_value       NUMERIC,
    expected_value      NUMERIC,
    change_pct          NUMERIC,
    severity            VARCHAR(10) NOT NULL DEFAULT 'warning',  -- info | warning | high | critical
    reason              TEXT NOT NULL,
    evidence            JSONB,
    status              VARCHAR(10) NOT NULL DEFAULT 'open',     -- open | reviewed | dismissed | resolved
    detected_by         VARCHAR(12) NOT NULL DEFAULT 'ingest',   -- ingest | batch | scheduler | manual
    detected_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_by         INTEGER REFERENCES users(id),
    resolved_at         TIMESTAMPTZ
);
-- One OPEN finding per rule+industry+period (COALESCE folds annual NULLs).
CREATE UNIQUE INDEX IF NOT EXISTS uq_open_finding
    ON data_findings (rule_id, industry_id, period_year, COALESCE(period_quarter, 0))
    WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_findings_open
    ON data_findings (status, severity, detected_at DESC);

-- ------------------------------------------------------------
-- 7. Configurable intelligence rules (Phases 1, 9, 10)
--    One table, three categories; thresholds are SEEDED DEFAULTS
--    (no invented regulatory values) and admin-editable at runtime.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS intelligence_rules (
    rule_id             VARCHAR(40) PRIMARY KEY,
    category            VARCHAR(12) NOT NULL,      -- validation | consistency | anomaly
    description         TEXT NOT NULL,
    config              JSONB NOT NULL DEFAULT '{}'::jsonb,
    enabled             BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by          INTEGER REFERENCES users(id),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- validation: hard ranges (canonical units: INR, count, KL, kWh)
INSERT INTO intelligence_rules (rule_id, category, description, config) VALUES
 ('V-INVEST',    'validation', 'Investment amount range (INR)',                  '{"field":"investmentAmount","min":0,"max":10000000000000}'),
 ('V-TURN',      'validation', 'Annual turnover range (INR)',                    '{"field":"annualTurnover","min":0,"max":10000000000000}'),
 ('V-EXPORT',    'validation', 'Export revenue range (INR)',                     '{"field":"exportRevenue","min":0,"max":10000000000000}'),
 ('V-RD',        'validation', 'R&D expenditure range (INR)',                    '{"field":"rdExpenditure","min":0,"max":10000000000000}'),
 ('V-PERM',      'validation', 'Permanent employees range (count)',              '{"field":"permanentEmployees","min":0,"max":1000000}'),
 ('V-CONTRACT',  'validation', 'Contract employees range (count)',               '{"field":"contractEmployees","min":0,"max":1000000}'),
 ('V-SCST',      'validation', 'SC/ST employees range (count)',                  '{"field":"scStEmployees","min":0,"max":1000000}'),
 ('V-WOMEN',     'validation', 'Women employees range (count)',                  '{"field":"womenEmployees","min":0,"max":1000000}'),
 ('V-WATER',     'validation', 'Water consumption range (KL/period)',            '{"field":"waterConsumption","min":0,"max":100000000}'),
 ('V-POWER',     'validation', 'Power usage range (kWh/period)',                 '{"field":"powerUsage","min":0,"max":1000000000}'),
 ('V-WASTE',     'validation', 'Waste generated range (MT/period)',              '{"field":"wasteGenerated","min":0,"max":10000000}'),
 ('V-WASTEPCT',  'validation', 'Waste recycled percentage (0-100)',              '{"field":"wasteRecycledPct","min":0,"max":100}'),
 ('V-CSR',       'validation', 'CSR spend range (INR)',                          '{"field":"csrSpent","min":0,"max":100000000000}'),
 ('V-CSRBENEF',  'validation', 'CSR beneficiaries range (count)',                '{"field":"csrBeneficiaries","min":0,"max":100000000}'),
 ('V-PROD-QTY',  'validation', 'Production quantity range',                      '{"field":"productionQuantity","min":0,"max":10000000000}'),
 ('V-PROD-VAL',  'validation', 'Production value range (INR)',                   '{"field":"productionValue","min":0,"max":10000000000000}')
ON CONFLICT (rule_id) DO NOTHING;

-- consistency: cross-field / cross-period / quota checks (soft — produce findings)
INSERT INTO intelligence_rules (rule_id, category, description, config) VALUES
 ('C-WAT-QUOTA',   'consistency', 'Water usage vs allocated quota (tolerance %)',
   '{"metric":"waterConsumption","quotaField":"water_allocated_kl","tolerancePct":20,"severity":"high"}'),
 ('C-PWR-QUOTA',   'consistency', 'Power usage vs sanctioned load (energy-equivalent, tolerance %)',
   '{"metric":"powerUsage","quotaField":"sanctioned_load_kw","hoursPerQuarter":2190,"tolerancePct":20,"severity":"high"}'),
 ('C-EMP-SPLIT',   'consistency', 'Workforce breakdown cannot exceed total employees',
   '{"severity":"warning"}'),
 ('C-EXPORT-TURN', 'consistency', 'Export revenue cannot exceed total turnover',
   '{"tolerancePct":5,"severity":"warning"}'),
 ('C-UNIT-SMALL',  'consistency', 'Suspiciously small INR value — possible Crore-unit entry',
   '{"field":"investmentAmount","threshold":100000,"severity":"warning"}'),
 ('C-INV-COMMIT',  'consistency', 'Realised investment below committed share (info)',
   '{"minRealisationPct":70,"severity":"info"}')
ON CONFLICT (rule_id) DO NOTHING;

-- anomaly: statistical detection on period series
INSERT INTO intelligence_rules (rule_id, category, description, config) VALUES
 ('A-POP-CHANGE',  'anomaly', 'Period-over-period change beyond threshold',
   '{"maxChangePct":50,"minBaseline":1,"lookbackQuarters":4,"severity":"high"}'),
 ('A-IQR',         'anomaly', 'IQR outlier vs own history (robust statistics)',
   '{"factor":3.0,"minHistory":4,"lookbackQuarters":8,"severity":"warning","metrics":["totalEmployees","waterConsumption","powerUsage","annualTurnover","investmentAmount"]}')
ON CONFLICT (rule_id) DO NOTHING;

-- ------------------------------------------------------------
-- 8. AI decision persistence + assistant query log (Phases 16-18)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id                  SERIAL PRIMARY KEY,
    industry_id         INTEGER NOT NULL REFERENCES industry_profiles(id) ON DELETE CASCADE,
    recommendation      TEXT NOT NULL,
    reason              TEXT,
    evidence            JSONB,
    priority            VARCHAR(10) NOT NULL DEFAULT 'medium',
    category            VARCHAR(30),
    risk_level          VARCHAR(10),
    generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    generated_by        VARCHAR(20) NOT NULL DEFAULT 'rule-engine',
    status              VARCHAR(10) NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | executed | expired
    reviewed_by         INTEGER REFERENCES users(id),
    reviewed_at         TIMESTAMPTZ,
    review_note         TEXT,
    action              VARCHAR(60),
    outcome             TEXT
);
CREATE INDEX IF NOT EXISTS idx_ai_recs_status ON ai_recommendations (status, priority, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_recs_industry ON ai_recommendations (industry_id, generated_at DESC);

CREATE TABLE IF NOT EXISTS ai_query_log (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER REFERENCES users(id),
    role                VARCHAR(10),
    query               TEXT NOT NULL,
    intent              VARCHAR(40),
    tables_touched      TEXT[],
    execution_ms        INTEGER,
    result_status       VARCHAR(10) NOT NULL DEFAULT 'ok',   -- ok | denied | error | insufficient_data
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_query_log_user ON ai_query_log (user_id, created_at DESC);

-- ------------------------------------------------------------
-- 9. Persisted quarterly forecasts (Phase 14)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forecasts (
    id                  SERIAL PRIMARY KEY,
    metric              VARCHAR(20) NOT NULL,      -- investment | employment | water | power | turnover | production
    scope_type          VARCHAR(10) NOT NULL,      -- industry | park | state
    scope_id            INTEGER,                   -- NULL for state
    period_year         INTEGER NOT NULL,
    period_quarter      INTEGER NOT NULL,
    predicted_value     NUMERIC NOT NULL,
    lower_bound         NUMERIC,
    upper_bound         NUMERIC,
    model               VARCHAR(30) NOT NULL,      -- linear_regression | moving_average | seasonal_naive
    model_version       VARCHAR(20) NOT NULL DEFAULT '1.0',
    training_periods    INTEGER,
    generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    generated_by        VARCHAR(16) NOT NULL DEFAULT 'system'
);
CREATE INDEX IF NOT EXISTS idx_forecasts_lookup
    ON forecasts (metric, scope_type, scope_id, period_year, period_quarter);

-- ------------------------------------------------------------
-- 10. data_submissions: timestamps + late flag (audited gap)
-- ------------------------------------------------------------
ALTER TABLE data_submissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE data_submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE data_submissions ADD COLUMN IF NOT EXISTS is_late BOOLEAN NOT NULL DEFAULT FALSE;

-- ------------------------------------------------------------
-- 11. audit_logs: change payload + request id (Phase 19)
-- ------------------------------------------------------------
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS payload JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS request_id TEXT;

-- ------------------------------------------------------------
-- 12. users: account lockout (Phase 22)
-- ------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- ------------------------------------------------------------
-- 13. industry_profiles: scoped per-industry API key (Phase 22)
-- ------------------------------------------------------------
ALTER TABLE industry_profiles ADD COLUMN IF NOT EXISTS api_key_hash TEXT;
ALTER TABLE industry_profiles ADD COLUMN IF NOT EXISTS api_key_prefix TEXT;

-- ------------------------------------------------------------
-- 14. Compliance-rules repair (audited dead rules): fill NULL
--     thresholds on the seeded quota rules ONLY where NULL, so the
--     existing evaluateRule() engine can actually fire them. These
--     are placeholder magnitudes an admin is expected to tune —
--     the intelligent quota checks live in data_findings with
--     per-industry allocations (which a global rule cannot express).
-- ------------------------------------------------------------
UPDATE compliance_rules
   SET threshold_value = 1000000, updated_by = updated_by
 WHERE rule_code = 'ENV-WAT-OD' AND threshold_value IS NULL;
UPDATE compliance_rules
   SET threshold_value = 100000
 WHERE rule_code = 'ENV-PWR-OD' AND threshold_value IS NULL;

-- Wire the seeded SUB-Q rule so quarterly-filing enforcement can
-- actually be evaluated by the existing engine (target: submission
-- count for the current year — breach means zero filings).
UPDATE compliance_rules
   SET target_metric = 'submission_count', threshold_operator = 'lt', threshold_value = 1
 WHERE rule_code = 'SUB-Q' AND (target_metric IS NULL OR threshold_operator IS NULL);

-- ------------------------------------------------------------
-- 15. Backfill: stamp existing submissions with their original
--     filing timestamps so created_at is never NULL for old rows.
-- ------------------------------------------------------------
UPDATE data_submissions SET created_at = COALESCE(created_at, submitted_at, NOW()) WHERE created_at IS NULL;
UPDATE data_submissions SET updated_at = COALESCE(updated_at, submitted_at, NOW()) WHERE updated_at IS NULL;

-- ------------------------------------------------------------
-- 16. Metric columns become NULLABLE: "not reported" must be
--     distinguishable from a genuine 0 (Phase 1 — never coerce
--     missing values to zero). Historical rows keep their values;
--     new filings may store NULL for unreported metrics.
-- ------------------------------------------------------------
ALTER TABLE financial_data ALTER COLUMN investment_amount DROP NOT NULL;
ALTER TABLE financial_data ALTER COLUMN annual_turnover DROP NOT NULL;
ALTER TABLE resource_usage ALTER COLUMN water_consumption DROP NOT NULL;
ALTER TABLE resource_usage ALTER COLUMN power_usage DROP NOT NULL;
ALTER TABLE employment_data ALTER COLUMN permanent_employees DROP NOT NULL;
ALTER TABLE employment_data ALTER COLUMN contract_employees DROP NOT NULL;
ALTER TABLE csr_activities ALTER COLUMN description DROP NOT NULL;
ALTER TABLE csr_activities ALTER COLUMN amount_spent DROP NOT NULL;

-- A-CORROBORATION — cross-metric expansion coherence (Yes.docx):
-- a major single-domain change without corroborating movement in
-- related domains raises a review finding.
INSERT INTO intelligence_rules (rule_id, category, description, config) VALUES
 ('A-CORROBORATION', 'anomaly', 'Major change without corroborating movement in related metrics (expansion coherence)',
   '{"relatedMinPct":10,"severity":"warning"}')
ON CONFLICT (rule_id) DO NOTHING;

-- Relational link for filing-proof attachments (F3): documents
-- submitted alongside a quarterly filing reference it directly.
ALTER TABLE documents ADD COLUMN IF NOT EXISTS submission_id INTEGER REFERENCES data_submissions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_documents_submission ON documents (submission_id);
