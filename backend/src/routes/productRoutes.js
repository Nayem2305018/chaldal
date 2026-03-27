const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");

router.get("/", productController.getAllProducts);
router.get("/category/:categoryId", productController.getProductsByCategory);
router.post("/", productController.createProduct);
router.delete("/:productId", productController.deleteProduct);

module.exports = router;
