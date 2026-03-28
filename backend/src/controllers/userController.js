/**
 * User Controller
 * Handles user-profile related API responses and user data operations.
 */
const db = require("../db");

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.query(
      "SELECT user_id, name, email, phone, created_at FROM users WHERE user_id = $1",
      [userId]
    );

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

    const result = await db.query(
      `
      UPDATE users 
      SET name = COALESCE($1, name), 
          phone = COALESCE($2, phone)
      WHERE user_id = $3
      RETURNING user_id, name, email, phone
      `,
      [name, phone, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "Profile updated successfully",
      user: result.rows[0]
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


