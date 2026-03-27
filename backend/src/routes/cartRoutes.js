const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const { verifyToken, authorizeRole } = require("../middlewares/authMiddleware");

// User routes protected with JWT
router.get("/", verifyToken, authorizeRole(["user"]), cartController.getCart);
router.post(
  "/add/:product_id",
  verifyToken,
  authorizeRole(["user"]),
  cartController.addToCart,
);

module.exports = router;
