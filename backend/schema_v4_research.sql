-- ============================================================
-- SIPCOT SIMS v4 — RESEARCH-GROUNDED ENHANCEMENTS (Tier 1)
-- ============================================================
-- Source: BUILD_TODO_Research_Future_Changes.md
-- Runs AFTER schema.sql, schema_v2.sql, schema_v3_enhancements.sql.
--
-- Purpose : Backing storage for the 6 problem-statement dimensions,
--           enriched with real-world SIPCOT structure:
--             T1.1 committed-vs-actual investment/employment
--             T1.2 CSR 5-pillar restructure (Section 135 mandate)
--             T1.3 water/power quotas
--             T1.4 GSTIN + turnover reconciliation
--             T1.5 realistic seed (real parks + named tenants)
--             T1.5b sector tagging + women-focused flags
--
-- Safety  : PURELY ADDITIVE. No existing table/column dropped/renamed.
--           Every ALTER is guarded in DO/EXCEPTION; every CREATE is
--           IF NOT EXISTS; every seed is ON CONFLICT DO NOTHING. Safe
--           to re-run on every boot (the backend auto-applies it).
-- ============================================================

-- ============================================================
-- T1.1 + T1.3 + T1.4 — industry_profiles enrichment
--   committed_investment_cr / committed_employment : the CAF baseline
--   water_allocated_kl / sanctioned_load_kw / tariff_per_unit : quotas
--   gstin : for turnover reconciliation against GST filings
-- ============================================================
DO $$ BEGIN
    ALTER TABLE industry_profiles ADD COLUMN committed_investment_cr DECIMAL(15,2) DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE industry_profiles ADD COLUMN committed_employment INTEGER DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE industry_profiles ADD COLUMN water_allocated_kl DECIMAL(10,2) DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE industry_profiles ADD COLUMN sanctioned_load_kw DECIMAL(10,2) DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE industry_profiles ADD COLUMN tariff_per_unit DECIMAL(8,2) DEFAULT 6.50;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE industry_profiles ADD COLUMN gstin VARCHAR(15);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ============================================================
-- T1.2 — CSR module restructure (Section 135 / Schedule VII)
--   The existing csr_activities has: description, amount_spent, beneficiary_count.
--   We ADD the legally-structured fields; existing columns stay.
-- ============================================================
DO $$ BEGIN
    ALTER TABLE csr_activities ADD COLUMN pillar VARCHAR(40);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE csr_activities ADD COLUMN pat_baseline_cr DECIMAL(15,2) DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE csr_activities ADD COLUMN mandated_spend_cr DECIMAL(15,2) DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE csr_activities ADD COLUMN actual_spend_cr DECIMAL(15,2) DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE csr_activities ADD COLUMN implementing_partner VARCHAR(255);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE csr_activities ADD COLUMN csr1_registration_no VARCHAR(50);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE csr_activities ADD COLUMN sdg_goals INTEGER[] DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE csr_activities ADD COLUMN location_benefited VARCHAR(255);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE csr_activities ADD COLUMN proof_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ============================================================
-- T1.4 — financial_data: GST reconciliation
-- ============================================================
DO $$ BEGIN
    ALTER TABLE financial_data ADD COLUMN gst_turnover_cr DECIMAL(15,2);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE financial_data ADD COLUMN gst_reconcile_status VARCHAR(20) DEFAULT 'unverified';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
-- status values: unverified | matches | mismatch | overdue

-- ============================================================
-- T1.5b — sector tagging
-- ============================================================
DO $$ BEGIN
    ALTER TABLE industrial_parks ADD COLUMN sector_tags TEXT[] DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE industrial_parks ADD COLUMN is_women_focused BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE industry_profiles ADD COLUMN sector_tag VARCHAR(60);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ============================================================
-- T1.5 — REALISTIC SEED DATA (additive; never deletes/overwrites)
-- ============================================================

