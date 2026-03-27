// const db = require("../db");

// exports.checkout = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { delivery_address, preferred_delivery_time } = req.body;
    
//     if (!delivery_address) return res.status(400).json({ error: "Delivery address is required" });
//     if (!preferred_delivery_time) return res.status(400).json({ error: "Preferred delivery time is required" });

//     // 1. Get cart securely mapping session user
//     const cartRes = await db.query("SELECT * FROM cart WHERE user_id = $1 AND status = 'active'", [userId]);
//     if (cartRes.rows.length === 0) return res.status(400).json({ error: "No active cart found" });
//     const cartId = cartRes.rows[0].cart_id;

//     // 2. Get cart items
//     const itemsRes = await db.query(`
//       SELECT ci.product_id, ci.quantity, p.price 
//       FROM cart_item ci
//       JOIN product p ON ci.product_id = p.product_id
//       WHERE ci.cart_id = $1
//     `, [cartId]);

//     if (itemsRes.rows.length === 0) return res.status(400).json({ error: "Cart has no items" });

//     // 3. Accumulate subtotal values
//     let total_price = 0;
//     for (const item of itemsRes.rows) {
//       total_price += Number(item.price) * item.quantity;
//     }

//     // 4. Create Order
//     const maxOrderRes = await db.query("SELECT COALESCE(MAX(order_id), 0) + 1 AS next_id FROM orders");
//     const orderId = maxOrderRes.rows[0].next_id;

//     await db.query(
//       "INSERT INTO orders (order_id, user_id, total_price, order_status, payment_status, order_date, delivery_address, preferred_delivery_time) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)",
//       [orderId, userId, total_price, 'pending', 'unpaid', delivery_address, preferred_delivery_time]
//     );

//     // 5. Transfer items to Order Items log
//     const maxOrderItemRes = await db.query("SELECT COALESCE(MAX(order_item_id), 0) AS max_id FROM order_item");
//     let nextOrderItemId = maxOrderItemRes.rows[0].max_id;

//     for (const item of itemsRes.rows) {
//       nextOrderItemId++;
//       const subtotal = Number(item.price) * item.quantity;
//       await db.query(`
//         INSERT INTO order_item (order_item_id, order_id, product_id, quantity, unit_price, subtotal)
//         VALUES ($1, $2, $3, $4, $5, $6)
//       `, [nextOrderItemId, orderId, item.product_id, item.quantity, item.price, subtotal]);
//     }

//     // 6. Mark cart as ordered (do not delete)
//     await db.query("UPDATE cart SET status = 'ordered' WHERE cart_id = $1", [cartId]);

//     res.json({ message: "Checkout successful", order_id: orderId });
//   } catch (error) {
//     console.error("Checkout error:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };

// exports.getMyOrders = async (req, res) => {
//   try {
//     const result = await db.query(`
//       SELECT o.*, 
//         (SELECT json_agg(json_build_object('product_name', p.product_name, 'quantity', oi.quantity, 'unit_price', oi.unit_price)) 
//          FROM order_item oi 
//          JOIN product p ON oi.product_id = p.product_id 
//          WHERE oi.order_id = o.order_id) as items
//       FROM orders o 
//       WHERE user_id = $1 ORDER BY order_date DESC
//     `, [req.user.id]);
//     res.json(result.rows);
//   } catch(e) {
//     res.status(500).json({ error: "Error fetching orders" });
//   }
// };

// exports.getAssignedOrders = async (req, res) => {
//   try {
//     const result = await db.query(`
//       SELECT o.*, d.delivery_id, d.delivery_status, d.warehouse_id,
//         (SELECT json_agg(json_build_object('product_name', p.product_name, 'quantity', oi.quantity, 'unit_price', oi.unit_price)) 
//          FROM order_item oi 
//          JOIN product p ON oi.product_id = p.product_id 
//          WHERE oi.order_id = o.order_id) as items
//       FROM orders o
//       JOIN delivery d ON o.order_id = d.order_id
//       WHERE d.rider_id = $1
//       ORDER BY o.order_date DESC
//     `, [req.user.id]);
//     res.json(result.rows);
//   } catch(e) {
//     res.status(500).json({ error: "Error fetching assigned orders" });
//   }
// }

