const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "..", ".env"),
});

const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const riderRoutes = require("./routes/riderRoutes");
const { isEmailConfigured, getEmailConfig } = require("./utils/emailService");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isLocalDevOrigin = (origin) => {
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
};

if (allowedOrigins.length === 0) {
  allowedOrigins.push("http://localhost:3000", "http://localhost:3001");
}

// Middleware
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin) || isLocalDevOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json());

// JWT Configuration - Verify JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  console.warn(
    "⚠️  JWT_SECRET is not set in environment variables. Please set it for production.",
  );
}

if (!isEmailConfigured()) {
  const { missing } = getEmailConfig();
  console.warn(
    `⚠️  Email notifications are disabled. Missing mail config keys: ${missing.join(", ")}`,
  );
}

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);
app.use("/api/rider", riderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "✅ Chaldal Backend API is running with JWT Authentication",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use(errorHandler);

const parseEnvInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const requestedPort = parseEnvInt(process.env.PORT, 5000);
const isProduction = process.env.NODE_ENV === "production";
const allowPortFallback =
  String(
    process.env.ALLOW_PORT_FALLBACK || String(!isProduction),
  ).toLowerCase() === "true";
const maxPortFallbackAttempts = parseEnvInt(
  process.env.PORT_FALLBACK_ATTEMPTS,
  20,
);

const startServer = (port, attemptsLeft) => {
  const server = app.listen(port, () => {
    console.log(`🚀 Server started on http://localhost:${port}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      if (allowPortFallback && attemptsLeft > 0) {
        const nextPort = port + 1;
        console.warn(
          `⚠️  Port ${port} is busy, retrying on ${nextPort} (${attemptsLeft} attempts left)...`,
        );
        startServer(nextPort, attemptsLeft - 1);
        return;
      }

      console.error(
        [
          `❌ Port ${port} is already in use.`,
          "Stop the existing process or set a different PORT in backend/.env.",
          "Optional: set ALLOW_PORT_FALLBACK=true to auto-try the next ports.",
        ].join(" "),
      );
      process.exit(1);
    }

    console.error("❌ Server failed to start:", error);
    process.exit(1);
  });
};

startServer(requestedPort, maxPortFallbackAttempts);
