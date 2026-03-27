const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { verifyToken, authorizeRole } = require("../middlewares/authMiddleware");

// User-only routes protected with JWT
router.post(
  "/checkout",
  verifyToken,
  authorizeRole(["user"]),
  orderController.checkout,
);

router.get(
  "/my-orders",
  verifyToken,
  authorizeRole(["user"]),
  orderController.getMyOrders,
);

// Rider routes
const riderOnly = [verifyToken, authorizeRole(["rider"])];
router.get("/available", ...riderOnly, orderController.getAvailableOrders);
router.get("/assigned", ...riderOnly, orderController.getAssignedOrders);

router.patch(
  "/assign-rider/:order_id",
  ...riderOnly,
  orderController.selfAssignOrder,
);

router.patch(
  "/start-delivery/:order_id",
  ...riderOnly,
  orderController.startDelivery,
);

router.patch(
  "/complete-delivery/:order_id",
  ...riderOnly,
  orderController.completeDelivery,
);

// Admin routes
router.post(
  "/confirm-payment/:order_id",
  verifyToken,
  authorizeRole(["admin"]),
  orderController.confirmPayment,
);

module.exports = router;

