const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: true,
});

async function patch() {
  try {
    // Add vehicle_type mapping to Rider accounts dynamically
    await pool.query("ALTER TABLE rider_requests ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(50)");
    await pool.query("ALTER TABLE rider ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(50)");
    console.log("Database patched securely for Rider additions!");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

patch();
