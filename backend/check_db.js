require('dotenv').config();
const { pool } = require('./db');

async function check() {
  try {
    const res = await pool.query('SELECT * FROM users');
    console.log('Users in database:', res.rows);
  } catch (err) {
    console.error('Error querying database:', err.message);
  } finally {
    await pool.end();
  }
}

check();
