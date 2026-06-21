require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'sipcot_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'sipcot_db',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function cleanData() {
  try {
    console.log('Connecting to database to sterilize submissions...');
    await pool.query('TRUNCATE data_submissions CASCADE;');
    console.log('Successfully sterilized data_submissions, financial_data, employment_data, resource_usage, and csr_activities.');
  } catch (err) {
    console.error('Error cleaning data:', err);
  } finally {
    await pool.end();
  }
}

cleanData();
