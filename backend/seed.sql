-- Clear existing tables
TRUNCATE users, govt_profiles, industry_profiles, park_plots, park_infrastructure_metrics, service_requests, service_milestones, compliance_violations, compliance_scores, documents CASCADE;

-- 1. Insert Users
INSERT INTO users (email, password_hash, role, status) VALUES 
('admin@sipcot.com', '$2b$10$bPIabcNNmvQf7Al55z9xwedxk9PcPc32QY1e6e4wLNCKiqz/AoVO.', 'admin', 'Active'),
('govt@tn.gov.in', '$2b$10$bPIabcNNmvQf7Al55z9xwedxk9PcPc32QY1e6e4wLNCKiqz/AoVO.', 'govt', 'Active'),
('industry@abc.com', '$2b$10$bPIabcNNmvQf7Al55z9xwedxk9PcPc32QY1e6e4wLNCKiqz/AoVO.', 'industry', 'Active'),
('xyz@sipcot.com', '$2b$10$bPIabcNNmvQf7Al55z9xwedxk9PcPc32QY1e6e4wLNCKiqz/AoVO.', 'industry', 'Active'),
('pqr@sipcot.com', '$2b$10$bPIabcNNmvQf7Al55z9xwedxk9PcPc32QY1e6e4wLNCKiqz/AoVO.', 'industry', 'Active'),
('lmn@sipcot.com', '$2b$10$bPIabcNNmvQf7Al55z9xwedxk9PcPc32QY1e6e4wLNCKiqz/AoVO.', 'industry', 'Active'),
('delta@sipcot.com', '$2b$10$bPIabcNNmvQf7Al55z9xwedxk9PcPc32QY1e6e4wLNCKiqz/AoVO.', 'industry', 'Active'),
('alpha@sipcot.com', '$2b$10$bPIabcNNmvQf7Al55z9xwedxk9PcPc32QY1e6e4wLNCKiqz/AoVO.', 'industry', 'Active'),
('beta@sipcot.com', '$2b$10$bPIabcNNmvQf7Al55z9xwedxk9PcPc32QY1e6e4wLNCKiqz/AoVO.', 'industry', 'Active'),
('gamma@sipcot.com', '$2b$10$bPIabcNNmvQf7Al55z9xwedxk9PcPc32QY1e6e4wLNCKiqz/AoVO.', 'industry', 'Active'),
('omega@sipcot.com', '$2b$10$bPIabcNNmvQf7Al55z9xwedxk9PcPc32QY1e6e4wLNCKiqz/AoVO.', 'industry', 'Active'),
('sigma@sipcot.com', '$2b$10$bPIabcNNmvQf7Al55z9xwedxk9PcPc32QY1e6e4wLNCKiqz/AoVO.', 'industry', 'Active');

-- 2. Insert Govt Profile
INSERT INTO govt_profiles (user_id, officer_name, designation, department, jurisdiction)
SELECT id, 'Govt Officer', 'Senior Manager', 'Industrial Development', 'Statewide'
FROM users WHERE email = 'govt@tn.gov.in';

-- 3. Insert Industry Profiles
INSERT INTO industry_profiles (user_id, company_name, industry_type, location, contact_person, phone_number, park_id, compliance_score, total_investment_cr, total_employees)
SELECT u.id, 'ABC Manufacturing', 'Automotive', 'Oragadam', 'John Doe', '9876543210', p.id, 85, 150.00, 450
FROM users u, industrial_parks p WHERE u.email = 'industry@abc.com' AND p.code = 'ORGDM';

INSERT INTO industry_profiles (user_id, company_name, industry_type, location, contact_person, phone_number, park_id, compliance_score, total_investment_cr, total_employees)
SELECT u.id, 'XYZ Manufacturing', 'Manufacturing', 'Sriperumbudur', 'Xavier Y.', '9000000001', p.id, 78, 180.00, 600
FROM users u, industrial_parks p WHERE u.email = 'xyz@sipcot.com' AND p.code = 'SRPBR';

INSERT INTO industry_profiles (user_id, company_name, industry_type, location, contact_person, phone_number, park_id, compliance_score, total_investment_cr, total_employees)
SELECT u.id, 'PQR Auto Parts', 'Automotive', 'Hosur', 'Priya Q.', '9000000002', p.id, 90, 55.00, 180
FROM users u, industrial_parks p WHERE u.email = 'pqr@sipcot.com' AND p.code = 'HOSUR';

INSERT INTO industry_profiles (user_id, company_name, industry_type, location, contact_person, phone_number, park_id, compliance_score, total_investment_cr, total_employees)
SELECT u.id, 'LMN Textiles', 'Textiles', 'Gangaikondan', 'Logan M.', '9000000003', p.id, 58, 110.00, 1200
FROM users u, industrial_parks p WHERE u.email = 'lmn@sipcot.com' AND p.code = 'GNGKN';

INSERT INTO industry_profiles (user_id, company_name, industry_type, location, contact_person, phone_number, park_id, compliance_score, total_investment_cr, total_employees)
SELECT u.id, 'Delta Pharma', 'Pharmaceuticals', 'Oragadam', 'David P.', '9000000004', p.id, 92, 85.00, 220
FROM users u, industrial_parks p WHERE u.email = 'delta@sipcot.com' AND p.code = 'ORGDM';

INSERT INTO industry_profiles (user_id, company_name, industry_type, location, contact_person, phone_number, park_id, compliance_score, total_investment_cr, total_employees)
SELECT u.id, 'Alpha Engineering', 'Heavy Engineering', 'Sriperumbudur', 'Alan E.', '9000000005', p.id, 81, 220.00, 750
FROM users u, industrial_parks p WHERE u.email = 'alpha@sipcot.com' AND p.code = 'SRPBR';

INSERT INTO industry_profiles (user_id, company_name, industry_type, location, contact_person, phone_number, park_id, compliance_score, total_investment_cr, total_employees)
SELECT u.id, 'Beta Chemicals', 'Chemicals', 'Cheyyar', 'Bob C.', '9000000006', p.id, 35, 250.00, 400
FROM users u, industrial_parks p WHERE u.email = 'beta@sipcot.com' AND p.code = 'CHEYR';

INSERT INTO industry_profiles (user_id, company_name, industry_type, location, contact_person, phone_number, park_id, compliance_score, total_investment_cr, total_employees)
SELECT u.id, 'Gamma Food Processing', 'Food Processing', 'Thoothukudi', 'Grace F.', '9000000007', p.id, 76, 40.00, 150
FROM users u, industrial_parks p WHERE u.email = 'gamma@sipcot.com' AND p.code = 'VLMVD';

