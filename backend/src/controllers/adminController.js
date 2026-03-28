/**
 * Admin Controller
 * Handles admin dashboards, rider approvals, inventory updates, offers, and order management.
 */
const db = require("../db");
const bcrypt = require("bcrypt");
const {
  ensureOfferSchema,
  normalizeVoucherCode,
  roundMoney,
} = require("../utils/offerService");

let paymentConfirmationTableReady = false;
let warehouseInventorySchemaReady = false;

const OFFER_DISCOUNT_TYPES = ["percentage", "fixed_amount"];

const parseOptionalDate = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const buildVoucherPayload = (input, existing = null) => {
  const source = {
    code: input.code ?? existing?.code,
    discount_type: input.discount_type ?? existing?.discount_type,
    discount_value: input.discount_value ?? existing?.discount_value,
    min_order_amount: input.min_order_amount ?? existing?.min_order_amount ?? 0,
    max_discount_amount:
      input.max_discount_amount ?? existing?.max_discount_amount ?? null,
    usage_limit_per_user:
      input.usage_limit_per_user ?? existing?.usage_limit_per_user ?? 1,
    start_at: input.start_at ?? existing?.start_at ?? null,
    end_at: input.end_at ?? existing?.end_at ?? null,
    is_active:
      input.is_active === undefined
        ? (existing?.is_active ?? true)
        : Boolean(input.is_active),
  };

  const code = normalizeVoucherCode(source.code);
  if (!code) {
    return { error: "Voucher code is required" };
  }

  const discountType = String(source.discount_type || "").trim();
  if (!OFFER_DISCOUNT_TYPES.includes(discountType)) {
    return { error: "discount_type must be either percentage or fixed_amount" };
  }

  const discountValue = Number(source.discount_value);
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return { error: "discount_value must be a positive number" };
  }

  if (discountType === "percentage" && discountValue > 100) {
    return { error: "Percentage voucher discount cannot exceed 100" };
  }

  const minOrderAmount = Number(source.min_order_amount || 0);
  if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0) {
    return { error: "min_order_amount must be zero or a positive number" };
  }

  const usageLimitPerUser = Number(source.usage_limit_per_user || 0);
  if (!Number.isInteger(usageLimitPerUser) || usageLimitPerUser <= 0) {
    return { error: "usage_limit_per_user must be a positive integer" };
  }

  let maxDiscountAmount = null;
  if (
    source.max_discount_amount !== null &&
    source.max_discount_amount !== undefined &&
    source.max_discount_amount !== ""
  ) {
    maxDiscountAmount = Number(source.max_discount_amount);
    if (!Number.isFinite(maxDiscountAmount) || maxDiscountAmount <= 0) {
      return { error: "max_discount_amount must be a positive number" };
    }
  }

  const startAt = parseOptionalDate(source.start_at);
  if (
    source.start_at !== null &&
    source.start_at !== undefined &&
    source.start_at !== "" &&
    !startAt
  ) {
    return { error: "start_at must be a valid datetime" };
  }

  const endAt = parseOptionalDate(source.end_at);
  if (
    source.end_at !== null &&
    source.end_at !== undefined &&
    source.end_at !== "" &&
    !endAt
  ) {
    return { error: "end_at must be a valid datetime" };
  }

  if (startAt && endAt && endAt < startAt) {
    return { error: "end_at must be greater than or equal to start_at" };
  }

  return {
    payload: {
      code,
      discount_type: discountType,
      discount_value: roundMoney(discountValue),
      min_order_amount: roundMoney(minOrderAmount),
      max_discount_amount:
        maxDiscountAmount === null ? null : roundMoney(maxDiscountAmount),
      usage_limit_per_user: usageLimitPerUser,
      start_at: startAt,
      end_at: endAt,
      is_active: Boolean(source.is_active),
    },
  };
};

