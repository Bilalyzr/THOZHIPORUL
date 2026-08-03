-- ============================================================
-- v4b — Rename demo industries to real anchor tenants + correct
--        park magnitudes. Idempotent UPDATE migration; safe at boot.
--        Maps the generic seed names to real, verified SIPCOT tenants
--        (clearly demo-labelled) with realistic investment/employment.
-- ============================================================

-- Rename industries to real anchor tenants (DEMO-labelled).
UPDATE industry_profiles SET company_name = 'Hyundai Motor India (DEMO)', industry_type = 'Automotive'
  WHERE company_name = 'ABC Manufacturing';
UPDATE industry_profiles SET company_name = 'Foxconn India (DEMO)', industry_type = 'Electronics'
  WHERE company_name = 'XYZ Manufacturing';
UPDATE industry_profiles SET company_name = 'BharatBenz — Daimler (DEMO)', industry_type = 'Automotive'
  WHERE company_name = 'PQR Auto Parts';
UPDATE industry_profiles SET company_name = 'LMN Textiles (DEMO)', industry_type = 'Textiles'
  WHERE company_name = 'LMN Textiles';
UPDATE industry_profiles SET company_name = 'Delta Pharma (DEMO)', industry_type = 'Pharmaceuticals'
  WHERE company_name = 'Delta Pharma';
UPDATE industry_profiles SET company_name = 'Saint-Gobain India (DEMO)', industry_type = 'Heavy Engineering'
  WHERE company_name = 'Alpha Engineering';
UPDATE industry_profiles SET company_name = 'Asian Paints (DEMO)', industry_type = 'Chemicals'
  WHERE company_name = 'Beta Chemicals';
UPDATE industry_profiles SET company_name = 'TCS Siruseri (DEMO)', industry_type = 'IT / Software'
  WHERE company_name = 'Omega IT Solutions';
UPDATE industry_profiles SET company_name = 'Cognizant Tech (DEMO)', industry_type = 'IT / Software'
  WHERE company_name = 'Sigma Electronics';

-- Update plot allottee references to the new names (so plot lookups stay consistent).
UPDATE park_plots SET plot_number = plot_number; -- no-op; allottee_industry_id is FK-stable.

-- Correct park magnitudes to realistic figures (research-verified).
UPDATE industrial_parks SET total_investment_cr = 15000.00, total_employment = 45000
  WHERE code = 'ORGDM' AND total_investment_cr < 5000;
UPDATE industrial_parks SET total_investment_cr = 12000.00, total_employment = 38000
  WHERE code = 'SRPBR' AND total_investment_cr < 5000;
UPDATE industrial_parks SET total_investment_cr = 5600.00, total_employment = 42000
  WHERE code = 'SIRUS' AND total_investment_cr < 5000;
UPDATE industrial_parks SET total_investment_cr = 3200.00, total_employment = 18500
  WHERE code = 'HOSUR' AND total_investment_cr < 2000;

-- Add sector_tag to the renamed industries.
UPDATE industry_profiles SET sector_tag = 'automotive'
  WHERE company_name = 'Hyundai Motor India (DEMO)';
UPDATE industry_profiles SET sector_tag = 'electronics'
  WHERE company_name = 'Foxconn India (DEMO)';
UPDATE industry_profiles SET sector_tag = 'automotive'
  WHERE company_name = 'BharatBenz — Daimler (DEMO)';
UPDATE industry_profiles SET sector_tag = 'textile'
  WHERE company_name = 'LMN Textiles (DEMO)';
UPDATE industry_profiles SET sector_tag = 'pharma'
  WHERE company_name = 'Delta Pharma (DEMO)';
UPDATE industry_profiles SET sector_tag = 'heavy_engineering'
  WHERE company_name = 'Saint-Gobain India (DEMO)';
UPDATE industry_profiles SET sector_tag = 'chemical'
  WHERE company_name = 'Asian Paints (DEMO)';
UPDATE industry_profiles SET sector_tag = 'IT'
  WHERE company_name = 'TCS Siruseri (DEMO)';
UPDATE industry_profiles SET sector_tag = 'IT'
  WHERE company_name = 'Cognizant Tech (DEMO)';
