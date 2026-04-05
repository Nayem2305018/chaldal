/**
 * Auth Controller
 * Handles signup, login, token verification, and role-aware authentication flows.
 * SQL artifacts: backend/sql/controllers/auth/{queries,functions,procedures,triggers}.sql
 */
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");

const { getSql } = require("../utils/sqlFileLoader");
const SQL = getSql("auth");
const { ensureRegionSchema } = require("../utils/regionService");

const EMAIL_LOOKUP_SQL_BY_TABLE = {
  users: SQL.lookup_users_by_email,
  rider: SQL.lookup_rider_by_email,
  admin: SQL.lookup_admin_by_email,
};

const EMAIL_EXISTS_SQL_BY_TABLE = {
  users: SQL.exists_users_by_email,
  rider: SQL.exists_rider_by_email,
  admin: SQL.exists_admin_by_email,
  rider_requests: SQL.exists_rider_requests_by_email,
};

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
      const queryText = EMAIL_LOOKUP_SQL_BY_TABLE[table];
      if (!queryText) {
        continue;
      }

      const result = await db.query(queryText, [email]);
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
    const queryText = EMAIL_EXISTS_SQL_BY_TABLE[tableName];
    if (!queryText) {
      return false;
    }

    const result = await db.query(queryText, [email]);
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
    const regionId = Number(req.body.region_id);

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

    if (!Number.isInteger(regionId) || regionId <= 0) {
      return res.status(400).json({
        error: "A valid region_id is required for signup",
      });
    }

    await ensureRegionSchema(db);

    const regionExistsRes = await db.query(SQL.exists_region_by_id, [regionId]);

    if (regionExistsRes.rows.length === 0) {
      return res.status(400).json({
        error: "Selected region_id does not exist",
      });
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
      const nextIdResult = await db.query(SQL.q_0001);
      const nextId = nextIdResult.rows[0].next_id;

      await db.query(SQL.insert_signup_user, [
        nextId,
        name,
        email,
        password_hash,
        phone,
        regionId,
      ]);

      const newUser = await db.query(SQL.select_signup_user_by_id, [nextId]);

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

      await db.query(SQL.insert_signup_rider_request, [
        name,
        email,
        password_hash,
        phone,
        appointmentCode,
        regionId,
      ]);

      const newRequest = await db.query(
        SQL.select_latest_rider_request_by_email,
        [email],
      );

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

exports.getRegions = async (req, res) => {
  try {
    await ensureRegionSchema(db);

    const result = await db.query(SQL.select_regions);

    return res.status(200).json({ regions: result.rows });
  } catch (error) {
    console.error("Get regions error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const { user, userRole } = await findUserByEmail(email);
    let resolvedUser = user;

    // User not found
    if (!resolvedUser) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    let passwordMatch = false;

    if (userRole === "admin") {
      if (resolvedUser.password_hash) {
        try {
          passwordMatch = await bcrypt.compare(
            password,
            resolvedUser.password_hash,
          );
        } catch (err) {
          passwordMatch = password === resolvedUser.password_hash;
        }
      }

      if (!passwordMatch && resolvedUser.password) {
        passwordMatch = password === resolvedUser.password;
      }
    } else if (userRole === "user" || userRole === "rider") {
      // User & Rider: try bcrypt comparison first, then fallback to plain text if necessary
      if (!resolvedUser.password_hash && !resolvedUser.password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      try {
        if (resolvedUser.password_hash) {
          passwordMatch = await bcrypt.compare(
            password,
            resolvedUser.password_hash,
          );
        }
      } catch (err) {
        // Fallback to plain text check if bcrypt fails or hash is missing
        passwordMatch =
          password === (resolvedUser.password_hash || resolvedUser.password);
      }

      // Final strict fallback for plain text if bcrypt didn't match
      if (!passwordMatch) {
        passwordMatch =
          password === (resolvedUser.password_hash || resolvedUser.password);
      }
    }

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Determine user ID based on table
    let userId;
    if (userRole === "user") {
      userId = resolvedUser.user_id;
    } else if (userRole === "rider") {
      userId = resolvedUser.rider_id;
    } else if (userRole === "admin") {
      userId = resolvedUser.admin_id;
    }

    // Reset active region from home region at login so a new session always starts with home stock rules.
    if (userRole === "user" && Number.isInteger(Number(userId))) {
      await ensureRegionSchema(db);
      await db.query(SQL.reset_user_region_on_logout, [Number(userId)]);

      const refreshedUserRes = await db.query(SQL.lookup_users_by_email, [
        email,
      ]);
      if (refreshedUserRes.rows.length > 0) {
        resolvedUser = refreshedUserRes.rows[0];
      }
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

    const displayName = resolvedUser.name || resolvedUser.rider_name || "User";

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
        email: resolvedUser.email,
        region_id: resolvedUser.region_id || null,
      },
      redirectPath,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.logout = async (req, res) => {
  try {
    if (req.user?.role === "user" && Number.isInteger(Number(req.user.id))) {
      await ensureRegionSchema(db);
      await db.query(SQL.reset_user_region_on_logout, [Number(req.user.id)]);
    }

    // JWT is stateless, so logout mainly requires client to remove token.
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.verifyToken = (req, res) => {
  // This endpoint allows frontend to verify if token is still valid
  res.status(200).json({
    message: "Token is valid",
    user: req.user,
  });
};