-- Add the real parks the research flagged as missing (idempotent).
-- Cuddalore (chemical complex, SACEM env monitoring), Ranipet (leather),
-- Perundurai (textile/ZLD), Irungattukottai (Hyundai, distinct from
-- Sriperumbudur), Gummidipoondi (hazardous waste CHWTSDF), Thoothukudi (port/SEZ).
INSERT INTO industrial_parks (name, code, district, total_area_acres, developed_area_acres, available_area_acres, latitude, longitude, status, infrastructure_score, established_year, total_industries, total_investment_cr, total_employment, water_capacity_kl, power_capacity_mw, sector_tags, is_women_focused)
VALUES
    ('Cuddalore SIPCOT Chemical Complex', 'CUDD', 'Cuddalore', 1200.00, '1100.00', '100.00', 11.7450, 79.8420, 'active', 78, 1991, 58, 4200.00, 12000, 3000.00, 150.00, ARRAY['chemical','pharma'], FALSE),
    ('Ranipet SIPCOT Complex', 'RANPT', 'Ranipet', 1150.00, 1000.00, 150.00, 12.9270, 79.3290, 'active', 75, 1989, 64, 2100.00, 9800, 2500.00, 110.00, ARRAY['leather','chemical'], FALSE),
    ('Perundurai SIPCOT Growth Centre', 'PERN', 'Erode', 650.00, 580.00, 70.00, 11.2770, 77.5880, 'active', 80, 2002, 90, 2800.00, 18000, 2200.00, 120.00, ARRAY['textile'], FALSE),
    ('Irungattukottai SIPCOT', 'IRGK', 'Kancheepuram', 1700.00, 1600.00, 100.00, 12.9440, 79.9250, 'active', 93, 1998, 110, 18500.00, 52000, 4500.00, 280.00, ARRAY['automotive','electronics'], TRUE),
    ('Gummidipoondi SIPCOT', 'GMMD', 'Tiruvallur', 520.00, 380.00, 140.00, 13.4080, 80.0680, 'active', 70, 2005, 22, 650.00, 3200, 1500.00, 70.00, ARRAY['chemical'], FALSE),
    ('Thoothukudi SIPCOT (SEZ)', 'TUTH', 'Thoothukudi', 1967.00, 900.00, 1067.00, 8.7640, 78.1340, 'under_development', 60, 2010, 14, 800.00, 4200, 1800.00, 90.00, ARRAY['chemical','renewable_energy'], FALSE)
ON CONFLICT (code) DO NOTHING;

-- Add real-sector tags + women-focused flags to the EXISTING seed parks
-- so the GIS/Analytics sector filters are populated immediately.
UPDATE industrial_parks SET sector_tags = ARRAY['automotive','auto_components'], is_women_focused = TRUE
  WHERE code = 'ORGDM' AND (sector_tags = '{}' OR sector_tags IS NULL);
UPDATE industrial_parks SET sector_tags = ARRAY['electronics','telecom']
  WHERE code = 'SRPBR' AND (sector_tags = '{}' OR sector_tags IS NULL);
UPDATE industrial_parks SET sector_tags = ARRAY['automotive','textile','pharma']
  WHERE code = 'HOSUR' AND (sector_tags = '{}' OR sector_tags IS NULL);
UPDATE industrial_parks SET sector_tags = ARRAY['IT','ITES'], is_women_focused = TRUE
  WHERE code = 'SIRUS' AND (sector_tags = '{}' OR sector_tags IS NULL);
UPDATE industrial_parks SET sector_tags = ARRAY['textile']
  WHERE code = 'GNGKN' AND (sector_tags = '{}' OR sector_tags IS NULL);

-- ============================================================
-- T1.1 + T1.3 + T1.4 seed: set committed baselines + quotas + GSTIN
-- on the existing industry_profiles so the dashboards show realisation
-- gaps immediately (no synthetic inserts — just enrich real rows).
-- ============================================================
UPDATE industry_profiles SET
    committed_investment_cr = 150.00, committed_employment = 450,
    water_allocated_kl = 500, sanctioned_load_kw = 2.5, tariff_per_unit = 6.50,
    gstin = '33ABCDE1234F1Z5'
  WHERE company_name = 'ABC Manufacturing' AND committed_investment_cr = 0;
