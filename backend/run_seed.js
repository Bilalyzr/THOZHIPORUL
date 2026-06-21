require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function seed() {
  // Prevent accidental seeding of production databases (db-seed.md guardrails)
  if (process.env.NODE_ENV === 'production' || process.env.DB_NAME?.includes('prod')) {
    if (!process.argv.includes('--force')) {
      console.error(`[SEED] [FATAL] Seeding is blocked on production database: "${process.env.DB_NAME}"`);
      console.error('[SEED] To override this and seed anyway, append the "--force" flag.');
      process.exit(1);
    }
    console.warn('[SEED] [WARNING] Running database seed on production with --force flag.');
  }

  const seedSqlPath = path.join(__dirname, 'seed.sql');
  const seedSql = fs.readFileSync(seedSqlPath, 'utf8');

  console.log('Seeding database...');
  try {
    await pool.query(seedSql);
    console.log('Database seeded successfully!');
  } catch (err) {
    console.error('Error seeding database:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