const buildProductDiscountPayload = (input, existing = null) => {
  const source = {
    product_id: input.product_id ?? existing?.product_id,
    discount_type: input.discount_type ?? existing?.discount_type,
    discount_value: input.discount_value ?? existing?.discount_value,
    max_discount_amount:
      input.max_discount_amount ?? existing?.max_discount_amount ?? null,
    start_at: input.start_at ?? existing?.start_at ?? null,
    end_at: input.end_at ?? existing?.end_at ?? null,
    is_active:
      input.is_active === undefined
        ? (existing?.is_active ?? true)
        : Boolean(input.is_active),
  };

  const productId = Number(source.product_id);
  if (!Number.isInteger(productId) || productId <= 0) {
    return { error: "product_id must be a positive integer" };
  }

  const discountType = String(source.discount_type || "").trim();
  if (!OFFER_DISCOUNT_TYPES.includes(discountType)) {
    return { error: "discount_type must be either percentage or fixed_amount" };
  }

  const discountValue = Number(source.discount_value);
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return { error: "discount_value must be a positive number" };
  }

  if (discountType === "percentage" && discountValue > 100) {
    return { error: "Percentage product discount cannot exceed 100" };
  }

  let maxDiscountAmount = null;
  if (
    source.max_discount_amount !== null &&
    source.max_discount_amount !== undefined &&
    source.max_discount_amount !== ""
  ) {
    maxDiscountAmount = Number(source.max_discount_amount);
    if (!Number.isFinite(maxDiscountAmount) || maxDiscountAmount <= 0) {
      return { error: "max_discount_amount must be a positive number" };
    }
  }

  const startAt = parseOptionalDate(source.start_at);
  if (
    source.start_at !== null &&
    source.start_at !== undefined &&
    source.start_at !== "" &&
    !startAt
  ) {
    return { error: "start_at must be a valid datetime" };
  }

  const endAt = parseOptionalDate(source.end_at);
  if (
    source.end_at !== null &&
    source.end_at !== undefined &&
    source.end_at !== "" &&
    !endAt
  ) {
    return { error: "end_at must be a valid datetime" };
  }

  if (startAt && endAt && endAt < startAt) {
    return { error: "end_at must be greater than or equal to start_at" };
  }

  return {
    payload: {
      product_id: productId,
      discount_type: discountType,
      discount_value: roundMoney(discountValue),
      max_discount_amount:
        maxDiscountAmount === null ? null : roundMoney(maxDiscountAmount),
      start_at: startAt,
      end_at: endAt,
      is_active: Boolean(source.is_active),
    },
  };
};

