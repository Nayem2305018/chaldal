const db = require('./src/db');
async function test() {
  const inv = await db.query("SELECT * FROM inventory LIMIT 1");
  console.log("INVENTORY:", inv.fields.map(f => f.name));
  const prod = await db.query("SELECT * FROM product LIMIT 1");
  console.log("PRODUCT:", prod.fields.map(f => f.name));
  process.exit();
}
test();
