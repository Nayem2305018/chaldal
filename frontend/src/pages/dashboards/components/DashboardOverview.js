import React, { useState, useEffect } from "react";
import api from "../../../services/api";

const DashboardOverview = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRiders: 0,
    pendingRiderRequests: 0,
    totalOrders: 0,
    totalRevenue: 0,
    lowStockProducts: [],
    discount_products: [],
    analytics: {
      dailyRevenue: [],
      monthlyRevenueTrend: [],
      warehouseWorkload: [],
      monthlyRevenueSummary: { total_revenue: 0, total_orders: 0 },
      averageOrderValue: 0,
      topSellingProducts: [],
      mostActiveUsers: [],
      orderStatusDistribution: [],
      peakOrderHours: [],
    },
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("/admin/dashboard-stats");
        setLoadError("");
        setStats((prev) => ({
          ...prev,
          ...res.data.stats,
          lowStockProducts: res.data.stats?.lowStockProducts || [],
          discount_products: res.data.stats?.discount_products || [],
          analytics: {
            ...prev.analytics,
            ...(res.data.stats?.analytics || {}),
          },
        }));
      } catch (err) {
        console.error("Failed to load stats", err);
        const serverMessage = err?.response?.data?.error;
        setLoadError(serverMessage || "Failed to load dashboard statistics.");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div>Loading dashboard stats...</div>;

  if (loadError) {
    return (
      <div
        style={{
          background: "#fff6f6",
          border: "1px solid #f2b8b5",
          color: "#7f1d1d",
          borderRadius: "8px",
          padding: "14px 16px",
        }}
      >
        {loadError}
      </div>
    );
  }

  const monthlySummary = stats.analytics?.monthlyRevenueSummary || {};
  const topSellingProducts = stats.analytics?.topSellingProducts || [];
  const mostActiveUsers = stats.analytics?.mostActiveUsers || [];
  const orderStatusDistribution =
    stats.analytics?.orderStatusDistribution || [];
  const peakOrderHours = stats.analytics?.peakOrderHours || [];
  const riderPerformance = stats.analytics?.riderPerformance || [];
  const dailyRevenue = stats.analytics?.dailyRevenue || [];
  const monthlyRevenueTrend = stats.analytics?.monthlyRevenueTrend || [];
  const warehouseWorkload = stats.analytics?.warehouseWorkload || [];

  return (
    <div>
      <h2 style={{ marginTop: 0, color: "#333" }}>Dashboard Overview 📊</h2>
      <div
        style={{
          display: "flex",
          gap: "20px",
          marginBottom: "40px",
          flexWrap: "wrap",
        }}
      >
        <div style={cardStyle}>
          <h4 style={{ margin: 0, color: "#666" }}>Total Users</h4>
          <div style={numberStyle}>{stats.totalUsers}</div>
        </div>
        <div style={cardStyle}>
          <h4 style={{ margin: 0, color: "#666" }}>Total Riders</h4>
          <div style={numberStyle}>{stats.totalRiders}</div>
        </div>
        <div style={cardStyle}>
          <h4 style={{ margin: 0, color: "#666" }}>Total Orders</h4>
          <div style={numberStyle}>{stats.totalOrders}</div>
        </div>
        <div style={cardStyle}>
          <h4 style={{ margin: 0, color: "#666" }}>Pending Rider Requests</h4>
          <div style={{ ...numberStyle, color: "#f39c12" }}>
            {stats.pendingRiderRequests}
          </div>
        </div>
        <div style={cardStyle}>
          <h4 style={{ margin: 0, color: "#666" }}>Gross Revenue</h4>
          <div style={{ ...numberStyle, color: "#27ae60" }}>
            ৳{Number(stats.totalRevenue || 0).toFixed(2)}
          </div>
        </div>
      </div>

      <h3 style={{ marginBottom: "12px" }}>Advanced Business Analytics</h3>
      <div
        style={{
          display: "flex",
          gap: "20px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <div style={cardStyle}>
          <h4 style={{ margin: 0, color: "#666" }}>
            Paid Revenue (This Month)
          </h4>
          <div style={{ ...numberStyle, color: "#27ae60" }}>
            ৳{Number(monthlySummary.total_revenue || 0).toFixed(2)}
          </div>
        </div>
        <div style={cardStyle}>
          <h4 style={{ margin: 0, color: "#666" }}>Paid Orders (This Month)</h4>
          <div style={numberStyle}>
            {Number(monthlySummary.total_orders || 0)}
          </div>
        </div>
        <div style={cardStyle}>
          <h4 style={{ margin: 0, color: "#666" }}>Average Order Value</h4>
          <div style={{ ...numberStyle, color: "#2980b9" }}>
            ৳{Number(stats.analytics?.averageOrderValue || 0).toFixed(2)}
          </div>
        </div>
      </div>

      <h3 style={{ marginBottom: "10px" }}>Daily Paid Revenue</h3>
      {dailyRevenue.length === 0 ? (
        <div
          style={{
            padding: "20px",
            background: "white",
            borderRadius: "8px",
            border: "1px dashed #ccc",
            marginBottom: "28px",
          }}
        >
          No paid-order daily revenue data available yet.
        </div>
      ) : (
        <table className="admin-table" style={{ marginBottom: "28px" }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Paid Revenue</th>
              <th>Paid Orders</th>
            </tr>
          </thead>
          <tbody>
            {dailyRevenue.map((row) => (
              <tr key={String(row.revenue_date)}>
                <td>{String(row.revenue_date || "")}</td>
                <td>৳{Number(row.total_revenue || 0).toFixed(2)}</td>
                <td>{Number(row.total_orders || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 style={{ marginBottom: "10px" }}>Monthly Paid Revenue Trend</h3>
      {monthlyRevenueTrend.length === 0 ? (
        <div
          style={{
            padding: "20px",
            background: "white",
            borderRadius: "8px",
            border: "1px dashed #ccc",
            marginBottom: "28px",
          }}
        >
          No monthly revenue trend data available yet.
        </div>
      ) : (
        <table className="admin-table" style={{ marginBottom: "28px" }}>
          <thead>
            <tr>
              <th>Month</th>
              <th>Paid Revenue</th>
              <th>Paid Orders</th>
            </tr>
          </thead>
          <tbody>
            {monthlyRevenueTrend.map((row) => (
              <tr key={String(row.month_key)}>
                <td>{String(row.month_name || "")}</td>
                <td>৳{Number(row.total_revenue || 0).toFixed(2)}</td>
                <td>{Number(row.total_orders || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 style={{ marginBottom: "10px" }}>Warehouse Workload</h3>
      {warehouseWorkload.length === 0 ? (
        <div
          style={{
            padding: "20px",
            background: "white",
            borderRadius: "8px",
            border: "1px dashed #ccc",
            marginBottom: "28px",
          }}
        >
          No warehouse workload data available yet.
        </div>
      ) : (
        <table className="admin-table" style={{ marginBottom: "28px" }}>
          <thead>
            <tr>
              <th>Warehouse ID</th>
              <th>Warehouse Name</th>
              <th>Total Deliveries</th>
            </tr>
          </thead>
          <tbody>
            {warehouseWorkload.map((row) => (
              <tr key={String(row.warehouse_id)}>
                <td>#{row.warehouse_id}</td>
                <td>{row.warehouse_name || "N/A"}</td>
                <td>{Number(row.total_deliveries || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 style={{ marginBottom: "10px" }}>Rider Performance</h3>
      {riderPerformance.length === 0 ? (
        <div
          style={{
            padding: "20px",
            background: "white",
            borderRadius: "8px",
            border: "1px dashed #ccc",
            marginBottom: "28px",
          }}
        >
          No rider performance data available yet.
        </div>
      ) : (
        <table className="admin-table" style={{ marginBottom: "28px" }}>
          <thead>
            <tr>
              <th>Rider ID</th>
              <th>Rider Name</th>
              <th>Completed Deliveries</th>
            </tr>
          </thead>
          <tbody>
            {riderPerformance.map((row) => (
              <tr key={String(row.rider_id)}>
                <td>#{row.rider_id}</td>
                <td>{row.rider_name || "N/A"}</td>
                <td>{Number(row.total_deliveries_completed || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div
        style={{
          display: "flex",
          gap: "20px",
          flexWrap: "wrap",
          marginBottom: "32px",
        }}
      >
        <div style={panelStyle}>
          <h4 style={panelTitleStyle}>Top-Selling Products</h4>
          {topSellingProducts.length === 0 ? (
            <p style={emptyTextStyle}>No sales data available yet.</p>
          ) : (
            <ul style={listStyle}>
              {topSellingProducts.slice(0, 5).map((item) => (
                <li key={item.product_id}>
                  {item.product_name} ({item.total_quantity_sold} units)
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={panelStyle}>
          <h4 style={panelTitleStyle}>Most Active Users</h4>
          {mostActiveUsers.length === 0 ? (
            <p style={emptyTextStyle}>No user activity data available yet.</p>
          ) : (
            <ul style={listStyle}>
              {mostActiveUsers.slice(0, 5).map((user) => (
                <li key={user.user_id}>
                  {user.user_name} ({user.total_orders} orders)
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={panelStyle}>
          <h4 style={panelTitleStyle}>Order Status Distribution</h4>
          {orderStatusDistribution.length === 0 ? (
            <p style={emptyTextStyle}>No order status data available yet.</p>
          ) : (
            <ul style={listStyle}>
              {orderStatusDistribution.map((statusRow) => (
                <li key={statusRow.order_status}>
                  {statusRow.order_status}: {statusRow.total_orders}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={panelStyle}>
          <h4 style={panelTitleStyle}>Peak Order Hours</h4>
          {peakOrderHours.length === 0 ? (
            <p style={emptyTextStyle}>No order time data available yet.</p>
          ) : (
            <ul style={listStyle}>
              {peakOrderHours.slice(0, 5).map((row) => (
                <li key={row.order_hour}>
                  {String(row.order_hour).padStart(2, "0")}:00 -{" "}
                  {row.total_orders} orders
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <h3 style={{ marginBottom: "8px" }}>Active Discount Products</h3>
      {stats.discount_products.length === 0 ? (
        <div
          style={{
            padding: "20px",
            background: "white",
            borderRadius: "8px",
            border: "1px dashed #ccc",
            marginBottom: "28px",
          }}
        >
          No active product discounts currently found in database.
        </div>
      ) : (
        <table className="admin-table" style={{ marginBottom: "32px" }}>
          <thead>
            <tr>
              <th>Product</th>
              <th>Type</th>
              <th>Value</th>
              <th>Discounted Price</th>
            </tr>
          </thead>
          <tbody>
            {stats.discount_products.map((item) => (
              <tr key={item.product_discount_id}>
                <td>{item.product_name}</td>
                <td>{item.discount_type}</td>
                <td>
                  {item.discount_type === "percentage"
                    ? `${item.discount_value}%`
                    : `৳${Number(item.discount_value || 0).toFixed(2)}`}
                </td>
                <td>৳{Number(item.discounted_price || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>⚠️ Low Stock Alerts By Region ( &lt; 10 items )</h3>
      {stats.lowStockProducts.length === 0 ? (
        <div
          style={{
            padding: "20px",
            background: "white",
            borderRadius: "8px",
            border: "1px dashed #ccc",
          }}
        >
          Excellent! No products are currently running out of stock!
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Product Name</th>
              <th>Region</th>
              <th>Warehouse</th>
              <th>Current Stock</th>
            </tr>
          </thead>
          <tbody>
            {stats.lowStockProducts.map((p) => (
              <tr
                key={`${p.product_id}-${p.warehouse_id || p.region_id || "na"}`}
              >
                <td>#{p.product_id}</td>
                <td>{p.product_name}</td>
                <td>{p.region_name || "Unassigned Region"}</td>
                <td>{p.warehouse_name || "N/A"}</td>
                <td style={{ color: "#e74c3c", fontWeight: "bold" }}>
                  {p.stock_quantity} remaining
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const cardStyle = {
  flex: "1",
  minWidth: "200px",
  background: "white",
  padding: "20px",
  borderRadius: "10px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  borderLeft: "5px solid #9575cd",
};
const numberStyle = {
  fontSize: "2.5rem",
  fontWeight: "bold",
  color: "#333",
  marginTop: "10px",
};
const panelStyle = {
  flex: "1",
  minWidth: "230px",
  background: "#fff",
  border: "1px solid #e4e7ec",
  borderRadius: "10px",
  padding: "14px 16px",
};
const panelTitleStyle = {
  marginTop: 0,
  marginBottom: "10px",
  color: "#2c3e50",
};
const listStyle = {
  margin: 0,
  paddingLeft: "18px",
  color: "#495057",
  lineHeight: 1.6,
};
const emptyTextStyle = { color: "#888", margin: 0 };

export default DashboardOverview;
