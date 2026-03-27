import React, { useEffect, useState } from "react";
import api, { fetchProducts } from "../../services/api";
import ProductList from "../../components/ProductList";

const UserDashboard = () => {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  
  useEffect(() => {
    fetchProducts().then(setProducts).catch(console.error);
    api.get("/order/my-orders").then(res => setOrders(res.data)).catch(console.error);
  }, []);

  return (
    <div style={{ padding: "100px 20px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>User Dashboard 👤</h2>
        <button 
          onClick={async () => {
            try { await api.post("/auth/logout"); } catch(e){}
            localStorage.removeItem("auth_token");
            localStorage.removeItem("auth_user");
            localStorage.removeItem("auth_role");
            window.location.href = "/";
          }}
          style={{ padding: "8px 16px", background: "#e74c3c", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
        >
          Logout
        </button>
      </div>
      <p style={{ color: "#666", marginBottom: "30px" }}>Browse all available products below. Add items to your cart by clicking the plus icons on the products.</p>
      
      {products.length === 0 ? <p>Loading products...</p> : <ProductList products={products} />}

      <h3 style={{ marginTop: "50px", borderBottom: "2px solid #eee", paddingBottom: "10px" }}>My Order History 📦</h3>
      {orders.length === 0 ? (
        <p>You haven't placed any orders yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "20px" }}>
          {orders.map(o => (
            <div key={o.order_id} style={{ background: "#f8f9fa", padding: "20px", borderRadius: "10px", border: "1px solid #ddd" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <h4 style={{ margin: 0 }}>Order #{o.order_id}</h4>
                <span style={{ 
                  background: o.order_status === "Delivered" ? "#27ae60" : "#f39c12", 
                  color: "white", padding: "4px 10px", borderRadius: "12px", fontSize: "0.85rem", fontWeight: "bold" 
                }}>
                  {o.order_status}
                </span>
              </div>
              <p style={{ margin: "5px 0", fontSize: "0.9rem", color: "#666" }}>Placed on: {new Date(o.order_date).toLocaleDateString()}</p>
              
              <div style={{ margin: "15px 0", background: "white", padding: "10px", borderRadius: "8px" }}>
                <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>Delivery Details:</p>
                <div style={{ fontSize: "0.9rem" }}>
                  <div><strong>Address:</strong> {o.delivery_address || 'N/A'}</div>
                  <div><strong>Time:</strong> {o.preferred_delivery_time || 'N/A'}</div>
                </div>
              </div>

              <div style={{ background: "white", padding: "10px", borderRadius: "8px" }}>
                <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>Items:</p>
                <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.9rem" }}>
                  {o.items && o.items.map((item, idx) => (
                    <li key={idx}>{item.quantity}x {item.product_name} <span style={{ color: "#e74c3c" }}>(৳{Number(item.unit_price) * item.quantity})</span></li>
                  ))}
                </ul>
              </div>
              
              <div style={{ marginTop: "15px", textAlign: "right", fontWeight: "bold", fontSize: "1.1rem" }}>
                Total Paid: <span style={{ color: "#e74c3c" }}>৳{Number(o.total_price).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
