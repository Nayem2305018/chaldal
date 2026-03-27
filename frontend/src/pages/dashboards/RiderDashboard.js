import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "../../services/api";

const RiderDashboard = () => {
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [warehouseSelections, setWarehouseSelections] = useState({});
  const [paymentNotes, setPaymentNotes] = useState({});
  const [activeSection, setActiveSection] = useState("none");
  const location = useLocation();
  const userString = localStorage.getItem("auth_user");
  const rider = userString ? JSON.parse(userString) : null;

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assignedRes, availableRes] = await Promise.all([
        api.get("/order/assigned"),
        api.get("/order/available"),
      ]);
      setMyDeliveries(assignedRes.data);
      setAvailableOrders(availableRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (location.hash === "#profile") {
      setActiveSection("profile");
      return;
    }

    if (location.hash === "#delivery-history") {
      setActiveSection("history");
      return;
    }

    setActiveSection("none");
  }, [location.hash]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      if (newStatus === "Delivered") {
        const note = paymentNotes[orderId];
        if (!note || !note.trim()) {
          alert(
            "Please write a confirmation message for sending collected money before completing delivery.",
          );
          return;
        }

        await api.patch(`/order/complete-delivery/${orderId}`, {
          payment_confirmation_message: note.trim(),
        });
      } else {
        await api.patch(`/order/start-delivery/${orderId}`);
      }

      setPaymentNotes((prev) => ({ ...prev, [orderId]: "" }));
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update status");
    }
  };

  const handleAssignRider = async (orderId) => {
    const warehouse_id = warehouseSelections[orderId] || null;

    try {
      await api.patch(`/order/assign-rider/${orderId}`, {
        warehouse_id,
      });
      alert("Order successfully assigned to you!");
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to assign order");
    }
  };

  return (
    <div
      style={{ padding: "100px 20px", maxWidth: "1000px", margin: "0 auto" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>Rider Dispatch Terminal 🚚</h2>
        <button
          onClick={async () => {
            try {
              await api.post("/auth/logout");
            } catch (e) {}
            localStorage.removeItem("auth_token");
            localStorage.removeItem("auth_user");
            localStorage.removeItem("auth_role");
            window.location.href = "/";
          }}
          style={{
            padding: "8px 16px",
            background: "#e74c3c",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Logout
        </button>
      </div>
      <p style={{ color: "#666", marginBottom: "30px" }}>
        Monitor your active deliveries and assign yourself to new pending orders
        below.
      </p>

      {activeSection === "profile" && (
        <section
          id="profile"
          style={{
            background: "#ffffff",
            border: "1px solid #ececec",
            borderRadius: "10px",
            padding: "16px",
            marginBottom: "30px",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Rider Profile</h3>
          <p style={{ margin: "6px 0" }}>
            <strong>Name:</strong> {rider?.name || rider?.rider_name || "Rider"}
          </p>
          <p style={{ margin: "6px 0" }}>
            <strong>Email:</strong> {rider?.email || "N/A"}
          </p>
          <p style={{ margin: "6px 0" }}>
            <strong>Role:</strong> rider
          </p>
        </section>
      )}

      {loading ? (
        <p>Syncing dispatch logs...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "50px" }}>
          {/* Active Deliveries */}
          {activeSection === "history" && (
            <section id="delivery-history">
              <h3
                style={{
                  borderBottom: "2px solid #eee",
                  paddingBottom: "10px",
                }}
              >
                My Assigned Deliveries 📦
              </h3>
              {myDeliveries.length === 0 ? (
                <div
                  style={{
                    padding: "30px",
                    background: "#f8f9fa",
                    borderRadius: "8px",
                    border: "1px dashed #d1c4e9",
                    textAlign: "center",
                  }}
                >
                  You have no active or completed deliveries.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: "20px",
                    gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
                  }}
                >
                  {myDeliveries.map((d) => (
                    <div
                      key={d.delivery_id}
                      style={{
                        background: "white",
                        padding: "20px",
                        borderRadius: "12px",
                        border: "1px solid #1abc9c",
                        boxShadow: "0 4px 6px rgba(26,188,156,0.1)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "15px",
                        }}
                      >
                        <h4 style={{ margin: 0 }}>Delivery #{d.delivery_id}</h4>
                        <span
                          style={{
                            background:
                              d.delivery_status === "delivered"
                                ? "#27ae60"
                                : "#f39c12",
                            color: "white",
                            padding: "4px 12px",
                            borderRadius: "12px",
                            fontSize: "0.85rem",
                            fontWeight: "bold",
                          }}
                        >
                          {d.delivery_status === "assigned"
                            ? "Awaiting Dispatch"
                            : d.delivery_status}
                        </span>
                      </div>
                      <p>
                        <strong>Order ID:</strong> {d.order_id}
                      </p>
                      <p>
                        <strong>Pickup Warehouse:</strong> {d.warehouse_id}
                      </p>
                      {d.warehouse_allocations &&
                        d.warehouse_allocations.length > 0 && (
                          <div
                            style={{
                              marginBottom: "10px",
                              background: "#fff7e6",
                              border: "1px solid #ffe2ad",
                              padding: "8px",
                              borderRadius: "8px",
                            }}
                          >
                            <strong>Warehouse Allocation:</strong>
                            <ul
                              style={{
                                margin: "6px 0 0",
                                paddingLeft: "18px",
                                fontSize: "0.85rem",
                              }}
                            >
                              {d.warehouse_allocations.map((alloc, idx) => (
                                <li key={`${d.delivery_id}-${idx}`}>
                                  Warehouse {alloc.warehouse_id}:{" "}
                                  {alloc.allocated_quantity} x{" "}
                                  {alloc.product_name}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      <p>
                        <strong>Dropoff Address:</strong> {d.delivery_address}
                      </p>
                      <p>
                        <strong>Dropoff Time:</strong>{" "}
                        {d.preferred_delivery_time}
                      </p>

                      <div
                        style={{
                          marginTop: "15px",
                          background: "#f8f9fa",
                          padding: "10px",
                          borderRadius: "8px",
                        }}
                      >
                        <strong>Items to Deliver:</strong>
                        <ul
                          style={{
                            paddingLeft: "20px",
                            marginTop: "5px",
                            marginBottom: "5px",
                            fontSize: "0.9rem",
                          }}
                        >
                          {d.items && d.items.length > 0 ? (
                            d.items.map((item, idx) => (
                              <li key={idx}>
                                {item.quantity}x {item.product_name}
                              </li>
                            ))
                          ) : (
                            <li>No item details</li>
                          )}
                        </ul>
                      </div>

                      <div
                        style={{
                          marginTop: "20px",
                          display: "flex",
                          gap: "10px",
                        }}
                      >
                        {d.delivery_status === "assigned" && (
                          <button
                            onClick={() =>
                              handleUpdateStatus(d.order_id, "Out for Delivery")
                            }
                            style={btnStyle("#3498db")}
                          >
                            Start Delivery
                          </button>
                        )}
                        {d.delivery_status === "delivering" && (
                          <div style={{ width: "100%" }}>
                            <textarea
                              value={paymentNotes[d.order_id] || ""}
                              onChange={(e) =>
                                setPaymentNotes((prev) => ({
                                  ...prev,
                                  [d.order_id]: e.target.value,
                                }))
                              }
                              placeholder="Write money transfer confirmation message for admin..."
                              style={{
                                width: "100%",
                                minHeight: "70px",
                                marginBottom: "10px",
                                padding: "8px",
                                borderRadius: "6px",
                                border: "1px solid #ccc",
                                boxSizing: "border-box",
                              }}
                            />
                            <button
                              onClick={() =>
                                handleUpdateStatus(d.order_id, "Delivered")
                              }
                              style={btnStyle("#1abc9c")}
                            >
                              Complete Delivery & Send Confirmation 🏁
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Available Orders */}
          <section>
            <h3
              style={{ borderBottom: "2px solid #eee", paddingBottom: "10px" }}
            >
              Available Pending Orders 📋
            </h3>
            {availableOrders.length === 0 ? (
              <div
                style={{
                  padding: "30px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  border: "1px dashed #d1c4e9",
                  textAlign: "center",
                }}
              >
                No pending orders right now. Good job!
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "20px",
                  gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
                }}
              >
                {availableOrders.map((o) => (
                  <div
                    key={o.order_id}
                    style={{
                      background: "white",
                      padding: "20px",
                      borderRadius: "12px",
                      border: "1px solid #eee",
                      boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "15px",
                      }}
                    >
                      <h4 style={{ margin: 0 }}>Order #{o.order_id}</h4>
                    </div>
                    <p>
                      <strong>Customer Address:</strong> {o.delivery_address}
                    </p>
                    <p>
                      <strong>Requested Box Time:</strong>{" "}
                      {o.preferred_delivery_time}
                    </p>

                    <div
                      style={{
                        marginTop: "15px",
                        background: "#f8f9fa",
                        padding: "10px",
                        borderRadius: "8px",
                      }}
                    >
                      <strong>Ordered Items:</strong>
                      <ul
                        style={{
                          paddingLeft: "20px",
                          marginTop: "5px",
                          marginBottom: "5px",
                          fontSize: "0.9rem",
                        }}
                      >
                        {o.items && o.items.length > 0 ? (
                          o.items.map((item, idx) => (
                            <li key={idx}>
                              {item.quantity}x {item.product_name}
                            </li>
                          ))
                        ) : (
                          <li>No items mapped</li>
                        )}
                      </ul>
                    </div>

                    <div style={{ marginTop: "20px" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.9rem",
                          fontWeight: "bold",
                          marginBottom: "5px",
                        }}
                      >
                        Preferred Pickup Warehouse (optional):
                      </label>
                      <select
                        value={warehouseSelections[o.order_id] || ""}
                        onChange={(e) =>
                          setWarehouseSelections((prev) => ({
                            ...prev,
                            [o.order_id]: e.target.value,
                          }))
                        }
                        style={{
                          width: "100%",
                          padding: "10px",
                          border: "1px solid #ccc",
                          borderRadius: "6px",
                          marginBottom: "15px",
                          boxSizing: "border-box",
                        }}
                      >
                        <option value="">
                          Auto allocate from all warehouses
                        </option>
                        <option value="1">Warehouse 1</option>
                        <option value="2">Warehouse 2</option>
                        <option value="3">Warehouse 3</option>
                      </select>
                      <button
                        onClick={() => handleAssignRider(o.order_id)}
                        style={{
                          ...btnStyle("#9b59b6"),
                          width: "100%",
                          padding: "12px",
                        }}
                      >
                        Final Submit & Assign
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

const btnStyle = (bg) => ({
  padding: "10px 15px",
  borderRadius: "6px",
  border: "none",
  background: bg,
  color: "white",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "0.9rem",
});

export default RiderDashboard;
