/**
 * SQL artifacts: backend/sql/controllers/order/{queries,functions,procedures,triggers}.sql
 */
const db = require("../db");
const { getSql } = require("../utils/sqlFileLoader");
const SQL = getSql("order");
const { sendEmail } = require("../utils/emailService");
const {
  ensureOfferSchema,
  computeDiscountAmount,
  normalizeVoucherCode,
  roundMoney,
} = require("../utils/offerService");
const { ensureRegionSchema } = require("../utils/regionService");
const {
  ensureOrderAutomationSchema,
} = require("../utils/orderAutomationService");

let paymentConfirmationTableReady = false;
let warehouseAllocationSchemaReady = false;

const ensurePaymentConfirmationTable = async () => {
  if (paymentConfirmationTableReady) {
    return;
  }

  await db.query(SQL.q_0001);

  paymentConfirmationTableReady = true;
};

const ensureWarehouseAllocationSchema = async () => {
  if (warehouseAllocationSchemaReady) {
    return;
  }

  await ensureRegionSchema(db);

  await ensureOrderAutomationSchema(db);

  await db.query(SQL.q_0002);

  await db.query(SQL.q_0003);

  await db.query(SQL.q_0004);

  try {
    const missingInventoryRows = await db.query(SQL.q_0005);
    const warehousesRes = await db.query(SQL.q_0067);
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

  warehouseAllocationSchemaReady = true;
};

const syncProductStockTotal = async (client, productId) => {
  try {
    await client.query(SQL.q_0023, [productId]);
  } catch (error) {
    // Some historical schemas may not contain product.stock_quantity.
    if (error.code !== "42703") {
      throw error;
    }
  }
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const notifyUserDeliveryCompleted = async ({ orderId }) => {
  const orderDetailsRes = await db.query(SQL.q_0007, [orderId]);

  if (orderDetailsRes.rows.length === 0) {
    return { sent: false, reason: "order-not-found" };
  }

  const order = orderDetailsRes.rows[0];
  const recipient = order.customer_email;

  if (!recipient) {
    return { sent: false, reason: "missing-customer-email" };
  }

  const customerName = order.customer_name || "Customer";
  const items = Array.isArray(order.items) ? order.items : [];

  const itemTextLines = items.map((item, index) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unit_price || 0).toFixed(2);
    const subtotal = Number(item.subtotal || 0).toFixed(2);
    return `${index + 1}. ${item.product_name} x${quantity} @ BDT ${unitPrice} = BDT ${subtotal}`;
  });

  const itemHtmlLines = items
    .map((item) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unit_price || 0).toFixed(2);
      const subtotal = Number(item.subtotal || 0).toFixed(2);
      return `<li>${escapeHtml(item.product_name)} x${quantity} @ BDT ${unitPrice} = BDT ${subtotal}</li>`;
    })
    .join("");

  const totalAmount = Number(order.total_price || 0).toFixed(2);
  const safeAddress = escapeHtml(order.delivery_address || "N/A");

  const subject = "Your delivery is complete - Receipt from Chaldal";

  const text = [
    `Hello ${customerName},`,
    "",
    "Thank you for shopping with us. Your order has been delivered successfully.",
    "We wish you a wonderful day and hope to serve you again soon.",
    "",
    `Delivery Address: ${order.delivery_address || "N/A"}`,
    `Total Amount: BDT ${totalAmount}`,
    "",
    "Receipt:",
    ...(itemTextLines.length > 0
      ? itemTextLines
      : ["No item details available."]),
    "",
    "Regards,",
    "Chaldal Delivery Team",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
      <h2 style="margin: 0 0 12px; color: #10b981;">Delivery Completed Successfully</h2>
      <p style="margin: 0 0 10px;">Hello ${escapeHtml(customerName)},</p>
      <p style="margin: 0 0 10px;">Thank you for shopping with us. Your order has been delivered successfully.</p>
      <p style="margin: 0 0 14px;">We wish you a wonderful day and hope to serve you again soon.</p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
        <p style="margin: 0 0 6px;"><strong>Delivery Address:</strong> ${safeAddress}</p>
        <p style="margin: 0;"><strong>Total Amount:</strong> BDT ${totalAmount}</p>
      </div>

      <h3 style="margin: 0 0 8px;">Receipt</h3>
      ${
        itemHtmlLines
          ? `<ul style="margin: 0 0 14px; padding-left: 20px;">${itemHtmlLines}</ul>`
          : '<p style="margin: 0 0 14px;">No item details available.</p>'
      }

      <p style="margin: 0;">Regards,<br/>Chaldal Delivery Team</p>
    </div>
  `;

  return sendEmail({ to: recipient, subject, text, html });
};

const buildHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const getActiveProductDiscountMap = async (client, productIds) => {
  if (!Array.isArray(productIds) || productIds.length === 0) {
    return new Map();
  }

  const result = await client.query(SQL.q_0024, [productIds]);

  const map = new Map();
  for (const row of result.rows) {
    const key = Number(row.product_id);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(row);
  }

  return map;
};

const calculateCartPricing = async ({
  client,
  userId,
  voucherCode,
  lockRows,
}) => {
  await ensureOfferSchema(client);

  const cartRes = await client.query(
    lockRows ? SQL.calc_cart_select_for_update : SQL.calc_cart_select_base,
    [userId],
  );

  if (cartRes.rows.length === 0) {
    throw buildHttpError(400, "No active cart found");
  }

  const cartId = Number(cartRes.rows[0].cart_id);

  const itemsRes = await client.query(
    lockRows ? SQL.calc_cart_items_for_update : SQL.calc_cart_items_base,
    [cartId],
  );

  if (itemsRes.rows.length === 0) {
    throw buildHttpError(400, "Cart has no items");
  }

  const productIds = [
    ...new Set(itemsRes.rows.map((item) => Number(item.product_id))),
  ];
  const discountMap = await getActiveProductDiscountMap(client, productIds);

  const pricedItems = [];
  let subtotalBeforeDiscount = 0;
  let productDiscountTotal = 0;

  for (const item of itemsRes.rows) {
    const quantity = Number(item.quantity || 0);
    const baseUnitPrice = Number(item.base_unit_price || 0);
    const discountRows = discountMap.get(Number(item.product_id)) || [];
    const lineBaseTotal = roundMoney(baseUnitPrice * quantity);

    // Product discount terms are unit-based; compute per-unit discount and scale by quantity.
    let bestDiscount = null;
    for (const row of discountRows) {
      const unitDiscountAmount = computeDiscountAmount(
        baseUnitPrice,
        row.discount_type,
        row.discount_value,
        row.max_discount_amount,
      );
      const lineDiscountAmount = roundMoney(unitDiscountAmount * quantity);

      if (!bestDiscount || lineDiscountAmount > bestDiscount.discount_amount) {
        bestDiscount = {
          ...row,
          unit_discount_amount: unitDiscountAmount,
          discount_amount: lineDiscountAmount,
        };
      }
    }

    const lineProductDiscountTotal = roundMoney(
      Number(bestDiscount?.discount_amount || 0),
    );
    const lineTotal = roundMoney(lineBaseTotal - lineProductDiscountTotal);
    const productDiscountPerUnit = roundMoney(
      Number(bestDiscount?.unit_discount_amount || 0),
    );
    const effectiveUnitPrice =
      quantity > 0 ? roundMoney(lineTotal / quantity) : 0;

    subtotalBeforeDiscount = roundMoney(subtotalBeforeDiscount + lineBaseTotal);
    productDiscountTotal = roundMoney(
      productDiscountTotal + lineProductDiscountTotal,
    );

    pricedItems.push({
      product_id: Number(item.product_id),
      product_name: item.product_name,
      quantity,
      base_unit_price: roundMoney(baseUnitPrice),
      effective_unit_price: effectiveUnitPrice,
      product_discount_per_unit: roundMoney(productDiscountPerUnit),
      line_base_total: lineBaseTotal,
      line_product_discount_total: lineProductDiscountTotal,
      line_total: lineTotal,
      applied_product_discount_id: bestDiscount
        ? Number(bestDiscount.product_discount_id)
        : null,
      applied_product_discount: bestDiscount
        ? {
            product_discount_id: Number(bestDiscount.product_discount_id),
            discount_type: bestDiscount.discount_type,
            discount_value: Number(bestDiscount.discount_value),
            max_discount_amount:
              bestDiscount.max_discount_amount === null
                ? null
                : Number(bestDiscount.max_discount_amount),
          }
        : null,
      fallback_stock_quantity: Number(item.fallback_stock_quantity || 0),
    });
  }

  const subtotalAfterProductDiscount = roundMoney(
    subtotalBeforeDiscount - productDiscountTotal,
  );

  const normalizedCode = normalizeVoucherCode(voucherCode);
  let appliedVoucher = null;
  let voucherDiscountTotal = 0;

  if (normalizedCode) {
    const voucherRes = await client.query(SQL.q_0025, [normalizedCode]);

    if (voucherRes.rows.length === 0) {
      throw buildHttpError(400, "Invalid voucher code");
    }

    const voucher = voucherRes.rows[0];
    const now = new Date();

    if (!voucher.is_active) {
      throw buildHttpError(400, "This voucher is currently inactive");
    }

    if (voucher.start_at && new Date(voucher.start_at) > now) {
      throw buildHttpError(400, "This voucher is not active yet");
    }

    if (voucher.end_at && new Date(voucher.end_at) < now) {
      throw buildHttpError(400, "This voucher has expired");
    }

    const minOrderAmount = Number(voucher.min_order_amount || 0);
    if (subtotalAfterProductDiscount < minOrderAmount) {
      throw buildHttpError(
        400,
        `Minimum order amount for this voucher is BDT ${roundMoney(minOrderAmount).toFixed(2)}`,
      );
    }

    const usageRes = await client.query(SQL.q_0026, [
      voucher.voucher_id,
      userId,
    ]);

    const usageCount = Number(usageRes.rows[0].usage_count || 0);
    const usageLimit = Number(voucher.usage_limit_per_user || 1);

    if (usageCount >= usageLimit) {
      throw buildHttpError(
        400,
        "You have reached the usage limit for this voucher",
      );
    }

    voucherDiscountTotal = computeDiscountAmount(
      subtotalAfterProductDiscount,
      voucher.discount_type,
      voucher.discount_value,
      voucher.max_discount_amount,
    );

    appliedVoucher = {
      voucher_id: Number(voucher.voucher_id),
      code: voucher.code,
      discount_type: voucher.discount_type,
      discount_value: Number(voucher.discount_value),
      min_order_amount: Number(voucher.min_order_amount || 0),
      max_discount_amount:
        voucher.max_discount_amount === null
          ? null
          : Number(voucher.max_discount_amount),
      usage_limit_per_user: usageLimit,
      usage_count_for_user: usageCount,
    };
  }

  const finalTotal = roundMoney(
    Math.max(0, subtotalAfterProductDiscount - voucherDiscountTotal),
  );

  return {
    cart_id: cartId,
    items: pricedItems,
    subtotal_before_discount: subtotalBeforeDiscount,
    product_discount_total: productDiscountTotal,
    subtotal_after_product_discount: subtotalAfterProductDiscount,
    voucher_discount_total: roundMoney(voucherDiscountTotal),
    final_total: finalTotal,
    applied_voucher: appliedVoucher,
  };
};

const resolveRegionWarehouse = async (client, regionId) => {
  const warehouseRes = await client.query(SQL.q_0066, [regionId]);

  if (warehouseRes.rows.length === 0) {
    throw buildHttpError(400, "No warehouse configured for selected region");
  }

  const warehouse = warehouseRes.rows[0];
  return {
    warehouse_id: Number(warehouse.warehouse_id),
    warehouse_name: warehouse.name,
    region_id: Number(warehouse.region_id),
  };
};

const reconcileCartForRegionWarehouse = async ({
  client,
  userId,
  warehouseId,
}) => {
  const cartRes = await client.query(SQL.calc_cart_select_for_update, [userId]);

  if (cartRes.rows.length === 0) {
    return { cart_id: null, adjustments: [] };
  }

  const cartId = Number(cartRes.rows[0].cart_id);
  const itemsRes = await client.query(SQL.calc_cart_items_for_update, [cartId]);

  const adjustments = [];

  for (const item of itemsRes.rows) {
    const productId = Number(item.product_id);
    const cartItemId = Number(item.cart_item_id);
    const requestedQuantity = Number(item.quantity || 0);
    const baseUnitPrice = Number(item.base_unit_price || 0);

    const stockRes = await client.query(SQL.q_0068, [productId, warehouseId]);
    const availableStock = Number(stockRes.rows[0]?.stock_quantity || 0);

    if (availableStock <= 0) {
      await client.query(SQL.q_0070, [cartItemId]);
      adjustments.push({
        product_id: productId,
        product_name: item.product_name,
        requested_quantity: requestedQuantity,
        adjusted_quantity: 0,
        available_quantity: 0,
      });
      continue;
    }

    if (requestedQuantity > availableStock) {
      const adjustedQuantity = availableStock;
      const adjustedLineTotal = roundMoney(adjustedQuantity * baseUnitPrice);

      await client.query(SQL.q_0071, [
        adjustedQuantity,
        adjustedLineTotal,
        cartItemId,
      ]);

      adjustments.push({
        product_id: productId,
        product_name: item.product_name,
        requested_quantity: requestedQuantity,
        adjusted_quantity: adjustedQuantity,
        available_quantity: availableStock,
      });
    }
  }

  return {
    cart_id: cartId,
    adjustments,
  };
};

// ======================= CHECKOUT =======================
exports.checkout = async (req, res) => {
  const client = await db.connect();

  try {
    await ensureWarehouseAllocationSchema();

    const userId = req.user.id;
    const { delivery_address, preferred_delivery_time, voucher_code } =
      req.body;
    const regionId = Number(req.body.region_id);

    if (!delivery_address)
      return res.status(400).json({ error: "Delivery address is required" });

    if (!preferred_delivery_time)
      return res
        .status(400)
        .json({ error: "Preferred delivery time is required" });

    if (!Number.isInteger(regionId) || regionId <= 0) {
      return res.status(400).json({ error: "A valid region_id is required" });
    }

    await ensureRegionSchema(client);

    const regionExistsRes = await client.query(SQL.q_0064, [regionId]);

    if (regionExistsRes.rows.length === 0) {
      return res.status(400).json({ error: "Selected region_id is invalid" });
    }

    const regionWarehouse = await resolveRegionWarehouse(client, regionId);

    await client.query(SQL.q_0027);
    await client.query(SQL.q_0072, [regionId, userId]);

    const reconciliation = await reconcileCartForRegionWarehouse({
      client,
      userId,
      warehouseId: regionWarehouse.warehouse_id,
    });

    if (reconciliation.adjustments.length > 0) {
      await client.query(SQL.q_0029);
      return res.status(409).json({
        error:
          "Cart quantities were adjusted based on selected region stock. Please review cart and place order again.",
        region_id: regionId,
        warehouse_id: regionWarehouse.warehouse_id,
        adjustments: reconciliation.adjustments,
      });
    }

    const pricing = await calculateCartPricing({
      client,
      userId,
      voucherCode: voucher_code,
      lockRows: true,
    });

    if (!Array.isArray(pricing.items) || pricing.items.length === 0) {
      await client.query(SQL.q_0029);
      return res.status(400).json({ error: "Cart has no items" });
    }

    const cartId = pricing.cart_id;

    const touchedProducts = new Set();

    // Reserve stock from the selected region warehouse only.
    for (const item of pricing.items) {
      const requestedQty = Number(item.quantity || 0);
      const reserveRes = await client.query(SQL.q_0069, [
        item.product_id,
        regionWarehouse.warehouse_id,
        requestedQty,
      ]);

      if (reserveRes.rowCount === 0) {
        await client.query(SQL.q_0029);
        return res.status(400).json({
          error: "Sorry! limited quantity available",
        });
      }

      touchedProducts.add(Number(item.product_id));
    }

    // Create order with manual ID handling
    const maxOrderRes = await client.query(SQL.q_0030);
    const orderId = maxOrderRes.rows[0].next_id;

    await client.query(SQL.q_0031, [
      orderId,
      userId,
      pricing.final_total,
      delivery_address,
      preferred_delivery_time,
      pricing.subtotal_before_discount,
      pricing.product_discount_total,
      pricing.voucher_discount_total,
      pricing.applied_voucher?.code || null,
      regionId,
    ]);
    // Fetch Base Order Item ID
    const maxOrderItemRes = await client.query(SQL.q_0032);
    let nextOrderItemId = maxOrderItemRes.rows[0].max_id;

    // Insert order items
    for (const item of pricing.items) {
      nextOrderItemId++;
      const subtotal = Number(item.line_total);

      await client.query(SQL.q_0033, [
        nextOrderItemId,
        orderId,
        item.product_id,
        item.quantity,
        item.effective_unit_price,
        subtotal,
        item.base_unit_price,
        item.product_discount_per_unit,
        item.applied_product_discount_id,
      ]);
    }

    for (const productId of touchedProducts) {
      await syncProductStockTotal(client, productId);
    }

    if (pricing.applied_voucher && pricing.voucher_discount_total > 0) {
      const usageIdRes = await client.query(SQL.q_0034);
      const usageId = Number(usageIdRes.rows[0].next_id);

      await client.query(SQL.q_0035, [
        usageId,
        pricing.applied_voucher.voucher_id,
        userId,
        orderId,
        pricing.applied_voucher.code,
        pricing.voucher_discount_total,
      ]);
    }

    // Mark cart as ordered
    await client.query(SQL.q_0036, [cartId]);

    await client.query(SQL.q_0037);

    res.json({
      message: "Your order is on its way!",
      order_id: orderId,
      region_id: regionId,
      warehouse_id: regionWarehouse.warehouse_id,
      pricing: {
        subtotal_before_discount: pricing.subtotal_before_discount,
        product_discount_total: pricing.product_discount_total,
        voucher_discount_total: pricing.voucher_discount_total,
        final_total: pricing.final_total,
        applied_voucher: pricing.applied_voucher,
      },
    });
  } catch (error) {
    await client.query(SQL.q_0038);
    console.error(error);
    res
      .status(error.status || 500)
      .json({ error: error.message || "Checkout failed" });
  } finally {
    client.release();
  }
};

exports.previewCheckoutPricing = async (req, res) => {
  const client = await db.connect();

  try {
    const userId = req.user.id;
    const { voucher_code } = req.body || {};

    const pricing = await calculateCartPricing({
      client,
      userId,
      voucherCode: voucher_code,
      lockRows: false,
    });

    return res.json(pricing);
  } catch (error) {
    console.error("Preview checkout pricing error:", error);
    return res
      .status(error.status || 500)
      .json({ error: error.message || "Failed to preview pricing" });
  } finally {
    client.release();
  }
};

exports.revalidateCartRegion = async (req, res) => {
  const client = await db.connect();

  try {
    await ensureWarehouseAllocationSchema();

    const userId = req.user.id;
    const regionId = Number(req.body.region_id);
    const voucherCode = req.body.voucher_code;

    if (!Number.isInteger(regionId) || regionId <= 0) {
      return res.status(400).json({ error: "A valid region_id is required" });
    }

    await ensureRegionSchema(client);

    const regionExistsRes = await client.query(SQL.q_0064, [regionId]);
    if (regionExistsRes.rows.length === 0) {
      return res.status(400).json({ error: "Selected region_id is invalid" });
    }

    const regionWarehouse = await resolveRegionWarehouse(client, regionId);

    await client.query(SQL.q_0027);
    await client.query(SQL.q_0072, [regionId, userId]);

    const reconciliation = await reconcileCartForRegionWarehouse({
      client,
      userId,
      warehouseId: regionWarehouse.warehouse_id,
    });

    await client.query(SQL.q_0037);

    let pricing = null;
    try {
      pricing = await calculateCartPricing({
        client,
        userId,
        voucherCode,
        lockRows: false,
      });
    } catch (pricingError) {
      if (
        pricingError?.message !== "No active cart found" &&
        pricingError?.message !== "Cart has no items"
      ) {
        throw pricingError;
      }
    }

    return res.status(200).json({
      region_id: regionId,
      warehouse_id: regionWarehouse.warehouse_id,
      warehouse_name: regionWarehouse.warehouse_name,
      adjustments: reconciliation.adjustments,
      pricing,
    });
  } catch (error) {
    try {
      await client.query(SQL.q_0038);
    } catch (_) {}

    console.error("Revalidate cart region error:", error);
    return res
      .status(error.status || 500)
      .json({ error: error.message || "Failed to revalidate cart" });
  } finally {
    client.release();
  }
};

// ======================= USER ORDERS =======================
exports.getMyOrders = async (req, res) => {
  try {
    const result = await db.query(SQL.q_0008, [req.user.id]);

    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: "Error fetching orders" });
  }
};

// ======================= RIDER ASSIGNED ORDERS =======================
exports.getAssignedOrders = async (req, res) => {
  try {
    await ensurePaymentConfirmationTable();
    await ensureWarehouseAllocationSchema();

    const result = await db.query(SQL.q_0009, [req.user.id]);

    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: "Error fetching assigned orders" });
  }
};

// ======================= AVAILABLE ORDERS =======================
exports.getAvailableOrders = async (req, res) => {
  try {
    await ensureRegionSchema(db);

    const result = await db.query(SQL.q_0010, [req.user.id]);

    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: "Error fetching available orders" });
  }
};

exports.getRegions = async (req, res) => {
  try {
    await ensureRegionSchema(db);

    const result = await db.query(SQL.q_0063);

    return res.status(200).json({ regions: result.rows });
  } catch (error) {
    console.error("Get order regions error:", error);
    return res.status(500).json({ error: "Error fetching regions" });
  }
};

// ======================= SELF ASSIGN =======================
exports.selfAssignOrder = async (req, res) => {
  const client = await db.connect();

  try {
    const { order_id } = req.params;
    const rider_id = req.user.id;

    await ensureWarehouseAllocationSchema();
    await ensurePaymentConfirmationTable();
    await ensureRegionSchema(client);

    await client.query(SQL.q_0039);

    const pendingVerificationRes = await client.query(SQL.q_0040, [rider_id]);

    if (pendingVerificationRes.rows.length > 0) {
      await client.query(SQL.q_0041);
      return res.status(400).json({
        error: `You cannot assign a new order until admin verifies collected payment for order #${pendingVerificationRes.rows[0].order_id}`,
      });
    }

    const riderRegionRes = await client.query(SQL.q_0065, [rider_id]);
    const riderRegionId = Number(riderRegionRes.rows[0]?.region_id);

    if (!Number.isInteger(riderRegionId) || riderRegionId <= 0) {
      await client.query(SQL.q_0041);
      return res.status(400).json({
        error: "Rider region is not configured. Please contact admin.",
      });
    }

    const orderRes = await client.query(SQL.q_0044, [order_id]);

    if (orderRes.rows.length === 0) {
      await client.query(SQL.q_0045);
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orderRes.rows[0];
    const orderRegionId = Number(order.region_id);

    if (!Number.isInteger(orderRegionId) || orderRegionId !== riderRegionId) {
      await client.query(SQL.q_0046);
      return res.status(403).json({
        error: "You can only assign orders from your own region",
      });
    }

    if (order.order_status !== "pending") {
      await client.query(SQL.q_0046);
      return res.status(400).json({ error: "Already assigned" });
    }

    // Prevent duplicate assignment
    const check = await client.query(SQL.q_0047, [order_id]);

    if (check.rows.length > 0) {
      await client.query(SQL.q_0048);
      return res.status(400).json({ error: "Already assigned" });
    }

    const regionWarehouse = await resolveRegionWarehouse(client, orderRegionId);

    const orderItemsRes = await client.query(SQL.q_0049, [order_id]);

    if (orderItemsRes.rows.length === 0) {
      await client.query(SQL.q_0050);
      return res.status(400).json({ error: "Order has no items to allocate" });
    }

    const allocationRows = [];

    for (const item of orderItemsRes.rows) {
      allocationRows.push({
        order_id: Number(order_id),
        product_id: Number(item.product_id),
        product_name: item.product_name,
        warehouse_id: regionWarehouse.warehouse_id,
        allocated_quantity: Number(item.quantity),
      });
    }

    // Fetch manual ID as legacy schema lacks SERIAL sequence
    const maxDelRes = await client.query(SQL.q_0055);
    const next_delivery_id = maxDelRes.rows[0].next_id;

    const primaryWarehouseId = regionWarehouse.warehouse_id;

    await client.query(SQL.q_0056, [
      next_delivery_id,
      order_id,
      rider_id,
      primaryWarehouseId,
    ]);

    for (const row of allocationRows) {
      await client.query(SQL.q_0059, [
        next_delivery_id,
        row.order_id,
        row.product_id,
        row.warehouse_id,
        row.allocated_quantity,
      ]);
    }

    await client.query(SQL.q_0060, [order_id]);

    await client.query(SQL.q_0061);

    res.json({
      message: "Order assigned successfully",
      allocations: allocationRows,
      primary_warehouse_id: primaryWarehouseId,
    });
  } catch (err) {
    console.error("Assign error details:", err);
    await client.query(SQL.q_0062);
    res
      .status(err.status || 500)
      .json({ error: err.message || "Assignment failed" });
  } finally {
    client.release();
  }
};

