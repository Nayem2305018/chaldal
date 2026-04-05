/**
 * Admin Controller
 * Handles admin dashboards, rider approvals, inventory updates, offers, and order management.
 * SQL artifacts: backend/sql/controllers/admin/{queries,functions,procedures,triggers}.sql
 */
const db = require("../db");
const { getSql } = require("../utils/sqlFileLoader");
const SQL = getSql("admin");
const bcrypt = require("bcrypt");
const {
  ensureOfferSchema,
  normalizeVoucherCode,
  roundMoney,
} = require("../utils/offerService");
const { ensureAnalyticsSchema } = require("../utils/analyticsService");
const { ensureRegionSchema } = require("../utils/regionService");
const {
  ensureOrderAutomationSchema,
} = require("../utils/orderAutomationService");

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

  await db.query(SQL.q_0001);

  paymentConfirmationTableReady = true;
};

const ensureWarehouseInventorySchema = async () => {
  if (warehouseInventorySchemaReady) {
    return;
  }

  await ensureRegionSchema(db);

  await db.query(SQL.q_0002);

  await db.query(SQL.q_0003);

  await db.query(SQL.q_0004);

  try {
    const missingInventoryRows = await db.query(SQL.q_0005);
    const warehousesRes = await db.query(SQL.q_0040);
    const warehouses = warehousesRes.rows || [];

    for (const row of missingInventoryRows.rows) {
      const initialStock = Number(row.stock_quantity || 0);
      if (warehouses.length === 0) continue;

      const safeStock = Math.max(0, initialStock);
      const baseShare = Math.floor(safeStock / warehouses.length);
      const remainder = safeStock % warehouses.length;

      for (let index = 0; index < warehouses.length; index += 1) {
        const warehouseId = Number(warehouses[index].warehouse_id);
        const seededStock = baseShare + (index < remainder ? 1 : 0);
        await db.query(SQL.q_0006, [row.product_id, warehouseId, seededStock]);
      }
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
    await db.query(SQL.q_0007, [productId]);
  } catch (error) {
    if (error.code !== "42703") {
      throw error;
    }
  }
};

// Get all pending rider requests
exports.getRiderRequests = async (req, res) => {
  try {
    await ensureRegionSchema(db);

    const result = await db.query(SQL.q_0008);

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

    await ensureRegionSchema(db);

    if (!request_id) {
      return res.status(400).json({ error: "Request ID is required" });
    }

    // Get rider request details
    const requestResult = await db.query(SQL.q_0009, [request_id]);

    if (requestResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Rider request not found or already processed" });
    }

    const riderRequest = requestResult.rows[0];
    const regionId = Number(riderRequest.region_id);

    if (!Number.isInteger(regionId) || regionId <= 0) {
      return res.status(400).json({
        error: "Rider request must include a valid region_id",
      });
    }

    // Get next rider ID
    const nextIdResult = await db.query(SQL.q_0010);
    const nextRiderId = nextIdResult.rows[0].next_id;

    await db.query(SQL.insert_approved_rider, [
      nextRiderId,
      riderRequest.name,
      riderRequest.email,
      riderRequest.password_hash,
      riderRequest.phone,
      riderRequest.appointment_code,
      regionId,
    ]);

    const newRider = await db.query(SQL.select_rider_by_id, [nextRiderId]);

    // Update rider request status to approved
    await db.query(SQL.q_0011, [req.user.id, request_id]);

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
    const result = await db.query(SQL.q_0012, [req.user.id, request_id]);

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Rider request not found or already processed" });
    }

    const requestRes = await db.query(SQL.select_rider_request_by_id, [
      request_id,
    ]);

    res.status(200).json({
      message: "Rider request rejected successfully",
      request: requestRes.rows[0],
    });
  } catch (error) {
    console.error("Reject rider error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get all riders (approved)
exports.getAllRiders = async (req, res) => {
  try {
    const result = await db.query(SQL.q_0013);

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
    const result = await db.query(SQL.q_0014);

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

    const result = await db.query(SQL.q_0015, [status, rider_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Rider not found" });
    }

    const riderRes = await db.query(SQL.select_rider_status_by_id, [rider_id]);

    res.status(200).json({
      message: "Rider status updated",
      rider: riderRes.rows[0],
    });
  } catch (error) {
    console.error("Update rider status error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const safeQuery = async (sqlText, fallbackRows = []) => {
      if (!sqlText || typeof sqlText !== "string") {
        return { rows: fallbackRows };
      }

      try {
        return await db.query(sqlText);
      } catch (queryError) {
        console.error("Dashboard analytics query failed:", queryError.message);
        return { rows: fallbackRows };
      }
    };

    try {
      await ensureOfferSchema(db);
    } catch (schemaError) {
      console.error(
        "Dashboard offer schema check failed:",
        schemaError.message,
      );
    }

    try {
      await ensureAnalyticsSchema(db);
    } catch (schemaError) {
      console.error(
        "Dashboard analytics schema check failed:",
        schemaError.message,
      );
    }

    try {
      await ensureWarehouseInventorySchema();
    } catch (schemaError) {
      console.error(
        "Dashboard warehouse inventory schema check failed:",
        schemaError.message,
      );
    }

    const [
      usersCount,
      ridersCount,
      pendingRequests,
      ordersCount,
      revenueRes,
      lowStockRes,
      discountProductsRes,
      dailyRevenueRes,
      monthlyRevenueSummaryRes,
      monthlyRevenueTrendRes,
      topSellingProductsRes,
      mostActiveUsersRes,
      riderPerformanceRes,
      orderStatusDistributionRes,
      peakOrderHoursRes,
      warehouseWorkloadRes,
      averageOrderValueRes,
      monthlyReportRes,
    ] = await Promise.all([
      safeQuery(SQL.q_0016, [{ count: 0 }]),
      safeQuery(SQL.q_0017, [{ count: 0 }]),
      safeQuery(SQL.q_0018, [{ count: 0 }]),
      safeQuery(SQL.q_0019, [{ count: 0 }]),
      safeQuery(SQL.q_0020, [{ revenue: 0 }]),
      safeQuery(SQL.q_0021, []),
      safeQuery(SQL.q_0022),
      safeQuery(SQL.q_0023),
      safeQuery(SQL.q_0024, [
        { month_start: null, total_revenue: 0, total_orders: 0 },
      ]),
      safeQuery(SQL.q_0067, []),
      safeQuery(SQL.q_0025),
      safeQuery(SQL.q_0026),
      safeQuery(SQL.q_0027),
      safeQuery(SQL.q_0028),
      safeQuery(SQL.q_0029),
      safeQuery(SQL.q_0030),
      safeQuery(SQL.q_0031, [{ average_order_value: 0 }]),
      safeQuery(SQL.q_0032, [{ report: {} }]),
    ]);

    const monthlySummary = monthlyRevenueSummaryRes.rows[0] || {
      month_start: null,
      total_revenue: 0,
      total_orders: 0,
    };

    const dailyRevenue = (dailyRevenueRes.rows || []).map((row) => ({
      revenue_date: row.revenue_date,
      total_revenue: Number(row.total_revenue || 0),
      total_orders: Number(row.total_orders || 0),
    }));

    const monthlyRevenueTrend = (monthlyRevenueTrendRes.rows || [])
      .map((row) => ({
        month_name: row.month_name,
        month_key: row.month_key,
        total_revenue: Number(roundMoney(row.total_revenue || 0)),
        total_orders: Number(row.total_orders || 0),
      }))
      .sort((a, b) => String(b.month_key).localeCompare(String(a.month_key)));

    const averageOrderValue =
      averageOrderValueRes.rows[0]?.average_order_value ?? 0;
    const monthlyReport = monthlyReportRes.rows[0]?.report || {};

    res.status(200).json({
      stats: {
        totalUsers: Number(usersCount.rows[0]?.count || 0),
        totalRiders: Number(ridersCount.rows[0]?.count || 0),
        pendingRiderRequests: Number(pendingRequests.rows[0]?.count || 0),
        totalOrders: Number(ordersCount.rows[0]?.count || 0),
        totalRevenue: Number(revenueRes.rows[0]?.revenue || 0),
        lowStockProducts: lowStockRes.rows,
        discount_products: discountProductsRes.rows,
        analytics: {
          dailyRevenue,
          monthlyRevenueTrend,
          monthlyRevenueSummary: {
            month_start: monthlySummary.month_start,
            total_revenue: Number(monthlySummary.total_revenue || 0),
            total_orders: Number(monthlySummary.total_orders || 0),
          },
          topSellingProducts: topSellingProductsRes.rows,
          mostActiveUsers: mostActiveUsersRes.rows,
          riderPerformance: riderPerformanceRes.rows,
          orderStatusDistribution: orderStatusDistributionRes.rows,
          peakOrderHours: peakOrderHoursRes.rows,
          warehouseWorkload: warehouseWorkloadRes.rows,
          averageOrderValue: Number(averageOrderValue || 0),
          monthlyReport,
        },
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
    const resultId = await db.query(SQL.q_0033);
    await db.query(SQL.q_0034, [
      resultId.rows[0].next_id,
      product_name,
      price,
      stock_quantity || 0,
      category_id,
      photourl || "",
    ]);
    res.json({ message: "Product created successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to create product" });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { product_name, price, stock_quantity, category_id, photourl } =
      req.body;
    await db.query(SQL.q_0035, [
      product_name,
      price,
      stock_quantity,
      category_id,
      photourl,
      req.params.id,
    ]);
    res.json({ message: "Product updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update product" });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    await db.query(SQL.q_0036, [req.params.id]);
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

    const result = await db.query(SQL.q_0037);
    res.json(result.rows);
  } catch (err) {
    console.error("Get orders error:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    await db.query(SQL.q_0038, [req.body.status, req.params.id]);
    res.json({ message: "Order updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update order status" });
  }
};

exports.getInventorySummary = async (req, res) => {
  try {
    await ensureWarehouseInventorySchema();

    const productsRes = await db.query(SQL.q_0039);

    const warehouseTotalsRes = await db.query(SQL.q_0040);

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

    const productRes = await db.query(SQL.q_0041, [productId]);

    if (productRes.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const warehouseRes = await db.query(SQL.q_0042, [warehouseId]);

    if (warehouseRes.rows.length === 0) {
      return res.status(404).json({ error: "Warehouse not found" });
    }

    const updateRes = await db.query(SQL.q_0043, [
      productId,
      warehouseId,
      stockQuantity,
    ]);

    if (updateRes.rowCount === 0) {
      await db.query(SQL.q_0043_insert, [
        productId,
        warehouseId,
        stockQuantity,
      ]);
    }

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

    const orderRes = await db.query(SQL.q_0044, [orderId]);

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

    if (order.payment_status !== "collected") {
      return res.status(400).json({
        error: "Payment can only be confirmed after rider collection",
      });
    }

    const paymentConfirmationRes = await db.query(SQL.q_0045, [orderId]);

    if (paymentConfirmationRes.rows.length === 0) {
      return res.status(400).json({
        error: "Rider payment confirmation message is required first",
      });
    }

    await db.query(SQL.q_0046, [orderId]);

    await db.query(SQL.q_0047, [orderId, req.user.id]);

    res.json({ message: "Payment confirmed" });
  } catch (err) {
    console.error("Confirm payment error:", err);
    res.status(500).json({ error: "Failed to confirm payment" });
  }
};

exports.assignRider = async (req, res) => {
  try {
    await ensureOrderAutomationSchema(db);

    const { order_id, rider_id } = req.body;
    // Step 1: Push a delivery request explicitly bound to the specific order mapping natively matching database IDs dynamically.
    await db.query(SQL.q_0048, [order_id, "Assigned to Rider"]);
    const deliveryInsert = await db.query(SQL.select_delivery_by_order_id, [
      order_id,
    ]);

    if (deliveryInsert.rows.length === 0) {
      throw new Error("Failed to resolve created delivery_id");
    }
    // Step 2: Establish Rider relation binding assignments formally natively mapping constraints securely to avoid collisions dynamically globally.
    await db.query(SQL.q_0049, [rider_id, deliveryInsert.rows[0].delivery_id]);
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

    const duplicateRes = await db.query(SQL.q_0050, [payload.code]);

    if (duplicateRes.rows.length > 0) {
      return res.status(409).json({ error: "Voucher code already exists" });
    }

    const maxIdRes = await db.query(SQL.q_0051);
    const voucherId = Number(maxIdRes.rows[0].next_id);

    await db.query(SQL.q_0052, [
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
    ]);

    const insertRes = await db.query(SQL.q_0054, [voucherId]);

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

    const result = await db.query(SQL.q_0053);

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

    const existingRes = await db.query(SQL.q_0054, [voucherId]);

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

    const duplicateRes = await db.query(SQL.q_0055, [payload.code, voucherId]);

    if (duplicateRes.rows.length > 0) {
      return res.status(409).json({ error: "Voucher code already exists" });
    }

    const updateRes = await db.query(SQL.q_0056, [
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
    ]);

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: "Voucher not found" });
    }

    const updatedVoucher = await db.query(SQL.q_0054, [voucherId]);

    return res.json({
      message: "Voucher updated successfully",
      voucher: updatedVoucher.rows[0],
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

    const updateRes = await db.query(SQL.q_0057, [isActive, voucherId]);

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: "Voucher not found" });
    }

    const updatedVoucher = await db.query(SQL.q_0054, [voucherId]);

    return res.json({
      message: `Voucher ${isActive ? "activated" : "deactivated"} successfully`,
      voucher: updatedVoucher.rows[0],
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

    const result = await db.query(SQL.q_0058, [voucherId]);

    return res.json({ usage_history: result.rows.slice(0, limit) });
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

    const productRes = await db.query(SQL.q_0059, [payload.product_id]);

    if (productRes.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const maxIdRes = await db.query(SQL.q_0060);
    const productDiscountId = Number(maxIdRes.rows[0].next_id);

    await db.query(SQL.q_0061, [
      productDiscountId,
      payload.product_id,
      payload.discount_type,
      payload.discount_value,
      payload.max_discount_amount,
      payload.start_at,
      payload.end_at,
      payload.is_active,
      req.user.id,
    ]);

    const insertRes = await db.query(SQL.q_0063, [productDiscountId]);

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

    await db.query(SQL.q_0068);

    const result = await db.query(SQL.q_0062);

    return res.json({
      discounts: result.rows,
      discount_products: result.rows,
    });
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

    const existingRes = await db.query(SQL.q_0063, [productDiscountId]);

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

    const productRes = await db.query(SQL.q_0064, [payload.product_id]);

    if (productRes.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const updateRes = await db.query(SQL.q_0065, [
      payload.product_id,
      payload.discount_type,
      payload.discount_value,
      payload.max_discount_amount,
      payload.start_at,
      payload.end_at,
      payload.is_active,
      productDiscountId,
    ]);

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: "Product discount not found" });
    }

    const updatedDiscount = await db.query(SQL.q_0063, [productDiscountId]);

    return res.json({
      message: "Product discount updated successfully",
      discount: updatedDiscount.rows[0],
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

    const updateRes = await db.query(SQL.q_0066, [isActive, productDiscountId]);

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: "Product discount not found" });
    }

    const updatedDiscount = await db.query(SQL.q_0063, [productDiscountId]);

    return res.json({
      message: `Product discount ${isActive ? "activated" : "deactivated"} successfully`,
      discount: updatedDiscount.rows[0],
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