INSERT INTO industry_profiles (user_id, company_name, industry_type, location, contact_person, phone_number, park_id, compliance_score, total_investment_cr, total_employees)
SELECT u.id, 'Omega IT Solutions', 'IT / Software', 'Siruseri', 'Oliver I.', '9000000008', p.id, 95, 30.00, 1500
FROM users u, industrial_parks p WHERE u.email = 'omega@sipcot.com' AND p.code = 'SIRUS';

INSERT INTO industry_profiles (user_id, company_name, industry_type, location, contact_person, phone_number, park_id, compliance_score, total_investment_cr, total_employees)
SELECT u.id, 'Sigma Electronics', 'Electronics', 'Sriperumbudur', 'Sam E.', '9000000009', p.id, 88, 45.00, 350
FROM users u, industrial_parks p WHERE u.email = 'sigma@sipcot.com' AND p.code = 'SRPBR';

-- 4. Insert Park Plots
INSERT INTO park_plots (park_id, plot_number, area_acres, status, allotment_date, lease_start_date, lease_end_date, monthly_lease_amount, zone_type)
VALUES 
((SELECT id FROM industrial_parks WHERE code='ORGDM'), 'A-101', 12.50, 'allotted', '2019-03-01', '2019-04-01', '2035-03-31', 250000.00, 'Industrial'),
((SELECT id FROM industrial_parks WHERE code='SRPBR'), 'A-201', 15.00, 'allotted', '2018-05-10', '2018-06-01', '2038-05-31', 300000.00, 'Industrial'),
((SELECT id FROM industrial_parks WHERE code='HOSUR'), 'H-15', 6.50, 'allotted', '2020-01-15', '2020-02-01', '2040-01-31', 130000.00, 'Industrial'),
((SELECT id FROM industrial_parks WHERE code='GNGKN'), 'G-10', 25.00, 'allotted', '2021-08-20', '2021-09-01', '2041-08-31', 125000.00, 'Industrial'),
((SELECT id FROM industrial_parks WHERE code='ORGDM'), 'B-204', 8.00, 'allotted', '2020-03-12', '2020-04-01', '2036-03-31', 160000.00, 'Industrial'),
((SELECT id FROM industrial_parks WHERE code='SRPBR'), 'C-102', 20.00, 'allotted', '2017-11-01', '2017-12-01', '2037-11-30', 400000.00, 'Industrial'),
((SELECT id FROM industrial_parks WHERE code='CHEYR'), 'C-02', 30.00, 'allotted', '2023-01-10', '2023-02-01', '2043-01-31', 150000.00, 'Industrial'),
((SELECT id FROM industrial_parks WHERE code='VLMVD'), 'V-12', 10.00, 'allotted', '2021-03-15', '2021-04-01', '2036-03-31', 180000.00, 'Industrial'),
((SELECT id FROM industrial_parks WHERE code='SIRUS'), 'T-05', 2.50, 'allotted', '2019-06-15', '2019-07-01', '2039-06-30', 500000.00, 'IT / ITES'),
((SELECT id FROM industrial_parks WHERE code='SRPBR'), 'E-303', 5.00, 'allotted', '2020-08-10', '2020-09-01', '2035-08-31', 100000.00, 'Electronics');

-- Link plots back to industry profiles
UPDATE industry_profiles ip SET plot_id = pp.id 
FROM park_plots pp 
WHERE pp.plot_number = 'A-101' AND ip.company_name = 'ABC Manufacturing';

UPDATE industry_profiles ip SET plot_id = pp.id 
FROM park_plots pp 
WHERE pp.plot_number = 'A-201' AND ip.company_name = 'XYZ Manufacturing';

UPDATE industry_profiles ip SET plot_id = pp.id 
FROM park_plots pp 
WHERE pp.plot_number = 'H-15' AND ip.company_name = 'PQR Auto Parts';

UPDATE industry_profiles ip SET plot_id = pp.id 
FROM park_plots pp 
WHERE pp.plot_number = 'G-10' AND ip.company_name = 'LMN Textiles';

UPDATE industry_profiles ip SET plot_id = pp.id 
FROM park_plots pp 
WHERE pp.plot_number = 'B-204' AND ip.company_name = 'Delta Pharma';

UPDATE industry_profiles ip SET plot_id = pp.id 
FROM park_plots pp 
WHERE pp.plot_number = 'C-102' AND ip.company_name = 'Alpha Engineering';

UPDATE industry_profiles ip SET plot_id = pp.id 
FROM park_plots pp 
WHERE pp.plot_number = 'C-02' AND ip.company_name = 'Beta Chemicals';

UPDATE industry_profiles ip SET plot_id = pp.id 
FROM park_plots pp 
WHERE pp.plot_number = 'V-12' AND ip.company_name = 'Gamma Food Processing';

UPDATE industry_profiles ip SET plot_id = pp.id 
FROM park_plots pp 
WHERE pp.plot_number = 'T-05' AND ip.company_name = 'Omega IT Solutions';

UPDATE industry_profiles ip SET plot_id = pp.id 
FROM park_plots pp 
WHERE pp.plot_number = 'E-303' AND ip.company_name = 'Sigma Electronics';

-- Also set allottee_industry_id in park_plots
UPDATE park_plots pp SET allottee_industry_id = ip.id 
FROM industry_profiles ip WHERE ip.plot_id = pp.id;

-- 5. Insert Compliance Scores
-- Seed scores for last 6 months for each industry
-- ABC Manufacturing (overall: 85)
INSERT INTO compliance_scores (industry_id, score_date, overall_score, submission_score, environmental_score, financial_score, safety_score)
VALUES
((SELECT id FROM industry_profiles WHERE company_name='ABC Manufacturing'), '2025-10-01', 80, 85, 75, 88, 82),
((SELECT id FROM industry_profiles WHERE company_name='ABC Manufacturing'), '2025-11-01', 81, 88, 76, 88, 80),
((SELECT id FROM industry_profiles WHERE company_name='ABC Manufacturing'), '2025-12-01', 82, 90, 78, 88, 78),
((SELECT id FROM industry_profiles WHERE company_name='ABC Manufacturing'), '2026-01-01', 83, 92, 78, 88, 76),
((SELECT id FROM industry_profiles WHERE company_name='ABC Manufacturing'), '2026-02-01', 84, 94, 79, 88, 76),
((SELECT id FROM industry_profiles WHERE company_name='ABC Manufacturing'), '2026-03-01', 85, 95, 80, 90, 75);

