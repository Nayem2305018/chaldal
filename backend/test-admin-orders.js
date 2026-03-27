const db = require('./src/db');

async function testAdminOrders() {
  try {
    const result = await db.query(`
      SELECT o.*, d.rider_id, d.warehouse_id, d.delivery_status, d.assigned_at,
        (SELECT json_agg(json_build_object('product_name', p.product_name, 'quantity', oi.quantity, 'unit_price', oi.unit_price)) 
         FROM order_item oi 
         JOIN product p ON oi.product_id = p.product_id 
         WHERE oi.order_id = o.order_id) as items
      FROM orders o 
      LEFT JOIN delivery d ON o.order_id = d.order_id
      ORDER BY o.order_date DESC
    `);
    console.log("SUCCESS: Found " + result.rows.length + " orders for admin.");
    if (result.rows.length > 0) {
      console.log("First order sample:", JSON.stringify(result.rows[0], null, 2));
    }
  } catch (e) {
    console.error("DB ERROR:", e.message);
  } finally {
    process.exit();
  }
}
testAdminOrders();
