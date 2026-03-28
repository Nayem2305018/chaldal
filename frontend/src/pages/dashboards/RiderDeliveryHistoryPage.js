import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const RiderDeliveryHistoryPage = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDeliveryHistory = async () => {
      try {
        setLoading(true);
        const response = await api.get("/order/assigned");
        const completed = (response.data || []).filter(
          (delivery) => delivery.delivery_status === "delivered",
        );
        setDeliveries(completed);
      } catch (error) {
        console.error("Failed to load delivery history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveryHistory();
  }, []);

  if (loading) {
    return (
      <div
        style={{ padding: "100px 20px", maxWidth: "1000px", margin: "0 auto" }}
      >
        <p>Loading delivery history...</p>
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
        <h2 style={{ margin: 0 }}>Completed Delivery History</h2>
        <button
          type="button"
          onClick={() => navigate("/rider/dashboard")}
          style={{
            padding: "8px 14px",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            background: "white",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Back to Dispatch Dashboard
        </button>
      </div>

      {deliveries.length === 0 ? (
        <p>No completed deliveries yet.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "14px",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          }}
        >
          {deliveries.map((delivery) => (
            <div
              key={delivery.delivery_id}
              style={{
                background: "#f8fff9",
                border: "1px solid #d5f5e3",
                borderRadius: "10px",
                padding: "14px",
              }}
            >
              <p style={{ margin: "0 0 6px" }}>
                <strong>Delivery ID:</strong> {delivery.delivery_id}
              </p>
              <p style={{ margin: "0 0 6px" }}>
                <strong>Order ID:</strong> {delivery.order_id}
              </p>
              <p style={{ margin: "0 0 6px" }}>
                <strong>Delivered Date:</strong>{" "}
                {delivery.order_date
                  ? new Date(delivery.order_date).toLocaleDateString()
                  : "N/A"}
              </p>
              <p style={{ margin: "0 0 6px" }}>
                <strong>Payment Verification:</strong>{" "}
                {delivery.payment_status === "paid"
                  ? "Admin Verified"
                  : "Awaiting Admin Verification"}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Confirmation Submitted:</strong>{" "}
                {delivery.rider_payment_sent_at
                  ? new Date(delivery.rider_payment_sent_at).toLocaleString()
                  : "No"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RiderDeliveryHistoryPage;
