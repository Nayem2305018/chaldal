const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");

// Predefined appointment codes for riders
const VALID_APPOINTMENT_CODES = {
  RIDER2024: "admin-created",
  APP_CODE_001: "admin-created",
};

// Generate JWT Token
const generateToken = (id, role, email) => {
  return jwt.sign({ id, role, email }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

exports.signup = async (req, res) => {
  try {
    const { name, email, password, phone, role, appointment_code } = req.body;

    // Validate required fields
    if (!name || !email || !password || !phone || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Prevent admin signup
    if (role === "admin") {
      return res.status(400).json({ error: "Admin signup is not allowed" });
    }

    if (role !== "user" && role !== "rider") {
      return res.status(400).json({ error: "Role must be 'user' or 'rider'" });
    }

    // Check if email already exists across all tables
    const userExists = await db.query(
      "SELECT email FROM users WHERE email = $1",
      [email],
    );
    const riderExists = await db.query(
      "SELECT email FROM rider WHERE email = $1",
      [email],
    );
    const adminExists = await db.query(
      "SELECT email FROM admin WHERE email = $1",
      [email],
    );
    const riderRequestExists = await db.query(
      "SELECT email FROM rider_requests WHERE email = $1",
      [email],
    );

    if (
      userExists.rows.length > 0 ||
      riderExists.rows.length > 0 ||
      adminExists.rows.length > 0 ||
      riderRequestExists.rows.length > 0
    ) {
      return res.status(409).json({ error: "Email already registered" });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // SIGNUP LOGIC FOR USERS
    if (role === "user") {
      const nextIdResult = await db.query(
        "SELECT COALESCE(MAX(user_id), 0) + 1 AS next_id FROM users",
      );
      const nextId = nextIdResult.rows[0].next_id;

      const insertQuery = `
        INSERT INTO users (user_id, name, email, password_hash, phone, created_at) 
        VALUES ($1, $2, $3, $4, $5, NOW()) 
        RETURNING user_id, name, email, phone
      `;

      const newUser = await db.query(insertQuery, [
        nextId,
        name,
        email,
        password_hash,
        phone,
      ]);

      return res.status(201).json({
        message: "User signed up successfully. You can now login.",
        user: newUser.rows[0],
      });
    }

    // SIGNUP LOGIC FOR RIDERS
    if (role === "rider") {
      if (!appointment_code) {
        return res
          .status(400)
          .json({ error: "Appointment code is required for rider signup" });
      }

      // Validate appointment code
      if (!VALID_APPOINTMENT_CODES[appointment_code]) {
        return res.status(400).json({ error: "Invalid appointment code" });
      }

      // Insert into rider_requests (NOT rider table)
      const insertQuery = `
        INSERT INTO rider_requests (name, email, password_hash, phone, appointment_code, status, created_at) 
        VALUES ($1, $2, $3, $4, $5, 'pending', NOW()) 
        RETURNING request_id, name, email, phone
      `;

      const newRequest = await db.query(insertQuery, [
        name,
        email,
        password_hash,
        phone,
        appointment_code,
      ]);

      return res.status(201).json({
        message:
          "Rider signup request submitted successfully. Please wait for admin approval.",
        request: newRequest.rows[0],
      });
    }
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    let user = null;
    let userRole = null;

    // Search in users table
    const userResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (userResult.rows.length > 0) {
      user = userResult.rows[0];
      userRole = "user";
    }

    // Search in rider table
    if (!user) {
      const riderResult = await db.query(
        "SELECT * FROM rider WHERE email = $1",
        [email],
      );
      if (riderResult.rows.length > 0) {
        user = riderResult.rows[0];
        userRole = "rider";
      }
    }

    // Search in admin table
    if (!user) {
      const adminResult = await db.query(
        "SELECT * FROM admin WHERE email = $1",
        [email],
      );
      if (adminResult.rows.length > 0) {
        user = adminResult.rows[0];
        userRole = "admin";
      }
    }

    // User not found
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    let passwordMatch = false;

    if (userRole === "admin") {
      // Admin: direct string comparison (no bcrypt)
      passwordMatch = password === user.password;
    } else if (userRole === "user" || userRole === "rider") {
      // User & Rider: try bcrypt comparison first, then fallback to plain text if necessary
      if (!user.password_hash && !user.password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      try {
        if (user.password_hash) {
          passwordMatch = await bcrypt.compare(password, user.password_hash);
        }
      } catch (err) {
        // Fallback to plain text check if bcrypt fails or hash is missing
        passwordMatch = password === (user.password_hash || user.password);
      }

      // Final strict fallback for plain text if bcrypt didn't match
      if (!passwordMatch) {
         passwordMatch = password === (user.password_hash || user.password);
      }
    }

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Determine user ID based on table
    let userId;
    if (userRole === "user") {
      userId = user.user_id;
    } else if (userRole === "rider") {
      userId = user.rider_id;
    } else if (userRole === "admin") {
      userId = user.admin_id;
    }

    // Generate JWT Token
    const token = generateToken(userId, userRole, email);

    // Determine redirect path
    const redirectPath =
      userRole === "admin"
        ? "/admin/dashboard"
        : userRole === "rider"
          ? "/rider/dashboard"
          : "/user/dashboard";

    res.status(200).json({
      message: "Login successful",
      token,
      role: userRole,
      user: {
        id: userId,
        name: user.name,
        email: user.email,
      },
      redirectPath,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.logout = (req, res) => {
  // JWT is stateless, so logout just requires client to remove token
  res.status(200).json({ message: "Logged out successfully" });
};

exports.verifyToken = (req, res) => {
  // This endpoint allows frontend to verify if token is still valid
  res.status(200).json({
    message: "Token is valid",
    user: req.user,
  });
};
