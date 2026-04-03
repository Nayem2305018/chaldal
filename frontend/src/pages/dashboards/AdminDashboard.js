import React, { useState } from "react";
import api from "../../services/api";
import DashboardOverview from "./components/DashboardOverview";
import ManageCategories from "./components/ManageCategories";
import ManageProducts from "./components/ManageProducts";
import InventoryManagement from "./components/InventoryManagement";
import OrdersManagement from "./components/OrdersManagement";
import VoucherManagement from "./components/VoucherManagement";
import RiderRequests from "./components/RiderRequests";
import ApprovedRiders from "./components/ApprovedRiders";
import UsersList from "./components/UsersList";
import "../../styles/AdminDashboard.css";

const AdminDashboard = () => {
  const [activeView, setActiveView] = useState("overview");

  const NAV_ITEMS = [
    { id: "overview", label: "Dashboard Overview", icon: "📊" },
    { id: "categories", label: "Manage Categories", icon: "📁" },
    { id: "products", label: "Manage Products", icon: "📦" },
    { id: "inventory", label: "Inventory Management", icon: "🏢" },
    { id: "orders", label: "Orders Management", icon: "🚚" },
    { id: "vouchers", label: "Voucher Management", icon: "🎟️" },
    { id: "rider-requests", label: "Rider Requests", icon: "🏍️" },
    { id: "approved-riders", label: "Approved Riders", icon: "✅" },
    { id: "users", label: "All Users", icon: "👥" },
  ];

  const renderContent = () => {
    switch (activeView) {
      case "overview":
        return <DashboardOverview />;
      case "categories":
        return <ManageCategories />;
      case "products":
        return <ManageProducts />;
      case "inventory":
        return <InventoryManagement />;
      case "orders":
        return <OrdersManagement />;
      case "vouchers":
        return <VoucherManagement />;
      case "rider-requests":
        return <RiderRequests />;
      case "approved-riders":
        return <ApprovedRiders />;
      case "users":
        return <UsersList />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingRight: "10px",
          }}
        >
          <div className="admin-sidebar-header">Admin Control 👑</div>
        </div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <div
              key={item.id}
              className={`admin-nav-item ${activeView === item.id ? "active" : ""}`}
              onClick={() => setActiveView(item.id)}
            >
              <span style={{ marginRight: "10px", fontSize: "1.2rem" }}>
                {item.icon}
              </span>
              {item.label}
            </div>
          ))}
        </nav>
        <div style={{ padding: "20px", marginTop: "auto" }}>
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
              width: "100%",
              padding: "10px",
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
      </aside>

      <main className="admin-content">{renderContent()}</main>
    </div>
  );
};

export default AdminDashboard;
