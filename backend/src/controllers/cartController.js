/**
 * Cart Controller
 * Handles cart retrieval, add/remove item operations, and cart quantity/price updates.
 * SQL artifacts: backend/sql/controllers/cart/{queries,functions,procedures,triggers}.sql
 */
const db = require("../db");
const { ensureRegionSchema } = require("../utils/regionService");

const { getSql } = require("../utils/sqlFileLoader");
const SQL = getSql("cart");
let cartPricingColumnsReady = false;

const outOfStockMessage = "Product is out of stock.";
const limitedStockMessage = "Sorry! limited quantity available";

const getUserRegionId = async (userId) => {
  const regionRes = await db.query(SQL.q_0020, [userId]);
  const regionId = Number(regionRes.rows[0]?.region_id);

  if (!Number.isInteger(regionId) || regionId <= 0) {
    return null;
  }

  return regionId;
};

const ensureCartPricingColumns = async () => {
  if (cartPricingColumnsReady) {
    return;
  }

  try {
    await db.query(SQL.q_0001);
  } catch (error) {
    // 42701: duplicate_column (column already exists)
    if (error.code !== "42701") {
      throw error;
    }
  }

  try {
    await db.query(SQL.q_0002);
  } catch (error) {
    if (error.code !== "42701") {
      throw error;
    }
  }

  cartPricingColumnsReady = true;
};

exports.getCart = async (req, res) => {
  try {
    await ensureCartPricingColumns();
    await ensureRegionSchema(db);

    const userId = req.user.id;
    const regionId = await getUserRegionId(userId);

    if (!regionId) {
      return res.status(400).json({
        error: "User default region is not configured",
      });
    }

    // Get active cart
    const cartRes = await db.query(SQL.q_0003, [userId]);
    let cartId = null;

    if (cartRes.rows.length === 0) {
      // Create new active cart (No longer automatically created on getCart, but we can do it if needed. Actually prompt says: "Do not create a cart on login; create on first add-to-cart action". So if getCart runs and no active cart, just return empty items.)
      return res.json({ cart_id: null, items: [], subtotal: 0, total: 0 });
    } else {
      cartId = cartRes.rows[0].cart_id;
    }

    // Get cart items with saved unit prices (if present)
    const itemsRes = await db.query(SQL.q_0004, [cartId, regionId]);

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
    await ensureRegionSchema(db);

    const userId = req.user.id;
    const { product_id } = req.params;
    const quantityToAdd = Number(req.body.quantity || 1);
    const regionId = await getUserRegionId(userId);

    if (!regionId) {
      return res.status(400).json({
        error: "User default region is not configured",
      });
    }

    if (Number.isNaN(quantityToAdd) || quantityToAdd === 0) {
      return res
        .status(400)
        .json({ error: "Quantity must be a non-zero number" });
    }

    // Identify/create cart context
    let cartRes = await db.query(SQL.q_0005, [userId]);
    let cartId;
    if (cartRes.rows.length === 0) {
      const maxIdRes = await db.query(SQL.q_0006);
      cartId = maxIdRes.rows[0].next_id;
      await db.query(SQL.q_0007, [cartId, userId]);
    } else {
      cartId = cartRes.rows[0].cart_id;
      await db.query(SQL.q_0008, [cartId]);
    }

    const existingItemRes = await db.query(SQL.q_0009, [
      cartId,
      product_id,
      regionId,
    ]);

    if (existingItemRes.rows.length > 0) {
      // Reuse previously saved unit_price and only fetch stock for validation.
      const existingItem = existingItemRes.rows[0];
      const stock = Number(existingItem.stock_quantity || 0);
      const newQuantity = Number(existingItem.quantity) + quantityToAdd;

      if (quantityToAdd > 0 && stock <= 0) {
        return res.status(400).json({ error: outOfStockMessage });
      }

      // Allow increment until stock quantity (inclusive), block only above stock.
      if (quantityToAdd > 0 && newQuantity > stock) {
        return res.status(400).json({ error: limitedStockMessage });
      }

      if (newQuantity <= 0) {
        await db.query(SQL.q_0011, [existingItem.cart_item_id]);
      } else {
        let unitPrice = existingItem.unit_price;

        if (unitPrice === null || unitPrice === undefined) {
          const priceRes = await db.query(SQL.q_0012, [product_id]);
          unitPrice = Number(priceRes.rows[0]?.price || 0);
        } else {
          unitPrice = Number(unitPrice);
        }

        const lineTotal = Number((newQuantity * unitPrice).toFixed(2));

        await db.query(SQL.q_0013, [
          newQuantity,
          unitPrice,
          lineTotal,
          existingItem.cart_item_id,
        ]);
      }
    } else {
      if (quantityToAdd < 0) {
        return res
          .status(400)
          .json({ error: "Cannot reduce quantity for non-existing cart item" });
      }

      // First add: fetch price once and save snapshot amount in cart_item.unit_price.
      const prodRes = await db.query(SQL.q_0014, [product_id, regionId]);

      if (prodRes.rows.length === 0) {
        return res.status(404).json({ error: "Product not found" });
      }

      const stock = Number(prodRes.rows[0].stock_quantity);
      const unitPrice = Number(prodRes.rows[0].price);
      const lineTotal = Number((quantityToAdd * unitPrice).toFixed(2));

      if (stock <= 0) {
        return res.status(400).json({ error: outOfStockMessage });
      }

      if (quantityToAdd > stock) {
        return res.status(400).json({ error: limitedStockMessage });
      }

      await db.query(SQL.q_0015, [
        cartId,
        product_id,
        quantityToAdd,
        unitPrice,
        lineTotal,
      ]);
    }

    // Return updated cart directly
    const updatedItems = await db.query(SQL.q_0016, [cartId, regionId]);

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
    await ensureRegionSchema(db);

    const userId = req.user.id;
    const { item_id } = req.params;
    const { quantity } = req.body;
    const configuredRegionId = await getUserRegionId(userId);

    if (!configuredRegionId) {
      return res.status(400).json({
        error: "User default region is not configured",
      });
    }

    // Verify item belongs to user's active cart
    const itemRes = await db.query(SQL.q_0017, [item_id, userId]);

    if (itemRes.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Item not found in your active cart" });
    }

    const item = itemRes.rows[0];

    if (quantity <= 0) {
      await db.query(SQL.q_0018, [item_id]);
    } else {
      if (quantity > item.stock_quantity) {
        return res.status(400).json({ error: limitedStockMessage });
      }

      const basePrice = Number(item.unit_price ?? item.price ?? 0);
      const lineTotal = Number((Number(quantity) * basePrice).toFixed(2));

      await db.query(SQL.q_0019, [quantity, basePrice, lineTotal, item_id]);
    }

    res.json({ message: "Cart item updated successfully" });
  } catch (error) {
    console.error("Update cart item error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
