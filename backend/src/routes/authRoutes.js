/**
 * Auth Routes
 * Defines public/protected authentication endpoints and token verification routes.
 */
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { verifyToken } = require("../middlewares/authMiddleware");

// Public routes
router.get("/regions", authController.getRegions);
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/logout", verifyToken, authController.logout);

// Protected routes
router.get("/verify", verifyToken, authController.verifyToken);

module.exports = router;
