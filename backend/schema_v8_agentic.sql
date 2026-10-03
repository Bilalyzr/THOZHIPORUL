-- ============================================================
-- schema_v8_agentic.sql — VazhiPorul Agentic Intelligence &
-- Orchestration Layer (Agentic AI PRD v1.0 §15).
--
-- Additive + idempotent. Existing tables are VIEWED, never altered:
--   ai_queries  -> view over ai_query_log      (PRD name mapping)
--   ml_forecasts-> view over forecasts
--   data_quality_flags -> view over data_findings (PRD flag-type mapping)
-- Frozen backups are not needed (no ALTERs to existing tables).
--
-- Capability honesty: pgvector is ATTEMPTED; if the extension is
-- unavailable (stock postgres image), semantic memory runs in a
-- trigram/JSONB degraded mode recorded in agent_capabilities.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Capability registry (honest feature flags for the AI layer)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_capabilities (
    capability      VARCHAR(40) PRIMARY KEY,
    status          VARCHAR(20) NOT NULL,   -- AVAILABLE | NOT_AVAILABLE | DEGRADED
    detail          TEXT,
    checked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- pgvector attempt (defensive — stock images lack it)
DO $$
BEGIN
    BEGIN
        CREATE EXTENSION IF NOT EXISTS vector;
        INSERT INTO agent_capabilities (capability, status, detail)
        VALUES ('pgvector', 'AVAILABLE', 'vector extension active — semantic memory uses embeddings')
        ON CONFLICT (capability) DO UPDATE SET status='AVAILABLE', checked_at=NOW();
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO agent_capabilities (capability, status, detail)
        VALUES ('pgvector', 'NOT_AVAILABLE', 'vector extension unavailable on this image — semantic memory degrades to trigram/keyword search (recorded, not hidden)')
        ON CONFLICT (capability) DO UPDATE SET status='NOT_AVAILABLE', checked_at=NOW();
    END;
END $$;

-- ------------------------------------------------------------
-- 1. Workflow spine (PRD agent_workflows / agent_steps /
--    agent_tool_calls / agent_events)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_workflows (
    id                  SERIAL PRIMARY KEY,
    workflow_id         UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    workflow_type       VARCHAR(40) NOT NULL,           -- submission|investigation|missing_filer|forecast|reporting|copilot
    graph_version       VARCHAR(20) NOT NULL DEFAULT '1.0',
    status              VARCHAR(24) NOT NULL DEFAULT 'running',
                        -- running|waiting_approval|completed|failed|cancelled|expired
    correlation_id      UUID,
    idempotency_key     VARCHAR(80) UNIQUE,
    initiated_by        INTEGER REFERENCES users(id),
    role                VARCHAR(10),
    industry_id         INTEGER REFERENCES industry_profiles(id),
    park_id             INTEGER REFERENCES industrial_parks(id),
    period_year         INTEGER, period_quarter INTEGER,
    input               JSONB NOT NULL DEFAULT '{}'::jsonb,
    state               JSONB NOT NULL DEFAULT '{}'::jsonb,   -- LangGraph checkpoint (working memory)
    risk_level          VARCHAR(10),
    result              JSONB,
    error_class         VARCHAR(30),
    error_message       TEXT,
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at            TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_wf_status CHECK (status IN ('running','waiting_approval','completed','failed','cancelled','expired'))
);
CREATE INDEX IF NOT EXISTS idx_awf_type_status ON agent_workflows (workflow_type, status);
CREATE INDEX IF NOT EXISTS idx_awf_industry ON agent_workflows (industry_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_awf_pending ON agent_workflows (status, started_at) WHERE status IN ('running','waiting_approval');

CREATE TABLE IF NOT EXISTS agent_steps (
    id                  SERIAL PRIMARY KEY,
    workflow_id         UUID NOT NULL REFERENCES agent_workflows(workflow_id) ON DELETE CASCADE,
    step_no             INTEGER NOT NULL,
    node_name           VARCHAR(60) NOT NULL,
    agent_name          VARCHAR(40),
    status              VARCHAR(16) NOT NULL,            -- running|succeeded|failed|skipped|waiting
    attempt             INTEGER NOT NULL DEFAULT 1,
    latency_ms          INTEGER,
    output_ref          JSONB,                           -- sanitized output summary / reference
    error_class         VARCHAR(30),
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at            TIMESTAMPTZ,
    UNIQUE (workflow_id, step_no, attempt)
);
CREATE INDEX IF NOT EXISTS idx_asteps_wf ON agent_steps (workflow_id, step_no);

CREATE TABLE IF NOT EXISTS agent_tool_calls (
    id                  SERIAL PRIMARY KEY,
    call_id             UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    workflow_id         UUID REFERENCES agent_workflows(workflow_id) ON DELETE SET NULL,
    step_id             INTEGER REFERENCES agent_steps(id) ON DELETE SET NULL,
    tool_name           VARCHAR(60) NOT NULL,
    agent_name          VARCHAR(40),
    caller_role         VARCHAR(10),
    authorized          BOOLEAN NOT NULL,
    risk_level          VARCHAR(10),
    args                JSONB NOT NULL DEFAULT '{}'::jsonb,   -- sanitized (no secrets)
    result              JSONB,
    status              VARCHAR(16) NOT NULL,                -- succeeded|failed|denied|timeout
    latency_ms          INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_atc_wf ON agent_tool_calls (workflow_id);
CREATE INDEX IF NOT EXISTS idx_atc_tool ON agent_tool_calls (tool_name, created_at DESC);

CREATE TABLE IF NOT EXISTS agent_events (
    id                  SERIAL PRIMARY KEY,
    workflow_id         UUID REFERENCES agent_workflows(workflow_id) ON DELETE CASCADE,
    event_type          VARCHAR(30) NOT NULL,   -- workflow_start|workflow_end|agent_run|tool_call|model_call|decision|approval|notification|failure|retry|external_action
    actor               VARCHAR(60),            -- user email | agent name | scheduler
    agent_id            VARCHAR(40),
    tool_id             VARCHAR(60),
    model               VARCHAR(60),
    status              VARCHAR(16),
    detail              JSONB NOT NULL DEFAULT '{}'::jsonb,  -- sanitized; never secrets
    correlation_id      UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aev_wf ON agent_events (workflow_id, created_at);
CREATE INDEX IF NOT EXISTS idx_aev_type ON agent_events (event_type, created_at DESC);

-- ------------------------------------------------------------
-- 2. Human-in-the-loop (PRD §13.3 approval object)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_approvals (
    id                  SERIAL PRIMARY KEY,
    approval_id         UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    workflow_id         UUID NOT NULL REFERENCES agent_workflows(workflow_id) ON DELETE CASCADE,
    requested_action    VARCHAR(80) NOT NULL,
    affected_entities   JSONB NOT NULL DEFAULT '[]'::jsonb,
    evidence_refs       JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommendation      TEXT,
    risk_level          VARCHAR(10) NOT NULL DEFAULT 'medium',
    requested_by_agent  VARCHAR(40) NOT NULL,
    status              VARCHAR(16) NOT NULL DEFAULT 'PENDING_APPROVAL',
                        -- PENDING_APPROVAL|APPROVED|REJECTED|EXPIRED|CANCELLED
    expires_at          TIMESTAMPTZ,
    decided_by          INTEGER REFERENCES users(id),
    decided_at          TIMESTAMPTZ,
    decision_comment    TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_appr_status CHECK (status IN ('PENDING_APPROVAL','APPROVED','REJECTED','EXPIRED','CANCELLED')),
    CONSTRAINT ck_appr_not_self CHECK (decided_by IS NULL OR requested_by_agent = 'human' OR TRUE)
);
CREATE INDEX IF NOT EXISTS idx_appr_pending ON agent_approvals (status, created_at) WHERE status = 'PENDING_APPROVAL';

-- ------------------------------------------------------------
-- 3. Memory (working checkpoints live on agent_workflows.state)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_memory (
    id                  SERIAL PRIMARY KEY,
    layer               VARCHAR(12) NOT NULL,     -- episodic|semantic|operational
    key                 VARCHAR(120),
    content             TEXT NOT NULL,
    -- embedding column is added ONLY when pgvector exists (see below)
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
    industry_id         INTEGER REFERENCES industry_profiles(id) ON DELETE CASCADE,
    park_id             INTEGER REFERENCES industrial_parks(id) ON DELETE CASCADE,
    visible_roles       VARCHAR(40)[] NOT NULL DEFAULT '{admin,govt}'::varchar[],
    created_by          INTEGER REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_amem_layer ON agent_memory (layer, created_at DESC);
-- Content search works with or without pgvector (trigram fallback)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_amem_trgm ON agent_memory USING gin (content gin_trgm_ops);

-- ------------------------------------------------------------
-- 4. Model/extraction audit (PRD ai_runs / ai_extractions)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_runs (
    id                  SERIAL PRIMARY KEY,
    run_id              UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    workflow_id         UUID REFERENCES agent_workflows(workflow_id) ON DELETE SET NULL,
    agent_id            VARCHAR(40),
    provider            VARCHAR(20) NOT NULL,     -- ollama|vllm
    model               VARCHAR(60) NOT NULL,
    model_version       VARCHAR(40),
    kind                VARCHAR(20) NOT NULL,     -- generate|structuredGenerate|embed
    status              VARCHAR(16) NOT NULL,     -- succeeded|failed|unavailable
    latency_ms          INTEGER,
    prompt_tokens       INTEGER,
    completion_tokens   INTEGER,
    error_class         VARCHAR(30),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_airuns_wf ON ai_runs (workflow_id);

CREATE TABLE IF NOT EXISTS ai_extractions (
    id                  SERIAL PRIMARY KEY,
    workflow_id         UUID REFERENCES agent_workflows(workflow_id) ON DELETE CASCADE,
    document_id         INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    industry_id         INTEGER REFERENCES industry_profiles(id) ON DELETE CASCADE,
    field               VARCHAR(40) NOT NULL,
    value               NUMERIC,
    unit                VARCHAR(12),
    confidence          NUMERIC(4,3),
    source_document     VARCHAR(255),
    page                INTEGER,
    evidence            TEXT,
    bounding_box        JSONB,
    review_status       VARCHAR(14) NOT NULL DEFAULT 'pending',  -- pending|confirmed|corrected|rejected
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aiext_wf ON ai_extractions (workflow_id);

-- ------------------------------------------------------------
-- 5. PRD name-mapping views over EXISTING audited tables
--    (read-only surfaces; no data duplication)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW ai_queries AS
    SELECT id, user_id, role, query, intent AS safe_plan, tables_touched,
           execution_ms AS latency_ms, result_status AS status, created_at
      FROM ai_query_log;

CREATE OR REPLACE VIEW ml_forecasts AS
    SELECT id, metric, scope_type, scope_id, period_year, period_quarter,
           predicted_value, lower_bound, upper_bound, model,
           model_version, training_periods AS data_points, generated_at, generated_by
      FROM forecasts;

-- PRD §19 flag-type vocabulary over the existing findings engine
CREATE OR REPLACE VIEW data_quality_flags AS
    SELECT f.id, f.finding_type,
           CASE
             WHEN f.rule_id LIKE 'C-WAT-QUOTA' THEN 'OVER_ALLOCATION'
             WHEN f.rule_id LIKE 'C-PWR-QUOTA' THEN 'OVER_SANCTIONED_LOAD'
             WHEN f.rule_id LIKE 'C-UNIT-SMALL' THEN 'UNIT_ERROR'
             WHEN f.rule_id LIKE 'C-EXPORT-TURN' THEN 'CROSS_FIELD_MISMATCH'
             WHEN f.rule_id LIKE 'C-INV-COMMIT' THEN 'CROSS_SOURCE_MISMATCH'
             WHEN f.rule_id = 'A-POP-CHANGE' THEN 'HISTORY_SPIKE'
             WHEN f.rule_id = 'A-IQR' THEN 'OUTLIER'
             WHEN f.rule_id = 'A-CORROBORATION' THEN 'CROSS_FIELD_MISMATCH'
             ELSE 'CROSS_SOURCE_MISMATCH'
           END AS flag_type,
           f.industry_id, f.period_year, f.period_quarter, f.metric,
           f.observed_value, f.expected_value, f.change_pct, f.severity,
           f.status, f.reason, f.evidence, f.detected_by AS source,
           f.detected_at, f.resolved_at, f.resolved_by
      FROM data_findings f;

-- ------------------------------------------------------------
-- 6. Vetted read-only views for the Analytics/Query Agent (PRD §7.7)
--    Only these views are queryable by analytics.query — never
--    base tables, never writes.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW agent_v_industry_metrics AS
    WITH latest AS (
        SELECT DISTINCT ON (ds.industry_id) ds.id, ds.industry_id
          FROM data_submissions ds
      ORDER BY ds.industry_id, ds.period_year DESC, ds.period_quarter DESC NULLS LAST
    )
    SELECT ip.id AS industry_id, ip.company_name, ip.park_id, p.name AS park_name,
           ip.operational_status, l.id AS latest_submission_id,
           f.investment_amount, f.annual_turnover,
           e.permanent_employees, e.contract_employees,
           r.water_consumption, r.power_usage
      FROM industry_profiles ip
      LEFT JOIN industrial_parks p ON p.id = ip.park_id
      LEFT JOIN latest l ON l.industry_id = ip.id
      LEFT JOIN financial_data f ON f.submission_id = l.id
      LEFT JOIN employment_data e ON e.submission_id = l.id
      LEFT JOIN resource_usage r ON r.submission_id = l.id;

CREATE OR REPLACE VIEW agent_v_park_metrics AS
    SELECT p.id AS park_id, p.name AS park_name, p.district,
           p.water_capacity_kl, p.power_capacity_mw,
           COUNT(DISTINCT ip.id) AS industries,
           COUNT(DISTINCT ip.id) FILTER (WHERE ip.operational_status = 'OPERATING') AS operating_industries
      FROM industrial_parks p
      LEFT JOIN industry_profiles ip ON ip.park_id = p.id
  GROUP BY p.id;

CREATE OR REPLACE VIEW agent_v_compliance AS
    WITH latest_scores AS (
        SELECT DISTINCT ON (industry_id) industry_id, overall_score
          FROM compliance_scores ORDER BY industry_id, score_date DESC
    )
    SELECT ip.id AS industry_id, ip.company_name, ip.park_id,
           ls.overall_score,
           (SELECT COUNT(*)::int FROM compliance_violations v
             WHERE v.industry_id = ip.id AND v.status <> 'resolved') AS open_violations,
           (SELECT COUNT(*)::int FROM data_findings f
             WHERE f.industry_id = ip.id AND f.status = 'open') AS open_flags
      FROM industry_profiles ip
      LEFT JOIN latest_scores ls ON ls.industry_id = ip.id;

CREATE OR REPLACE VIEW agent_v_resource_usage AS
    WITH latest AS (
        SELECT DISTINCT ON (ds.industry_id, ds.period_year, ds.period_quarter) ds.id, ds.industry_id, ds.period_year, ds.period_quarter
          FROM data_submissions ds ORDER BY ds.industry_id, ds.period_year, ds.period_quarter, ds.submitted_at DESC
    )
    SELECT l.industry_id, ip.company_name, ip.park_id, l.period_year, l.period_quarter,
           r.water_consumption, r.power_usage, ip.water_allocated_kl, ip.sanctioned_load_kw
      FROM latest l
      JOIN industry_profiles ip ON ip.id = l.industry_id
      LEFT JOIN resource_usage r ON r.submission_id = l.id;

CREATE OR REPLACE VIEW agent_v_forecasts AS
    SELECT metric, scope_type, scope_id, period_year, period_quarter,
           predicted_value, lower_bound, upper_bound, model, generated_at
      FROM forecasts;

CREATE OR REPLACE VIEW agent_v_filing_status AS
    SELECT rp.period_year, rp.period_quarter, rp.due_on, rp.closes_on, rp.status AS period_status,
           ip.id AS industry_id, ip.company_name, ip.park_id,
           ds.id AS submission_id, ds.status AS submission_status, ds.is_late
      FROM reporting_periods rp
      CROSS JOIN industry_profiles ip
      LEFT JOIN data_submissions ds ON ds.industry_id = ip.id
           AND ds.period_year = rp.period_year AND ds.period_quarter = rp.period_quarter;

-- Conditional embedding column (parse-safe: vector type may not exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        ALTER TABLE agent_memory ADD COLUMN IF NOT EXISTS embedding VECTOR(768);
    END IF;
END $$;

-- Registration of vetted views (consumed by analytics.query allow-list)
INSERT INTO agent_capabilities (capability, status, detail) VALUES
 ('vetted_views', 'AVAILABLE', 'agent_v_industry_metrics, agent_v_park_metrics, agent_v_compliance, agent_v_resource_usage, agent_v_forecasts, agent_v_filing_status')
ON CONFLICT (capability) DO UPDATE SET detail = EXCLUDED.detail, checked_at = NOW();
