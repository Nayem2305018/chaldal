import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const UserOrderHistoryPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await api.get("/order/my-orders");
        setOrders(response.data || []);
      } catch (error) {
        console.error("Failed to load order history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div
        style={{ padding: "100px 20px", maxWidth: "1000px", margin: "0 auto" }}
      >
        <p>Loading your order history...</p>
      </div>
    );
  }

  return (
    <div
      style={{ padding: "100px 20px", maxWidth: "1000px", margin: "0 auto" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ margin: 0 }}>My Order History</h2>
        <button
          type="button"
          onClick={() => navigate("/user/dashboard")}
          style={{
            padding: "8px 14px",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            background: "white",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Back to Dashboard
        </button>
      </div>

      {orders.length === 0 ? (
        <p>You have not placed any orders yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {orders.map((order) => {
            const orderStatus = String(order.order_status || "").toLowerCase();
            const isDelivered = orderStatus === "delivered";

            return (
              <div
                key={order.order_id}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #dbe1ea",
                  borderRadius: "10px",
                  padding: "18px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "10px",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <h4 style={{ margin: 0 }}>Order #{order.order_id}</h4>
                  <span
                    style={{
                      background: isDelivered ? "#16a34a" : "#d97706",
                      color: "white",
                      borderRadius: "999px",
                      padding: "4px 10px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      textTransform: "capitalize",
                    }}
                  >
                    {order.order_status}
                  </span>
                </div>

                <p
                  style={{
                    margin: "0 0 10px",
                    color: "#64748b",
                    fontSize: "0.9rem",
                  }}
                >
                  Placed on: {new Date(order.order_date).toLocaleDateString()}
                </p>

                <div
                  style={{
                    background: "white",
                    borderRadius: "8px",
                    padding: "10px",
                    marginBottom: "10px",
                  }}
                >
                  <p style={{ margin: "0 0 4px", fontWeight: 700 }}>
                    Delivery Details
                  </p>
                  <p style={{ margin: "0 0 2px", fontSize: "0.92rem" }}>
                    Address: {order.delivery_address || "N/A"}
                  </p>
                  <p style={{ margin: 0, fontSize: "0.92rem" }}>
                    Time: {order.preferred_delivery_time || "N/A"}
                  </p>
                </div>

                <div
                  style={{
                    background: "white",
                    borderRadius: "8px",
                    padding: "10px",
                  }}
                >
                  <p style={{ margin: "0 0 4px", fontWeight: 700 }}>Items</p>
                  {Array.isArray(order.items) && order.items.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: "18px" }}>
                      {order.items.map((item, index) => (
                        <li
                          key={`${order.order_id}-${index}`}
                          style={{ marginBottom: "2px" }}
                        >
                          {item.quantity}x {item.product_name} (BDT{" "}
                          {(
                            Number(item.unit_price || 0) *
                            Number(item.quantity || 0)
                          ).toFixed(2)}
                          )
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ margin: 0, color: "#64748b" }}>
                      No item details available.
                    </p>
                  )}
                </div>

                <p
                  style={{
                    margin: "12px 0 0",
                    textAlign: "right",
                    fontWeight: 700,
                  }}
                >
                  Total: BDT {Number(order.total_price || 0).toFixed(2)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UserOrderHistoryPage;
