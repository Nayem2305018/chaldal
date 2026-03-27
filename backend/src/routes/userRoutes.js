const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const orderController = require("../controllers/orderController");
const { verifyToken, authorizeRole } = require("../middlewares/authMiddleware");

// Middleware to require user role
const userOnly = [verifyToken, authorizeRole(["user"])];

// All user routes require authentication and correct role
router.get("/profile", userOnly, userController.getProfile);
router.put("/profile", userOnly, userController.updateProfile);
router.get("/orders", userOnly, orderController.getMyOrders);

module.exports = router;
