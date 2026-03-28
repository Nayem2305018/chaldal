/**
 * Category Controller
 * Serves category listing and category-related catalog data.
 */
const db = require("../db");


exports.getAllCategories = async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM Category");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Database error" });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { category_name, photourl } = req.body;
    const resultId = await db.query("SELECT COALESCE(MAX(category_id), 0) + 1 AS next_id FROM category");
    await db.query("INSERT INTO category (category_id, category_name, photourl) VALUES ($1, $2, $3)", [resultId.rows[0].next_id, category_name, photourl || ""]);
    res.json({ message: "Category created successfully" });
  } catch (err) { res.status(500).json({ error: "Failed to create category" }); }
};

exports.updateCategory = async (req, res) => {
  try {
    const { category_name, photourl } = req.body;
    await db.query("UPDATE category SET category_name = COALESCE($1, category_name), photourl = COALESCE($2, photourl) WHERE category_id = $3", [category_name, photourl, req.params.id]);
    res.json({ message: "Category updated successfully" });
  } catch (err) { res.status(500).json({ error: "Failed to update category" }); }
};

exports.deleteCategory = async (req, res) => {
  try {
    await db.query("DELETE FROM category WHERE category_id = $1", [req.params.id]);
    res.json({ message: "Category deleted successfully" });
  } catch (err) { res.status(500).json({ error: "Failed to delete category" }); }
};