// exports.getAvailableOrders = async (req, res) => {
//   try {
//     const result = await db.query(`
//       SELECT o.*, 
//         (SELECT json_agg(json_build_object('product_name', p.product_name, 'quantity', oi.quantity, 'unit_price', oi.unit_price)) 
//          FROM order_item oi 
//          JOIN product p ON oi.product_id = p.product_id 
//          WHERE oi.order_id = o.order_id) as items
//       FROM orders o 
//       WHERE order_status = 'pending'
//       ORDER BY order_date DESC
//     `);
//     res.json(result.rows);
//   } catch(e) {
//     res.status(500).json({ error: "Error fetching available orders" });
//   }
// };

// exports.selfAssignOrder = async (req, res) => {
//   try {
//     const { order_id } = req.params;
//     const { warehouse_id } = req.body;
//     const rider_id = req.user.id;
//     const warehouseId = parseInt(warehouse_id);
//     if (!warehouseId || isNaN(warehouseId)) return res.status(400).json({error: "warehouse_id must be a valid number (e.g. 1, 2, 3)"});

//     const orderRes = await db.query("SELECT * FROM orders WHERE order_id = $1 FOR UPDATE", [order_id]);
//     if (orderRes.rows.length === 0) return res.status(404).json({error: "Order not found"});
//     const order = orderRes.rows[0];
    
//     if (order.order_status !== 'pending') {
//       return res.status(400).json({error: "Order already assigned or processed by another rider"});
//     }

//     const delRes = await db.query("SELECT * FROM delivery WHERE order_id = $1", [order_id]);
//     if (delRes.rows.length > 0) return res.status(400).json({error: "Order already assigned to delivery execution"});

//     const maxDelId = await db.query("SELECT COALESCE(MAX(delivery_id), 0) + 1 AS next_id FROM delivery");
//     await db.query(
//       "INSERT INTO delivery (delivery_id, order_id, rider_id, delivery_status, warehouse_id, assigned_at) VALUES ($1, $2, $3, $4, $5, NOW())", 
//       [maxDelId.rows[0].next_id, order_id, rider_id, 'assigned', warehouseId]
//     );

//     await db.query("UPDATE orders SET order_status = 'assigned' WHERE order_id = $1", [order_id]);
//     res.json({ message: "Order assigned successfully to you" });
//   } catch (err) { 
//     console.error(err);
//     res.status(500).json({ error: "Failed to self-assign order" }); 
//   }
// };

// exports.startDelivery = async (req, res) => {
//   try {
//     const { order_id } = req.params;
//     const rider_id = req.user.id;

//     const testQ = await db.query("SELECT * FROM delivery WHERE order_id = $1 AND rider_id = $2", [order_id, rider_id]);
//     if (testQ.rows.length === 0) return res.status(403).json({error: "Order not assigned to you"});

//     await db.query("UPDATE orders SET order_status = 'delivering' WHERE order_id = $1", [order_id]);
//     await db.query("UPDATE delivery SET delivery_status = 'delivering' WHERE order_id = $1", [order_id]);

//     res.json({ message: "Delivery started" });
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({error: "Error starting delivery"});
//   }
// };

// exports.completeDelivery = async (req, res) => {
//   try {
//     const { order_id } = req.params;
//     const rider_id = req.user.id;

//     // Validate assignment
//     const testQ = await db.query("SELECT * FROM delivery WHERE order_id = $1 AND rider_id = $2", [order_id, rider_id]);
//     if (testQ.rows.length === 0) return res.status(403).json({error: "Order not assigned to you"});

