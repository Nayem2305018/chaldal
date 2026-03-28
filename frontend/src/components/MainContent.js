/**
 * MainContent Component
 * Owns route-level rendering and role-based redirects across dashboard and public pages.
 */
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AddProductForm from "./AddProductForm";
import HomePage from "../pages/HomePage";
import CategoryFilterPage from "../pages/CategoryFilterPage";
import SignupPage from "../pages/SignupPage";
import LoginPage from "../pages/LoginPage";
import ProtectedRoute from "./ProtectedRoute";
import UserDashboard from "../pages/dashboards/UserDashboard";
import UserOrderHistoryPage from "../pages/dashboards/UserOrderHistoryPage";
import AdminDashboard from "../pages/dashboards/AdminDashboard";
import RiderDashboard from "../pages/dashboards/RiderDashboard";
import RiderDeliveryHistoryPage from "../pages/dashboards/RiderDeliveryHistoryPage";
import CheckoutPage from "../pages/CheckoutPage";

const MainContent = ({
  admin,
  refreshProducts,
  setRefreshProducts,
  searchTerm,
}) => {
  const role = localStorage.getItem("auth_role");

  const rootElement =
    role === "admin" ? (
      <Navigate to="/admin/dashboard" replace />
    ) : role === "rider" ? (
      <Navigate to="/rider/dashboard" replace />
    ) : (
      <>
        {admin && (
          <AddProductForm
            adminId={admin.adminId}
            onProductAdded={() => setRefreshProducts(!refreshProducts)}
          />
        )}
        <HomePage key={refreshProducts} searchTerm={searchTerm} />
      </>
    );

  return (
    <main className="App-main">
      <Routes>
        <Route
          path="/user/dashboard"
          element={
            <ProtectedRoute allowedRoles={["user"]}>
              <UserDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/order-history"
          element={
            <ProtectedRoute allowedRoles={["user"]}>
              <UserOrderHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute allowedRoles={["user"]}>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rider/dashboard"
          element={
            <ProtectedRoute allowedRoles={["rider"]}>
              <RiderDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rider/delivery-history"
          element={
            <ProtectedRoute allowedRoles={["rider"]}>
              <RiderDeliveryHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/" element={rootElement} />
        <Route path="/categories" element={<CategoryFilterPage />} />
        <Route
          path="/categories/:categoryId"
          element={<CategoryFilterPage />}
        />
      </Routes>
    </main>
  );
};

export default MainContent;


