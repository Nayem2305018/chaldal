const db = require("../db");

// exports.getDeliveries = async (req, res) => {
//   try {
//     const riderId = req.session.user.id;
    
//     const result = await db.query(`
//       SELECT d.delivery_id, d.order_id, d.status, d.delivery_address 
//       FROM delivery d
//       JOIN rider_ride r ON d.delivery_id = r.delivery_id
//       WHERE r.rider_id = $1
//     `, [riderId]);
    
//     res.json(result.rows);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Failed to fetch deliveries mapping." });
//   }
// };

// exports.updateDeliveryStatus = async (req, res) => {
//   try {
//     const riderId = req.session.user.id;
//     const { id } = req.params;
//     const { status } = req.body;

//     // Enforce isolation protecting assignments
//     const verify = await db.query("SELECT * FROM rider_ride WHERE rider_id = $1 AND delivery_id = $2", [riderId, id]);
//     if (verify.rows.length === 0) {
//       return res.status(403).json({ error: "Unauthorized access protecting deliveries." });
//     }

//     await db.query("UPDATE delivery SET status = $1 WHERE delivery_id = $2", [status, id]);
//     res.json({ message: "Delivery status securely updated." });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Failed to execute delivery update context." });
//   }
// };

exports.getDeliveries = async (req, res) => {
  try {
    const riderId = req.user.id;

    const result = await db.query(`
      SELECT 
        d.delivery_id,
        d.order_id,
        d.delivery_status,
        d.warehouse_id,
        o.delivery_address,
        o.order_status,
        o.payment_status
      FROM delivery d
      JOIN orders o ON d.order_id = o.order_id
      WHERE d.rider_id = $1
      ORDER BY d.assigned_at DESC
    `, [riderId]);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch deliveries" });
  }
};

exports.updateDeliveryStatus = async (req, res) => {
  try {
    const riderId = req.user.id;
    const { id } = req.params; // delivery_id
    const { status } = req.body;

    // Check ownership
    const verify = await db.query(
      "SELECT * FROM delivery WHERE delivery_id = $1 AND rider_id = $2",
      [id, riderId]
    );

    if (verify.rows.length === 0) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    // Update delivery table
    await db.query(
      "UPDATE delivery SET delivery_status = $1 WHERE delivery_id = $2",
      [status, id]
    );

    // ALSO update order status (IMPORTANT 🔥)
    if (status === "delivering") {
      await db.query(
        "UPDATE orders SET order_status = 'delivering' WHERE order_id = (SELECT order_id FROM delivery WHERE delivery_id = $1)",
        [id]
      );
    }

    if (status === "delivered") {
      await db.query(
        `
        UPDATE orders 
        SET order_status = 'delivered',
            payment_status = CASE 
              WHEN payment_status = 'paid' THEN 'paid'
              ELSE 'collected'
            END
        WHERE order_id = (SELECT order_id FROM delivery WHERE delivery_id = $1)
        `,
        [id]
      );

      await db.query(
        "UPDATE delivery SET delivered_at = NOW() WHERE delivery_id = $1",
        [id]
      );
    }

    res.json({ message: "Delivery status updated successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update delivery" });
  }
};
