const db = require("../db");
const bcrypt = require("bcrypt");

// Get all pending rider requests
exports.getRiderRequests = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT request_id, name, email, phone, appointment_code, status, created_at 
       FROM rider_requests 
       WHERE status = 'pending' 
       ORDER BY created_at DESC`,
    );

    res.status(200).json({
      message: "Rider requests retrieved",
      requests: result.rows,
    });
  } catch (error) {
    console.error("Get rider requests error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Approve a rider request
exports.approveRider = async (req, res) => {
  try {
    const { request_id } = req.params;

    if (!request_id) {
      return res.status(400).json({ error: "Request ID is required" });
    }

    // Get rider request details
    const requestResult = await db.query(
      `SELECT * FROM rider_requests WHERE request_id = $1 AND status = 'pending'`,
      [request_id],
    );

    if (requestResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Rider request not found or already processed" });
    }

    const riderRequest = requestResult.rows[0];

    // Get next rider ID
    const nextIdResult = await db.query(
      "SELECT COALESCE(MAX(rider_id), 0) + 1 AS next_id FROM rider",
    );
    const nextRiderId = nextIdResult.rows[0].next_id;

    // Insert into rider table
    const insertRiderQuery = `
      INSERT INTO rider (
        rider_id, 
        rider_name, 
        email, 
        password_hash, 
        phone, 
        appointment_code, 
        current_status, 
        created_at
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, 'available', NOW()) 
      RETURNING rider_id, rider_name, email, phone, current_status
    `;

    const newRider = await db.query(insertRiderQuery, [
      nextRiderId,
      riderRequest.name,
      riderRequest.email,
      riderRequest.password_hash,
      riderRequest.phone,
      riderRequest.appointment_code,
    ]);

    // Update rider request status to approved
    await db.query(
      `UPDATE rider_requests 
       SET status = 'approved', reviewed_at = NOW(), reviewed_by = $1 
       WHERE request_id = $2`,
      [req.user.id, request_id],
    );

    res.status(200).json({
      message: "Rider approved successfully",
      rider: newRider.rows[0],
    });
  } catch (error) {
    console.error("Approve rider error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Reject a rider request
exports.rejectRider = async (req, res) => {
  try {
    const { request_id } = req.params;
    const { reason } = req.body;

    if (!request_id) {
      return res.status(400).json({ error: "Request ID is required" });
    }

    // Update rider request status to rejected
    const result = await db.query(
      `UPDATE rider_requests 
       SET status = 'rejected', reviewed_at = NOW(), reviewed_by = $1 
       WHERE request_id = $2 AND status = 'pending'
       RETURNING request_id, name, email, status`,
      [req.user.id, request_id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Rider request not found or already processed" });
    }

    res.status(200).json({
      message: "Rider request rejected successfully",
      request: result.rows[0],
    });
  } catch (error) {
    console.error("Reject rider error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get all riders (approved)
exports.getAllRiders = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT rider_id, rider_name, email, phone, current_status, created_at 
       FROM rider 
       ORDER BY created_at DESC`,
    );

    res.status(200).json({
      message: "Riders retrieved",
      riders: result.rows,
    });
  } catch (error) {
    console.error("Get riders error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT user_id, name, email, phone, created_at 
       FROM users 
       ORDER BY created_at DESC`,
    );

    res.status(200).json({
      message: "Users retrieved",
      users: result.rows,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Update rider status
exports.updateRiderStatus = async (req, res) => {
  try {
    const { rider_id } = req.params;
    const { status } = req.body;

    if (!rider_id || !status) {
      return res
        .status(400)
        .json({ error: "Rider ID and status are required" });
    }

    const validStatuses = ["available", "on_delivery", "offline"];

    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ error: `Status must be one of: ${validStatuses.join(", ")}` });
    }

    const result = await db.query(
      `UPDATE rider 
       SET current_status = $1 
       WHERE rider_id = $2 
       RETURNING rider_id, rider_name, email, current_status`,
      [status, rider_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Rider not found" });
    }

    res.status(200).json({
      message: "Rider status updated",
      rider: result.rows[0],
    });
  } catch (error) {
    console.error("Update rider status error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const usersCount = await db.query("SELECT COUNT(*) as count FROM users");
    const ridersCount = await db.query("SELECT COUNT(*) as count FROM rider");
    const pendingRequests = await db.query(
      "SELECT COUNT(*) as count FROM rider_requests WHERE status = 'pending'",
    );
    const ordersCount = await db.query(
      "SELECT COUNT(*) as count FROM orders",
    );
    const revenueRes = await db.query(`
      SELECT COALESCE(SUM(total_price), 0) AS revenue
      FROM orders
      WHERE order_status = 'delivered'
    `);

    res.status(200).json({
      stats: {
        totalUsers: parseInt(usersCount.rows[0].count),
        totalRiders: parseInt(ridersCount.rows[0].count),
        pendingRiderRequests: parseInt(pendingRequests.rows[0].count),
        totalOrders: parseInt(ordersCount.rows[0].count),
        totalRevenue: parseFloat(revenueRes.rows[0].revenue),
      },
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
exports.createProduct = async (req, res) => {
  try {
    const { product_name, price, stock_quantity, category_id, photourl } =
      req.body;
    const resultId = await db.query(
      "SELECT COALESCE(MAX(product_id), 0) + 1 AS next_id FROM product",
    );
    await db.query(
      "INSERT INTO product (product_id, product_name, price, stock_quantity, category_id, photourl) VALUES ($1, $2, $3, $4, $5, $6)",
      [
        resultId.rows[0].next_id,
        product_name,
        price,
        stock_quantity || 0,
        category_id,
        photourl || "",
      ],
    );
    res.json({ message: "Product created successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to create product" });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { product_name, price, stock_quantity, category_id, photourl } =
      req.body;
    await db.query(
      "UPDATE product SET product_name = COALESCE($1, product_name), price = COALESCE($2, price), stock_quantity = COALESCE($3, stock_quantity), category_id = COALESCE($4, category_id), photourl = COALESCE($5, photourl) WHERE product_id = $6",
      [
        product_name,
        price,
        stock_quantity,
        category_id,
        photourl,
        req.params.id,
      ],
    );
    res.json({ message: "Product updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update product" });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    await db.query("DELETE FROM product WHERE product_id = $1", [
      req.params.id,
    ]);
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product" });
  }
};

// Orders Management
exports.getOrders = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT o.*, d.rider_id, d.warehouse_id, d.delivery_status 
      FROM orders o 
      LEFT JOIN delivery d ON o.order_id = d.order_id 
      ORDER BY o.order_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    await db.query("UPDATE orders SET order_status = $1 WHERE order_id = $2", [
      req.body.status,
      req.params.id,
    ]);
    res.json({ message: "Order updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update order status" });
  }
};

exports.assignRider = async (req, res) => {
  try {
    const { order_id, rider_id } = req.body;
    // Step 1: Push a delivery request explicitly bound to the specific order mapping natively matching database IDs dynamically.
    const deliveryInsert = await db.query(
      "INSERT INTO delivery (order_id, status) VALUES ($1, $2) RETURNING delivery_id",
      [order_id, "Assigned to Rider"],
    );
    // Step 2: Establish Rider relation binding assignments formally natively mapping constraints securely to avoid collisions dynamically globally.
    await db.query(
      "INSERT INTO rider_ride (rider_id, delivery_id) VALUES ($1, $2)",
      [rider_id, deliveryInsert.rows[0].delivery_id],
    );
    res.json({ message: "Rider assigned and scheduled successfully" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Failed to bind Rider Assignment properly!" });
  }
};

// Vouchers Management
exports.createVoucher = async (req, res) => {
  try {
    const { code, discount_amount, expiry_date, is_active } = req.body;
    const maxId = await db.query(
      "SELECT COALESCE(MAX(voucher_id), 0) + 1 AS next_id FROM voucher",
    );
    await db.query(
      "INSERT INTO voucher (voucher_id, code, discount_amount, expiry_date, is_active) VALUES ($1, $2, $3, $4, $5)",
      [
        maxId.rows[0].next_id,
        code,
        discount_amount,
        expiry_date || null,
        is_active !== false,
      ],
    );
    res.json({ message: "Voucher generated securely" });
  } catch (err) {
    res.status(500).json({ error: "Failed to construct voucher natively" });
  }
};
