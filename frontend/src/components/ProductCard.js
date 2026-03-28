/**
 * ProductCard Component
 * Shows product image/details, active discount pricing, and cart quantity controls for each product.
 */
import React, { useState } from "react";
import { useCart } from "../context/CartContext";
import "../styles/Card.css";

const TAKA_SYMBOL = "\u09F3";

function ProductCard({ product }) {
  const { changeQuantity, getQuantity } = useCart();
  const quantity = getQuantity(product.product_id);
  const [error, setError] = useState(null);

  const basePrice = Number(product.price || 0);
  const discountAmount = Number(product.product_discount_amount || 0);
  const discountedPrice = Number(
    product.discounted_price !== undefined && product.discounted_price !== null
      ? product.discounted_price
      : basePrice,
  );
  const hasActiveDiscount = discountAmount > 0 && discountedPrice < basePrice;
  const discountType = product.active_discount_type;
  const discountValue = Number(product.active_discount_value || 0);
  const maxDiscountAmount = Number(product.active_max_discount_amount || 0);

  const offerLabel = hasActiveDiscount
    ? discountType === "percentage"
      ? `${Math.round(discountValue)}% OFF`
      : `SAVE ${TAKA_SYMBOL} ${discountAmount.toFixed(2)}`
    : "";

  const offerMeta = hasActiveDiscount
    ? discountType === "percentage" && maxDiscountAmount > 0
      ? `Active offer: ${Math.round(discountValue)}% off (max ${TAKA_SYMBOL} ${maxDiscountAmount.toFixed(2)})`
      : `Active offer: instant savings on this product`
    : "";

  const handleQuantity = async (change) => {
    setError(null);
    const res = await changeQuantity(product.product_id, change, {
      price: discountedPrice,
      product_name: product.product_name,
      photourl: product.photourl,
      unit: product.unit,
    });
    if (res && !res.success) {
      setError(res.error);
      setTimeout(() => setError(null), 3000); // Clear error after 3s
    }
  };

  return (
    <div
      className={`card ${hasActiveDiscount ? "has-offer" : ""}`}
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      {hasActiveDiscount && (
        <div className="card-offer-ribbon">{offerLabel}</div>
      )}

      <div className="card-header">
        <h3>{product.product_name || "Product"}</h3>
      </div>

      <div
        className="product-image-container"
        style={{ textAlign: "center", padding: "10px", flex: 1 }}
      >
        <img
          src={product.photourl || "/dailyDealsShopInfo.webp"}
          alt={product.product_name}
          className="product-image"
          style={{ width: "100%", height: "180px", objectFit: "contain" }}
        />
      </div>

      <div className="card-body" style={{ marginTop: "auto" }}>
        <div className="product-price" style={{ marginBottom: "15px" }}>
          <span className="price-label">Price:</span>
          <div className="product-price-amounts">
            {hasActiveDiscount && (
              <div className="price-original">
                {TAKA_SYMBOL} {basePrice.toFixed(2)}
              </div>
            )}

            <span
              className={`price-value ${hasActiveDiscount ? "offer-price" : ""}`}
            >
              {TAKA_SYMBOL} {discountedPrice.toFixed(2)}
            </span>

            {hasActiveDiscount && (
              <div className="price-savings-pill">
                SAVE {TAKA_SYMBOL} {discountAmount.toFixed(2)}
              </div>
            )}

            {hasActiveDiscount && <div className="offer-meta">{offerMeta}</div>}
          </div>
        </div>

        {quantity > 0 ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#f8f9fa",
              borderRadius: "8px",
              padding: "5px",
              border: "1px solid #d1c4e9",
            }}
          >
            <button
              onClick={() => handleQuantity(-1)}
              style={{
                background: "#9575cd",
                color: "white",
                border: "none",
                width: "30px",
                height: "30px",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "18px",
                fontWeight: "bold",
              }}
            >
              -
            </button>
            <span style={{ fontWeight: "bold", fontSize: "16px" }}>
              {quantity} in cart
            </span>
            <button
              onClick={() => handleQuantity(1)}
              style={{
                background: "#9575cd",
                color: "white",
                border: "none",
                width: "30px",
                height: "30px",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "18px",
                fontWeight: "bold",
              }}
            >
              +
            </button>
          </div>
        ) : (
          <button
            onClick={() => handleQuantity(1)}
            style={{
              width: "100%",
              padding: "10px",
              background: "linear-gradient(135deg, #d1c4e9 0%, #9575cd 100%)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "16px",
              transition: "transform 0.2s",
            }}
            onMouseOver={(e) => (e.target.style.transform = "scale(1.02)")}
            onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
          >
            Add to Bag +
          </button>
        )}
        {error && (
          <div
            style={{
              color: "red",
              fontSize: "12px",
              marginTop: "10px",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductCard;
