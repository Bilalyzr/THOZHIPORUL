require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function seed() {
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
