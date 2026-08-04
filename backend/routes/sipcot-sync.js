const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('./auth');

// ─────────────────────────────────────────────────
// SIPCOT MASTER-SYSTEM SYNC (SIMULATED)
// This router represents a connector to SIPCOT Authority's external
// "verified records" master system. That live integration does NOT
// exist yet, so the verified-submissions payload below is sample data
// and every response is honestly flagged as `simulated` / sandbox.
// Where a figure CAN be sourced from OUR own database (submission
// counts, industry counts) it is queried live.
//
// Access is guarded by the platform's normal role auth (admin/govt).
// The API key MUST be provided via the SIPCOT_API_KEY env var — there is
// no hardcoded fallback, so a missing key never silently runs on a
// known/shared secret. The /key-info endpoint returns a 503 if unset.
// ─────────────────────────────────────────────────
const SIPCOT_API_KEY = process.env.SIPCOT_API_KEY || null;

// ─────────────────────────────────────────────────
// Sample: SIPCOT Authority's verified submissions
// (SIMULATED — in production this data comes from SIPCOT's real master DB)
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
    source: 'simulated-sync'
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
    source: 'simulated-sync'
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
    source: 'simulated-sync'
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
    source: 'simulated-sync'
  }
];

// ─────────────────────────────────────────────────
// GET /api/sipcot-sync/verified-submissions
// Fetches sample verified submissions (SIMULATED external pull)
// ─────────────────────────────────────────────────
router.get('/verified-submissions', requireRole(['admin', 'govt']), (req, res) => {
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
    simulated: true,
    connection: 'not_connected',
    fetched_at: new Date().toISOString(),
    total_records: results.length,
    api_version: 'v1.0',
    source: 'Simulated SIPCOT Authority — Verified Records API (sample data, not a live feed)',
    data: results
  });
});

// ─────────────────────────────────────────────────
// GET /api/sipcot-sync/key-info
// Shows info about the demonstration API key (for admin panel display)
// ─────────────────────────────────────────────────
router.get('/key-info', requireRole(['admin', 'govt']), (req, res) => {
  if (!SIPCOT_API_KEY) {
    return res.status(503).json({ error: 'SIPCOT_API_KEY not configured.' });
  }
  res.json({
    success: true,
    simulated: true,
    key_preview: SIPCOT_API_KEY.slice(0, 20) + '••••••••••••',
    issued_to: 'SIPCOT SIMS Platform',
    issued_by: 'SIPCOT IT Division, Chennai (demonstration key)',
    permissions: ['read:verified-submissions', 'read:company-profiles'],
    rate_limit: '100 requests/hour',
    expires_at: '2027-03-31T23:59:59Z',
    status: 'ACTIVE (sandbox)'
  });
});

// ─────────────────────────────────────────────────
// POST /api/sipcot-sync/trigger-sync
// Admin manually triggers a sync pull. External pull is SIMULATED, but the
// record counts reported are pulled live from OUR own database.
// ─────────────────────────────────────────────────
router.post('/trigger-sync', requireRole(['admin', 'govt']), async (req, res) => {
  try {
    // Real counts from our DB give the sync a truthful "records available" figure.
    const { rows } = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM data_submissions) AS total_submissions,
        (SELECT COUNT(*) FROM data_submissions WHERE lower(status) = 'approved') AS approved_submissions,
        (SELECT COUNT(*) FROM industry_profiles) AS total_industries
    `);
    const r = rows[0];
    const approved = parseInt(r.approved_submissions) || 0;
    const total = parseInt(r.total_submissions) || 0;

    res.json({
      success: true,
      simulated: true,
      connection: 'not_connected',
      sync_id: `SYNC-${Date.now()}`,
      triggered_at: new Date().toISOString(),
      records_fetched: verifiedSubmissions.length,
      // Real figures from our database:
      local_total_submissions: total,
      local_approved_submissions: approved,
      local_industries: parseInt(r.total_industries) || 0,
      next_auto_sync: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      message: `Simulated sync complete. Pulled ${verifiedSubmissions.length} sample records from the (not connected) SIPCOT master system; ${approved} of ${total} local submissions are approved.`
    });
  } catch (err) {
    console.error('SIPCOT Sync Error:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