-- XYZ Manufacturing (overall: 78)
INSERT INTO compliance_scores (industry_id, score_date, overall_score, submission_score, environmental_score, financial_score, safety_score)
VALUES
((SELECT id FROM industry_profiles WHERE company_name='XYZ Manufacturing'), '2025-10-01', 75, 80, 70, 78, 72),
((SELECT id FROM industry_profiles WHERE company_name='XYZ Manufacturing'), '2025-11-01', 76, 82, 71, 78, 73),
((SELECT id FROM industry_profiles WHERE company_name='XYZ Manufacturing'), '2025-12-01', 76, 82, 71, 78, 73),
((SELECT id FROM industry_profiles WHERE company_name='XYZ Manufacturing'), '2026-01-01', 77, 85, 72, 78, 73),
((SELECT id FROM industry_profiles WHERE company_name='XYZ Manufacturing'), '2026-02-01', 77, 85, 72, 78, 73),
((SELECT id FROM industry_profiles WHERE company_name='XYZ Manufacturing'), '2026-03-01', 78, 88, 72, 85, 67);

-- PQR Auto Parts (overall: 90)
INSERT INTO compliance_scores (industry_id, score_date, overall_score, submission_score, environmental_score, financial_score, safety_score)
VALUES
((SELECT id FROM industry_profiles WHERE company_name='PQR Auto Parts'), '2025-10-01', 88, 90, 85, 90, 87),
((SELECT id FROM industry_profiles WHERE company_name='PQR Auto Parts'), '2025-11-01', 89, 90, 86, 90, 90),
((SELECT id FROM industry_profiles WHERE company_name='PQR Auto Parts'), '2025-12-01', 89, 90, 86, 90, 90),
((SELECT id FROM industry_profiles WHERE company_name='PQR Auto Parts'), '2026-01-01', 90, 90, 88, 90, 92),
((SELECT id FROM industry_profiles WHERE company_name='PQR Auto Parts'), '2026-02-01', 90, 90, 88, 90, 92),
((SELECT id FROM industry_profiles WHERE company_name='PQR Auto Parts'), '2026-03-01', 90, 90, 88, 90, 92);

-- LMN Textiles (overall: 58)
INSERT INTO compliance_scores (industry_id, score_date, overall_score, submission_score, environmental_score, financial_score, safety_score)
VALUES
((SELECT id FROM industry_profiles WHERE company_name='LMN Textiles'), '2025-10-01', 75, 80, 75, 75, 70),
((SELECT id FROM industry_profiles WHERE company_name='LMN Textiles'), '2025-11-01', 74, 80, 70, 75, 71),
((SELECT id FROM industry_profiles WHERE company_name='LMN Textiles'), '2025-12-01', 72, 80, 65, 75, 68),
((SELECT id FROM industry_profiles WHERE company_name='LMN Textiles'), '2026-01-01', 65, 80, 50, 70, 60),
((SELECT id FROM industry_profiles WHERE company_name='LMN Textiles'), '2026-02-01', 60, 80, 40, 70, 50),
((SELECT id FROM industry_profiles WHERE company_name='LMN Textiles'), '2026-03-01', 58, 80, 35, 70, 47);

-- Delta Pharma (overall: 92)
INSERT INTO compliance_scores (industry_id, score_date, overall_score, submission_score, environmental_score, financial_score, safety_score)
VALUES
((SELECT id FROM industry_profiles WHERE company_name='Delta Pharma'), '2025-10-01', 90, 95, 88, 90, 88),
((SELECT id FROM industry_profiles WHERE company_name='Delta Pharma'), '2025-11-01', 90, 95, 88, 90, 88),
((SELECT id FROM industry_profiles WHERE company_name='Delta Pharma'), '2025-12-01', 91, 95, 89, 92, 90),
((SELECT id FROM industry_profiles WHERE company_name='Delta Pharma'), '2026-01-01', 91, 95, 89, 92, 90),
((SELECT id FROM industry_profiles WHERE company_name='Delta Pharma'), '2026-02-01', 92, 95, 90, 92, 91),
((SELECT id FROM industry_profiles WHERE company_name='Delta Pharma'), '2026-03-01', 92, 95, 90, 92, 91);

-- Alpha Engineering (overall: 81)
INSERT INTO compliance_scores (industry_id, score_date, overall_score, submission_score, environmental_score, financial_score, safety_score)
VALUES
((SELECT id FROM industry_profiles WHERE company_name='Alpha Engineering'), '2025-10-01', 78, 80, 75, 80, 75),
((SELECT id FROM industry_profiles WHERE company_name='Alpha Engineering'), '2025-11-01', 79, 82, 76, 80, 76),
((SELECT id FROM industry_profiles WHERE company_name='Alpha Engineering'), '2025-12-01', 80, 85, 77, 82, 76),
((SELECT id FROM industry_profiles WHERE company_name='Alpha Engineering'), '2026-01-01', 80, 85, 77, 82, 76),
((SELECT id FROM industry_profiles WHERE company_name='Alpha Engineering'), '2026-02-01', 81, 85, 78, 84, 77),
((SELECT id FROM industry_profiles WHERE company_name='Alpha Engineering'), '2026-03-01', 81, 85, 78, 84, 77);

-- Beta Chemicals (overall: 35)
INSERT INTO compliance_scores (industry_id, score_date, overall_score, submission_score, environmental_score, financial_score, safety_score)
VALUES
((SELECT id FROM industry_profiles WHERE company_name='Beta Chemicals'), '2025-10-01', 70, 75, 68, 75, 65),
((SELECT id FROM industry_profiles WHERE company_name='Beta Chemicals'), '2025-11-01', 68, 72, 65, 75, 62),
((SELECT id FROM industry_profiles WHERE company_name='Beta Chemicals'), '2025-12-01', 65, 70, 60, 70, 60),
((SELECT id FROM industry_profiles WHERE company_name='Beta Chemicals'), '2026-01-01', 50, 60, 45, 65, 30),
((SELECT id FROM industry_profiles WHERE company_name='Beta Chemicals'), '2026-02-01', 40, 50, 35, 65, 10),
((SELECT id FROM industry_profiles WHERE company_name='Beta Chemicals'), '2026-03-01', 35, 45, 30, 60, 5);

-- Gamma Food Processing (overall: 76)
INSERT INTO compliance_scores (industry_id, score_date, overall_score, submission_score, environmental_score, financial_score, safety_score)
VALUES
((SELECT id FROM industry_profiles WHERE company_name='Gamma Food Processing'), '2025-10-01', 72, 75, 70, 75, 68),
((SELECT id FROM industry_profiles WHERE company_name='Gamma Food Processing'), '2025-11-01', 73, 76, 72, 75, 69),
((SELECT id FROM industry_profiles WHERE company_name='Gamma Food Processing'), '2025-12-01', 74, 78, 73, 76, 70),
((SELECT id FROM industry_profiles WHERE company_name='Gamma Food Processing'), '2026-01-01', 75, 80, 74, 78, 70),
((SELECT id FROM industry_profiles WHERE company_name='Gamma Food Processing'), '2026-02-01', 75, 80, 74, 78, 70),
((SELECT id FROM industry_profiles WHERE company_name='Gamma Food Processing'), '2026-03-01', 76, 80, 75, 78, 71);

