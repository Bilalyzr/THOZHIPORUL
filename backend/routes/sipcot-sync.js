const express = require('express');
const router = express.Router();

// ─────────────────────────────────────────────────
// API KEY Configuration
// In production, set SIPCOT_API_KEY in environment variables
// ─────────────────────────────────────────────────
const SIPCOT_API_KEY = process.env.SIPCOT_API_KEY || 'SIPCOT-SIMS-2026-a4f8e2d1-b7c3-49e5-9612-3f8a1d0e7b5c';

// Middleware: Validate API Key on every request to this router
function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Missing API Key',
      message: 'Provide your API key via "X-API-Key" header or "api_key" query parameter.'
    });
  }

  if (apiKey !== SIPCOT_API_KEY) {
    return res.status(403).json({
      success: false,
      error: 'Invalid API Key',
      message: 'The provided API key is not authorized. Contact SIPCOT authority for a valid key.'
    });
  }

  next();
}

// Apply API key validation to all routes below
router.use(validateApiKey);

// ─────────────────────────────────────────────────
// Mock: SIPCOT Authority's verified submissions
// (In production, this data comes from SIPCOT's real database)
// ─────────────────────────────────────────────────
const verifiedSubmissions = [
  {
    id: 'SIPCOT-VER-001',
    company_name: 'ABC Industries Pvt Ltd',
    cin: 'U28920TN2018PTC123456',
    park: 'Oragadam',
    type: 'electricity_bill',
    period: 'Q1 2026',
    amount_rs: 485000,
    units_consumed: 64200,
    rate_per_unit: 7.55,
    verified_by: 'Mr. R. Senthil Kumar, Asst. Director',
    verified_at: '2026-05-05T14:30:00Z',
    status: 'VERIFIED',
    source: 'api-sync'
  },
  {
    id: 'SIPCOT-VER-002',
    company_name: 'LMN Textiles Ltd',
    cin: 'L17120TN2015PLC098765',
    park: 'Sriperumbudur',
    type: 'water_bill',
    period: 'Q1 2026',
    amount_rs: 127500,
    units_consumed: 2830,
    rate_per_unit: 45.05,
    verified_by: 'Ms. K. Priya, Section Officer',
    verified_at: '2026-05-04T11:15:00Z',
    status: 'VERIFIED',
    source: 'api-sync'
  },
  {
    id: 'SIPCOT-VER-003',
    company_name: 'Sunrise Foods India Ltd',
    cin: 'U15400TN2020PTC567890',
    park: 'Hosur',
    type: 'employee_data',
    period: 'Q1 2026',
    total_employees: 342,
    new_hires: 18,
    attrition: 5,
    avg_salary_rs: 28500,
    verified_by: 'Mr. R. Senthil Kumar, Asst. Director',
    verified_at: '2026-05-06T09:45:00Z',
    status: 'VERIFIED',
    source: 'api-sync'
  },
  {
    id: 'SIPCOT-VER-004',
    company_name: 'PQR Auto Components',
    cin: 'U34300TN2017PTC345678',
    park: 'Oragadam',
    type: 'electricity_bill',
    period: 'Q1 2026',
    amount_rs: 312000,
    units_consumed: 41300,
    rate_per_unit: 7.55,
    verified_by: 'Ms. K. Priya, Section Officer',
    verified_at: '2026-05-06T10:20:00Z',
    status: 'VERIFIED',
    source: 'api-sync'
  }
];

// ─────────────────────────────────────────────────
// GET /api/sipcot-sync/verified-submissions
// Fetches all verified submissions (the auto-fetch endpoint)
// ─────────────────────────────────────────────────
router.get('/verified-submissions', (req, res) => {
  const { type, park, since } = req.query;

  let results = [...verifiedSubmissions];

  // Filter by type (electricity_bill, water_bill, employee_data)
  if (type) {
    results = results.filter(r => r.type === type);
  }

  // Filter by park
  if (park) {
    results = results.filter(r => r.park.toLowerCase() === park.toLowerCase());
  }

  // Filter by date (records verified after this timestamp)
  if (since) {
    const sinceDate = new Date(since);
    results = results.filter(r => new Date(r.verified_at) >= sinceDate);
  }

  res.json({
    success: true,
    fetched_at: new Date().toISOString(),
    total_records: results.length,
    api_version: 'v1.0',
    source: 'SIPCOT Authority — Verified Records API',
    data: results
  });
});

// ─────────────────────────────────────────────────
// GET /api/sipcot-sync/key-info
// Shows info about the current API key (for admin panel display)
// ─────────────────────────────────────────────────
router.get('/key-info', (req, res) => {
  res.json({
    success: true,
    key_preview: SIPCOT_API_KEY.slice(0, 20) + '••••••••••••',
    issued_to: 'SIPCOT SIMS Platform',
    issued_by: 'SIPCOT IT Division, Chennai',
    permissions: ['read:verified-submissions', 'read:company-profiles'],
    rate_limit: '100 requests/hour',
    expires_at: '2027-03-31T23:59:59Z',
    status: 'ACTIVE'
  });
});

// ─────────────────────────────────────────────────
// POST /api/sipcot-sync/trigger-sync
// Admin can manually trigger a sync pull
// ─────────────────────────────────────────────────
router.post('/trigger-sync', (req, res) => {
  const syncResult = {
    success: true,
    sync_id: `SYNC-${Date.now()}`,
    triggered_at: new Date().toISOString(),
    records_fetched: verifiedSubmissions.length,
    new_records: 2,
    updated_records: 1,
    skipped_duplicates: 1,
    next_auto_sync: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    message: `Successfully synced ${verifiedSubmissions.length} verified records from SIPCOT authority.`
  };

  res.json(syncResult);
});

module.exports = router;
