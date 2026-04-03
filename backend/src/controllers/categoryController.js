/**
 * Category Controller
 * Serves category listing and category-related catalog data.
 * SQL artifacts: backend/sql/controllers/category/{queries,functions,procedures,triggers}.sql
 */
const db = require("../db");

const { getSql } = require("../utils/sqlFileLoader");
const SQL = getSql("category");
exports.getAllCategories = async (req, res) => {
  try {
    const result = await db.query(SQL.q_0001);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Database error" });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { category_name, photourl } = req.body;
    const resultId = await db.query(
      SQL.q_0002,
    );
    await db.query(
      SQL.q_0003,
      [resultId.rows[0].next_id, category_name, photourl || ""],
    );
    res.json({ message: "Category created successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to create category" });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { category_name, photourl } = req.body;
    await db.query(
      SQL.q_0004,
      [category_name, photourl, req.params.id],
    );
    res.json({ message: "Category updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update category" });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    await db.query(SQL.q_0005, [
      req.params.id,
    ]);
    res.json({ message: "Category deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete category" });
  }
};