-- Omega IT Solutions (overall: 95)
INSERT INTO compliance_scores (industry_id, score_date, overall_score, submission_score, environmental_score, financial_score, safety_score)
VALUES
((SELECT id FROM industry_profiles WHERE company_name='Omega IT Solutions'), '2025-10-01', 93, 95, 93, 92, 92),
((SELECT id FROM industry_profiles WHERE company_name='Omega IT Solutions'), '2025-11-01', 94, 96, 94, 92, 92),
((SELECT id FROM industry_profiles WHERE company_name='Omega IT Solutions'), '2025-12-01', 94, 96, 94, 92, 92),
((SELECT id FROM industry_profiles WHERE company_name='Omega IT Solutions'), '2026-01-01', 95, 98, 95, 94, 93),
((SELECT id FROM industry_profiles WHERE company_name='Omega IT Solutions'), '2026-02-01', 95, 98, 95, 94, 93),
((SELECT id FROM industry_profiles WHERE company_name='Omega IT Solutions'), '2026-03-01', 95, 98, 95, 94, 93);

-- Sigma Electronics (overall: 88)
INSERT INTO compliance_scores (industry_id, score_date, overall_score, submission_score, environmental_score, financial_score, safety_score)
VALUES
((SELECT id FROM industry_profiles WHERE company_name='Sigma Electronics'), '2025-10-01', 85, 88, 82, 88, 84),
((SELECT id FROM industry_profiles WHERE company_name='Sigma Electronics'), '2025-11-01', 86, 89, 83, 88, 85),
((SELECT id FROM industry_profiles WHERE company_name='Sigma Electronics'), '2025-12-01', 86, 89, 83, 88, 85),
((SELECT id FROM industry_profiles WHERE company_name='Sigma Electronics'), '2026-01-01', 87, 90, 84, 90, 86),
((SELECT id FROM industry_profiles WHERE company_name='Sigma Electronics'), '2026-02-01', 87, 90, 84, 90, 86),
((SELECT id FROM industry_profiles WHERE company_name='Sigma Electronics'), '2026-03-01', 88, 90, 85, 90, 87);

-- 6. Insert Data Submissions
-- ABC Manufacturing Submissions
WITH sub AS (
  INSERT INTO data_submissions (industry_id, period_year, period_quarter, status, submitted_at, approved_by)
  VALUES ((SELECT id FROM industry_profiles WHERE company_name='ABC Manufacturing'), 2025, 4, 'approved', '2026-01-10 14:30:00', (SELECT id FROM users WHERE role='govt' LIMIT 1))
  RETURNING id
)
INSERT INTO financial_data (submission_id, investment_amount, annual_turnover, export_revenue, rd_expenditure)
SELECT id, 150000000.00, 320000000.00, 80000000.00, 5000000.00 FROM sub;

WITH sub AS (
  SELECT id FROM data_submissions WHERE industry_id = (SELECT id FROM industry_profiles WHERE company_name='ABC Manufacturing') AND period_year = 2025 AND period_quarter = 4
)
INSERT INTO resource_usage (submission_id, water_consumption, power_usage, waste_generated, waste_recycled_pct)
SELECT id, 1200.00, 45000.00, 24.50, 75.00 FROM sub;

WITH sub AS (
  SELECT id FROM data_submissions WHERE industry_id = (SELECT id FROM industry_profiles WHERE company_name='ABC Manufacturing') AND period_year = 2025 AND period_quarter = 4
)
INSERT INTO employment_data (submission_id, permanent_employees, contract_employees, sc_st_employees, women_employees)
SELECT id, 300, 150, 45, 95 FROM sub;

-- XYZ Manufacturing Submissions
WITH sub AS (
  INSERT INTO data_submissions (industry_id, period_year, period_quarter, status, submitted_at, approved_by)
  VALUES ((SELECT id FROM industry_profiles WHERE company_name='XYZ Manufacturing'), 2025, 4, 'approved', '2026-01-12 11:15:00', (SELECT id FROM users WHERE role='govt' LIMIT 1))
  RETURNING id
)
INSERT INTO financial_data (submission_id, investment_amount, annual_turnover, export_revenue, rd_expenditure)
SELECT id, 180000000.00, 410000000.00, 120000000.00, 3000000.00 FROM sub;

WITH sub AS (
  SELECT id FROM data_submissions WHERE industry_id = (SELECT id FROM industry_profiles WHERE company_name='XYZ Manufacturing') AND period_year = 2025 AND period_quarter = 4
)
INSERT INTO resource_usage (submission_id, water_consumption, power_usage, waste_generated, waste_recycled_pct)
SELECT id, 2200.00, 75000.00, 42.00, 60.00 FROM sub;

WITH sub AS (
  SELECT id FROM data_submissions WHERE industry_id = (SELECT id FROM industry_profiles WHERE company_name='XYZ Manufacturing') AND period_year = 2025 AND period_quarter = 4
)
INSERT INTO employment_data (submission_id, permanent_employees, contract_employees, sc_st_employees, women_employees)
SELECT id, 400, 200, 60, 110 FROM sub;

-- LMN Textiles Submissions
WITH sub AS (
  INSERT INTO data_submissions (industry_id, period_year, period_quarter, status, submitted_at, approved_by)
  VALUES ((SELECT id FROM industry_profiles WHERE company_name='LMN Textiles'), 2025, 4, 'approved', '2026-01-08 09:30:00', (SELECT id FROM users WHERE role='govt' LIMIT 1))
  RETURNING id
)
INSERT INTO financial_data (submission_id, investment_amount, annual_turnover, export_revenue, rd_expenditure)
SELECT id, 110000000.00, 180000000.00, 60000000.00, 1000000.00 FROM sub;

WITH sub AS (
  SELECT id FROM data_submissions WHERE industry_id = (SELECT id FROM industry_profiles WHERE company_name='LMN Textiles') AND period_year = 2025 AND period_quarter = 4
)
INSERT INTO resource_usage (submission_id, water_consumption, power_usage, waste_generated, waste_recycled_pct)
SELECT id, 9500.00, 38000.00, 85.00, 40.00 FROM sub;

WITH sub AS (
  SELECT id FROM data_submissions WHERE industry_id = (SELECT id FROM industry_profiles WHERE company_name='LMN Textiles') AND period_year = 2025 AND period_quarter = 4
)
INSERT INTO employment_data (submission_id, permanent_employees, contract_employees, sc_st_employees, women_employees)
SELECT id, 800, 400, 150, 450 FROM sub;

