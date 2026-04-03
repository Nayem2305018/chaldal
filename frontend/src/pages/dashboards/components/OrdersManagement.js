import React, { useCallback, useEffect, useState } from "react";
import api from "../../../services/api";

const OrdersManagement = () => {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("All");
  const [confirmingOrderId, setConfirmingOrderId] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get("/admin/orders");
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    const intervalId = setInterval(() => {
      fetchOrders();
    }, 10000);

    return () => clearInterval(intervalId);
  }, [fetchOrders]);

  const handleConfirmPayment = async (orderId) => {
    setConfirmingOrderId(orderId);
    try {
      await api.post(`/admin/order/${orderId}/confirm-payment`);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.error || "Payment confirmation failed");
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const normalizeStatus = (value) => String(value || "").toLowerCase();

  const filteredOrders =
    filter === "All"
      ? orders
      : orders.filter((o) => normalizeStatus(o.order_status) === filter);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Orders & Dispatch 🚚</h2>

      <div style={{ marginBottom: "12px" }}>
        <button
          onClick={fetchOrders}
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            background: "#fff",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Refresh Orders
        </button>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <strong>Filter by Status: </strong>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: "8px", borderRadius: "6px", marginLeft: "10px" }}
        >
          <option value="All">All Orders</option>
          <option value="pending">Pending</option>
          <option value="assigned">Assigned</option>
          <option value="delivering">Delivering</option>
          <option value="delivered">Delivered</option>
        </select>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Date</th>
            <th>Delivery Info</th>
            <th>Ordered Items</th>
            <th>Total</th>
            <th>Status</th>
            <th>Payment Confirmation</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map((o) => (
            <tr key={o.order_id}>
              <td>{o.order_id}</td>
              <td>{new Date(o.order_date).toLocaleDateString()}</td>
              <td>
                <div style={{ fontSize: "0.85rem", maxWidth: "200px" }}>
                  <strong>Address:</strong> {o.delivery_address || "N/A"}
                  <br />
                  <strong>Time:</strong> {o.preferred_delivery_time || "N/A"}
                </div>
              </td>
              <td>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: "15px",
                    fontSize: "0.85rem",
                    maxWidth: "250px",
                  }}
                >
                  {o.items && o.items.length > 0 ? (
                    o.items.map((item, idx) => (
                      <li key={idx}>
                        {item.quantity}x {item.product_name}
                      </li>
                    ))
                  ) : (
                    <li>No items</li>
                  )}
                </ul>
              </td>
              <td style={{ fontWeight: "bold" }}>
                ৳{parseFloat(o.total_price).toFixed(2)}
              </td>
              <td>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: "12px",
                    fontSize: "0.85rem",
                    fontWeight: "bold",
                    background:
                      normalizeStatus(o.order_status) === "delivered"
                        ? "#e8f8f5"
                        : normalizeStatus(o.order_status) === "pending"
                          ? "#fff3cd"
                          : "#e1f5fe",
                    color:
                      normalizeStatus(o.order_status) === "delivered"
                        ? "#27ae60"
                        : normalizeStatus(o.order_status) === "pending"
                          ? "#f39c12"
                          : "#2980b9",
                  }}
                >
                  {o.order_status}
                </span>

                {o.rider_id && (
                  <div
                    style={{
                      marginTop: "10px",
                      fontSize: "0.8rem",
                      background: "#f8f9fa",
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px dashed #ccc",
                    }}
                  >
                    <strong>Rider ID:</strong> {o.rider_id}
                    <br />
                    <strong>Warehouse:</strong> {o.warehouse_id || "N/A"}
                    <br />
                    <strong>Delivery Ref:</strong>{" "}
                    {o.delivery_status || "Assigned"}
                  </div>
                )}

                {o.warehouse_allocations &&
                  o.warehouse_allocations.length > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: "0.8rem",
                        background: "#fff7e6",
                        padding: "8px",
                        borderRadius: "6px",
                        border: "1px solid #ffe2ad",
                      }}
                    >
                      <strong>Allocation:</strong>
                      <ul style={{ margin: "5px 0 0", paddingLeft: "16px" }}>
                        {o.warehouse_allocations.map((alloc, idx) => (
                          <li key={`${o.order_id}-${idx}`}>
                            W{alloc.warehouse_id}: {alloc.allocated_quantity} x{" "}
                            {alloc.product_name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </td>
              <td>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    minWidth: "240px",
                  }}
                >
                  <span style={{ fontSize: "0.85rem", fontWeight: "bold" }}>
                    Payment Status: {o.payment_status || "unpaid"}
                  </span>
                  {o.rider_payment_message ? (
                    <div
                      style={{
                        background: "#f8f9fa",
                        border: "1px solid #ddd",
                        borderRadius: "6px",
                        padding: "8px",
                        fontSize: "0.85rem",
                      }}
                    >
                      <strong>Rider Note:</strong> {o.rider_payment_message}
                      <br />
                      <strong>Sent:</strong>{" "}
                      {o.rider_payment_sent_at
                        ? new Date(o.rider_payment_sent_at).toLocaleString()
                        : "N/A"}
                    </div>
                  ) : (
                    <span style={{ fontSize: "0.85rem", color: "#999" }}>
                      Rider confirmation message pending
                    </span>
                  )}

                  <button
                    onClick={() => handleConfirmPayment(o.order_id)}
                    disabled={
                      confirmingOrderId === o.order_id ||
                      normalizeStatus(o.order_status) !== "delivered" ||
                      normalizeStatus(o.payment_status) === "paid" ||
                      !o.rider_payment_message
                    }
                    style={{
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "none",
                      fontWeight: "bold",
                      cursor:
                        confirmingOrderId === o.order_id ||
                        normalizeStatus(o.order_status) !== "delivered" ||
                        normalizeStatus(o.payment_status) === "paid" ||
                        !o.rider_payment_message
                          ? "not-allowed"
                          : "pointer",
                      background:
                        normalizeStatus(o.payment_status) === "paid"
                          ? "#95a5a6"
                          : "#27ae60",
                      color: "white",
                      opacity:
                        confirmingOrderId === o.order_id ||
                        normalizeStatus(o.order_status) !== "delivered" ||
                        normalizeStatus(o.payment_status) === "paid" ||
                        !o.rider_payment_message
                          ? 0.7
                          : 1,
                    }}
                  >
                    {normalizeStatus(o.payment_status) === "paid"
                      ? "Payment Confirmed"
                      : confirmingOrderId === o.order_id
                        ? "Confirming..."
                        : "Approve Rider Payment"}
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

export default OrdersManagement;
