/**
 * Rider Routes
 * Defines rider-only endpoints for delivery list and delivery state updates.
 */
const express = require("express");
const router = express.Router();
const riderController = require("../controllers/riderController");
const { verifyToken, authorizeRole } = require("../middlewares/authMiddleware");

// Middleware to require rider role
const riderOnly = [verifyToken, authorizeRole(["rider"])];

// Rider-only routes
router.get("/deliveries", riderOnly, riderController.getDeliveries);
router.put("/delivery/:id", riderOnly, riderController.updateDeliveryStatus);

module.exports = router;