const ensurePaymentConfirmationTable = async () => {
  if (paymentConfirmationTableReady) {
    return;
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS rider_payment_confirmation (
      order_id INT PRIMARY KEY REFERENCES orders(order_id) ON DELETE CASCADE,
      rider_id INT NOT NULL REFERENCES rider(rider_id),
      rider_message TEXT NOT NULL,
      sent_at TIMESTAMP DEFAULT NOW(),
      admin_confirmed_at TIMESTAMP,
      admin_confirmed_by INT REFERENCES admin(admin_id)
    )
  `);

  paymentConfirmationTableReady = true;
};

const ensureWarehouseInventorySchema = async () => {
  if (warehouseInventorySchemaReady) {
    return;
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS delivery_inventory_allocation (
      allocation_id SERIAL PRIMARY KEY,
      delivery_id INT NOT NULL REFERENCES delivery(delivery_id) ON DELETE CASCADE,
      order_id INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
      product_id INT NOT NULL REFERENCES product(product_id),
      warehouse_id INT NOT NULL REFERENCES warehouse(warehouse_id),
      allocated_quantity INT NOT NULL CHECK (allocated_quantity > 0),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.query(
    "CREATE UNIQUE INDEX IF NOT EXISTS ux_inventory_product_warehouse ON inventory(product_id, warehouse_id)",
  );

  await db.query(`
    INSERT INTO warehouse (warehouse_id, name, location)
    VALUES
      (1, 'Warehouse 1', 'Main Hub 1'),
      (2, 'Warehouse 2', 'Main Hub 2'),
      (3, 'Warehouse 3', 'Main Hub 3')
    ON CONFLICT (warehouse_id) DO NOTHING
  `);

  try {
    const missingInventoryRows = await db.query(`
      SELECT p.product_id, COALESCE(p.stock_quantity, 0)::INT AS stock_quantity
      FROM product p
      LEFT JOIN inventory i ON i.product_id = p.product_id
      GROUP BY p.product_id, p.stock_quantity
      HAVING COUNT(i.inventory_id) = 0
    `);

    for (const row of missingInventoryRows.rows) {
      const initialStock = Number(row.stock_quantity || 0);
      if (initialStock <= 0) continue;

      await db.query(
        `
        INSERT INTO inventory (inventory_id, product_id, warehouse_id, stock_quantity, last_updated)
        VALUES (
          (SELECT COALESCE(MAX(inventory_id), 0) + 1 FROM inventory),
          $1,
          1,
          $2,
          NOW()
        )
        ON CONFLICT (product_id, warehouse_id)
        DO NOTHING
        `,
        [row.product_id, initialStock],
      );
    }
  } catch (error) {
    if (error.code !== "42703") {
      throw error;
    }
  }

  warehouseInventorySchemaReady = true;
};

const syncProductStockTotal = async (productId) => {
  try {
    await db.query(
      `
      UPDATE product
      SET stock_quantity = (
        SELECT COALESCE(SUM(stock_quantity), 0)
        FROM inventory
        WHERE product_id = $1
      )
      WHERE product_id = $1
      `,
      [productId],
    );
  } catch (error) {
    if (error.code !== "42703") {
      throw error;
    }
  }
};

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
    const ordersCount = await db.query("SELECT COUNT(*) as count FROM orders");
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
    await ensurePaymentConfirmationTable();
    await ensureWarehouseInventorySchema();

    const result = await db.query(`
      SELECT 
        o.*, 
        d.rider_id, 
        d.warehouse_id, 
        d.delivery_status,
        rpc.rider_message AS rider_payment_message,
        rpc.sent_at AS rider_payment_sent_at,
        rpc.admin_confirmed_at,
        rpc.admin_confirmed_by,
        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'warehouse_id', dia.warehouse_id,
                'product_id', dia.product_id,
                'product_name', p2.product_name,
                'allocated_quantity', dia.allocated_quantity
              )
              ORDER BY dia.warehouse_id, dia.product_id
            ),
            '[]'::json
          )
          FROM delivery_inventory_allocation dia
          JOIN product p2 ON p2.product_id = dia.product_id
          WHERE dia.order_id = o.order_id
        ) AS warehouse_allocations,
        (
          SELECT json_agg(
            json_build_object(
              'product_name', p.product_name,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price
            )
          )
          FROM order_item oi
          JOIN product p ON oi.product_id = p.product_id
          WHERE oi.order_id = o.order_id
        ) AS items
      FROM orders o 
      LEFT JOIN delivery d ON o.order_id = d.order_id 
      LEFT JOIN rider_payment_confirmation rpc ON rpc.order_id = o.order_id
      ORDER BY o.order_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Get orders error:", err);
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

