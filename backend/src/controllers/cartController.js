const db = require("../db");

exports.getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get active cart
    const cartRes = await db.query("SELECT * FROM cart WHERE user_id = $1 AND status = 'active'", [userId]);
    let cartId = null;

    if (cartRes.rows.length === 0) {
      // Create new active cart (No longer automatically created on getCart, but we can do it if needed. Actually prompt says: "Do not create a cart on login; create on first add-to-cart action". So if getCart runs and no active cart, just return empty items.)
      return res.json({ cart_id: null, items: [], subtotal: 0, total: 0 });
    } else {
      cartId = cartRes.rows[0].cart_id;
    }

    // Get cart items mapped to products
    const itemsRes = await db.query(`
      SELECT ci.cart_item_id, ci.quantity, p.* 
      FROM cart_item ci
      JOIN product p ON ci.product_id = p.product_id
      WHERE ci.cart_id = $1
    `, [cartId]);

    let subtotal = 0;
    for (const item of itemsRes.rows) {
      subtotal += Number(item.price) * item.quantity;
    }

    res.json({ cart_id: cartId, items: itemsRes.rows, subtotal, total: subtotal });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_id } = req.params;
    const quantityToAdd = req.body.quantity || 1;

    // Fetch product to validate stock
    const prodRes = await db.query("SELECT stock_quantity, price FROM product WHERE product_id = $1", [product_id]);
    if (prodRes.rows.length === 0) return res.status(404).json({ error: "Product not found" });
    const stock = prodRes.rows[0].stock_quantity;

    // Identify/create cart context
    let cartRes = await db.query("SELECT cart_id FROM cart WHERE user_id = $1 AND status = 'active'", [userId]);
    let cartId;
    if (cartRes.rows.length === 0) {
      const maxIdRes = await db.query("SELECT COALESCE(MAX(cart_id), 0) + 1 AS next_id FROM cart");
      cartId = maxIdRes.rows[0].next_id;
      await db.query("INSERT INTO cart (cart_id, user_id, last_updated, status) VALUES ($1, $2, NOW(), 'active')", [cartId, userId]);
    } else {
      cartId = cartRes.rows[0].cart_id;
      await db.query("UPDATE cart SET last_updated = NOW() WHERE cart_id = $1", [cartId]);
    }

    if (quantityToAdd > stock) {
      return res.status(400).json({ error: "Sorry! limited quantity available" });
    }

    if (quantityToAdd !== 0) {
      try {
        await db.query(`
        INSERT INTO cart_item (cart_item_id, cart_id, product_id, quantity) 
        VALUES (
          (SELECT COALESCE(MAX(cart_item_id), 0) + 1 FROM cart_item),
          $1, $2, $3
        )
        ON CONFLICT (cart_id, product_id) 
        DO UPDATE SET quantity = cart_item.quantity + EXCLUDED.quantity
      `, [cartId, product_id, quantityToAdd]);
      } catch (err) {
        if (err.code === '23514') { /* Ignore CHECK constraint */ }
        else throw err;
      }
      
      // Secondary strict validation to prevent over-stock after race-conditions
      const updatedItemRes = await db.query(
        "SELECT quantity, cart_item_id FROM cart_item WHERE cart_id = $1 AND product_id = $2",
        [cartId, product_id]
      );
      if (updatedItemRes.rows.length > 0) {
        const resultQty = updatedItemRes.rows[0].quantity;
        const resultId = updatedItemRes.rows[0].cart_item_id;
        
        if (resultQty <= 0) {
          await db.query("DELETE FROM cart_item WHERE cart_item_id = $1", [resultId]);
        } else if (resultQty > stock) {
          // Revert to max stock if exceeded from concurrent clicks
          await db.query(
            "UPDATE cart_item SET quantity = $1 WHERE cart_item_id = $2",
            [stock, resultId]
          );
        }
      }
    }

    // Return updated cart directly
    const updatedItems = await db.query(`
      SELECT ci.cart_item_id, ci.quantity, p.* 
      FROM cart_item ci
      JOIN product p ON ci.product_id = p.product_id
      WHERE ci.cart_id = $1
    `, [cartId]);

    let subtotal = 0;
    for (const item of updatedItems.rows) {
      subtotal += Number(item.price) * item.quantity;
    }

    res.json({ message: "Cart successfully updated.", cart_id: cartId, items: updatedItems.rows, subtotal, total: subtotal });
  } catch (error) {
    console.error("Cart alteration error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { item_id } = req.params;
    const { quantity } = req.body;

    // Verify item belongs to user's active cart
    const itemRes = await db.query(`
      SELECT ci.*, c.status, p.stock_quantity 
      FROM cart_item ci
      JOIN cart c ON ci.cart_id = c.cart_id
      JOIN product p ON ci.product_id = p.product_id
      WHERE ci.cart_item_id = $1 AND c.user_id = $2 AND c.status = 'active'
    `, [item_id, userId]);

    if (itemRes.rows.length === 0) {
      return res.status(404).json({ error: "Item not found in your active cart" });
    }

    const item = itemRes.rows[0];

    if (quantity <= 0) {
      await db.query("DELETE FROM cart_item WHERE cart_item_id = $1", [item_id]);
    } else {
      if (quantity > item.stock_quantity) {
        return res.status(400).json({ error: "Sorry! limited quantity available" });
      }
      await db.query("UPDATE cart_item SET quantity = $1 WHERE cart_item_id = $2", [quantity, item_id]);
    }

    res.json({ message: "Cart item updated successfully" });
  } catch (error) {
    console.error("Update cart item error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