-- PQR Auto Parts Submissions
WITH sub AS (
  INSERT INTO data_submissions (industry_id, period_year, period_quarter, status, submitted_at, approved_by)
  VALUES ((SELECT id FROM industry_profiles WHERE company_name='PQR Auto Parts'), 2025, 4, 'approved', '2026-01-14 16:45:00', (SELECT id FROM users WHERE role='govt' LIMIT 1))
  RETURNING id
)
INSERT INTO financial_data (submission_id, investment_amount, annual_turnover, export_revenue, rd_expenditure)
SELECT id, 55000000.00, 98000000.00, 15000000.00, 1200000.00 FROM sub;

WITH sub AS (
  SELECT id FROM data_submissions WHERE industry_id = (SELECT id FROM industry_profiles WHERE company_name='PQR Auto Parts') AND period_year = 2025 AND period_quarter = 4
)
INSERT INTO resource_usage (submission_id, water_consumption, power_usage, waste_generated, waste_recycled_pct)
SELECT id, 850.00, 22000.00, 15.00, 68.00 FROM sub;

WITH sub AS (
  SELECT id FROM data_submissions WHERE industry_id = (SELECT id FROM industry_profiles WHERE company_name='PQR Auto Parts') AND period_year = 2025 AND period_quarter = 4
)
INSERT INTO employment_data (submission_id, permanent_employees, contract_employees, sc_st_employees, women_employees)
SELECT id, 120, 60, 25, 30 FROM sub;

-- Delta Pharma Submissions
WITH sub AS (
  INSERT INTO data_submissions (industry_id, period_year, period_quarter, status, submitted_at, approved_by)
  VALUES ((SELECT id FROM industry_profiles WHERE company_name='Delta Pharma'), 2025, 4, 'approved', '2026-01-11 10:00:00', (SELECT id FROM users WHERE role='govt' LIMIT 1))
  RETURNING id
)
INSERT INTO financial_data (submission_id, investment_amount, annual_turnover, export_revenue, rd_expenditure)
SELECT id, 85000000.00, 150000000.00, 40000000.00, 8000000.00 FROM sub;

WITH sub AS (
  SELECT id FROM data_submissions WHERE industry_id = (SELECT id FROM industry_profiles WHERE company_name='Delta Pharma') AND period_year = 2025 AND period_quarter = 4
)
INSERT INTO resource_usage (submission_id, water_consumption, power_usage, waste_generated, waste_recycled_pct)
SELECT id, 1500.00, 60000.00, 35.00, 82.00 FROM sub;

WITH sub AS (
  SELECT id FROM data_submissions WHERE industry_id = (SELECT id FROM industry_profiles WHERE company_name='Delta Pharma') AND period_year = 2025 AND period_quarter = 4
)
INSERT INTO employment_data (submission_id, permanent_employees, contract_employees, sc_st_employees, women_employees)
SELECT id, 150, 70, 20, 80 FROM sub;

-- Alpha Engineering Submissions
WITH sub AS (
  INSERT INTO data_submissions (industry_id, period_year, period_quarter, status, submitted_at, approved_by)
  VALUES ((SELECT id FROM industry_profiles WHERE company_name='Alpha Engineering'), 2025, 4, 'approved', '2026-01-09 15:00:00', (SELECT id FROM users WHERE role='govt' LIMIT 1))
  RETURNING id
)
INSERT INTO financial_data (submission_id, investment_amount, annual_turnover, export_revenue, rd_expenditure)
SELECT id, 220000000.00, 480000000.00, 150000000.00, 4500000.00 FROM sub;

WITH sub AS (
  SELECT id FROM data_submissions WHERE industry_id = (SELECT id FROM industry_profiles WHERE company_name='Alpha Engineering') AND period_year = 2025 AND period_quarter = 4
)
INSERT INTO resource_usage (submission_id, water_consumption, power_usage, waste_generated, waste_recycled_pct)
SELECT id, 3500.00, 110000.00, 75.00, 65.00 FROM sub;

WITH sub AS (
  SELECT id FROM data_submissions WHERE industry_id = (SELECT id FROM industry_profiles WHERE company_name='Alpha Engineering') AND period_year = 2025 AND period_quarter = 4
)
INSERT INTO employment_data (submission_id, permanent_employees, contract_employees, sc_st_employees, women_employees)
SELECT id, 500, 250, 70, 90 FROM sub;

-- Beta Chemicals Submissions
WITH sub AS (
  INSERT INTO data_submissions (industry_id, period_year, period_quarter, status, submitted_at, approved_by)
  VALUES ((SELECT id FROM industry_profiles WHERE company_name='Beta Chemicals'), 2025, 4, 'approved', '2026-01-15 17:00:00', (SELECT id FROM users WHERE role='govt' LIMIT 1))
  RETURNING id
)
INSERT INTO financial_data (submission_id, investment_amount, annual_turnover, export_revenue, rd_expenditure)
SELECT id, 250000000.00, 390000000.00, 90000000.00, 6000000.00 FROM sub;

WITH sub AS (
  SELECT id FROM data_submissions WHERE industry_id = (SELECT id FROM industry_profiles WHERE company_name='Beta Chemicals') AND period_year = 2025 AND period_quarter = 4
)
INSERT INTO resource_usage (submission_id, water_consumption, power_usage, waste_generated, waste_recycled_pct)
SELECT id, 5500.00, 95000.00, 120.00, 50.00 FROM sub;

WITH sub AS (
  SELECT id FROM data_submissions WHERE industry_id = (SELECT id FROM industry_profiles WHERE company_name='Beta Chemicals') AND period_year = 2025 AND period_quarter = 4
)
INSERT INTO employment_data (submission_id, permanent_employees, contract_employees, sc_st_employees, women_employees)
SELECT id, 250, 150, 35, 60 FROM sub;

-- Gamma Food Processing Submissions
WITH sub AS (
  INSERT INTO data_submissions (industry_id, period_year, period_quarter, status, submitted_at, approved_by)
  VALUES ((SELECT id FROM industry_profiles WHERE company_name='Gamma Food Processing'), 2025, 4, 'approved', '2026-01-07 11:30:00', (SELECT id FROM users WHERE role='govt' LIMIT 1))
  RETURNING id
)
INSERT INTO financial_data (submission_id, investment_amount, annual_turnover, export_revenue, rd_expenditure)
SELECT id, 40000000.00, 75000000.00, 8000000.00, 500000.00 FROM sub;

WITH sub AS (
  SELECT id FROM data_submissions WHERE industry_id = (SELECT id FROM industry_profiles WHERE company_name='Gamma Food Processing') AND period_year = 2025 AND period_quarter = 4
)
INSERT INTO resource_usage (submission_id, water_consumption, power_usage, waste_generated, waste_recycled_pct)
SELECT id, 4500.00, 15000.00, 30.00, 70.00 FROM sub;

