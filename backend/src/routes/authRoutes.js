const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { verifyToken } = require("../middlewares/authMiddleware");

// Public routes
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/logout", authController.logout);

// Protected routes
router.get("/verify", verifyToken, authController.verifyToken);

module.exports = router;
