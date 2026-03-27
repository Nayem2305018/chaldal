import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchCategories,
  fetchProducts,
  fetchProductsByCategory,
} from "../services/api";
import CategoryList from "../components/CategoryList";
import ProductList from "../components/ProductList";
import "../styles/Page.css";

function CategoryFilterPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(
    categoryId ? parseInt(categoryId) : null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (categoryId) {
      loadProductsByCategory(parseInt(categoryId));
      setSelectedCategory(parseInt(categoryId));
    } else {
      setSelectedCategory(null);
    }
  }, [categoryId]);

  const loadCategories = async () => {
    try {
      const categoriesData = await fetchCategories();
      setCategories(categoriesData);
    } catch (err) {
      setError("Failed to fetch categories.");
      console.error(err);
    }
  };

  const loadProductsByCategory = async (catId) => {
    try {
      setLoading(true);
      setError(null);
      const productsData = await fetchProductsByCategory(catId);
      setProducts(productsData);
    } catch (err) {
      setError("Failed to fetch products.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectedCategoryData = selectedCategory
    ? categories.find((c) => c.category_id === selectedCategory)
    : null;

  const handleSelectCategory = (catId) => {
    navigate(`/categories/${catId}`);
  };

  const handleBackClick = () => {
    navigate("/categories");
  };

  return (
    <div className="page-container">
      {/* Show categories or products based on selection */}
      {selectedCategory === null ? (
        <>
          <h2>📂 Select a Category</h2>

          {loading && <p className="loading">Loading categories...</p>}
          {error && <p className="error">{error}</p>}

          {!loading && !error && categories.length === 0 && (
            <p className="no-data">No categories available</p>
          )}

          {!loading && !error && categories.length > 0 && (
            <CategoryList
              categories={categories}
              onSelectCategory={handleSelectCategory}
            />
          )}

          <button onClick={loadCategories} className="refresh-btn">
            Refresh Categories
          </button>
        </>
      ) : (
        <>
          <div className="category-header">
            <button onClick={handleBackClick} className="back-btn">
              ← Back to Categories
            </button>
            <h2>📦 {selectedCategoryData?.category_name}</h2>
            <p className="category-description">
              {selectedCategoryData?.description}
            </p>
          </div>

          {loading && <p className="loading">Loading products...</p>}
          {error && <p className="error">{error}</p>}

          {!loading && !error && products.length === 0 && (
            <p className="no-data">No products available in this category</p>
          )}

          {!loading && !error && products.length > 0 && (
            <ProductList products={products} />
          )}

          <button
            onClick={() => loadProductsByCategory(selectedCategory)}
            className="refresh-btn"
          >
            Refresh Products
          </button>
        </>
      )}
    </div>
  );
}
export default CategoryFilterPage;
