const db = require('./src/db');
async function fix() {
  await db.query(`
    DELETE FROM cart_item a USING cart_item b
    WHERE a.cart_id = b.cart_id 
      AND a.product_id = b.product_id 
      AND a.cart_item_id < b.cart_item_id
  `);
  await db.query('ALTER TABLE cart_item ADD CONSTRAINT cart_product_unique UNIQUE (cart_id, product_id);');
  console.log("Cleaned and added constraint");
  process.exit(0);
}
fix().catch(e => { console.error(e); process.exit(1); });
