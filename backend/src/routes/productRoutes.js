/**
 * Product Routes
 * Defines product catalog endpoints including active offers and category-filtered products.
 */
const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");

router.get("/", productController.getAllProducts);
router.get("/offers/active", productController.getActiveProductOffers);
router.get("/category/:categoryId", productController.getProductsByCategory);
router.post("/", productController.createProduct);
router.delete("/:productId", productController.deleteProduct);

module.exports = router;
