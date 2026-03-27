const db = require("../db");

exports.getAllProducts = async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM Product");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Database error" });
  }
};

exports.getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const result = await db.query(
      "SELECT * FROM Product WHERE category_id = $1",
      [categoryId]
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
