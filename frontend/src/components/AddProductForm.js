import React, { useState } from "react";
import api from "../services/api";
import "../styles/Form.css";

function AddProductForm({ onProductAdded }) {
  const [formData, setFormData] = useState({
    product_id: "",
    product_name: "",
    price: "",
    unit: "",
    category_id: "",
    added_by_admin: 1,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]:
        name === "product_id" ||
        name === "price" ||
        name === "category_id" ||
        name === "added_by_admin"
          ? value
          : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const productData = {
        product_id: parseInt(formData.product_id),
        product_name: formData.product_name,
        price: parseFloat(formData.price),
        unit: formData.unit,
        category_id: parseInt(formData.category_id),
        added_by_admin: parseInt(formData.added_by_admin),
      };

      const response = await api.post("/products", productData);
      setMessage(`✅ ${response.data.message}`);
      setFormData({
        product_id: "",
        product_name: "",
        price: "",
        unit: "",
        category_id: "",
        added_by_admin: 1,
      });

      // Notify parent component
      if (onProductAdded) {
        onProductAdded();
      }
    } catch (err) {
      setError(`❌ ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h3>Add New Product</h3>
      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-group">
          <label htmlFor="product_id">Product ID *</label>
          <input
            type="number"
            id="product_id"
            name="product_id"
            value={formData.product_id}
            onChange={handleChange}
            required
            placeholder="e.g., 1"
          />
        </div>

        <div className="form-group">
          <label htmlFor="product_name">Product Name *</label>
          <input
            type="text"
            id="product_name"
            name="product_name"
            value={formData.product_name}
            onChange={handleChange}
            required
            placeholder="e.g., Fresh Tomato"
          />
        </div>

        <div className="form-group">
          <label htmlFor="price">Price *</label>
          <input
            type="number"
            id="price"
            name="price"
            value={formData.price}
            onChange={handleChange}
            required
            step="0.01"
            placeholder="e.g., 50.00"
          />
        </div>

        <div className="form-group">
          <label htmlFor="unit">Unit</label>
          <input
            type="text"
            id="unit"
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            placeholder="e.g., kg, liter, piece"
          />
        </div>

        <div className="form-group">
          <label htmlFor="category_id">Category ID *</label>
          <input
            type="number"
            id="category_id"
            name="category_id"
            value={formData.category_id}
            onChange={handleChange}
            required
            placeholder="e.g., 1"
          />
        </div>

        <div className="form-group">
          <label htmlFor="added_by_admin">Admin ID</label>
          <input
            type="number"
            id="added_by_admin"
            name="added_by_admin"
            value={formData.added_by_admin}
            onChange={handleChange}
            placeholder="e.g., 1"
          />
        </div>

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? "Adding..." : "Add Product"}
        </button>
      </form>

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default AddProductForm;
