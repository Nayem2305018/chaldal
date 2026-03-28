/**
 * Auth Controller
 * Handles signup, login, token verification, and role-aware authentication flows.
 */
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");

const isRecoverableAuthSchemaError = (error) => {
  // 42P01: undefined_table, 42703: undefined_column
  return error && (error.code === "42P01" || error.code === "42703");
};

const findUserByEmail = async (email) => {
  const tablePriority = [
    { table: "users", role: "user" },
    { table: "rider", role: "rider" },
    { table: "admin", role: "admin" },
  ];

  for (const { table, role } of tablePriority) {
    try {
      const result = await db.query(`SELECT * FROM ${table} WHERE email = $1`, [
        email,
      ]);
      if (result.rows.length > 0) {
        return { user: result.rows[0], userRole: role };
      }
    } catch (error) {
      if (isRecoverableAuthSchemaError(error)) {
        console.warn(`Skipping ${table} lookup: ${error.message}`);
        continue;
      }
      throw error;
    }
  }

  return { user: null, userRole: null };
};

const safeEmailExists = async (tableName, email) => {
  try {
    const result = await db.query(
      `SELECT 1 FROM ${tableName} WHERE email = $1`,
      [email],
    );
    return result.rows.length > 0;
  } catch (error) {
    if (isRecoverableAuthSchemaError(error)) {
      console.warn(
        `Skipping duplicate email check for ${tableName}: ${error.message}`,
      );
      return false;
    }
    throw error;
  }
};

// Generate JWT Token
const generateToken = (id, role, email) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

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

    // Check if email already exists across all auth-related tables
    const [userExists, riderExists, adminExists, riderRequestExists] =
      await Promise.all([
        safeEmailExists("users", email),
        safeEmailExists("rider", email),
        safeEmailExists("admin", email),
        safeEmailExists("rider_requests", email),
      ]);

    if (userExists || riderExists || adminExists || riderRequestExists) {
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
      const appointmentCode = String(appointment_code || "").trim();

      if (!appointmentCode) {
        return res
          .status(400)
          .json({ error: "Appointment code is required for rider signup" });
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
        appointmentCode,
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

    const { user, userRole } = await findUserByEmail(email);

    // User not found
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    let passwordMatch = false;

    if (userRole === "admin") {
      if (user.password_hash) {
        try {
          passwordMatch = await bcrypt.compare(password, user.password_hash);
        } catch (err) {
          passwordMatch = password === user.password_hash;
        }
      }

      if (!passwordMatch && user.password) {
        passwordMatch = password === user.password;
      }
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

    // JWT must exist before issuing tokens
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        error:
          "Server authentication is not configured. Please set JWT_SECRET.",
      });
    }

    // Generate JWT Token
    const token = generateToken(userId, userRole, email);

    const displayName = user.name || user.rider_name || "User";

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
        name: displayName,
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