//     const orderRes = await db.query("SELECT * FROM orders WHERE order_id = $1", [order_id]);
//     if (orderRes.rows.length === 0) return res.status(404).json({error: "Order not found"});
//     const order = orderRes.rows[0];

//     if (order.order_status !== 'assigned' && order.order_status !== 'delivering') {
//       return res.status(400).json({error: "Cannot complete delivery from current status"});
//     }

//     if (order.payment_status === 'paid') {
//       // Don't modify payment status if already paid by admin (edge case)
//       await db.query("UPDATE orders SET order_status = 'delivered' WHERE order_id = $1", [order_id]);
//     } else {
//       // Rider collects COD cash
//       await db.query("UPDATE orders SET order_status = 'delivered', payment_status = 'collected' WHERE order_id = $1", [order_id]);
//     }

//     await db.query("UPDATE delivery SET delivery_status = 'delivered', delivered_at = NOW() WHERE order_id = $1", [order_id]);

//     res.json({ message: "Delivery completed successfully, cash collected." });
//   } catch (e) {
//     res.status(500).json({error: "Error completing delivery"});
//   }
// };

// exports.confirmPayment = async (req, res) => {
//   try {
//     const { order_id } = req.params;
    
//     const orderRes = await db.query("SELECT * FROM orders WHERE order_id = $1", [order_id]);
//     if (orderRes.rows.length === 0) return res.status(404).json({error: "Order not found"});
//     const order = orderRes.rows[0];

//     if (order.order_status !== 'delivered') {
//       return res.status(400).json({error: "Payment can only be marked paid if order is delivered"});
//     }
//     if (order.payment_status === 'paid') {
//       return res.status(400).json({error: "Payment is already marked as paid"});
//     }

//     await db.query("UPDATE orders SET payment_status = 'paid' WHERE order_id = $1", [order_id]);
    
//     res.json({ message: "Payment confirmed successfully" });
//   } catch (e) {
//     res.status(500).json({error: "Error confirming payment"});
//   }
// };


const db = require("../db");


