/**
 * Rider Controller
 * Handles rider-specific delivery queries and rider delivery status updates.
 * SQL artifacts: backend/sql/controllers/rider/{queries,functions,procedures,triggers}.sql
 */
const db = require("../db");

const { getSql } = require("../utils/sqlFileLoader");
const SQL = getSql("rider");
exports.getDeliveries = async (req, res) => {
  try {
    const riderId = req.user.id;

    const result = await db.query(
      SQL.q_0001,
      [riderId],
    );

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
      SQL.q_0002,
      [id, riderId],
    );

    if (verify.rows.length === 0) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    // Update delivery table
    await db.query(
      SQL.q_0003,
      [status, id],
    );

    // ALSO update order status (IMPORTANT ðŸ”¥)
    if (status === "delivering") {
      await db.query(
        SQL.q_0004,
        [id],
      );
    }

    if (status === "delivered") {
      await db.query(
        SQL.q_0005,
        [id],
      );

      await db.query(
        SQL.q_0006,
        [id],
      );
    }

    res.json({ message: "Delivery status updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update delivery" });
  }
};
