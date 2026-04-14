-- SIPCOT SIMS PostgreSQL Database Schema

-- 1. Roles Enum for strict typing
CREATE TYPE user_role AS ENUM ('industry', 'admin', 'govt');

-- 2. Users Table (Central Auth)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending', -- Active, Pending, Suspended
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Industry Profiles (Linked to users where role='industry')
CREATE TABLE industry_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    industry_type VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    contact_person VARCHAR(100),
    phone_number VARCHAR(50),
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Submissions Master Table (Tracks compliance periods)
CREATE TABLE data_submissions (
    id SERIAL PRIMARY KEY,
    industry_id INTEGER REFERENCES industry_profiles(id) ON DELETE CASCADE,
    period_year INTEGER NOT NULL,
    period_quarter INTEGER, -- 1, 2, 3, 4 (null if annual)
    status VARCHAR(50) DEFAULT 'Draft', -- Draft, Submitted, Approved, Rejected
    submitted_at TIMESTAMP,
    approved_by INTEGER REFERENCES users(id),
    CONSTRAINT unique_period_per_industry UNIQUE (industry_id, period_year, period_quarter)
);

-- 5. Investment & Turnover Data
CREATE TABLE financial_data (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER UNIQUE REFERENCES data_submissions(id) ON DELETE CASCADE,
    investment_amount DECIMAL(15, 2) NOT NULL, -- in Crores
    annual_turnover DECIMAL(15, 2) NOT NULL -- in Crores
);

-- 6. Employment Data
CREATE TABLE employment_data (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER UNIQUE REFERENCES data_submissions(id) ON DELETE CASCADE,
    permanent_employees INTEGER NOT NULL DEFAULT 0,
    contract_employees INTEGER NOT NULL DEFAULT 0
);

-- 7. Resource Usage Data
CREATE TABLE resource_usage (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER UNIQUE REFERENCES data_submissions(id) ON DELETE CASCADE,
    water_consumption DECIMAL(10, 2) NOT NULL, -- in KL
    power_usage DECIMAL(10, 2) NOT NULL -- in kWh
);

-- 8. CSR Activities
CREATE TABLE csr_activities (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER UNIQUE REFERENCES data_submissions(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount_spent DECIMAL(15, 2) NOT NULL -- in Lakhs
);

-- 9. Audit Logs (For Security & Actions)
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initial Mock Data Scaffolding
INSERT INTO users (email, password_hash, role, status) VALUES 
('admin@sipcot.com', '$2b$10$xyz...', 'admin', 'Active'),
('govt@tn.gov.in', '$2b$10$xyz...', 'govt', 'Active');