// ======================= CHECKOUT =======================
exports.checkout = async (req, res) => {
  const client = await db.connect();

  try {
    const userId = req.user.id;
    const { delivery_address, preferred_delivery_time } = req.body;

    if (!delivery_address)
      return res.status(400).json({ error: "Delivery address is required" });

    if (!preferred_delivery_time)
      return res.status(400).json({ error: "Preferred delivery time is required" });

    await client.query("BEGIN");

    // Get active cart
    const cartRes = await client.query(
      "SELECT * FROM cart WHERE user_id = $1 AND status = 'active' FOR UPDATE",
      [userId]
    );

    if (cartRes.rows.length === 0)
      return res.status(400).json({ error: "No active cart found" });

    const cartId = cartRes.rows[0].cart_id;

    // Get cart items + lock the product rows to prevent concurrent overselling
    const itemsRes = await client.query(
      `
      SELECT ci.product_id, ci.quantity, p.price, p.stock_quantity
      FROM cart_item ci
      JOIN product p ON ci.product_id = p.product_id
      WHERE ci.cart_id = $1
      FOR UPDATE OF p
      `,
      [cartId]
    );

    if (itemsRes.rows.length === 0)
      return res.status(400).json({ error: "Cart has no items" });

    // Stock validation
    for (const item of itemsRes.rows) {
      if (item.quantity > item.stock_quantity) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: `Sorry! limited stock for product ${item.product_id}`,
        });
      }
    }

    // Calculate total
    let total_price = 0;
    for (const item of itemsRes.rows) {
      total_price += Number(item.price) * item.quantity;
    }

    // Create order with manual ID handling
    const maxOrderRes = await client.query("SELECT COALESCE(MAX(order_id), 0) + 1 AS next_id FROM orders");
    const orderId = maxOrderRes.rows[0].next_id;

    await client.query(
      `INSERT INTO orders 
      (order_id, user_id, total_price, order_status, payment_status, order_date, delivery_address, preferred_delivery_time) 
      VALUES ($1, $2, $3, 'pending', 'unpaid', NOW(), $4, $5)`,
      [orderId, userId, total_price, delivery_address, preferred_delivery_time]
    ); 
    // Fetch Base Order Item ID
    const maxOrderItemRes = await client.query("SELECT COALESCE(MAX(order_item_id), 0) AS max_id FROM order_item");
    let nextOrderItemId = maxOrderItemRes.rows[0].max_id;

    // Insert order items + reduce stock
    for (const item of itemsRes.rows) {
      nextOrderItemId++;
      const subtotal = Number(item.price) * item.quantity;

      await client.query(
        `
        INSERT INTO order_item (order_item_id, order_id, product_id, quantity, unit_price, subtotal)
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [nextOrderItemId, orderId, item.product_id, item.quantity, item.price, subtotal]
      );

      // Safe atomic stock reduction
      const stockRes = await client.query(
        `
        UPDATE product 
        SET stock_quantity = stock_quantity - $1 
        WHERE product_id = $2 AND stock_quantity >= $1
        `,
        [item.quantity, item.product_id]
      );
      
      if (stockRes.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: `Insufficient stock for product ${item.product_id}`
        });
      }
    }

    // Mark cart as ordered
    await client.query(
      "UPDATE cart SET status = 'ordered' WHERE cart_id = $1",
      [cartId]
    );

    await client.query("COMMIT");

    res.json({
      message: "Your order is on its way!",
      order_id: orderId,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Checkout failed" });
  } finally {
    client.release();
  }
};



// ======================= USER ORDERS =======================
exports.getMyOrders = async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT o.*, 
      (SELECT json_agg(json_build_object(
        'product_name', p.product_name,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price
      ))
      FROM order_item oi
      JOIN product p ON oi.product_id = p.product_id
      WHERE oi.order_id = o.order_id) AS items
      FROM orders o
      WHERE user_id = $1
      ORDER BY order_date DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: "Error fetching orders" });
  }
};



// ======================= RIDER ASSIGNED ORDERS =======================
exports.getAssignedOrders = async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT o.*, d.delivery_id, d.delivery_status, d.warehouse_id,
      (SELECT json_agg(json_build_object(
        'product_name', p.product_name,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price
      ))
      FROM order_item oi
      JOIN product p ON oi.product_id = p.product_id
      WHERE oi.order_id = o.order_id) AS items
      FROM orders o
      JOIN delivery d ON o.order_id = d.order_id
      WHERE d.rider_id = $1
      ORDER BY o.order_date DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: "Error fetching assigned orders" });
  }
};



// ======================= AVAILABLE ORDERS =======================
exports.getAvailableOrders = async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT o.*, 
      (SELECT json_agg(json_build_object(
        'product_name', p.product_name,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price
      ))
      FROM order_item oi
      JOIN product p ON oi.product_id = p.product_id
      WHERE oi.order_id = o.order_id) AS items
      FROM orders o
      WHERE order_status = 'pending'
      AND order_id NOT IN (SELECT order_id FROM delivery)
      ORDER BY order_date DESC
      `
    );

    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: "Error fetching available orders" });
  }
};



