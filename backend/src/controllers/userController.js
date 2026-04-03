/**
 * User Controller
 * Handles user-profile related API responses and user data operations.
 * SQL artifacts: backend/sql/controllers/user/{queries,functions,procedures,triggers}.sql
 */
const db = require("../db");

const { getSql } = require("../utils/sqlFileLoader");
const SQL = getSql("user");
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.query(SQL.q_0001, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone } = req.body;

    const result = await db.query(SQL.q_0002, [name, phone, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const updatedUser = await db.query(SQL.q_0003, [userId]);

    res.json({
      message: "Profile updated successfully",
      user: updatedUser.rows[0],
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
