import React, { useState } from "react";
import { useCart } from "../context/CartContext";
import "../styles/Card.css";

function ProductCard({ product }) {
  const { changeQuantity, getQuantity } = useCart();
  const quantity = getQuantity(product.product_id);
  const [error, setError] = useState(null);

  const handleQuantity = async (change) => {
    setError(null);
    const res = await changeQuantity(product.product_id, change);
    if (res && !res.success) {
      setError(res.error);
      setTimeout(() => setError(null), 3000); // Clear error after 3s
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="card-header">
        <h3>{product.product_name || "Product"}</h3>
        <p className="product-id" style={{ color: "#aaa", fontSize: "12px" }}>ID: {product.product_id}</p>
      </div>
      
      <div className="product-image-container" style={{ textAlign: "center", padding: "10px", flex: 1 }}>
        <img 
          src={product.photourl || "/dailyDealsShopInfo.webp"} 
          alt={product.product_name} 
          className="product-image" 
          style={{ width: "100%", height: "180px", objectFit: "contain" }}
        />
      </div>
      
      <div className="card-body" style={{ marginTop: 'auto' }}>
        <div className="product-price" style={{ marginBottom: "15px" }}>
          <span className="price-label">Price:</span>
          <span className="price-value" style={{ color: "#e74c3c", fontWeight: "bold" }}>৳ {product.price}</span>
        </div>

        {quantity > 0 ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8f9fa", borderRadius: "8px", padding: "5px", border: "1px solid #d1c4e9" }}>
            <button 
              onClick={() => handleQuantity(-1)}
              style={{ background: "#9575cd", color: "white", border: "none", width: "30px", height: "30px", borderRadius: "5px", cursor: "pointer", fontSize: "18px", fontWeight: "bold" }}
            >
              -
            </button>
            <span style={{ fontWeight: "bold", fontSize: "16px" }}>{quantity} in cart</span>
            <button 
              onClick={() => handleQuantity(1)}
              style={{ background: "#9575cd", color: "white", border: "none", width: "30px", height: "30px", borderRadius: "5px", cursor: "pointer", fontSize: "18px", fontWeight: "bold" }}
            >
              +
            </button>
          </div>
        ) : (
          <button 
            onClick={() => handleQuantity(1)}
            style={{ width: "100%", padding: "10px", background: "linear-gradient(135deg, #d1c4e9 0%, #9575cd 100%)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "16px", transition: "transform 0.2s" }}
            onMouseOver={(e) => e.target.style.transform = "scale(1.02)"}
            onMouseOut={(e) => e.target.style.transform = "scale(1)"}
          >
            Add to Bag +
          </button>
        )}
        {error && <div style={{ color: "red", fontSize: "12px", marginTop: "10px", textAlign: "center", fontWeight: "bold" }}>{error}</div>}
      </div>
    </div>
  );
}

export default ProductCard;
