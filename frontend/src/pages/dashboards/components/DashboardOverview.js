import React, { useState, useEffect } from "react";
import api from "../../../services/api";

const DashboardOverview = () => {
  const [stats, setStats] = useState({ totalUsers: 0, totalRiders: 0, pendingRiderRequests: 0, totalOrders: 0, totalRevenue: 0, lowStockProducts: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("/admin/dashboard-stats");
        setStats(prev => ({ ...prev, ...res.data.stats, lowStockProducts: res.data.stats?.lowStockProducts || [] }));
      } catch (err) { console.error("Failed to load stats", err); }
      finally { setLoading(false); }
    };
    fetchStats();
  }, []);

  if (loading) return <div>Loading dashboard stats...</div>;

  return (
    <div>
      <h2 style={{marginTop: 0, color: "#333"}}>Dashboard Overview 📊</h2>
      <div style={{ display: "flex", gap: "20px", marginBottom: "40px", flexWrap: "wrap" }}>
        <div style={cardStyle}>
          <h4 style={{margin: 0, color: "#666"}}>Total Users</h4>
          <div style={numberStyle}>{stats.totalUsers}</div>
        </div>
        <div style={cardStyle}>
          <h4 style={{margin: 0, color: "#666"}}>Total Riders</h4>
          <div style={numberStyle}>{stats.totalRiders}</div>
        </div>
        <div style={cardStyle}>
          <h4 style={{margin: 0, color: "#666"}}>Total Orders</h4>
          <div style={numberStyle}>{stats.totalOrders}</div>
        </div>
        <div style={cardStyle}>
          <h4 style={{margin: 0, color: "#666"}}>Pending Rider Requests</h4>
          <div style={{...numberStyle, color: "#f39c12"}}>{stats.pendingRiderRequests}</div>
        </div>
        <div style={cardStyle}>
          <h4 style={{margin: 0, color: "#666"}}>Gross Revenue</h4>
          <div style={{...numberStyle, color: "#27ae60"}}>৳{Number(stats.totalRevenue || 0).toFixed(2)}</div>
        </div>
      </div>
      
      <h3>⚠️ Low Stock Alerts ( &lt; 10 items )</h3>
      {stats.lowStockProducts.length === 0 ? (
        <div style={{ padding: "20px", background: "white", borderRadius: "8px", border: "1px dashed #ccc" }}>
          Excellent! No products are currently running out of stock!
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Product Name</th>
              <th>Current Stock</th>
            </tr>
          </thead>
          <tbody>
            {stats.lowStockProducts.map(p => (
              <tr key={p.product_id}>
                <td>#{p.product_id}</td>
                <td>{p.product_name}</td>
                <td style={{ color: "#e74c3c", fontWeight: "bold" }}>{p.stock_quantity} remaining</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const cardStyle = { flex: "1", minWidth: "200px", background: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", borderLeft: "5px solid #9575cd" };
const numberStyle = { fontSize: "2.5rem", fontWeight: "bold", color: "#333", marginTop: "10px" };

export default DashboardOverview;
