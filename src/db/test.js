// src/db/test.js
const pool = require('./config');

(async () => {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Payment Service DB Connected');
    console.log('DB Time:', res.rows[0]);
  } catch (err) {
    console.error('❌ DB connection failed:', err);
  } finally {
    await pool.end();
  }
})();
