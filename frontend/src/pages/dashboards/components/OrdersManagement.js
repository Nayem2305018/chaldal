import React, { useState, useEffect } from "react";
import api from "../../../services/api";

const OrdersManagement = () => {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("All");

  const fetchOrders = async () => {
    try {
      const res = await api.get("/admin/orders");
      setOrders(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.put(`/admin/order/${id}`, { status });
      fetchOrders();
    } catch (err) { alert("Status update failed"); }
  };


  const filteredOrders = filter === "All" ? orders : orders.filter(o => o.order_status === filter);

  return (
    <div>
      <h2 style={{marginTop: 0}}>Orders & Dispatch 🚚</h2>
      
      <div style={{ marginBottom: "20px" }}>
        <strong>Filter by Status: </strong>
        <select value={filter} onChange={e=>setFilter(e.target.value)} style={{ padding: "8px", borderRadius: "6px", marginLeft: "10px" }}>
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
            <th>Order ID</th><th>Date</th><th>Delivery Info</th><th>Ordered Items</th><th>Total</th><th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map(o => (
            <tr key={o.order_id}>
              <td>{o.order_id}</td>
              <td>{new Date(o.order_date).toLocaleDateString()}</td>
              <td>
                <div style={{ fontSize: "0.85rem", maxWidth: "200px" }}>
                  <strong>Address:</strong> {o.delivery_address || 'N/A'}<br/>
                  <strong>Time:</strong> {o.preferred_delivery_time || 'N/A'}
                </div>
              </td>
              <td>
                <ul style={{ margin: 0, paddingLeft: "15px", fontSize: "0.85rem", maxWidth: "250px" }}>
                  {o.items && o.items.length > 0 ? o.items.map((item, idx) => (
                    <li key={idx}>{item.quantity}x {item.product_name}</li>
                  )) : <li>No items</li>}
                </ul>
              </td>
              <td style={{ fontWeight: "bold" }}>৳{parseFloat(o.total_price).toFixed(2)}</td>
              <td>
                <span style={{
                  padding: "4px 10px", borderRadius: "12px", fontSize: "0.85rem", fontWeight: "bold",
                  background: o.order_status === 'Delivered' ? '#e8f8f5' : o.order_status === 'Pending' ? '#fff3cd' : '#e1f5fe',
                  color: o.order_status === 'Delivered' ? '#27ae60' : o.order_status === 'Pending' ? '#f39c12' : '#2980b9'
                }}>
                  {o.order_status}
                </span>
                
                {o.rider_id && (
                  <div style={{ marginTop: "10px", fontSize: "0.8rem", background: "#f8f9fa", padding: "8px", borderRadius: "6px", border: "1px dashed #ccc" }}>
                    <strong>Rider ID:</strong> {o.rider_id}<br/>
                    <strong>Warehouse:</strong> {o.warehouse_id || "N/A"}<br/>
                    <strong>Delivery Ref:</strong> {o.delivery_status || "Assigned"}
                  </div>
                )}
              </td>
              <td>
                <div style={{ display: "flex", gap: "10px" }}>
                  <select 
                    value={o.order_status} 
                    onChange={(e) => handleUpdateStatus(o.order_id, e.target.value)}
                    style={{ padding: "5px", borderRadius: "4px" }}
                  >
                    <option value="pending">Pending</option>
                    <option value="assigned">Assigned</option>
                    <option value="delivering">Delivering</option>
                    <option value="delivered">Delivered</option>
                  </select>
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