// ======================= SELF ASSIGN =======================
exports.selfAssignOrder = async (req, res) => {
  const client = await db.connect();

  try {
    const { order_id } = req.params;
    const { warehouse_id } = req.body;
    const rider_id = req.user.id;

    if (!warehouse_id)
      return res.status(400).json({ error: "warehouse_id required" });

    await client.query("BEGIN");

    const orderRes = await client.query(
      "SELECT * FROM orders WHERE order_id = $1 FOR UPDATE",
      [order_id]
    );

    if (orderRes.rows.length === 0)
      return res.status(404).json({ error: "Order not found" });

    const order = orderRes.rows[0];

    if (order.order_status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Already assigned" });
    }

    // Prevent duplicate assignment
    const check = await client.query(
      "SELECT * FROM delivery WHERE order_id = $1",
      [order_id]
    );

    if (check.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Already assigned" });
    }

    // Fetch manual ID as legacy schema lacks SERIAL sequence
    const maxDelRes = await client.query("SELECT COALESCE(MAX(delivery_id), 0) + 1 AS next_id FROM delivery");
    const next_delivery_id = maxDelRes.rows[0].next_id;

    await client.query(
      `
      INSERT INTO delivery (delivery_id, order_id, rider_id, delivery_status, warehouse_id, assigned_at)
      VALUES ($1, $2, $3, 'assigned', $4, NOW())
      `,
      [next_delivery_id, order_id, rider_id, warehouse_id]
    );

    await client.query(
      "UPDATE orders SET order_status = 'assigned' WHERE order_id = $1",
      [order_id]
    );

    await client.query("COMMIT");

    res.json({ message: "Order assigned successfully" });
  } catch (err) {
    console.error("Assign error details:", err);
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Assignment failed" });
  } finally {
    client.release();
  }
};



// ======================= START DELIVERY =======================
exports.startDelivery = async (req, res) => {
  try {
    const { order_id } = req.params;
    const rider_id = req.user.id;

    const check = await db.query(
      "SELECT * FROM delivery WHERE order_id = $1 AND rider_id = $2",
      [order_id, rider_id]
    );

    if (check.rows.length === 0)
      return res.status(403).json({ error: "Not your order" });

    await db.query(
      "UPDATE orders SET order_status = 'delivering' WHERE order_id = $1",
      [order_id]
    );

    await db.query(
      "UPDATE delivery SET delivery_status = 'delivering' WHERE order_id = $1",
      [order_id]
    );

    res.json({ message: "Delivery started" });
  } catch (e) {
    res.status(500).json({ error: "Error starting delivery" });
  }
};



// ======================= COMPLETE DELIVERY =======================
exports.completeDelivery = async (req, res) => {
  try {
    const { order_id } = req.params;
    const rider_id = req.user.id;

    const check = await db.query(
      "SELECT * FROM delivery WHERE order_id = $1 AND rider_id = $2",
      [order_id, rider_id]
    );

    if (check.rows.length === 0)
      return res.status(403).json({ error: "Not your order" });

    const orderRes = await db.query(
      "SELECT * FROM orders WHERE order_id = $1",
      [order_id]
    );

    const order = orderRes.rows[0];

    if (!["assigned", "delivering"].includes(order.order_status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    await db.query(
      `
      UPDATE orders 
      SET order_status = 'delivered',
          payment_status = CASE 
            WHEN payment_status = 'paid' THEN 'paid'
            ELSE 'collected'
          END
      WHERE order_id = $1
      `,
      [order_id]
    );

    await db.query(
      `
      UPDATE delivery 
      SET delivery_status = 'delivered',
          delivered_at = NOW()
      WHERE order_id = $1
      `,
      [order_id]
    );

    res.json({ message: "Delivery completed, cash collected" });
  } catch (e) {
    res.status(500).json({ error: "Error completing delivery" });
  }
};



// ======================= CONFIRM PAYMENT =======================
exports.confirmPayment = async (req, res) => {
  try {
    const { order_id } = req.params;

    const orderRes = await db.query(
      "SELECT * FROM orders WHERE order_id = $1",
      [order_id]
    );

    const order = orderRes.rows[0];

    if (!order)
      return res.status(404).json({ error: "Order not found" });

    if (order.order_status !== "delivered") {
      return res.status(400).json({
        error: "Must be delivered first",
      });
    }

    if (order.payment_status === "paid") {
      return res.status(400).json({
        error: "Already paid",
      });
    }

    await db.query(
      "UPDATE orders SET payment_status = 'paid' WHERE order_id = $1",
      [order_id]
    );

    res.json({ message: "Payment confirmed" });
  } catch (e) {
    res.status(500).json({ error: "Error confirming payment" });
  }
};