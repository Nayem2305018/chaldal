const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { verifyToken, authorizeRole } = require("../middlewares/authMiddleware");

// Middleware to require admin role
const adminOnly = [verifyToken, authorizeRole(["admin"])];

// Dashboard
router.get("/dashboard-stats", adminOnly, adminController.getDashboardStats);

// Rider Requests Management
router.get("/rider-requests", adminOnly, adminController.getRiderRequests);
router.post(
  "/approve-rider/:request_id",
  adminOnly,
  adminController.approveRider,
);
router.post(
  "/reject-rider/:request_id",
  adminOnly,
  adminController.rejectRider,
);

// Riders Management
router.get("/riders", adminOnly, adminController.getAllRiders);
router.put(
  "/riders/:rider_id/status",
  adminOnly,
  adminController.updateRiderStatus,
);

// Users Management
router.get("/users", adminOnly, adminController.getAllUsers);

// Inventory Management
router.get(
  "/inventory/summary",
  adminOnly,
  adminController.getInventorySummary,
);
router.put(
  "/inventory/:product_id/:warehouse_id",
  adminOnly,
  adminController.updateInventoryStock,
);

// Orders Management
router.get("/orders", adminOnly, adminController.getOrders);
router.put("/order/:id", adminOnly, adminController.updateOrder);
router.post(
  "/order/:id/confirm-payment",
  adminOnly,
  adminController.confirmPayment,
);

module.exports = router;
