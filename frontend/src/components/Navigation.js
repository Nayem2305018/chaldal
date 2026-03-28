/**
 * Navigation Component
 * Renders global top navigation, profile menu actions, and role-aware quick navigation.
 */
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import SearchBar from "./SearchBar";
import { useCart } from "../context/CartContext";
import "../styles/Navigation.css";

const CART_ICON = "\u{1F6D2}";
const DROPDOWN_ICON = "\u25BE";

const Navigation = ({ onSearch }) => {
  const navigate = useNavigate();
  const { totalItems, setIsOpen } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  const userString = localStorage.getItem("auth_user");
  const user = userString ? JSON.parse(userString) : null;
  const role = localStorage.getItem("auth_role");
  const logoTarget =
    role === "admin"
      ? "/admin/dashboard"
      : role === "rider"
        ? "/rider/dashboard"
        : "/";
  const showCartButton = role !== "admin" && role !== "rider";

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_role");
    setIsOpen(false);
    setMenuOpen(false);
    navigate("/", { replace: true });
    window.location.reload(); // Quick sync flush mapping entire cookie state safely downstream.
  };

  const navigateToSection = (path, hash) => {
    setMenuOpen(false);
    if (hash) {
      navigate({ pathname: path, hash });
      return;
    }

    navigate(path);
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to={logoTarget} className="nav-logo">
          <span className="nav-logo-icon" aria-hidden="true">
            {CART_ICON}
          </span>
          <span className="nav-logo-text">Chaldal</span>
        </Link>

        <SearchBar onSearch={onSearch} />

        <div
          style={{
            display: "flex",
            gap: "15px",
            marginLeft: "20px",
            alignItems: "center",
          }}
        >
          {showCartButton && (
            <button
              onClick={() => setIsOpen(true)}
              style={{
                background: "rgba(255,255,255,0.25)",
                border: "1px solid rgba(255,255,255,0.5)",
                color: "white",
                padding: "6px 12px",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "1rem",
                display: "flex",
                alignItems: "center",
                transition: "all 0.2s",
              }}
            >
              {CART_ICON}{" "}
              <span
                style={{
                  background: "#e74c3c",
                  borderRadius: "12px",
                  padding: "2px 8px",
                  fontSize: "0.8rem",
                  marginLeft: "8px",
                }}
              >
                {totalItems}
              </span>
            </button>
          )}

          {user ? (
            <>
              <div className="profile-menu" ref={profileMenuRef}>
                <button
                  className="profile-menu-trigger"
                  onClick={() => setMenuOpen((prev) => !prev)}
                >
                  {(user.name || user.rider_name || "User").split(" ")[0]}{" "}
                  {DROPDOWN_ICON}
                </button>

                {menuOpen && (
                  <div className="profile-menu-dropdown">
                    <div className="profile-menu-header">
                      <strong>{user.name || user.rider_name || "User"}</strong>
                      <span>{user.email || "no-email"}</span>
                      <span>Role: {role || "guest"}</span>
                    </div>

                    {role === "user" && (
                      <>
                        <button
                          type="button"
                          className="profile-menu-item"
                          onClick={() =>
                            navigateToSection("/user/dashboard", "#profile")
                          }
                        >
                          Profile
                        </button>
                        <button
                          type="button"
                          className="profile-menu-item"
                          onClick={() =>
                            navigateToSection("/user/order-history", "")
                          }
                        >
                          Order History
                        </button>
                      </>
                    )}

                    {role === "rider" && (
                      <>
                        <button
                          type="button"
                          className="profile-menu-item"
                          onClick={() =>
                            navigateToSection("/rider/dashboard", "#profile")
                          }
                        >
                          Profile
                        </button>
                        <button
                          type="button"
                          className="profile-menu-item"
                          onClick={() =>
                            navigateToSection("/rider/delivery-history", "")
                          }
                        >
                          Delivery History
                        </button>
                      </>
                    )}

                    {role === "admin" && (
                      <button
                        type="button"
                        className="profile-menu-item"
                        onClick={() =>
                          navigateToSection("/admin/dashboard", "")
                        }
                      >
                        Admin Dashboard
                      </button>
                    )}

                    <button
                      onClick={handleLogout}
                      className="profile-logout-btn"
                    >
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="login-link"
                style={{
                  color: "white",
                  textDecoration: "none",
                  fontWeight: "600",
                  border: "1px solid white",
                  padding: "6px 15px",
                  borderRadius: "20px",
                }}
              >
                Login
              </Link>

              <Link
                to="/signup"
                className="signup-link"
                style={{
                  color: "#9575cd",
                  background: "white",
                  textDecoration: "none",
                  fontWeight: "bold",
                  padding: "6px 15px",
                  borderRadius: "20px",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                }}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
