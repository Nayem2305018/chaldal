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
    // Add delivery_address and preferred_delivery_time to order table
    await pool.query('ALTER TABLE "order" ADD COLUMN IF NOT EXISTS delivery_address TEXT');
    await pool.query('ALTER TABLE "order" ADD COLUMN IF NOT EXISTS preferred_delivery_time VARCHAR(100)');
    
    console.log("Database patched securely for precise Delivery tracking!");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

patch();
