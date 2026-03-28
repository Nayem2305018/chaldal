import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api, { fetchProducts } from "../../services/api";
import ProductList from "../../components/ProductList";

const UserDashboard = () => {
  const [products, setProducts] = useState([]);
  const [activeSection, setActiveSection] = useState("dashboard");
  const location = useLocation();
  const userString = localStorage.getItem("auth_user");
  const user = userString ? JSON.parse(userString) : null;

  useEffect(() => {
    fetchProducts().then(setProducts).catch(console.error);
  }, []);

  useEffect(() => {
    if (location.hash === "#profile") {
      setActiveSection("profile");
      return;
    }

    setActiveSection("dashboard");
  }, [location.hash]);

  return (
    <div
      style={{ padding: "100px 20px", maxWidth: "1200px", margin: "0 auto" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>User Dashboard 👤</h2>
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
        Browse all available products below. Add items to your cart by clicking
        the plus icons on the products.
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
          <h3 style={{ marginTop: 0 }}>My Profile</h3>
          <p style={{ margin: "6px 0" }}>
            <strong>Name:</strong> {user?.name || "User"}
          </p>
          <p style={{ margin: "6px 0" }}>
            <strong>Email:</strong> {user?.email || "N/A"}
          </p>
          <p style={{ margin: "6px 0" }}>
            <strong>Role:</strong> user
          </p>
        </section>
      )}

      {products.length === 0 ? (
        <p>Loading products...</p>
      ) : (
        <ProductList products={products} />
      )}
    </div>
  );
};

export default UserDashboard;
