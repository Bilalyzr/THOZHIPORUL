-- SIPCOT SIMS v2 - Industrial OS Schema Extensions
-- Run AFTER the original schema.sql

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE park_status AS ENUM ('active', 'under_development', 'proposed');
CREATE TYPE plot_status AS ENUM ('available', 'allotted', 'reserved', 'under_construction');
CREATE TYPE service_type AS ENUM (
    'land_allotment', 'noc_fire', 'noc_pollution',
    'water_connection', 'power_connection', 'building_approval',
    'lease_renewal', 'transfer_request', 'expansion_request'
);
CREATE TYPE service_status AS ENUM (
    'applied', 'document_review', 'field_inspection',
    'pending_approval', 'approved', 'rejected', 'completed'
);
CREATE TYPE violation_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE violation_status AS ENUM ('open', 'acknowledged', 'resolving', 'resolved', 'escalated');
CREATE TYPE doc_category AS ENUM (
    'gst_certificate', 'incorporation', 'pollution_clearance',
    'fire_noc', 'lease_agreement', 'submission_attachment',
    'inspection_report', 'compliance_notice', 'other'
);

-- ============================================================
-- INDUSTRIAL PARKS
-- ============================================================
CREATE TABLE industrial_parks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    district VARCHAR(100) NOT NULL,
    total_area_acres DECIMAL(10,2) NOT NULL,
    developed_area_acres DECIMAL(10,2) DEFAULT 0,
    available_area_acres DECIMAL(10,2) DEFAULT 0,
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    status park_status DEFAULT 'active',
    infrastructure_score INTEGER DEFAULT 0,
    established_year INTEGER,
    total_industries INTEGER DEFAULT 0,
    total_investment_cr DECIMAL(15,2) DEFAULT 0,
    total_employment INTEGER DEFAULT 0,
    water_capacity_kl DECIMAL(10,2) DEFAULT 0,
    power_capacity_mw DECIMAL(10,2) DEFAULT 0,
    road_connectivity_km DECIMAL(10,2) DEFAULT 0,
    nearest_port VARCHAR(100),
    nearest_airport VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE park_plots (
    id SERIAL PRIMARY KEY,
    park_id INTEGER REFERENCES industrial_parks(id) ON DELETE CASCADE,
    plot_number VARCHAR(50) NOT NULL,
    area_acres DECIMAL(10,2) NOT NULL,
    status plot_status DEFAULT 'available',
    allottee_industry_id INTEGER REFERENCES industry_profiles(id),
    allotment_date DATE,
    lease_start_date DATE,
    lease_end_date DATE,
    monthly_lease_amount DECIMAL(12,2),
    zone_type VARCHAR(50),
    CONSTRAINT unique_plot_per_park UNIQUE (park_id, plot_number)
);

CREATE TABLE park_infrastructure_metrics (
    id SERIAL PRIMARY KEY,
    park_id INTEGER REFERENCES industrial_parks(id) ON DELETE CASCADE,
    recorded_date DATE NOT NULL,
    water_available_kl DECIMAL(10,2),
    water_consumed_kl DECIMAL(10,2),
    power_available_mw DECIMAL(10,2),
    power_consumed_mw DECIMAL(10,2),
    effluent_treated_kl DECIMAL(10,2),
    CONSTRAINT unique_metric_per_day UNIQUE (park_id, recorded_date)
);

