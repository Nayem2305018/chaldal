/**
 * Admin Routes
 * Defines admin-only endpoints for riders, users, inventory, offers, and order controls.
 */
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

// Product Management
router.post("/product", adminOnly, adminController.createProduct);
router.put("/product/:id", adminOnly, adminController.updateProduct);
router.delete("/product/:id", adminOnly, adminController.deleteProduct);

// Orders Management
router.get("/orders", adminOnly, adminController.getOrders);
router.put("/order/:id", adminOnly, adminController.updateOrder);
router.post(
  "/order/:id/confirm-payment",
  adminOnly,
  adminController.confirmPayment,
);

// Offer and Discount Management
router.post("/voucher", adminOnly, adminController.createVoucherOffer);

router.get("/offers/vouchers", adminOnly, adminController.getVoucherOffers);
router.post("/offers/vouchers", adminOnly, adminController.createVoucherOffer);
router.put(
  "/offers/vouchers/:voucher_id",
  adminOnly,
  adminController.updateVoucherOffer,
);
router.patch(
  "/offers/vouchers/:voucher_id/active",
  adminOnly,
  adminController.setVoucherOfferActive,
);
router.get(
  "/offers/voucher-usage",
  adminOnly,
  adminController.getVoucherUsageHistory,
);

router.get(
  "/offers/product-discounts",
  adminOnly,
  adminController.getProductDiscountOffers,
);
router.post(
  "/offers/product-discounts",
  adminOnly,
  adminController.createProductDiscountOffer,
);
router.put(
  "/offers/product-discounts/:product_discount_id",
  adminOnly,
  adminController.updateProductDiscountOffer,
);
router.patch(
  "/offers/product-discounts/:product_discount_id/active",
  adminOnly,
  adminController.setProductDiscountOfferActive,
);

module.exports = router;


