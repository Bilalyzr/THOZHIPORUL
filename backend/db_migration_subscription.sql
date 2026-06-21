-- Migration script: Add subscription fields to industry_profiles table
ALTER TABLE industry_profiles
    ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'free_starter',
    ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS payment_gateway_order_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS payment_gateway_payment_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP;