WITH sub AS (
  SELECT id FROM data_submissions WHERE industry_id = (SELECT id FROM industry_profiles WHERE company_name='Gamma Food Processing') AND period_year = 2025 AND period_quarter = 4
)
INSERT INTO employment_data (submission_id, permanent_employees, contract_employees, sc_st_employees, women_employees)
SELECT id, 100, 50, 15, 65 FROM sub;

-- Omega IT Solutions Submissions
WITH sub AS (
  INSERT INTO data_submissions (industry_id, period_year, period_quarter, status, submitted_at, approved_by)
  VALUES ((SELECT id FROM industry_profiles WHERE company_name='Omega IT Solutions'), 2025, 4, 'approved', '2026-01-05 09:00:00', (SELECT id FROM users WHERE role='govt' LIMIT 1))
  RETURNING id
)
INSERT INTO financial_data (submission_id, investment_amount, annual_turnover, export_revenue, rd_expenditure)
SELECT id, 30000000.00, 140000000.00, 85000000.00, 1000000.00 FROM sub;

WITH sub AS (
  SELECT id FROM data_submissions WHERE industry_id = (SELECT id FROM industry_profiles WHERE company_name='Omega IT Solutions') AND period_year = 2025 AND period_quarter = 4
)
INSERT INTO resource_usage (submission_id, water_consumption, power_usage, waste_generated, waste_recycled_pct)
SELECT id, 450.00, 8000.00, 5.00, 95.00 FROM sub;

WITH sub AS (
  SELECT id FROM data_submissions WHERE industry_id = (SELECT id FROM industry_profiles WHERE company_name='Omega IT Solutions') AND period_year = 2025 AND period_quarter = 4
)
INSERT INTO employment_data (submission_id, permanent_employees, contract_employees, sc_st_employees, women_employees)
SELECT id, 1200, 300, 180, 550 FROM sub;

-- Sigma Electronics Submissions
WITH sub AS (
  INSERT INTO data_submissions (industry_id, period_year, period_quarter, status, submitted_at, approved_by)
  VALUES ((SELECT id FROM industry_profiles WHERE company_name='Sigma Electronics'), 2025, 4, 'approved', '2026-01-13 14:00:00', (SELECT id FROM users WHERE role='govt' LIMIT 1))
  RETURNING id
)
INSERT INTO financial_data (submission_id, investment_amount, annual_turnover, export_revenue, rd_expenditure)
SELECT id, 45000000.00, 89000000.00, 28000000.00, 1500000.00 FROM sub;

WITH sub AS (
  SELECT id FROM data_submissions WHERE industry_id = (SELECT id FROM industry_profiles WHERE company_name='Sigma Electronics') AND period_year = 2025 AND period_quarter = 4
)
INSERT INTO resource_usage (submission_id, water_consumption, power_usage, waste_generated, waste_recycled_pct)
SELECT id, 650.00, 18000.00, 12.00, 80.00 FROM sub;

WITH sub AS (
  SELECT id FROM data_submissions WHERE industry_id = (SELECT id FROM industry_profiles WHERE company_name='Sigma Electronics') AND period_year = 2025 AND period_quarter = 4
)
INSERT INTO employment_data (submission_id, permanent_employees, contract_employees, sc_st_employees, women_employees)
SELECT id, 250, 100, 40, 120 FROM sub;

