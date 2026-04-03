/**
 * Product Controller
 * Serves product catalog data, active product discounts, and product CRUD operations.
 * SQL artifacts: backend/sql/controllers/product/{queries,functions,procedures,triggers}.sql
 */
const db = require("../db");
const { ensureOfferSchema } = require("../utils/offerService");
const { getSql } = require("../utils/sqlFileLoader");
const SQL = getSql("product");

exports.getAllProducts = async (req, res) => {
  try {
    await ensureOfferSchema(db);
    const result = await db.query(SQL.select_all_products_with_discount);
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
      SQL.select_products_by_category_with_discount,
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

    const result = await db.query(SQL.select_active_product_offers);

    res.json(result.rows.slice(0, limit));
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

    await db.query(SQL.insert_product, [
      product_id,
      product_name,
      price,
      unit,
      category_id,
      added_by_admin,
    ]);

    const result = await db.query(SQL.select_product_by_id, [product_id]);

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

    const result = await db.query(SQL.delete_product_by_id, [productId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({
      message: "Product deleted successfully",
      product_id: Number(productId),
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message || "Database error" });
  }
};
