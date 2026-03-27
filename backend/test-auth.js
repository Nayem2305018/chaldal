const db = require('./src/db');
async function test() {
  const users = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
  console.log("users:", users.rows.map(r => r.column_name));
  const rider = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'rider'");
  console.log("rider:", rider.rows.map(r => r.column_name));
  const admin = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'admin'");
  console.log("admin:", admin.rows.map(r => r.column_name));
  process.exit();
}
test().catch(console.error);