// ======================= START DELIVERY =======================
exports.startDelivery = async (req, res) => {
  try {
    const { order_id } = req.params;
    const rider_id = req.user.id;

    const check = await db.query(SQL.q_0011, [order_id, rider_id]);

    if (check.rows.length === 0)
      return res.status(403).json({ error: "Not your order" });

    await db.query(SQL.q_0012, [order_id]);

    await db.query(SQL.q_0013, [order_id]);

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
    const { payment_confirmation_message } = req.body;

    if (
      !payment_confirmation_message ||
      !String(payment_confirmation_message).trim()
    ) {
      return res.status(400).json({
        error:
          "Please provide a confirmation message about sending collected money.",
      });
    }

    await ensurePaymentConfirmationTable();

    const check = await db.query(SQL.q_0014, [order_id, rider_id]);

    if (check.rows.length === 0)
      return res.status(403).json({ error: "Not your order" });

    const orderRes = await db.query(SQL.q_0015, [order_id]);

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orderRes.rows[0];

    if (!["assigned", "delivering"].includes(order.order_status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    await db.query(SQL.q_0016, [order_id]);

    await db.query(SQL.q_0017, [order_id]);

    const paymentUpsertRes = await db.query(SQL.q_0018, [
      order_id,
      rider_id,
      String(payment_confirmation_message).trim(),
    ]);

    if (paymentUpsertRes.rowCount === 0) {
      await db.query(SQL.q_0018_insert, [
        order_id,
        rider_id,
        String(payment_confirmation_message).trim(),
      ]);
    }

    let emailStatus = {
      sent: false,
      reason: "not-attempted",
    };

    let emailSent = false;
    try {
      emailStatus = await notifyUserDeliveryCompleted({
        orderId: Number(order_id),
      });
      emailSent = Boolean(emailStatus && emailStatus.sent);
    } catch (mailError) {
      emailStatus = {
        sent: false,
        reason: "unexpected-mail-error",
        error: mailError.message,
      };

      // Do not fail delivery completion if email transport is unavailable.
      console.error(
        `Delivery completion email failed for order ${order_id}:`,
        mailError.message,
      );
    }

    res.json({
      message: "Delivery completed and money transfer confirmation sent",
      email_sent: emailSent,
      email_status: emailStatus,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error completing delivery" });
  }
};

// ======================= CONFIRM PAYMENT =======================
exports.confirmPayment = async (req, res) => {
  try {
    const { order_id } = req.params;

    await ensurePaymentConfirmationTable();

    const orderRes = await db.query(SQL.q_0019, [order_id]);

    const order = orderRes.rows[0];

    if (!order) return res.status(404).json({ error: "Order not found" });

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

    const paymentConfirmationRes = await db.query(SQL.q_0020, [order_id]);

    if (paymentConfirmationRes.rows.length === 0) {
      return res.status(400).json({
        error: "Rider has not submitted payment confirmation yet",
      });
    }

    await db.query(SQL.q_0021, [order_id]);

    await db.query(SQL.q_0022, [order_id, req.user.id]);

    res.json({ message: "Payment confirmed" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error confirming payment" });
  }
};
