-- Clear existing users (danger: only for demo seeding)
TRUNCATE users, industry_profiles, govt_profiles CASCADE;

-- 1. Insert Demo Users
-- password123 -> $2b$10$bPIabcNNmvQf7Al55z9xwedxk9PcPc32QY1e6e4wLNCKiqz/AoVO.
INSERT INTO users (email, password_hash, role, status) VALUES 
('admin@sipcot.com', '$2b$10$bPIabcNNmvQf7Al55z9xwedxk9PcPc32QY1e6e4wLNCKiqz/AoVO.', 'admin', 'Active'),
('govt@tn.gov.in', '$2b$10$bPIabcNNmvQf7Al55z9xwedxk9PcPc32QY1e6e4wLNCKiqz/AoVO.', 'govt', 'Active'),
('industry@abc.com', '$2b$10$bPIabcNNmvQf7Al55z9xwedxk9PcPc32QY1e6e4wLNCKiqz/AoVO.', 'industry', 'Active');

-- 2. Insert Profiles
INSERT INTO govt_profiles (user_id, officer_name, designation, department, jurisdiction)
SELECT id, 'Govt Officer', 'Senior Manager', 'Industrial Development', 'Statewide'
FROM users WHERE email = 'govt@tn.gov.in';

INSERT INTO industry_profiles (user_id, company_name, industry_type, location, contact_person, phone_number, park_id)
SELECT u.id, 'ABC Manufacturing', 'Automotive', 'Oragadam', 'John Doe', '9876543210', p.id
FROM users u, industrial_parks p
WHERE u.email = 'industry@abc.com' AND p.code = 'ORGDM';
