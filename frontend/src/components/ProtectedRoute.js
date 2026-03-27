import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "100px" }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return (
      <div
        style={{ textAlign: "center", marginTop: "100px", color: "#e74c3c" }}
      >
        <h2>Unauthorized Error 403</h2>
        <p>You do not have the required permissions to access this page.</p>
        <button
          onClick={() => {
            if (userRole === "admin") window.location.href = "/admin/dashboard";
            else if (userRole === "rider")
              window.location.href = "/rider/dashboard";
            else window.location.href = "/user/dashboard";
          }}
          style={{
            padding: "10px 20px",
            background: "#9575cd",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            marginTop: "20px",
          }}
        >
          Go to Your Dashboard
        </button>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
