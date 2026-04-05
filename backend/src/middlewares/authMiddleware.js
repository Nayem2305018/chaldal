const jwt = require("jsonwebtoken");
const db = require("../db");

const ROLE_LOOKUP_QUERIES = {
  user: [
    `
    select user_id as id,
           email,
           name,
           region_id
      from users
     where user_id = $1
       and lower(email) = lower($2)
     limit 1
  `,
  ],
  rider: [
    `
    select rider_id as id,
           email,
           rider_name as name,
           region_id
      from rider
     where rider_id = $1
       and lower(email) = lower($2)
     limit 1
  `,
  ],
  admin: [
    `
    select admin_id as id,
           email,
           name,
           null::int as region_id
      from admin
     where admin_id = $1
       and lower(email) = lower($2)
     limit 1
  `,
  ],
};

const isRecoverableLookupError = (error) => {
  // 42703: undefined_column, 42P01: undefined_table
  return error && (error.code === "42703" || error.code === "42P01");
};

const findAccountByClaims = async (role, id, email) => {
  const queries = ROLE_LOOKUP_QUERIES[role] || [];

  for (const queryText of queries) {
    try {
      const res = await db.query(queryText, [id, email]);
      if (res.rows.length > 0) {
        return res.rows[0];
      }
    } catch (error) {
      if (isRecoverableLookupError(error)) {
        continue;
      }
      throw error;
    }
  }

  return null;
};

// Verify JWT token and attach user to req.user
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized. Token missing." });
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const role = String(decoded?.role || "").toLowerCase();
    const id = Number(decoded?.id);
    const email = String(decoded?.email || "").trim();

    if (
      !ROLE_LOOKUP_QUERIES[role] ||
      !Number.isInteger(id) ||
      id <= 0 ||
      !email
    ) {
      return res.status(401).json({ error: "Invalid token claims" });
    }

    const account = await findAccountByClaims(role, id, email);

    if (!account) {
      return res.status(401).json({
        error: "Invalid token. Account mismatch or account no longer exists",
      });
    }

    req.user = {
      id: Number(account.id),
      role,
      email: account.email,
      name: account.name || null,
      region_id:
        account.region_id === undefined || account.region_id === null
          ? null
          : Number(account.region_id),
      token: {
        id,
        role,
        email,
      },
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
};

// Authorize specific roles
const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ error: "Unauthorized. Please log in first." });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden. Requires one of: ${allowedRoles.join(", ")} role.`,
      });
    }

    next();
  };
};

module.exports = {
  verifyToken,
  authorizeRole,
  // Convenience middleware for single roles
  requireUser: authorizeRole(["user"]),
  requireAdmin: authorizeRole(["admin"]),
  requireRider: authorizeRole(["rider"]),
};