UPDATE industry_profiles SET
    committed_investment_cr = 180.00, committed_employment = 600,
    water_allocated_kl = 600, sanctioned_load_kw = 3.0, tariff_per_unit = 6.50,
    gstin = '33XYZAB5678G2Z1'
  WHERE company_name = 'XYZ Manufacturing' AND committed_investment_cr = 0;

-- ============================================================
-- T1.2 seed: a couple of structured CSR rows (5-pillar) so the CSR
-- dashboard has data on first load. Linked to the existing submissions
-- of ABC Manufacturing via a safe sub-select.
-- ============================================================
INSERT INTO csr_activities (
    submission_id, description, amount_spent, beneficiary_count,
    pillar, pat_baseline_cr, mandated_spend_cr, actual_spend_cr,
    implementing_partner, csr1_registration_no, sdg_goals, location_benefited
)
SELECT
    (SELECT id FROM data_submissions WHERE industry_id = ip.id ORDER BY submitted_at DESC LIMIT 1),
    'Anganwadi renovation near Oragadam gate', 18.5, 120,
    'education_skills', 925.00, 18.5, 18.5,
    'SIPCOT Community Trust', 'CSR00001234', ARRAY[4], 'Oragadam, Kancheepuram'
FROM industry_profiles ip
WHERE ip.company_name = 'ABC Manufacturing'
  AND NOT EXISTS (
      SELECT 1 FROM csr_activities c
       WHERE c.location_benefited = 'Oragadam, Kancheepuram'
         AND c.pillar = 'education_skills'
  )
ON CONFLICT DO NOTHING;

INSERT INTO csr_activities (
    submission_id, description, amount_spent, beneficiary_count,
    pillar, pat_baseline_cr, mandated_spend_cr, actual_spend_cr,
    implementing_partner, csr1_registration_no, sdg_goals, location_benefited
)
SELECT
    (SELECT id FROM data_submissions WHERE industry_id = ip.id ORDER BY submitted_at DESC LIMIT 1),
    'Avenue tree plantation along inner ring road', 9.2, 0,
    'environment', 1110.00, 22.2, 9.2,
    'TN Forest Dept Partner NGO', 'CSR00005678', ARRAY[13,15], 'Oragadam green belt'
FROM industry_profiles ip
WHERE ip.company_name = 'XYZ Manufacturing'
  AND NOT EXISTS (
      SELECT 1 FROM csr_activities c
       WHERE c.location_benefited = 'Oragadam green belt'
         AND c.pillar = 'environment'
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- T1.3 + T1.1 seed compliance rules: realisation gap + over-draw.
--   These feed the existing compliance auto-detection engine.
--   (compliance_rules has no 'severity' column on the base table; the
--    rule evaluator derives severity from the category instead.)
-- ============================================================
INSERT INTO compliance_rules (rule_code, rule_name, description, category, check_frequency, auto_flag, target_metric, threshold_operator, threshold_value, is_active)
VALUES
    ('INV-REAL', 'Investment Realisation Gap', 'Actual investment must reach >=70% of committed investment within 24 months of allotment', 'financial', 'annual', true, NULL, NULL, NULL, true),
    ('ENV-WAT-OD', 'Water Over-draw', 'Monthly water consumption must not exceed 120% of allocated quota', 'environmental', 'monthly', true, 'resource_usage.water_consumption', 'gt', NULL, true),
    ('ENV-PWR-OD', 'Power Over-draw', 'Power consumption must not exceed 120% of sanctioned load', 'environmental', 'monthly', true, 'resource_usage.power_usage', 'gt', NULL, true),
    ('CSR-MAND', 'CSR Mandate (2% PAT)', 'Actual CSR spend must meet the 2% of PAT mandate (Section 135)', 'financial', 'annual', true, NULL, NULL, NULL, true)
ON CONFLICT (rule_code) DO NOTHING;

-- ============================================================
-- END v4 RESEARCH ENHANCEMENTS SCHEMA
-- ============================================================
