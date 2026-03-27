const express = require("express");
const cors = require("cors");
require("dotenv").config();

const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const riderRoutes = require("./routes/riderRoutes");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server started on http://localhost:${PORT}`);
});
