const fs = require('fs');
const path = require('path');
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

async function initDb() {
  try {
    const sqlPath = path.join(__dirname, '..', 'init-database.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running init-database.sql...');
    await pool.query(sql);
    console.log('Database initialized successfully!');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    await pool.end();
  }
}

initDb();