-- ============================================================
-- SERVICE REQUESTS
-- ============================================================
CREATE TABLE service_requests (
    id SERIAL PRIMARY KEY,
    industry_id INTEGER REFERENCES industry_profiles(id) ON DELETE CASCADE,
    park_id INTEGER REFERENCES industrial_parks(id),
    service_type service_type NOT NULL,
    reference_number VARCHAR(50) UNIQUE NOT NULL,
    requested_area_acres DECIMAL(10,2),
    current_status service_status DEFAULT 'applied',
    priority VARCHAR(20) DEFAULT 'normal',
    applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_completion DATE,
    actual_completion DATE,
    assigned_officer INTEGER REFERENCES users(id),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE service_milestones (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES service_requests(id) ON DELETE CASCADE,
    stage_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    officer_id INTEGER REFERENCES users(id),
    notes TEXT,
    sort_order INTEGER DEFAULT 0
);

-- ============================================================
-- COMPLIANCE ENGINE
-- ============================================================
CREATE TABLE compliance_rules (
    id SERIAL PRIMARY KEY,
    rule_code VARCHAR(50) UNIQUE NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    check_frequency VARCHAR(50),
    auto_flag BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE compliance_violations (
    id SERIAL PRIMARY KEY,
    industry_id INTEGER REFERENCES industry_profiles(id) ON DELETE CASCADE,
    rule_id INTEGER REFERENCES compliance_rules(id),
    violation_date DATE NOT NULL,
    severity violation_severity NOT NULL,
    status violation_status DEFAULT 'open',
    description TEXT NOT NULL,
    auto_detected BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    resolved_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE compliance_scores (
    id SERIAL PRIMARY KEY,
    industry_id INTEGER REFERENCES industry_profiles(id) ON DELETE CASCADE,
    score_date DATE NOT NULL,
    overall_score INTEGER NOT NULL,
    submission_score INTEGER,
    environmental_score INTEGER,
    financial_score INTEGER,
    safety_score INTEGER,
    CONSTRAINT unique_score_per_month UNIQUE (industry_id, score_date)
);

-- ============================================================
-- DOCUMENT VAULT
-- ============================================================
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    industry_id INTEGER REFERENCES industry_profiles(id) ON DELETE CASCADE,
    uploaded_by INTEGER REFERENCES users(id),
    category doc_category NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size_kb INTEGER,
    mime_type VARCHAR(100),
    expiry_date DATE,
    verified BOOLEAN DEFAULT FALSE,
    verified_by INTEGER REFERENCES users(id),
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- REPORT TEMPLATES
-- ============================================================
CREATE TABLE report_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type VARCHAR(50) NOT NULL,
    available_to user_role[] NOT NULL,
    query_definition JSONB,
    column_config JSONB,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- GOVT OFFICER PROFILES
-- ============================================================
CREATE TABLE govt_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    officer_name VARCHAR(255) NOT NULL,
    designation VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    jurisdiction VARCHAR(255),
    assigned_parks INTEGER[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ALTER EXISTING TABLES
-- ============================================================
ALTER TABLE industry_profiles
    ADD COLUMN park_id INTEGER REFERENCES industrial_parks(id),
    ADD COLUMN plot_id INTEGER REFERENCES park_plots(id),
    ADD COLUMN compliance_score INTEGER DEFAULT 100,
    ADD COLUMN last_submission_date TIMESTAMP,
    ADD COLUMN total_investment_cr DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN total_employees INTEGER DEFAULT 0;

ALTER TABLE users
    ADD COLUMN notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "portal": true}',
    ADD COLUMN last_login TIMESTAMP;

ALTER TABLE financial_data
    ADD COLUMN export_revenue DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN rd_expenditure DECIMAL(15,2) DEFAULT 0;

ALTER TABLE resource_usage
    ADD COLUMN waste_generated DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN waste_recycled_pct DECIMAL(5,2) DEFAULT 0;

ALTER TABLE employment_data
    ADD COLUMN sc_st_employees INTEGER DEFAULT 0,
    ADD COLUMN women_employees INTEGER DEFAULT 0;

ALTER TABLE csr_activities
    ADD COLUMN beneficiary_count INTEGER DEFAULT 0;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_park_plots_park ON park_plots(park_id);
CREATE INDEX idx_park_plots_status ON park_plots(status);
CREATE INDEX idx_service_requests_industry ON service_requests(industry_id);
CREATE INDEX idx_service_requests_status ON service_requests(current_status);
CREATE INDEX idx_compliance_violations_industry ON compliance_violations(industry_id);
CREATE INDEX idx_compliance_violations_status ON compliance_violations(status);
CREATE INDEX idx_compliance_scores_industry ON compliance_scores(industry_id);
CREATE INDEX idx_documents_industry ON documents(industry_id);

-- ============================================================
-- SEED DATA - Industrial Parks
-- ============================================================
INSERT INTO industrial_parks (name, code, district, total_area_acres, developed_area_acres, available_area_acres, latitude, longitude, status, infrastructure_score, established_year, total_industries, total_investment_cr, total_employment, water_capacity_kl, power_capacity_mw) VALUES
('Oragadam Industrial Park', 'ORGDM', 'Kancheepuram', 2500.00, 2200.00, 340.00, 12.7950, 79.9880, 'active', 94, 1997, 187, 4200.00, 23400, 5000.00, 250.00),
('Sriperumbudur Industrial Park', 'SRPBR', 'Kancheepuram', 1800.00, 1600.00, 220.00, 12.9716, 79.9407, 'active', 91, 1999, 156, 3800.00, 19800, 4200.00, 220.00),
('Hosur Industrial Park', 'HOSUR', 'Krishnagiri', 2100.00, 1900.00, 280.00, 12.7409, 77.8253, 'active', 88, 1995, 143, 3200.00, 18500, 3800.00, 200.00),
('Siruseri IT Park', 'SIRUS', 'Chengalpattu', 800.00, 750.00, 50.00, 12.8231, 80.2218, 'active', 92, 2002, 95, 5600.00, 42000, 2000.00, 180.00),
('Gangaikondan Industrial Park', 'GNGKN', 'Tirunelveli', 1200.00, 600.00, 600.00, 8.5672, 77.7906, 'active', 72, 2008, 34, 850.00, 4200, 2500.00, 100.00),
('Vallam-Vadagal Industrial Park', 'VLMVD', 'Kancheepuram', 950.00, 400.00, 550.00, 12.7500, 79.8900, 'under_development', 65, 2015, 18, 420.00, 2100, 1800.00, 80.00),
('Pillaipakkam Industrial Park', 'PLLPK', 'Kancheepuram', 700.00, 350.00, 350.00, 12.6800, 79.9200, 'under_development', 58, 2018, 12, 280.00, 1400, 1200.00, 60.00),
('Cheyyar Industrial Park', 'CHEYR', 'Tiruvannamalai', 1500.00, 300.00, 1200.00, 12.6619, 79.5436, 'proposed', 35, 2022, 5, 120.00, 600, 3000.00, 150.00);

-- Seed Compliance Rules
INSERT INTO compliance_rules (rule_code, rule_name, description, category, check_frequency, auto_flag) VALUES
('SUB-Q', 'Quarterly Submission', 'Industry must submit quarterly data within 15 days of quarter end', 'submission', 'quarterly', true),
('SUB-A', 'Annual Submission', 'Industry must submit annual consolidated data by April 30', 'submission', 'annual', true),
('ENV-WAT', 'Water Usage Threshold', 'Water consumption must not exceed allocated limit by more than 20%', 'environmental', 'monthly', true),
('ENV-PWR', 'Power Usage Threshold', 'Power consumption must not exceed allocated limit by more than 20%', 'environmental', 'monthly', true),
('ENV-WST', 'Waste Management', 'Minimum 60% waste recycling rate required', 'environmental', 'quarterly', true),
('FIN-INV', 'Investment Declaration', 'Investment changes exceeding 10% must be declared', 'financial', 'annual', false),
('SAF-NOC', 'Fire Safety NOC', 'Valid fire safety NOC must be maintained at all times', 'safety', 'annual', true),
('SAF-POL', 'Pollution Clearance', 'Valid pollution control board clearance required', 'safety', 'annual', true);
