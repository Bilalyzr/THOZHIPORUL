// scripts/seed_plots.js — generate park plots + allot one to each real
// industry. Idempotent: exits without touching anything if plots exist.
//
// Why: the real-data seed created parks and industries but no park_plots
// rows, so every /api/workspace/lease call 404'd ("Lease details not
// found"), park plot-availability lists were empty, and GIS plot layers
// had nothing to draw. Run:  node scripts/seed_plots.js  (from backend/)
require('dotenv').config();
const db = require('../db');

const ZONE_BY_PARK = {
  1: 'Industrial', 2: 'Industrial', 3: 'IT SEZ', 4: 'Industrial',
  5: 'Chemical', 6: 'Industrial', 7: 'Industrial', 8: 'Industrial',
  9: 'Industrial', 10: 'Industrial',
};

// Deterministic pseudo-random so reruns produce identical data.
let seed = 20261003;
const rnd = (min, max) => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return min + (seed % 1000) / 1000 * (max - min);
};

(async () => {
  const existing = await db.query('SELECT COUNT(*)::int AS n FROM park_plots');
  if (existing.rows[0].n > 0) {
    console.log(`park_plots already has ${existing.rows[0].n} rows — nothing to do.`);
    process.exit(0);
  }

  const parks = await db.query('SELECT id FROM industrial_parks WHERE id <= 10 ORDER BY id');
  for (const park of parks.rows) {
    const zone = ZONE_BY_PARK[park.id] || 'Industrial';
    for (const block of ['A', 'B']) {
      for (let i = 1; i <= 6; i++) {
        await db.query(
          `INSERT INTO park_plots (park_id, plot_number, area_acres, status, zone_type)
           VALUES ($1, $2, $3, 'available', $4)`,
          [park.id, `${block}-0${i}`, rnd(1.5, 28).toFixed(1), zone]
        );
      }
    }
  }
  const created = await db.query('SELECT COUNT(*)::int AS n FROM park_plots');
  console.log(`created ${created.rows[0].n} plots across ${parks.rows.length} parks`);

  // Allot one plot per industry in its own park.
  const industries = await db.query('SELECT id, park_id FROM industry_profiles ORDER BY id');
  for (const ind of industries.rows) {
    const plot = await db.query(
      `SELECT id, area_acres FROM park_plots
        WHERE park_id = $1 AND status = 'available'
        ORDER BY id LIMIT 1`,
      [ind.park_id]
    );
    if (!plot.rows.length) {
      console.log(`industry ${ind.id}: no free plot in park ${ind.park_id}, skipped`);
      continue;
    }
    const { id: plotId, area_acres: acres } = plot.rows[0];
    const startYear = 2015 + Math.floor(rnd(0, 8));
    const monthly = Math.round((parseFloat(acres) * rnd(38000, 52000)) / 1000) * 1000;
    await db.query(
      `UPDATE park_plots
          SET status = 'allotted', allottee_industry_id = $1,
              allotment_date = $2, lease_start_date = $2,
              lease_end_date = ($2::date + INTERVAL '30 years'),
              monthly_lease_amount = $3
        WHERE id = $4`,
      [ind.id, `${startYear}-04-01`, monthly, plotId]
    );
    await db.query('UPDATE industry_profiles SET plot_id = $1 WHERE id = $2', [plotId, ind.id]);
    console.log(`industry ${ind.id} → plot ${plotId} (${acres} acres, ₹${monthly}/mo, lease ${startYear}–${startYear + 30})`);
  }

  const allotted = await db.query("SELECT COUNT(*)::int AS n FROM park_plots WHERE status = 'allotted'");
  console.log(`done: ${allotted.rows[0].n} plots allotted, ${created.rows[0].n - allotted.rows[0].n} still available`);
  process.exit(0);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