exports.getInventorySummary = async (req, res) => {
  try {
    await ensureWarehouseInventorySchema();

    const productsRes = await db.query(`
      SELECT
        p.product_id,
        p.product_name,
        p.price,
        COALESCE(SUM(i.stock_quantity), 0)::INT AS total_stock,
        COALESCE(
          json_agg(
            json_build_object(
              'warehouse_id', w.warehouse_id,
              'warehouse_name', w.name,
              'stock_quantity', COALESCE(i.stock_quantity, 0)::INT
            )
            ORDER BY w.warehouse_id
          ) FILTER (WHERE w.warehouse_id IS NOT NULL),
          '[]'::json
        ) AS warehouses
      FROM product p
      CROSS JOIN warehouse w
      LEFT JOIN inventory i
        ON i.product_id = p.product_id
       AND i.warehouse_id = w.warehouse_id
      GROUP BY p.product_id, p.product_name, p.price
      ORDER BY p.product_id
    `);

    const warehouseTotalsRes = await db.query(`
      SELECT
        w.warehouse_id,
        w.name AS warehouse_name,
        COALESCE(SUM(i.stock_quantity), 0)::INT AS total_stock
      FROM warehouse w
      LEFT JOIN inventory i ON i.warehouse_id = w.warehouse_id
      GROUP BY w.warehouse_id, w.name
      ORDER BY w.warehouse_id
    `);

    const overallTotalStock = warehouseTotalsRes.rows.reduce(
      (sum, row) => sum + Number(row.total_stock),
      0,
    );

    res.json({
      products: productsRes.rows,
      warehouses: warehouseTotalsRes.rows,
      overall_total_stock: overallTotalStock,
    });
  } catch (error) {
    console.error("Get inventory summary error:", error);
    res.status(500).json({ error: "Failed to fetch inventory summary" });
  }
};

exports.updateInventoryStock = async (req, res) => {
  try {
    await ensureWarehouseInventorySchema();

    const productId = Number(req.params.product_id);
    const warehouseId = Number(req.params.warehouse_id);
    const stockQuantity = Number(req.body.stock_quantity);

    if (!Number.isInteger(productId) || !Number.isInteger(warehouseId)) {
      return res.status(400).json({
        error: "product_id and warehouse_id must be valid integers",
      });
    }

    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      return res.status(400).json({
        error: "stock_quantity must be a non-negative integer",
      });
    }

    const productRes = await db.query(
      "SELECT product_id FROM product WHERE product_id = $1",
      [productId],
    );

    if (productRes.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const warehouseRes = await db.query(
      "SELECT warehouse_id FROM warehouse WHERE warehouse_id = $1",
      [warehouseId],
    );

    if (warehouseRes.rows.length === 0) {
      return res.status(404).json({ error: "Warehouse not found" });
    }

    await db.query(
      `
      INSERT INTO inventory (inventory_id, product_id, warehouse_id, last_updated, stock_quantity)
      VALUES (
        (SELECT COALESCE(MAX(inventory_id), 0) + 1 FROM inventory),
        $1,
        $2,
        NOW(),
        $3
      )
      ON CONFLICT (product_id, warehouse_id)
      DO UPDATE
      SET stock_quantity = EXCLUDED.stock_quantity,
          last_updated = NOW()
      `,
      [productId, warehouseId, stockQuantity],
    );

    await syncProductStockTotal(productId);

    res.json({ message: "Inventory stock updated successfully" });
  } catch (error) {
    console.error("Update inventory stock error:", error);
    res.status(500).json({ error: "Failed to update inventory stock" });
  }
};

