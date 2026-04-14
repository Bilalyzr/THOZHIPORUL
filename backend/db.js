const { Pool } = require('pg');

// Create a new pool using environment variables
// Make sure your PostgreSQL server is running
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

pool.on('error', (err, client) => {
  console.error('Unexpected database error on idle client', err);
  process.exit(-1);
});

// Helper function for quick querying
const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text, duration, rows: res.rowCount });
  return res;
};

module.exports = {
  query,
  pool
};
