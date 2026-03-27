import React, { useEffect } from "react";
import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";

const CartSlider = () => {
  const { cart, isOpen, setIsOpen, changeQuantity, totalPrice, totalItems } =
    useCart();
  const navigate = useNavigate();
  const role = localStorage.getItem("auth_role");

  useEffect(() => {
    if ((role === "admin" || role === "rider") && isOpen) {
      setIsOpen(false);
    }
  }, [role, isOpen, setIsOpen]);

  const handleDrag = (e) => {
    // Only close if clicking the dark overlay behind the specific cart panel
    if (e.target.id === "cart-overlay") {
      setIsOpen(false);
    }
  };

  if (!isOpen || role === "admin" || role === "rider") return null;

  return (
    <div
      id="cart-overlay"
      onClick={handleDrag}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.5)",
        zIndex: 9999,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        style={{
          width: "350px",
          height: "100%",
          background: "white",
          boxShadow: "-5px 0 15px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          animation: "slideIn 0.3s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #d1c4e9 0%, #9575cd 100%)",
            padding: "20px",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.2rem" }}>
            🛒 Your Bag ({totalItems})
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: "none",
              border: "none",
              color: "white",
              fontSize: "1.5rem",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {cart.items.length === 0 ? (
            <p
              style={{ textAlign: "center", color: "#888", marginTop: "50px" }}
            >
              Your bag is empty. Start shopping!
            </p>
          ) : (
            cart.items.map((item) => (
              <div
                key={item.product_id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid #eee",
                  paddingBottom: "15px",
                  marginBottom: "15px",
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 10px 0", fontWeight: "bold" }}>
                    Product ID: {item.product_id}{" "}
                    {item.product_name && `(${item.product_name})`}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <button
                      onClick={() => changeQuantity(item.product_id, -1, item)}
                      style={{
                        width: "25px",
                        height: "25px",
                        borderRadius: "50%",
                        border: "1px solid #9575cd",
                        background: "white",
                        color: "#9575cd",
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      onClick={() => changeQuantity(item.product_id, 1, item)}
                      style={{
                        width: "25px",
                        height: "25px",
                        borderRadius: "50%",
                        border: "1px solid #9575cd",
                        background: "#9575cd",
                        color: "white",
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p
                    style={{ margin: 0, fontWeight: "bold", color: "#e74c3c" }}
                  >
                    ৳{" "}
                    {Number(
                      item.line_total ?? Number(item.price) * item.quantity,
                    ).toFixed(2)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cart.items.length > 0 && (
          <div
            style={{
              padding: "20px",
              borderTop: "1px solid #eee",
              background: "#f8f9fa",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "20px",
                fontSize: "1.1rem",
              }}
            >
              <strong>Total:</strong>
              <strong style={{ color: "#e74c3c" }}>৳ {totalPrice}</strong>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                navigate("/checkout");
              }}
              style={{
                width: "100%",
                padding: "15px",
                background: "linear-gradient(135deg, #1abc9c 0%, #0d9a6b 100%)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                fontSize: "1rem",
                cursor: "pointer",
              }}
            >
              Checkout
            </button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default CartSlider;
