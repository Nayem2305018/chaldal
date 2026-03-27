import React, { useState, useEffect } from "react";
import { fetchCategories } from "../services/api";
import CategoryList from "../components/CategoryList";
import "../styles/Page.css";

function CategoriesPage() {
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
      setError("Failed to fetch categories. Please try again later.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h2>Categories</h2>

      {loading && <p className="loading">Loading categories...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && categories.length === 0 && (
        <p className="no-data">No categories available</p>
      )}

      {!loading && !error && categories.length > 0 && (
        <CategoryList categories={categories} />
      )}

      <button onClick={loadCategories} className="refresh-btn">
        Refresh Categories
      </button>
    </div>
  );
}

export default CategoriesPage;