exports.confirmPayment = async (req, res) => {
  try {
    const orderId = req.params.id;

    await ensurePaymentConfirmationTable();

    const orderRes = await db.query(
      "SELECT * FROM orders WHERE order_id = $1",
      [orderId],
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orderRes.rows[0];

    if (order.order_status !== "delivered") {
      return res.status(400).json({
        error: "Payment can only be confirmed for delivered orders",
      });
    }

    if (order.payment_status === "paid") {
      return res.status(400).json({ error: "Payment already confirmed" });
    }

    const paymentConfirmationRes = await db.query(
      "SELECT order_id FROM rider_payment_confirmation WHERE order_id = $1",
      [orderId],
    );

    if (paymentConfirmationRes.rows.length === 0) {
      return res.status(400).json({
        error: "Rider payment confirmation message is required first",
      });
    }

    await db.query(
      "UPDATE orders SET payment_status = 'paid' WHERE order_id = $1",
      [orderId],
    );

    await db.query(
      `
      UPDATE rider_payment_confirmation
      SET admin_confirmed_at = NOW(),
          admin_confirmed_by = $2
      WHERE order_id = $1
      `,
      [orderId, req.user.id],
    );

    res.json({ message: "Payment confirmed" });
  } catch (err) {
    console.error("Confirm payment error:", err);
    res.status(500).json({ error: "Failed to confirm payment" });
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

// Offer and Discount Management
exports.createVoucherOffer = async (req, res) => {
  try {
    await ensureOfferSchema(db);

    const { payload, error } = buildVoucherPayload(req.body);
    if (error) {
      return res.status(400).json({ error });
    }

    const duplicateRes = await db.query(
      "SELECT voucher_id FROM vouchers WHERE UPPER(code) = UPPER($1)",
      [payload.code],
    );

    if (duplicateRes.rows.length > 0) {
      return res.status(409).json({ error: "Voucher code already exists" });
    }

    const maxIdRes = await db.query(
      "SELECT COALESCE(MAX(voucher_id), 0) + 1 AS next_id FROM vouchers",
    );
    const voucherId = Number(maxIdRes.rows[0].next_id);

    const insertRes = await db.query(
      `
      INSERT INTO vouchers (
        voucher_id,
        code,
        discount_type,
        discount_value,
        min_order_amount,
        max_discount_amount,
        usage_limit_per_user,
        start_at,
        end_at,
        is_active,
        created_by_admin,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
      `,
      [
        voucherId,
        payload.code,
        payload.discount_type,
        payload.discount_value,
        payload.min_order_amount,
        payload.max_discount_amount,
        payload.usage_limit_per_user,
        payload.start_at,
        payload.end_at,
        payload.is_active,
        req.user.id,
      ],
    );

    return res.status(201).json({
      message: "Voucher created successfully",
      voucher: insertRes.rows[0],
    });
  } catch (error) {
    console.error("Create voucher offer error:", error);
    return res.status(500).json({ error: "Failed to create voucher" });
  }
};

exports.getVoucherOffers = async (req, res) => {
  try {
    await ensureOfferSchema(db);

    const result = await db.query(`
      SELECT
        v.*,
        COALESCE(COUNT(vuh.usage_id), 0)::INT AS usage_count_total,
        CASE
          WHEN v.is_active = FALSE THEN FALSE
          WHEN v.start_at IS NOT NULL AND v.start_at > NOW() THEN FALSE
          WHEN v.end_at IS NOT NULL AND v.end_at < NOW() THEN FALSE
          ELSE TRUE
        END AS currently_applicable
      FROM vouchers v
      LEFT JOIN voucher_usage_history vuh ON vuh.voucher_id = v.voucher_id
      GROUP BY v.voucher_id
      ORDER BY v.created_at DESC, v.voucher_id DESC
    `);

    return res.json({ vouchers: result.rows });
  } catch (error) {
    console.error("Get voucher offers error:", error);
    return res.status(500).json({ error: "Failed to fetch vouchers" });
  }
};

exports.updateVoucherOffer = async (req, res) => {
  try {
    await ensureOfferSchema(db);

    const voucherId = Number(req.params.voucher_id);
    if (!Number.isInteger(voucherId) || voucherId <= 0) {
      return res.status(400).json({ error: "Invalid voucher_id" });
    }

    const existingRes = await db.query(
      "SELECT * FROM vouchers WHERE voucher_id = $1",
      [voucherId],
    );

    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: "Voucher not found" });
    }

    const { payload, error } = buildVoucherPayload(
      req.body,
      existingRes.rows[0],
    );
    if (error) {
      return res.status(400).json({ error });
    }

    const duplicateRes = await db.query(
      "SELECT voucher_id FROM vouchers WHERE UPPER(code) = UPPER($1) AND voucher_id <> $2",
      [payload.code, voucherId],
    );

    if (duplicateRes.rows.length > 0) {
      return res.status(409).json({ error: "Voucher code already exists" });
    }

    const updateRes = await db.query(
      `
      UPDATE vouchers
      SET
        code = $1,
        discount_type = $2,
        discount_value = $3,
        min_order_amount = $4,
        max_discount_amount = $5,
        usage_limit_per_user = $6,
        start_at = $7,
        end_at = $8,
        is_active = $9,
        updated_at = NOW()
      WHERE voucher_id = $10
      RETURNING *
      `,
      [
        payload.code,
        payload.discount_type,
        payload.discount_value,
        payload.min_order_amount,
        payload.max_discount_amount,
        payload.usage_limit_per_user,
        payload.start_at,
        payload.end_at,
        payload.is_active,
        voucherId,
      ],
    );

    return res.json({
      message: "Voucher updated successfully",
      voucher: updateRes.rows[0],
    });
  } catch (error) {
    console.error("Update voucher offer error:", error);
    return res.status(500).json({ error: "Failed to update voucher" });
  }
};

