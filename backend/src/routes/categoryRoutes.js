/**
 * Category Routes
 * Defines category listing endpoints used by homepage and category filters.
 */
const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");

router.get("/", categoryController.getAllCategories);

module.exports = router;


