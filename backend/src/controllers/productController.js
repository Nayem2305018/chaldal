/**
 * Product Controller
 * Serves product catalog data, active product discounts, and product CRUD operations.
 */
const db = require("../db");
const { ensureOfferSchema } = require("../utils/offerService");

const PRODUCT_WITH_DISCOUNT_SELECT = `
  SELECT
    p.*,
    COALESCE(ad.effective_discount_amount, 0)::NUMERIC(10,2) AS product_discount_amount,
    GREATEST(p.price - COALESCE(ad.effective_discount_amount, 0), 0)::NUMERIC(10,2) AS discounted_price,
    ad.product_discount_id AS active_product_discount_id,
    ad.discount_type AS active_discount_type,
    ad.discount_value AS active_discount_value,
    ad.max_discount_amount AS active_max_discount_amount,
    ad.start_at AS active_discount_start_at,
    ad.end_at AS active_discount_end_at
  FROM product p
  LEFT JOIN LATERAL (
    SELECT
      pd.product_discount_id,
      pd.discount_type,
      pd.discount_value,
      pd.max_discount_amount,
      pd.start_at,
      pd.end_at,
      LEAST(
        CASE
          WHEN pd.discount_type = 'percentage' THEN (p.price * pd.discount_value / 100.0)
          WHEN pd.discount_type = 'fixed_amount' THEN pd.discount_value
          ELSE 0
        END,
        COALESCE(pd.max_discount_amount, p.price),
        p.price
      )::NUMERIC(10,2) AS effective_discount_amount
    FROM product_discounts pd
    WHERE pd.product_id = p.product_id
      AND pd.is_active = TRUE
      AND (pd.start_at IS NULL OR pd.start_at <= NOW())
      AND (pd.end_at IS NULL OR pd.end_at >= NOW())
    ORDER BY effective_discount_amount DESC, pd.product_discount_id DESC
    LIMIT 1
  ) ad ON TRUE
`;

exports.getAllProducts = async (req, res) => {
  try {
    await ensureOfferSchema(db);
    const result = await db.query(
      `${PRODUCT_WITH_DISCOUNT_SELECT}
       ORDER BY p.product_id`,
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Database error" });
  }
};

exports.getProductsByCategory = async (req, res) => {
  try {
    await ensureOfferSchema(db);
    const { categoryId } = req.params;
    const result = await db.query(
      `${PRODUCT_WITH_DISCOUNT_SELECT}
       WHERE p.category_id = $1
       ORDER BY p.product_id`,
      [categoryId],
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Database error" });
  }
};

exports.getActiveProductOffers = async (req, res) => {
  try {
    await ensureOfferSchema(db);

    const requestedLimit = Number(req.query.limit || 6);
    const limit =
      Number.isInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 20)
        : 6;

    const result = await db.query(
      `${PRODUCT_WITH_DISCOUNT_SELECT}
       WHERE COALESCE(ad.effective_discount_amount, 0) > 0
       ORDER BY COALESCE(ad.effective_discount_amount, 0) DESC,
                ad.end_at ASC NULLS LAST,
                p.product_id ASC
       LIMIT $1`,
      [limit],
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Database error" });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const {
      product_id,
      product_name,
      price,
      unit,
      category_id,
      added_by_admin,
    } = req.body;

    // Validation
    if (!product_id || !product_name || !price || !category_id) {
      return res.status(400).json({
        error:
          "Missing required fields: product_id, product_name, price, category_id",
      });
    }

    const query = `
      INSERT INTO product (product_id, product_name, price, unit, category_id, added_by_admin)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const result = await db.query(query, [
      product_id,
      product_name,
      price,
      unit,
      category_id,
      added_by_admin,
    ]);
    res.status(201).json({
      message: "Product created successfully",
      product: result.rows[0],
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message || "Database error" });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const query = "DELETE FROM product WHERE product_id = $1 RETURNING *;";
    const result = await db.query(query, [productId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({
      message: "Product deleted successfully",
      product: result.rows[0],
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message || "Database error" });
  }
};