exports.setVoucherOfferActive = async (req, res) => {
  try {
    await ensureOfferSchema(db);

    const voucherId = Number(req.params.voucher_id);
    const isActive = req.body?.is_active;

    if (!Number.isInteger(voucherId) || voucherId <= 0) {
      return res.status(400).json({ error: "Invalid voucher_id" });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ error: "is_active must be true or false" });
    }

    const updateRes = await db.query(
      `
      UPDATE vouchers
      SET is_active = $1,
          updated_at = NOW()
      WHERE voucher_id = $2
      RETURNING *
      `,
      [isActive, voucherId],
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: "Voucher not found" });
    }

    return res.json({
      message: `Voucher ${isActive ? "activated" : "deactivated"} successfully`,
      voucher: updateRes.rows[0],
    });
  } catch (error) {
    console.error("Set voucher active error:", error);
    return res
      .status(500)
      .json({ error: "Failed to update voucher activation" });
  }
};

exports.getVoucherUsageHistory = async (req, res) => {
  try {
    await ensureOfferSchema(db);

    const voucherId = req.query.voucher_id
      ? Number(req.query.voucher_id)
      : null;
    const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 500);

    if (
      voucherId !== null &&
      (!Number.isInteger(voucherId) || voucherId <= 0)
    ) {
      return res
        .status(400)
        .json({ error: "voucher_id must be a positive integer" });
    }

    const result = await db.query(
      `
      SELECT
        vuh.usage_id,
        vuh.voucher_id,
        vuh.voucher_code,
        vuh.user_id,
        u.name AS user_name,
        u.email AS user_email,
        vuh.order_id,
        o.order_date,
        vuh.discount_amount,
        vuh.used_at
      FROM voucher_usage_history vuh
      JOIN users u ON u.user_id = vuh.user_id
      JOIN orders o ON o.order_id = vuh.order_id
      WHERE ($1::INT IS NULL OR vuh.voucher_id = $1)
      ORDER BY vuh.used_at DESC, vuh.usage_id DESC
      LIMIT $2
      `,
      [voucherId, limit],
    );

    return res.json({ usage_history: result.rows });
  } catch (error) {
    console.error("Get voucher usage history error:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch voucher usage history" });
  }
};

