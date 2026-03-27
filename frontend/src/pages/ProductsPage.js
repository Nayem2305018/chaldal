import React, { useState, useEffect } from "react";
import { fetchProducts } from "../services/api";
import ProductList from "../components/ProductList";
import "../styles/Page.css";

function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProducts();
      setProducts(data);
    } catch (err) {
      setError("Failed to fetch products. Please try again later.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h2>Products</h2>

      {loading && <p className="loading">Loading products...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && products.length === 0 && (
        <p className="no-data">No products available</p>
      )}

      {!loading && !error && products.length > 0 && (
        <ProductList products={products} />
      )}

      <button onClick={loadProducts} className="refresh-btn">
        Refresh Products
      </button>
    </div>
  );
}

export default ProductsPage;
