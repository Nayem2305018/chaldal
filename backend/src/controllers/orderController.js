
const db = require("../db");
const { sendEmail } = require("../utils/emailService");
const {
  ensureOfferSchema,
  computeDiscountAmount,
  normalizeVoucherCode,
  pickBestProductDiscount,
  roundMoney,
} = require("../utils/offerService");

let paymentConfirmationTableReady = false;
let warehouseAllocationSchemaReady = false;

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

const ensureWarehouseAllocationSchema = async () => {
  if (warehouseAllocationSchemaReady) {
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

  warehouseAllocationSchemaReady = true;
};

const syncProductStockTotal = async (client, productId) => {
  try {
    await client.query(
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
  const orderDetailsRes = await db.query(
    `
    SELECT
      o.order_id,
      o.total_price,
      o.delivery_address,
      o.order_date,
      u.name AS customer_name,
      u.email AS customer_email,
      (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'product_name', p.product_name,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'subtotal', oi.subtotal
            )
            ORDER BY oi.order_item_id
          ),
          '[]'::json
        )
        FROM order_item oi
        JOIN product p ON p.product_id = oi.product_id
        WHERE oi.order_id = o.order_id
      ) AS items
    FROM orders o
    JOIN users u ON u.user_id = o.user_id
    WHERE o.order_id = $1
    LIMIT 1
    `,
    [orderId],
  );

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

  const result = await client.query(
    `
    SELECT
      product_discount_id,
      product_id,
      discount_type,
      discount_value,
      max_discount_amount,
      start_at,
      end_at,
      is_active
    FROM product_discounts
    WHERE product_id = ANY($1::INT[])
      AND is_active = TRUE
      AND (start_at IS NULL OR start_at <= NOW())
      AND (end_at IS NULL OR end_at >= NOW())
    `,
    [productIds],
  );

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
    `
    SELECT cart_id
    FROM cart
    WHERE user_id = $1
      AND status = 'active'
    ${lockRows ? "FOR UPDATE" : ""}
    `,
    [userId],
  );

  if (cartRes.rows.length === 0) {
    throw buildHttpError(400, "No active cart found");
  }

  const cartId = Number(cartRes.rows[0].cart_id);

  const itemsRes = await client.query(
    `
    SELECT
      ci.product_id,
      ci.quantity,
      COALESCE(ci.unit_price, p.price) AS base_unit_price,
      p.product_name,
      COALESCE(p.stock_quantity, 0) AS fallback_stock_quantity
    FROM cart_item ci
    JOIN product p ON p.product_id = ci.product_id
    WHERE ci.cart_id = $1
    ${lockRows ? "FOR UPDATE OF ci" : ""}
    `,
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
    const bestDiscount = pickBestProductDiscount(discountRows, baseUnitPrice);
    const productDiscountPerUnit = Number(bestDiscount?.discount_amount || 0);
    const effectiveUnitPrice = roundMoney(
      baseUnitPrice - productDiscountPerUnit,
    );

    const lineBaseTotal = roundMoney(baseUnitPrice * quantity);
    const lineProductDiscountTotal = roundMoney(
      productDiscountPerUnit * quantity,
    );
    const lineTotal = roundMoney(effectiveUnitPrice * quantity);

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
    const voucherRes = await client.query(
      `
      SELECT *
      FROM vouchers
      WHERE UPPER(code) = UPPER($1)
      LIMIT 1
      `,
      [normalizedCode],
    );

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

    const usageRes = await client.query(
      `
      SELECT COUNT(*)::INT AS usage_count
      FROM voucher_usage_history
      WHERE voucher_id = $1
        AND user_id = $2
      `,
      [voucher.voucher_id, userId],
    );

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

// ======================= CHECKOUT =======================
exports.checkout = async (req, res) => {
  const client = await db.connect();

  try {
    await ensureWarehouseAllocationSchema();

    const userId = req.user.id;
    const { delivery_address, preferred_delivery_time, voucher_code } =
      req.body;

    if (!delivery_address)
      return res.status(400).json({ error: "Delivery address is required" });

    if (!preferred_delivery_time)
      return res
        .status(400)
        .json({ error: "Preferred delivery time is required" });

    await client.query("BEGIN");

    const pricing = await calculateCartPricing({
      client,
      userId,
      voucherCode: voucher_code,
      lockRows: true,
    });

    const cartId = pricing.cart_id;

    // Stock validation against all warehouses combined
    for (const item of pricing.items) {
      const stockRes = await client.query(
        `
        SELECT COALESCE(SUM(stock_quantity), 0)::INT AS total_stock
        FROM inventory
        WHERE product_id = $1
        `,
        [item.product_id],
      );

      let totalStock = Number(stockRes.rows[0]?.total_stock || 0);

      // Backward compatibility for old datasets that still only track product.stock_quantity
      if (totalStock === 0) {
        totalStock = Number(item.fallback_stock_quantity || 0);
      }

      if (Number(item.quantity) > totalStock) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: `Sorry! limited stock for product ${item.product_id}`,
        });
      }
    }

    // Create order with manual ID handling
    const maxOrderRes = await client.query(
      "SELECT COALESCE(MAX(order_id), 0) + 1 AS next_id FROM orders",
    );
    const orderId = maxOrderRes.rows[0].next_id;

    await client.query(
      `INSERT INTO orders 
      (
        order_id,
        user_id,
        total_price,
        order_status,
        payment_status,
        order_date,
        delivery_address,
        preferred_delivery_time,
        subtotal_before_discount,
        product_discount_total,
        voucher_discount_total,
        voucher_code
      ) 
      VALUES ($1, $2, $3, 'pending', 'unpaid', NOW(), $4, $5, $6, $7, $8, $9)`,
      [
        orderId,
        userId,
        pricing.final_total,
        delivery_address,
        preferred_delivery_time,
        pricing.subtotal_before_discount,
        pricing.product_discount_total,
        pricing.voucher_discount_total,
        pricing.applied_voucher?.code || null,
      ],
    );
    // Fetch Base Order Item ID
    const maxOrderItemRes = await client.query(
      "SELECT COALESCE(MAX(order_item_id), 0) AS max_id FROM order_item",
    );
    let nextOrderItemId = maxOrderItemRes.rows[0].max_id;

    // Insert order items
    for (const item of pricing.items) {
      nextOrderItemId++;
      const subtotal = Number(item.line_total);

      await client.query(
        `
        INSERT INTO order_item (
          order_item_id,
          order_id,
          product_id,
          quantity,
          unit_price,
          subtotal,
          original_unit_price,
          product_discount_per_unit,
          applied_product_discount_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          nextOrderItemId,
          orderId,
          item.product_id,
          item.quantity,
          item.effective_unit_price,
          subtotal,
          item.base_unit_price,
          item.product_discount_per_unit,
          item.applied_product_discount_id,
        ],
      );
    }

    if (pricing.applied_voucher && pricing.voucher_discount_total > 0) {
      const usageIdRes = await client.query(
        "SELECT COALESCE(MAX(usage_id), 0) + 1 AS next_id FROM voucher_usage_history",
      );
      const usageId = Number(usageIdRes.rows[0].next_id);

      await client.query(
        `
        INSERT INTO voucher_usage_history (
          usage_id,
          voucher_id,
          user_id,
          order_id,
          voucher_code,
          discount_amount,
          used_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `,
        [
          usageId,
          pricing.applied_voucher.voucher_id,
          userId,
          orderId,
          pricing.applied_voucher.code,
          pricing.voucher_discount_total,
        ],
      );
    }

    // Mark cart as ordered
    await client.query(
      "UPDATE cart SET status = 'ordered' WHERE cart_id = $1",
      [cartId],
    );

    await client.query("COMMIT");

    res.json({
      message: "Your order is on its way!",
      order_id: orderId,
      pricing: {
        subtotal_before_discount: pricing.subtotal_before_discount,
        product_discount_total: pricing.product_discount_total,
        voucher_discount_total: pricing.voucher_discount_total,
        final_total: pricing.final_total,
        applied_voucher: pricing.applied_voucher,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
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
      [req.user.id],
    );

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

    const result = await db.query(
      `
      SELECT o.*, d.delivery_id, d.delivery_status, d.warehouse_id,
      rpc.rider_message AS rider_payment_message,
      rpc.sent_at AS rider_payment_sent_at,
      rpc.admin_confirmed_at,
      (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'warehouse_id', dia.warehouse_id,
              'product_id', dia.product_id,
              'product_name', p.product_name,
              'allocated_quantity', dia.allocated_quantity
            )
            ORDER BY dia.warehouse_id, dia.product_id
          ),
          '[]'::json
        )
        FROM delivery_inventory_allocation dia
        JOIN product p ON p.product_id = dia.product_id
        WHERE dia.order_id = o.order_id
      ) AS warehouse_allocations,
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
      LEFT JOIN rider_payment_confirmation rpc ON rpc.order_id = o.order_id
      WHERE d.rider_id = $1
      ORDER BY o.order_date DESC
      `,
      [req.user.id],
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
      `,
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

    const preferredWarehouseId =
      warehouse_id === undefined || warehouse_id === null || warehouse_id === ""
        ? null
        : Number(warehouse_id);

    if (
      preferredWarehouseId !== null &&
      !Number.isInteger(preferredWarehouseId)
    ) {
      return res.status(400).json({
        error: "warehouse_id must be a valid integer if provided",
      });
    }

    await ensureWarehouseAllocationSchema();
    await ensurePaymentConfirmationTable();

    await client.query("BEGIN");

    const pendingVerificationRes = await client.query(
      `
      SELECT o.order_id
      FROM delivery d
      JOIN orders o ON o.order_id = d.order_id
      WHERE d.rider_id = $1
        AND d.delivery_status = 'delivered'
        AND o.payment_status <> 'paid'
      ORDER BY o.order_date ASC
      LIMIT 1
      `,
      [rider_id],
    );

    if (pendingVerificationRes.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `You cannot assign a new order until admin verifies collected payment for order #${pendingVerificationRes.rows[0].order_id}`,
      });
    }

    if (preferredWarehouseId !== null) {
      const warehouseRes = await client.query(
        "SELECT warehouse_id FROM warehouse WHERE warehouse_id = $1",
        [preferredWarehouseId],
      );

      if (warehouseRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ error: "Selected warehouse does not exist" });
      }
    }

    const orderRes = await client.query(
      "SELECT * FROM orders WHERE order_id = $1 FOR UPDATE",
      [order_id],
    );

    if (orderRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orderRes.rows[0];

    if (order.order_status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Already assigned" });
    }

    // Prevent duplicate assignment
    const check = await client.query(
      "SELECT * FROM delivery WHERE order_id = $1",
      [order_id],
    );

    if (check.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Already assigned" });
    }

    const orderItemsRes = await client.query(
      `
      SELECT oi.product_id, oi.quantity, p.product_name
      FROM order_item oi
      JOIN product p ON p.product_id = oi.product_id
      WHERE oi.order_id = $1
      `,
      [order_id],
    );

    if (orderItemsRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Order has no items to allocate" });
    }

    const allocationRows = [];

    for (const item of orderItemsRes.rows) {
      if (preferredWarehouseId !== null) {
        const preferredStockRes = await client.query(
          `
          SELECT i.stock_quantity
          FROM inventory i
          WHERE i.product_id = $1
            AND i.warehouse_id = $2
          FOR UPDATE
          `,
          [item.product_id, preferredWarehouseId],
        );

        const availableInPreferredWarehouse = Number(
          preferredStockRes.rows[0]?.stock_quantity || 0,
        );

        if (availableInPreferredWarehouse < Number(item.quantity)) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            error: `Insufficient stock for ${item.product_name} in warehouse ${preferredWarehouseId}. Required ${item.quantity}, available ${availableInPreferredWarehouse}. Please collect the items from another warehouse.`,
          });
        }

        allocationRows.push({
          order_id: Number(order_id),
          product_id: Number(item.product_id),
          product_name: item.product_name,
          warehouse_id: preferredWarehouseId,
          allocated_quantity: Number(item.quantity),
        });

        continue;
      }

      const inventoryRowsRes = await client.query(
        `
        SELECT i.warehouse_id, i.stock_quantity
        FROM inventory i
        WHERE i.product_id = $1
          AND i.stock_quantity > 0
        ORDER BY
          CASE WHEN $2::INT IS NOT NULL AND i.warehouse_id = $2 THEN 0 ELSE 1 END,
          i.stock_quantity DESC,
          i.warehouse_id ASC
        FOR UPDATE
        `,
        [item.product_id, preferredWarehouseId],
      );

      const inventoryRows = inventoryRowsRes.rows;
      const totalAvailable = inventoryRows.reduce(
        (sum, row) => sum + Number(row.stock_quantity),
        0,
      );

      if (totalAvailable < Number(item.quantity)) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: `Not enough stock for ${item.product_name}. Required ${item.quantity}, available ${totalAvailable}.`,
        });
      }

      let remaining = Number(item.quantity);

      for (const stockRow of inventoryRows) {
        if (remaining <= 0) break;

        const availableInWarehouse = Number(stockRow.stock_quantity);
        const takeQty = Math.min(remaining, availableInWarehouse);

        if (takeQty > 0) {
          allocationRows.push({
            order_id: Number(order_id),
            product_id: Number(item.product_id),
            product_name: item.product_name,
            warehouse_id: Number(stockRow.warehouse_id),
            allocated_quantity: takeQty,
          });
          remaining -= takeQty;
        }
      }
    }

    // Fetch manual ID as legacy schema lacks SERIAL sequence
    const maxDelRes = await client.query(
      "SELECT COALESCE(MAX(delivery_id), 0) + 1 AS next_id FROM delivery",
    );
    const next_delivery_id = maxDelRes.rows[0].next_id;

    const primaryWarehouseId =
      preferredWarehouseId || allocationRows[0]?.warehouse_id || null;

    await client.query(
      `
      INSERT INTO delivery (delivery_id, order_id, rider_id, delivery_status, warehouse_id, assigned_at)
      VALUES ($1, $2, $3, 'assigned', $4, NOW())
      `,
      [next_delivery_id, order_id, rider_id, primaryWarehouseId],
    );

    const touchedProducts = new Set();

    for (const row of allocationRows) {
      const reduceStockRes = await client.query(
        `
        UPDATE inventory
        SET stock_quantity = stock_quantity - $1,
            last_updated = NOW()
        WHERE product_id = $2
          AND warehouse_id = $3
          AND stock_quantity >= $1
        `,
        [row.allocated_quantity, row.product_id, row.warehouse_id],
      );

      if (reduceStockRes.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "Inventory changed while assigning. Please retry assignment.",
        });
      }

      await client.query(
        `
        INSERT INTO delivery_inventory_allocation
          (delivery_id, order_id, product_id, warehouse_id, allocated_quantity)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          next_delivery_id,
          row.order_id,
          row.product_id,
          row.warehouse_id,
          row.allocated_quantity,
        ],
      );

      touchedProducts.add(row.product_id);
    }

    for (const productId of touchedProducts) {
      await syncProductStockTotal(client, productId);
    }

    await client.query(
      "UPDATE orders SET order_status = 'assigned' WHERE order_id = $1",
      [order_id],
    );

    await client.query("COMMIT");

    res.json({
      message: "Order assigned successfully",
      allocations: allocationRows,
      primary_warehouse_id: primaryWarehouseId,
    });
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
      [order_id, rider_id],
    );

    if (check.rows.length === 0)
      return res.status(403).json({ error: "Not your order" });

    await db.query(
      "UPDATE orders SET order_status = 'delivering' WHERE order_id = $1",
      [order_id],
    );

    await db.query(
      "UPDATE delivery SET delivery_status = 'delivering' WHERE order_id = $1",
      [order_id],
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

    const check = await db.query(
      "SELECT * FROM delivery WHERE order_id = $1 AND rider_id = $2",
      [order_id, rider_id],
    );

    if (check.rows.length === 0)
      return res.status(403).json({ error: "Not your order" });

    const orderRes = await db.query(
      "SELECT * FROM orders WHERE order_id = $1",
      [order_id],
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

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
      [order_id],
    );

    await db.query(
      `
      UPDATE delivery 
      SET delivery_status = 'delivered',
          delivered_at = NOW()
      WHERE order_id = $1
      `,
      [order_id],
    );

    await db.query(
      `
      INSERT INTO rider_payment_confirmation (order_id, rider_id, rider_message, sent_at, admin_confirmed_at, admin_confirmed_by)
      VALUES ($1, $2, $3, NOW(), NULL, NULL)
      ON CONFLICT (order_id)
      DO UPDATE
      SET rider_id = EXCLUDED.rider_id,
          rider_message = EXCLUDED.rider_message,
          sent_at = NOW(),
          admin_confirmed_at = NULL,
          admin_confirmed_by = NULL
      `,
      [order_id, rider_id, String(payment_confirmation_message).trim()],
    );

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

    const orderRes = await db.query(
      "SELECT * FROM orders WHERE order_id = $1",
      [order_id],
    );

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

    const paymentConfirmationRes = await db.query(
      "SELECT * FROM rider_payment_confirmation WHERE order_id = $1",
      [order_id],
    );

    if (paymentConfirmationRes.rows.length === 0) {
      return res.status(400).json({
        error: "Rider has not submitted payment confirmation yet",
      });
    }

    await db.query(
      "UPDATE orders SET payment_status = 'paid' WHERE order_id = $1",
      [order_id],
    );

    await db.query(
      `
      UPDATE rider_payment_confirmation
      SET admin_confirmed_at = NOW(),
          admin_confirmed_by = $2
      WHERE order_id = $1
      `,
      [order_id, req.user.id],
    );

    res.json({ message: "Payment confirmed" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error confirming payment" });
  }
};
