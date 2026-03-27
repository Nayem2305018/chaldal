const db = require('./src/db');
async function test() {
  const users = await db.query("SELECT * FROM users LIMIT 1");
  console.log("USERS:", users.rows);
  const rider = await db.query("SELECT * FROM rider LIMIT 1");
  console.log("RIDER:", rider.rows);
  const admin = await db.query("SELECT * FROM admin LIMIT 1");
  console.log("ADMIN:", admin.rows);
  process.exit();
}
test().catch(console.error);