exports.createProductDiscountOffer = async (req, res) => {
  try {
    await ensureOfferSchema(db);

    const { payload, error } = buildProductDiscountPayload(req.body);
    if (error) {
      return res.status(400).json({ error });
    }

    const productRes = await db.query(
      "SELECT product_id FROM product WHERE product_id = $1",
      [payload.product_id],
    );

    if (productRes.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const maxIdRes = await db.query(
      "SELECT COALESCE(MAX(product_discount_id), 0) + 1 AS next_id FROM product_discounts",
    );
    const productDiscountId = Number(maxIdRes.rows[0].next_id);

    const insertRes = await db.query(
      `
      INSERT INTO product_discounts (
        product_discount_id,
        product_id,
        discount_type,
        discount_value,
        max_discount_amount,
        start_at,
        end_at,
        is_active,
        created_by_admin,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
      `,
      [
        productDiscountId,
        payload.product_id,
        payload.discount_type,
        payload.discount_value,
        payload.max_discount_amount,
        payload.start_at,
        payload.end_at,
        payload.is_active,
        req.user.id,
      ],
    );

    return res.status(201).json({
      message: "Product discount created successfully",
      discount: insertRes.rows[0],
    });
  } catch (error) {
    console.error("Create product discount error:", error);
    return res.status(500).json({ error: "Failed to create product discount" });
  }
};

exports.getProductDiscountOffers = async (req, res) => {
  try {
    await ensureOfferSchema(db);

    const result = await db.query(`
      SELECT
        pd.*,
        p.product_name,
        CASE
          WHEN pd.is_active = FALSE THEN FALSE
          WHEN pd.start_at IS NOT NULL AND pd.start_at > NOW() THEN FALSE
          WHEN pd.end_at IS NOT NULL AND pd.end_at < NOW() THEN FALSE
          ELSE TRUE
        END AS currently_applicable
      FROM product_discounts pd
      JOIN product p ON p.product_id = pd.product_id
      ORDER BY pd.created_at DESC, pd.product_discount_id DESC
    `);

    return res.json({ discounts: result.rows });
  } catch (error) {
    console.error("Get product discounts error:", error);
    return res.status(500).json({ error: "Failed to fetch product discounts" });
  }
};

exports.updateProductDiscountOffer = async (req, res) => {
  try {
    await ensureOfferSchema(db);

    const productDiscountId = Number(req.params.product_discount_id);
    if (!Number.isInteger(productDiscountId) || productDiscountId <= 0) {
      return res.status(400).json({ error: "Invalid product_discount_id" });
    }

    const existingRes = await db.query(
      "SELECT * FROM product_discounts WHERE product_discount_id = $1",
      [productDiscountId],
    );

    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: "Product discount not found" });
    }

    const { payload, error } = buildProductDiscountPayload(
      req.body,
      existingRes.rows[0],
    );
    if (error) {
      return res.status(400).json({ error });
    }

    const productRes = await db.query(
      "SELECT product_id FROM product WHERE product_id = $1",
      [payload.product_id],
    );

    if (productRes.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const updateRes = await db.query(
      `
      UPDATE product_discounts
      SET
        product_id = $1,
        discount_type = $2,
        discount_value = $3,
        max_discount_amount = $4,
        start_at = $5,
        end_at = $6,
        is_active = $7,
        updated_at = NOW()
      WHERE product_discount_id = $8
      RETURNING *
      `,
      [
        payload.product_id,
        payload.discount_type,
        payload.discount_value,
        payload.max_discount_amount,
        payload.start_at,
        payload.end_at,
        payload.is_active,
        productDiscountId,
      ],
    );

    return res.json({
      message: "Product discount updated successfully",
      discount: updateRes.rows[0],
    });
  } catch (error) {
    console.error("Update product discount error:", error);
    return res.status(500).json({ error: "Failed to update product discount" });
  }
};

exports.setProductDiscountOfferActive = async (req, res) => {
  try {
    await ensureOfferSchema(db);

    const productDiscountId = Number(req.params.product_discount_id);
    const isActive = req.body?.is_active;

    if (!Number.isInteger(productDiscountId) || productDiscountId <= 0) {
      return res.status(400).json({ error: "Invalid product_discount_id" });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ error: "is_active must be true or false" });
    }

    const updateRes = await db.query(
      `
      UPDATE product_discounts
      SET is_active = $1,
          updated_at = NOW()
      WHERE product_discount_id = $2
      RETURNING *
      `,
      [isActive, productDiscountId],
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: "Product discount not found" });
    }

    return res.json({
      message: `Product discount ${isActive ? "activated" : "deactivated"} successfully`,
      discount: updateRes.rows[0],
    });
  } catch (error) {
    console.error("Set product discount active error:", error);
    return res
      .status(500)
      .json({ error: "Failed to update product discount activation" });
  }
};

// Backward-compatible alias used by existing frontend calls.
exports.createVoucher = exports.createVoucherOffer;
