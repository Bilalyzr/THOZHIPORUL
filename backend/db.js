const { Pool } = require('pg');

// Create a new pool using environment variables
// Make sure your PostgreSQL server is running
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'db',
  database: process.env.DB_NAME || 'sipcot_sims',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Testing the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error(`[DB] Failed to connect to database at ${pool.options.host}:${pool.options.port}`);
    console.error(`[DB] Error details:`, err.message);
  } else {
    console.log(`[DB] Successfully connected to database at ${pool.options.host}:${pool.options.port}`);
  }
});

pool.on('error', (err, client) => {
  console.error('[DB] Unexpected database error on idle client:', err.message);
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
