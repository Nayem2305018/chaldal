const db = require('./src/db');

async function test() {
  try {
    const result = await db.query(`
      SELECT o.*, 
        (SELECT json_agg(json_build_object('product_name', p.product_name, 'quantity', oi.quantity, 'unit_price', oi.unit_price)) 
         FROM order_item oi 
         JOIN product p ON oi.product_id = p.product_id 
         WHERE oi.order_id = o.order_id) as items
      FROM orders o ORDER BY order_date DESC
    `);
    console.log("SUCCESS:", result.rows.length, "orders found.");
  } catch (e) {
    console.error("DB ERROR:", e.message);
  } finally {
    process.exit();
  }
}
test();
