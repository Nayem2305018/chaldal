import React, { useState, useEffect } from "react";
import api from "../../../services/api";

const InventoryManagement = () => {
  const [products, setProducts] = useState([]);
  
  const fetchProducts = async () => {
    try {
      const res = await api.get("/products");
      setProducts(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleUpdateStock = async (id, newStock) => {
    try {
      await api.put(`/admin/product/${id}`, { stock_quantity: parseInt(newStock) });
      fetchProducts();
    } catch (err) { alert("Failed to update stock"); }
  };

  return (
    <div>
      <h2 style={{marginTop: 0}}>Inventory Tracking Hub 🏢</h2>
      <p style={{ color: "#666" }}>Quickly adjust storage values updating the main warehouses instantly securely.</p>
      
      <table className="admin-table">
        <thead>
          <tr>
            <th>Product ID</th>
            <th>Name</th>
            <th>Current Stock</th>
            <th>Quick Update</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p.product_id}>
              <td>#{p.product_id}</td>
              <td style={{ fontWeight: "bold" }}>{p.product_name}</td>
              <td><span style={{ 
                background: p.stock_quantity < 10 ? "#fdeded" : "#e8f8f5", 
                color: p.stock_quantity < 10 ? "#e74c3c" : "#27ae60",
                padding: "4px 8px", borderRadius: "12px", fontWeight: "bold"
              }}>
                {p.stock_quantity} Units
              </span></td>
              <td>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input 
                    type="number" 
                    id={`stock-${p.product_id}`}
                    defaultValue={p.stock_quantity}
                    style={{ width: "80px", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }}
                  />
                  <button 
                    onClick={() => {
                      const val = document.getElementById(`stock-${p.product_id}`).value;
                      handleUpdateStock(p.product_id, val);
                    }}
                    className="btn-edit" style={{ background: "#9575cd" }}>
                    Set Stock
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryManagement;
