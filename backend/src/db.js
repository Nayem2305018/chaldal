const { Pool } = require("pg");
require("dotenv").config();

// Create a new pool using credentials from your .env file
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: true,
});

// Log message when successfully connected
pool.on("connect", () => {
  console.log("✅ PostgreSQL Connected Successfully");
});

// Error handling for the idle pool
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  connect: () => pool.connect(),
};
       