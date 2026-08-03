-- ============================================================
-- SIPCOT SIMS v5 — TIER 2 (Allottee Lifecycle) Enhancements
-- ============================================================
-- Source: BUILD_TODO_Research_Future_Changes.md (Tier 2)
-- Runs AFTER schema.sql, schema_v2.sql, schema_v3_enhancements.sql,
-- schema_v4_research.sql.
--
-- Purpose : Close the allottee-lifecycle loop:
--             T2.1 Lease & utility billing (dues, arrears)
--             T2.2 Filing-deficiency query loop (officer <-> allottee)
--             T2.3 PO Status Report -> HO forwarding (inspections)
--             T2.4 Incentive disbursement (inspection -> fund release)
--             T2.5 MD escalation (grievances)
--
-- Safety  : PURELY ADDITIVE. Every CREATE is IF NOT EXISTS, every
--           ALTER is wrapped in DO/EXCEPTION, every seed is ON
--           CONFLICT DO NOTHING. Safe to auto-run on every boot.
-- ============================================================

-- ============================================================
-- T2.1 — Lease & utility billing
-- ============================================================
-- Per-industry monthly billing: lease rent, maintenance, water charges,
-- power charges. Tracks due date, paid status, and arrears ageing.
CREATE TABLE IF NOT EXISTS lease_billing (
    id                SERIAL PRIMARY KEY,
    industry_id       INTEGER REFERENCES industry_profiles(id) ON DELETE CASCADE,
    plot_id           INTEGER REFERENCES park_plots(id),
    billing_period    VARCHAR(20) NOT NULL,          -- '2026-07' (YYYY-MM)
    lease_rent        DECIMAL(12,2) DEFAULT 0,
    maintenance_fee   DECIMAL(12,2) DEFAULT 0,
    water_charges     DECIMAL(12,2) DEFAULT 0,       -- computed from consumption x tariff
    power_charges     DECIMAL(12,2) DEFAULT 0,
    total_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
    amount_paid       DECIMAL(12,2) DEFAULT 0,
    balance_due       DECIMAL(12,2) DEFAULT 0,
    due_date          DATE,
    status            VARCHAR(20) DEFAULT 'unpaid',  -- unpaid | partial | paid | overdue
    generated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at           TIMESTAMP,
    invoice_no        VARCHAR(50),
    UNIQUE (industry_id, billing_period)
);
CREATE INDEX IF NOT EXISTS idx_lease_billing_industry ON lease_billing(industry_id);
CREATE INDEX IF NOT EXISTS idx_lease_billing_status   ON lease_billing(status);

-- ============================================================
-- T2.2 — Filing-deficiency query loop (officer <-> allottee)
-- ============================================================
CREATE TABLE IF NOT EXISTS submission_queries (
    id              SERIAL PRIMARY KEY,
    submission_id   INTEGER REFERENCES data_submissions(id) ON DELETE CASCADE,
    raised_by       INTEGER REFERENCES users(id),           -- officer
    query_text      TEXT NOT NULL,
    raised_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_by    INTEGER REFERENCES users(id),           -- industry
    response_text   TEXT,
    responded_at    TIMESTAMP,
    resolved_by     INTEGER REFERENCES users(id),
    resolved_at     TIMESTAMP,
    status          VARCHAR(20) DEFAULT 'open'              -- open | responded | resolved
);
CREATE INDEX IF NOT EXISTS idx_subq_submission ON submission_queries(submission_id);
CREATE INDEX IF NOT EXISTS idx_subq_status     ON submission_queries(status);

-- ============================================================
-- T2.3 — PO Status Report -> HO forwarding (inspections extension)
-- ============================================================
DO $$ BEGIN
    ALTER TABLE inspections ADD COLUMN forwarded_to_ho BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE inspections ADD COLUMN forwarded_at TIMESTAMP;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE inspections ADD COLUMN ho_decision VARCHAR(20);  -- pending | approved | rejected
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE inspections ADD COLUMN ho_decision_by INTEGER REFERENCES users(id);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE inspections ADD COLUMN ho_decision_at TIMESTAMP;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE inspections ADD COLUMN status_report TEXT;       -- PO's narrative report
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ============================================================
-- T2.4 — Incentive disbursement (inspection -> fund release)
-- ============================================================
CREATE TABLE IF NOT EXISTS incentive_disbursements (
    id                SERIAL PRIMARY KEY,
    industry_id       INTEGER REFERENCES industry_profiles(id) ON DELETE CASCADE,
    incentive_scheme  VARCHAR(255) NOT NULL,        -- e.g. 'Capital Subsidy', 'SGST Reimbursement'
    inspection_id     INTEGER REFERENCES inspections(id),
    amount_sanctioned DECIMAL(15,2) NOT NULL DEFAULT 0,
    amount_disbursed  DECIMAL(15,2) DEFAULT 0,
    disbursement_date DATE,
    status            VARCHAR(20) DEFAULT 'pending', -- pending | sanctioned | disbursed | rejected
    approved_by       INTEGER REFERENCES users(id),
    approved_at       TIMESTAMP,
    notes             TEXT,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_incentive_industry ON incentive_disbursements(industry_id);

-- ============================================================
-- T2.5 — MD escalation (grievances extension)
-- ============================================================
DO $$ BEGIN
    ALTER TABLE grievances ADD COLUMN escalated_to_md BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE grievances ADD COLUMN escalated_at TIMESTAMP;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE grievances ADD COLUMN escalated_by INTEGER REFERENCES users(id);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE grievances ADD COLUMN md_resolution TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ============================================================
-- Seed: a lease-default compliance rule (unpaid rent > 90 days)
-- ============================================================
INSERT INTO compliance_rules (rule_code, rule_name, description, category, check_frequency, auto_flag, is_active)
VALUES ('FIN-LEASE', 'Lease Rent Default', 'Unpaid lease rent beyond 90 days triggers a lease-default violation', 'financial', 'monthly', true, true)
ON CONFLICT (rule_code) DO NOTHING;

-- ============================================================
-- END v5 TIER 2 ENHANCEMENTS SCHEMA
-- ============================================================
