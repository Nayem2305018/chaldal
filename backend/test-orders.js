const db = require('./src/db');
async function test() {
  const orders = await db.query("SELECT order_id, order_status, payment_status FROM orders LIMIT 5");
  console.log("ORDERS:", orders.rows);
  const delivery = await db.query("SELECT * FROM delivery LIMIT 5");
  console.log("DELIVERY:", delivery.rows);
  
  const pendingOrders = await db.query(`SELECT order_id, order_status FROM orders WHERE order_status = 'pending' AND order_id NOT IN (SELECT order_id FROM delivery)`);
  console.log("PENDING:", pendingOrders.rows);
  process.exit();
}
test().catch(console.error);
