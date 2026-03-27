import React, { useState } from "react";
import { useCart } from "../context/CartContext";
import { placeOrder } from "../services/api";

const CheckoutPage = () => {
  const { cart, totalPrice, loadCart } = useCart();
  const [formData, setFormData] = useState({
    delivery_address: "",
    preferred_delivery_time: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleProceed = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.delivery_address || !formData.preferred_delivery_time) {
      setError("Please fill in both address and delivery time.");
      return;
    }

    if (cart.items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    try {
      setLoading(true);
      await placeOrder(formData);
      setSuccess(true);
      
      // Clear local cart context UI state instantly, refresh to clear completely visually
      await loadCart();
      
      setTimeout(() => {
        window.location.href = "/user/dashboard";
      }, 2500);
      
    } catch (err) {
      setError(err.response?.data?.error || "Failed to place order.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ textAlign: "center", padding: "100px 20px" }}>
        <h1 style={{ color: "#27ae60", fontSize: "3rem" }}>✅</h1>
        <h2>Order Confirmed!</h2>
        <p>Your order has been placed successfully. Redirecting you...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "100px 20px", maxWidth: "800px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }}>
      {/* Checkout Form */}
      <div>
        <h2>Secure Checkout 🛡️</h2>
        <p style={{ color: "#666" }}>Please provide your delivery details.</p>

        {error && <div style={{ color: "red", padding: "10px", background: "#ffeaa7", borderRadius: "5px", marginBottom: "15px" }}>{error}</div>}

        <form onSubmit={handleProceed} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <div>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Delivery Address *</label>
            <textarea 
              name="delivery_address"
              value={formData.delivery_address}
              onChange={handleChange}
              rows="3"
              style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ccc", fontFamily: "inherit" }}
              placeholder="e.g. 123 Main Street, Apt 4B, Dhaka"
            />
          </div>
          <div>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Preferred Delivery Time *</label>
            <input 
              type="text"
              name="preferred_delivery_time"
              value={formData.preferred_delivery_time}
              onChange={handleChange}
              style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
              placeholder="e.g. Today 4:00 PM - 5:00 PM"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading || cart.items.length === 0}
            style={{ 
              marginTop: "10px", padding: "15px", background: "#27ae60", color: "white", 
              border: "none", borderRadius: "5px", fontWeight: "bold", fontSize: "1.1rem",
              cursor: (loading || cart.items.length === 0) ? "not-allowed" : "pointer",
              opacity: (loading || cart.items.length === 0) ? 0.7 : 1
            }}
          >
            {loading ? "Processing..." : "Proceed to Order"}
          </button>
        </form>
      </div>

      {/* Order Summary Summary */}
      <div style={{ background: "#f8f9fa", padding: "25px", borderRadius: "10px", border: "1px solid #eee" }}>
        <h3>Order Summary</h3>
        <hr style={{ border: "0", borderTop: "1px solid #ddd", margin: "15px 0" }}/>
        
        {cart.items.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "300px", overflowY: "auto", paddingRight: "10px" }}>
            {cart.items.map(item => (
              <div key={item.product_id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
                <span>{item.quantity}x {item.product_name || `Product #${item.product_id}`}</span>
                <span style={{ fontWeight: "bold" }}>৳ {Number(item.price) * item.quantity}</span>
              </div>
            ))}
          </div>
        )}
        
        <hr style={{ border: "0", borderTop: "1px solid #ddd", margin: "15px 0" }}/>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.2rem", fontWeight: "bold" }}>
          <span>Total:</span>
          <span style={{ color: "#e74c3c" }}>৳ {totalPrice}</span>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
