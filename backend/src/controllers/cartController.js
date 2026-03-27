const db = require("../db");

let cartPricingColumnsReady = false;

const ensureCartPricingColumns = async () => {
  if (cartPricingColumnsReady) {
    return;
  }

  await db.query(
    "ALTER TABLE cart_item ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2)",
  );
  await db.query(
    "ALTER TABLE cart_item ADD COLUMN IF NOT EXISTS line_total NUMERIC(12,2)",
  );

  cartPricingColumnsReady = true;
};

exports.getCart = async (req, res) => {
  try {
    await ensureCartPricingColumns();

    const userId = req.user.id;

    // Get active cart
    const cartRes = await db.query(
      "SELECT * FROM cart WHERE user_id = $1 AND status = 'active'",
      [userId],
    );
    let cartId = null;

    if (cartRes.rows.length === 0) {
      // Create new active cart (No longer automatically created on getCart, but we can do it if needed. Actually prompt says: "Do not create a cart on login; create on first add-to-cart action". So if getCart runs and no active cart, just return empty items.)
      return res.json({ cart_id: null, items: [], subtotal: 0, total: 0 });
    } else {
      cartId = cartRes.rows[0].cart_id;
    }

    // Get cart items with saved unit prices (if present)
    const itemsRes = await db.query(
      `
      SELECT 
        ci.cart_item_id,
        ci.product_id,
        ci.quantity,
        p.product_name,
        p.photourl,
        p.unit,
        COALESCE(ci.unit_price, p.price) AS price,
        COALESCE(ci.line_total, ci.quantity * COALESCE(ci.unit_price, p.price)) AS line_total
      FROM cart_item ci
      JOIN product p ON ci.product_id = p.product_id
      WHERE ci.cart_id = $1
    `,
      [cartId],
    );

    let subtotal = 0;
    for (const item of itemsRes.rows) {
      subtotal += Number(item.line_total);
    }

    res.json({
      cart_id: cartId,
      items: itemsRes.rows,
      subtotal,
      total: subtotal,
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.addToCart = async (req, res) => {
  try {
    await ensureCartPricingColumns();

    const userId = req.user.id;
    const { product_id } = req.params;
    const quantityToAdd = Number(req.body.quantity || 1);

    if (Number.isNaN(quantityToAdd) || quantityToAdd === 0) {
      return res
        .status(400)
        .json({ error: "Quantity must be a non-zero number" });
    }

    // Identify/create cart context
    let cartRes = await db.query(
      "SELECT cart_id FROM cart WHERE user_id = $1 AND status = 'active'",
      [userId],
    );
    let cartId;
    if (cartRes.rows.length === 0) {
      const maxIdRes = await db.query(
        "SELECT COALESCE(MAX(cart_id), 0) + 1 AS next_id FROM cart",
      );
      cartId = maxIdRes.rows[0].next_id;
      await db.query(
        "INSERT INTO cart (cart_id, user_id, last_updated, status) VALUES ($1, $2, NOW(), 'active')",
        [cartId, userId],
      );
    } else {
      cartId = cartRes.rows[0].cart_id;
      await db.query(
        "UPDATE cart SET last_updated = NOW() WHERE cart_id = $1",
        [cartId],
      );
    }

    const existingItemRes = await db.query(
      "SELECT cart_item_id, quantity, unit_price FROM cart_item WHERE cart_id = $1 AND product_id = $2",
      [cartId, product_id],
    );

    if (existingItemRes.rows.length > 0) {
      // Reuse previously saved unit_price and only fetch stock for validation.
      const existingItem = existingItemRes.rows[0];
      const stockRes = await db.query(
        "SELECT stock_quantity FROM product WHERE product_id = $1",
        [product_id],
      );

      if (stockRes.rows.length === 0) {
        return res.status(404).json({ error: "Product not found" });
      }

      const stock = Number(stockRes.rows[0].stock_quantity);
      const newQuantity = Number(existingItem.quantity) + quantityToAdd;

      if (newQuantity > stock) {
        return res
          .status(400)
          .json({ error: "Sorry! limited quantity available" });
      }

      if (newQuantity <= 0) {
        await db.query("DELETE FROM cart_item WHERE cart_item_id = $1", [
          existingItem.cart_item_id,
        ]);
      } else {
        let unitPrice = existingItem.unit_price;

        if (unitPrice === null || unitPrice === undefined) {
          const priceRes = await db.query(
            "SELECT price FROM product WHERE product_id = $1",
            [product_id],
          );
          unitPrice = Number(priceRes.rows[0]?.price || 0);
        } else {
          unitPrice = Number(unitPrice);
        }

        const lineTotal = Number((newQuantity * unitPrice).toFixed(2));

        await db.query(
          `
          UPDATE cart_item
          SET quantity = $1,
              unit_price = $2,
              line_total = $3
          WHERE cart_item_id = $4
          `,
          [newQuantity, unitPrice, lineTotal, existingItem.cart_item_id],
        );
      }
    } else {
      if (quantityToAdd < 0) {
        return res
          .status(400)
          .json({ error: "Cannot reduce quantity for non-existing cart item" });
      }

      // First add: fetch price once and save snapshot amount in cart_item.unit_price.
      const prodRes = await db.query(
        "SELECT stock_quantity, price FROM product WHERE product_id = $1",
        [product_id],
      );

      if (prodRes.rows.length === 0) {
        return res.status(404).json({ error: "Product not found" });
      }

      const stock = Number(prodRes.rows[0].stock_quantity);
      const unitPrice = Number(prodRes.rows[0].price);
      const lineTotal = Number((quantityToAdd * unitPrice).toFixed(2));

      if (quantityToAdd > stock) {
        return res
          .status(400)
          .json({ error: "Sorry! limited quantity available" });
      }

      await db.query(
        `
        INSERT INTO cart_item (cart_item_id, cart_id, product_id, quantity, unit_price, line_total)
        VALUES (
          (SELECT COALESCE(MAX(cart_item_id), 0) + 1 FROM cart_item),
          $1,
          $2,
          $3,
          $4,
          $5
        )
        `,
        [cartId, product_id, quantityToAdd, unitPrice, lineTotal],
      );
    }

    // Return updated cart directly
    const updatedItems = await db.query(
      `
      SELECT 
        ci.cart_item_id,
        ci.product_id,
        ci.quantity,
        p.product_name,
        p.photourl,
        p.unit,
        COALESCE(ci.unit_price, p.price) AS price,
        COALESCE(ci.line_total, ci.quantity * COALESCE(ci.unit_price, p.price)) AS line_total
      FROM cart_item ci
      JOIN product p ON ci.product_id = p.product_id
      WHERE ci.cart_id = $1
    `,
      [cartId],
    );

    let subtotal = 0;
    for (const item of updatedItems.rows) {
      subtotal += Number(item.line_total);
    }

    res.json({
      message: "Cart successfully updated.",
      cart_id: cartId,
      items: updatedItems.rows,
      subtotal,
      total: subtotal,
    });
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
    const itemRes = await db.query(
      `
      SELECT ci.*, c.status, p.stock_quantity, p.price 
      FROM cart_item ci
      JOIN cart c ON ci.cart_id = c.cart_id
      JOIN product p ON ci.product_id = p.product_id
      WHERE ci.cart_item_id = $1 AND c.user_id = $2 AND c.status = 'active'
    `,
      [item_id, userId],
    );

    if (itemRes.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Item not found in your active cart" });
    }

    const item = itemRes.rows[0];

    if (quantity <= 0) {
      await db.query("DELETE FROM cart_item WHERE cart_item_id = $1", [
        item_id,
      ]);
    } else {
      if (quantity > item.stock_quantity) {
        return res
          .status(400)
          .json({ error: "Sorry! limited quantity available" });
      }

      const basePrice = Number(item.unit_price ?? item.price ?? 0);
      const lineTotal = Number((Number(quantity) * basePrice).toFixed(2));

      await db.query(
        "UPDATE cart_item SET quantity = $1, unit_price = $2, line_total = $3 WHERE cart_item_id = $4",
        [quantity, basePrice, lineTotal, item_id],
      );
    }

    res.json({ message: "Cart item updated successfully" });
  } catch (error) {
    console.error("Update cart item error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
