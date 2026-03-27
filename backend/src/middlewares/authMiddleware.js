const jwt = require("jsonwebtoken");

// Verify JWT token and attach user to req.user
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized. Token missing." });
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
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
