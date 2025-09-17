const { Pool } = require('pg');

// Admin database connection for administrative tasks
const adminPool = new Pool({
  connectionString: process.env.DATABASE_ADMIN_URL,
});

module.exports = {
  query: (text, params) => adminPool.query(text, params),
  pool: adminPool
};