-- 7. Insert Documents
INSERT INTO documents (industry_id, uploaded_by, category, file_name, file_path, file_size_kb, mime_type, expiry_date, verified, verified_by, verified_at)
VALUES
((SELECT id FROM industry_profiles WHERE company_name='ABC Manufacturing'), (SELECT id FROM users WHERE email='industry@abc.com'), 'gst_certificate', 'gst_reg_abc.pdf', '/uploads/gst_reg_abc.pdf', 245, 'application/pdf', '2026-12-31', true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2026-01-15 10:00:00'),
((SELECT id FROM industry_profiles WHERE company_name='ABC Manufacturing'), (SELECT id FROM users WHERE email='industry@abc.com'), 'fire_noc', 'fire_noc_2025_abc.pdf', '/uploads/fire_noc_2025_abc.pdf', 180, 'application/pdf', '2026-05-01', true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2025-05-10 11:30:00'),
((SELECT id FROM industry_profiles WHERE company_name='ABC Manufacturing'), (SELECT id FROM users WHERE email='industry@abc.com'), 'pollution_clearance', 'pollution_clear_abc.pdf', '/uploads/pollution_clear_abc.pdf', 320, 'application/pdf', '2026-08-15', true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2025-08-20 14:00:00'),
((SELECT id FROM industry_profiles WHERE company_name='ABC Manufacturing'), (SELECT id FROM users WHERE email='industry@abc.com'), 'lease_agreement', 'lease_agreement_abc.pdf', '/uploads/lease_agreement_abc.pdf', 1200, 'application/pdf', NULL, true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2019-04-01 09:00:00'),

((SELECT id FROM industry_profiles WHERE company_name='XYZ Manufacturing'), (SELECT id FROM users WHERE email='xyz@sipcot.com'), 'gst_certificate', 'gst_reg_xyz.pdf', '/uploads/gst_reg_xyz.pdf', 250, 'application/pdf', '2026-12-31', true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2026-01-16 10:00:00'),
((SELECT id FROM industry_profiles WHERE company_name='XYZ Manufacturing'), (SELECT id FROM users WHERE email='xyz@sipcot.com'), 'fire_noc', 'fire_noc_xyz.pdf', '/uploads/fire_noc_xyz.pdf', 190, 'application/pdf', '2026-06-01', true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2025-06-02 11:30:00'),
((SELECT id FROM industry_profiles WHERE company_name='XYZ Manufacturing'), (SELECT id FROM users WHERE email='xyz@sipcot.com'), 'pollution_clearance', 'pollution_clear_xyz.pdf', '/uploads/pollution_clear_xyz.pdf', 310, 'application/pdf', '2026-09-15', true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2025-09-21 14:00:00'),
((SELECT id FROM industry_profiles WHERE company_name='XYZ Manufacturing'), (SELECT id FROM users WHERE email='xyz@sipcot.com'), 'lease_agreement', 'lease_agreement_xyz.pdf', '/uploads/lease_agreement_xyz.pdf', 1220, 'application/pdf', NULL, true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2018-06-01 09:00:00'),

((SELECT id FROM industry_profiles WHERE company_name='LMN Textiles'), (SELECT id FROM users WHERE email='lmn@sipcot.com'), 'gst_certificate', 'gst_reg_lmn.pdf', '/uploads/gst_reg_lmn.pdf', 260, 'application/pdf', '2026-12-31', true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2026-01-14 10:00:00'),
((SELECT id FROM industry_profiles WHERE company_name='LMN Textiles'), (SELECT id FROM users WHERE email='lmn@sipcot.com'), 'pollution_clearance', 'pollution_clear_lmn.pdf', '/uploads/pollution_clear_lmn.pdf', 330, 'application/pdf', '2026-10-15', true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2025-10-20 14:00:00'),
((SELECT id FROM industry_profiles WHERE company_name='LMN Textiles'), (SELECT id FROM users WHERE email='lmn@sipcot.com'), 'lease_agreement', 'lease_agreement_lmn.pdf', '/uploads/lease_agreement_lmn.pdf', 1210, 'application/pdf', NULL, true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2021-09-01 09:00:00'),

((SELECT id FROM industry_profiles WHERE company_name='Beta Chemicals'), (SELECT id FROM users WHERE email='beta@sipcot.com'), 'gst_certificate', 'gst_reg_beta.pdf', '/uploads/gst_reg_beta.pdf', 280, 'application/pdf', '2026-12-31', true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2026-01-16 10:00:00'),
((SELECT id FROM industry_profiles WHERE company_name='Beta Chemicals'), (SELECT id FROM users WHERE email='beta@sipcot.com'), 'fire_noc', 'fire_noc_beta.pdf', '/uploads/fire_noc_beta.pdf', 210, 'application/pdf', '2026-01-15', true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2025-01-16 11:30:00'),

((SELECT id FROM industry_profiles WHERE company_name='PQR Auto Parts'), (SELECT id FROM users WHERE email='pqr@sipcot.com'), 'gst_certificate', 'gst_reg_pqr.pdf', '/uploads/gst_reg_pqr.pdf', 230, 'application/pdf', '2026-12-31', true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2026-01-15 10:00:00'),
((SELECT id FROM industry_profiles WHERE company_name='PQR Auto Parts'), (SELECT id FROM users WHERE email='pqr@sipcot.com'), 'fire_noc', 'fire_noc_pqr.pdf', '/uploads/fire_noc_pqr.pdf', 175, 'application/pdf', '2026-09-01', true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2025-09-10 11:30:00'),
((SELECT id FROM industry_profiles WHERE company_name='PQR Auto Parts'), (SELECT id FROM users WHERE email='pqr@sipcot.com'), 'pollution_clearance', 'pollution_clear_pqr.pdf', '/uploads/pollution_clear_pqr.pdf', 290, 'application/pdf', '2026-11-15', true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2025-11-20 14:00:00'),
((SELECT id FROM industry_profiles WHERE company_name='PQR Auto Parts'), (SELECT id FROM users WHERE email='pqr@sipcot.com'), 'lease_agreement', 'lease_agreement_pqr.pdf', '/uploads/lease_agreement_pqr.pdf', 1150, 'application/pdf', NULL, true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2020-02-01 09:00:00'),

((SELECT id FROM industry_profiles WHERE company_name='Delta Pharma'), (SELECT id FROM users WHERE email='delta@sipcot.com'), 'gst_certificate', 'gst_reg_delta.pdf', '/uploads/gst_reg_delta.pdf', 255, 'application/pdf', '2026-12-31', true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2026-01-15 10:00:00'),
((SELECT id FROM industry_profiles WHERE company_name='Delta Pharma'), (SELECT id FROM users WHERE email='delta@sipcot.com'), 'fire_noc', 'fire_noc_delta.pdf', '/uploads/fire_noc_delta.pdf', 185, 'application/pdf', '2026-10-31', true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2025-11-01 11:30:00'),
((SELECT id FROM industry_profiles WHERE company_name='Delta Pharma'), (SELECT id FROM users WHERE email='delta@sipcot.com'), 'pollution_clearance', 'pollution_clear_delta.pdf', '/uploads/pollution_clear_delta.pdf', 315, 'application/pdf', '2027-02-28', true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2026-03-01 14:00:00'),
((SELECT id FROM industry_profiles WHERE company_name='Delta Pharma'), (SELECT id FROM users WHERE email='delta@sipcot.com'), 'lease_agreement', 'lease_agreement_delta.pdf', '/uploads/lease_agreement_delta.pdf', 1215, 'application/pdf', NULL, true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2020-04-01 09:00:00'),

((SELECT id FROM industry_profiles WHERE company_name='Alpha Engineering'), (SELECT id FROM users WHERE email='alpha@sipcot.com'), 'gst_certificate', 'gst_reg_alpha.pdf', '/uploads/gst_reg_alpha.pdf', 265, 'application/pdf', '2026-12-31', true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2026-01-15 10:00:00'),
((SELECT id FROM industry_profiles WHERE company_name='Alpha Engineering'), (SELECT id FROM users WHERE email='alpha@sipcot.com'), 'fire_noc', 'fire_noc_alpha.pdf', '/uploads/fire_noc_alpha.pdf', 195, 'application/pdf', '2026-08-30', true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2025-09-01 11:30:00'),
((SELECT id FROM industry_profiles WHERE company_name='Alpha Engineering'), (SELECT id FROM users WHERE email='alpha@sipcot.com'), 'pollution_clearance', 'pollution_clear_alpha.pdf', '/uploads/pollution_clear_alpha.pdf', 325, 'application/pdf', '2026-12-31', true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2026-01-05 14:00:00'),
((SELECT id FROM industry_profiles WHERE company_name='Alpha Engineering'), (SELECT id FROM users WHERE email='alpha@sipcot.com'), 'lease_agreement', 'lease_agreement_alpha.pdf', '/uploads/lease_agreement_alpha.pdf', 1230, 'application/pdf', NULL, true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2017-12-01 09:00:00'),

((SELECT id FROM industry_profiles WHERE company_name='Gamma Food Processing'), (SELECT id FROM users WHERE email='gamma@sipcot.com'), 'gst_certificate', 'gst_reg_gamma.pdf', '/uploads/gst_reg_gamma.pdf', 240, 'application/pdf', '2026-12-31', true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2026-01-15 10:00:00'),
((SELECT id FROM industry_profiles WHERE company_name='Gamma Food Processing'), (SELECT id FROM users WHERE email='gamma@sipcot.com'), 'fire_noc', 'fire_noc_gamma.pdf', '/uploads/fire_noc_gamma.pdf', 170, 'application/pdf', '2026-07-15', true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2025-07-20 11:30:00'),
((SELECT id FROM industry_profiles WHERE company_name='Gamma Food Processing'), (SELECT id FROM users WHERE email='gamma@sipcot.com'), 'pollution_clearance', 'pollution_clear_gamma.pdf', '/uploads/pollution_clear_gamma.pdf', 300, 'application/pdf', '2026-12-15', true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2025-12-20 14:00:00'),
((SELECT id FROM industry_profiles WHERE company_name='Gamma Food Processing'), (SELECT id FROM users WHERE email='gamma@sipcot.com'), 'lease_agreement', 'lease_agreement_gamma.pdf', '/uploads/lease_agreement_gamma.pdf', 1180, 'application/pdf', NULL, true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2021-04-01 09:00:00'),

((SELECT id FROM industry_profiles WHERE company_name='Omega IT Solutions'), (SELECT id FROM users WHERE email='omega@sipcot.com'), 'gst_certificate', 'gst_reg_omega.pdf', '/uploads/gst_reg_omega.pdf', 235, 'application/pdf', '2026-12-31', true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2026-01-15 10:00:00'),
((SELECT id FROM industry_profiles WHERE company_name='Omega IT Solutions'), (SELECT id FROM users WHERE email='omega@sipcot.com'), 'fire_noc', 'fire_noc_omega.pdf', '/uploads/fire_noc_omega.pdf', 180, 'application/pdf', '2027-01-15', true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2026-01-20 11:30:00'),
((SELECT id FROM industry_profiles WHERE company_name='Omega IT Solutions'), (SELECT id FROM users WHERE email='omega@sipcot.com'), 'lease_agreement', 'lease_agreement_omega.pdf', '/uploads/lease_agreement_omega.pdf', 1100, 'application/pdf', NULL, true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2019-07-01 09:00:00'),

((SELECT id FROM industry_profiles WHERE company_name='Sigma Electronics'), (SELECT id FROM users WHERE email='sigma@sipcot.com'), 'gst_certificate', 'gst_reg_sigma.pdf', '/uploads/gst_reg_sigma.pdf', 245, 'application/pdf', '2026-12-31', true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2026-01-15 10:00:00'),
((SELECT id FROM industry_profiles WHERE company_name='Sigma Electronics'), (SELECT id FROM users WHERE email='sigma@sipcot.com'), 'fire_noc', 'fire_noc_sigma.pdf', '/uploads/fire_noc_sigma.pdf', 190, 'application/pdf', '2026-11-30', true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2025-12-05 11:30:00'),
((SELECT id FROM industry_profiles WHERE company_name='Sigma Electronics'), (SELECT id FROM users WHERE email='sigma@sipcot.com'), 'pollution_clearance', 'pollution_clear_sigma.pdf', '/uploads/pollution_clear_sigma.pdf', 310, 'application/pdf', '2027-03-31', true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2026-04-01 14:00:00'),
((SELECT id FROM industry_profiles WHERE company_name='Sigma Electronics'), (SELECT id FROM users WHERE email='sigma@sipcot.com'), 'lease_agreement', 'lease_agreement_sigma.pdf', '/uploads/lease_agreement_sigma.pdf', 1205, 'application/pdf', NULL, true, (SELECT id FROM users WHERE email='govt@tn.gov.in'), '2020-09-01 09:00:00');

-- 8. Insert Compliance Violations
INSERT INTO compliance_violations (industry_id, rule_id, violation_date, severity, status, description, auto_detected)
VALUES
((SELECT id FROM industry_profiles WHERE company_name='LMN Textiles'), (SELECT id FROM compliance_rules WHERE rule_code='ENV-WAT'), '2026-03-10', 'high', 'open', 'Water usage exceeded by 300% (allocated 2500 KL, consumed 9500 KL in Q4 2025)', true),
((SELECT id FROM industry_profiles WHERE company_name='Beta Chemicals'), (SELECT id FROM compliance_rules WHERE rule_code='SAF-POL'), '2026-01-20', 'critical', 'open', 'Operating without valid Pollution Control Board clearance. Expiry was 2026-01-15.', true),
((SELECT id FROM industry_profiles WHERE company_name='Beta Chemicals'), (SELECT id FROM compliance_rules WHERE rule_code='SAF-NOC'), '2026-02-15', 'critical', 'open', 'Fire Safety Certificate audit failed due to expired safety equipment.', false);

-- 9. Insert Service Requests
INSERT INTO service_requests (industry_id, park_id, service_type, reference_number, requested_area_acres, current_status, priority, applied_date, expected_completion, assigned_officer, remarks)
VALUES
((SELECT id FROM industry_profiles WHERE company_name='ABC Manufacturing'), (SELECT id FROM industrial_parks WHERE code='ORGDM'), 'land_allotment', 'SR-2019-1002', 12.50, 'completed', 'normal', '2019-03-01 10:00:00', '2019-03-31', (SELECT id FROM users WHERE role='govt' LIMIT 1), 'Land allotment approved'),
((SELECT id FROM industry_profiles WHERE company_name='ABC Manufacturing'), (SELECT id FROM industrial_parks WHERE code='ORGDM'), 'water_connection', 'SR-2026-8203', NULL, 'applied', 'high', '2026-06-18 10:30:00', '2026-06-25', (SELECT id FROM users WHERE role='govt' LIMIT 1), 'Urgent request for unit 2 expansion'),

((SELECT id FROM industry_profiles WHERE company_name='XYZ Manufacturing'), (SELECT id FROM industrial_parks WHERE code='SRPBR'), 'land_allotment', 'SR-2018-1001', 15.00, 'completed', 'normal', '2018-05-10 10:00:00', '2018-05-30', (SELECT id FROM users WHERE role='govt' LIMIT 1), 'Land allotment approved'),
((SELECT id FROM industry_profiles WHERE company_name='XYZ Manufacturing'), (SELECT id FROM industrial_parks WHERE code='SRPBR'), 'power_connection', 'SR-2026-5510', NULL, 'document_review', 'normal', '2026-06-10 14:00:00', '2026-06-24', (SELECT id FROM users WHERE role='govt' LIMIT 1), 'Required additional 150 kVA power supply'),

((SELECT id FROM industry_profiles WHERE company_name='Beta Chemicals'), (SELECT id FROM industrial_parks WHERE code='CHEYR'), 'land_allotment', 'SR-2023-4011', 30.00, 'completed', 'normal', '2023-01-10 10:00:00', '2023-01-30', (SELECT id FROM users WHERE role='govt' LIMIT 1), 'Land allotment approved'),
((SELECT id FROM industry_profiles WHERE company_name='Beta Chemicals'), (SELECT id FROM industrial_parks WHERE code='CHEYR'), 'expansion_request', 'SR-2026-9045', 10.00, 'pending_approval', 'high', '2026-05-15 11:00:00', '2026-06-15', (SELECT id FROM users WHERE role='govt' LIMIT 1), 'Requested additional 10 acres adjacent plot for warehouse expansion');
