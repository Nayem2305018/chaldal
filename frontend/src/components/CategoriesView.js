import React, { useState, useEffect } from "react";
import { fetchCategories } from "../services/api";
import CategoryCard from "./CategoryCard";
import "../styles/CategoriesView.css";

function CategoriesView({ onCategorySelect }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCategories();
      setCategories(data);
    } catch (err) {
      setError("Failed to load categories");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="categories-view-loading">Loading categories...</div>;
  }

  if (error) {
    return <div className="categories-view-error">{error}</div>;
  }

  return (
    <div className="categories-view">
      <div className="categories-header">
        <h2>Shop by Category</h2>
        <p>Select a category to view products</p>
      </div>
      <div className="categories-grid">
        {categories.map((category) => (
          <CategoryCard
            key={category.category_id}
            category={category}
            onSelect={onCategorySelect}
          />
        ))}
      </div>
    </div>
  );
}

export default CategoriesView;
