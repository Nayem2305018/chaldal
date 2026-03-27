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
    // Add status to cart
    await pool.query("ALTER TABLE cart ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'");
    
    // Add payment_status to order
    await pool.query("ALTER TABLE \"order\" ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid'");
    
    // Add stock_quantity to product if missing (since adminController uses it)
    await pool.query("ALTER TABLE product ADD COLUMN IF NOT EXISTS stock_quantity INT DEFAULT 100");

    console.log("Database patched successfully");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

patch();
