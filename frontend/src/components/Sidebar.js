import React, { useState, useEffect } from "react";
import { fetchCategories } from "../services/api";
import "../styles/Sidebar.css";

function Sidebar({ onCategorySelect }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await fetchCategories();
      setCategories(data);
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (categoryId, categoryName) => {
    setSelectedCategory(categoryId);
    onCategorySelect(categoryId, categoryName);
  };

  return (
    <aside className="sidebar">
      {/* Offers Section */}
      <div className="sidebar-section">
        <h3 className="sidebar-title">🎉 Special Offers</h3>
        <div className="offers-list">
          <div className="offer-item">
            <span className="offer-badge">50% OFF</span>
            <p>Fresh Vegetables</p>
          </div>
          <div className="offer-item">
            <span className="offer-badge">30% OFF</span>
            <p>Dairy Products</p>
          </div>
          <div className="offer-item">
            <span className="offer-badge">25% OFF</span>
            <p>Fruits</p>
          </div>
          <div className="offer-item">
            <span className="offer-badge">20% OFF</span>
            <p>Grocery Items</p>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="sidebar-section">
        <h3 className="sidebar-title">📂 Categories</h3>
        {loading ? (
          <p className="loading-text">Loading categories...</p>
        ) : categories.length > 0 ? (
          <div className="categories-list">
            <button
              className={`category-item ${selectedCategory === null ? "active" : ""}`}
              onClick={() => {
                setSelectedCategory(null);
                onCategorySelect(null);
              }}
            >
              All Products
            </button>
            {categories.map((category) => (
              <button
                key={category.category_id}
                className={`category-item ${
                  selectedCategory === category.category_id ? "active" : ""
                }`}
                onClick={() =>
                  handleCategoryClick(
                    category.category_id,
                    category.category_name,
                  )
                }
              >
                {category.category_name}
              </button>
            ))}
          </div>
        ) : (
          <p className="no-data-text">No categories found</p>
        )}
      </div>

      {/* Discounts Section */}
      <div className="sidebar-section">
        <h3 className="sidebar-title">💰 Discounts</h3>
        <div className="discount-list">
          <div className="discount-item">
            <p>Weekly Deals</p>
            <span className="discount-badge">Save More</span>
          </div>
          <div className="discount-item">
            <p>Bulk Orders</p>
            <span className="discount-badge">Extra 10%</span>
          </div>
          <div className="discount-item">
            <p>Member Rewards</p>
            <span className="discount-badge">Active</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
