import React from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import SearchBar from "./SearchBar";
import { useCart } from "../context/CartContext";
import "../styles/Navigation.css";

const Navigation = ({ onSearch }) => {
  const navigate = useNavigate();
  const { totalItems, setIsOpen } = useCart();

  const userString = localStorage.getItem("auth_user");
  const user = userString ? JSON.parse(userString) : null;

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch(e) {
      console.error(e);
    }
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_role");
    setIsOpen(false);
    navigate("/");
    window.location.reload(); // Quick sync flush mapping entire cookie state safely downstream.
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          🛒 Chaldal
        </Link>

        <SearchBar onSearch={onSearch} />
        
        <div style={{ display: 'flex', gap: '15px', marginLeft: "20px", alignItems: "center" }}>
          
          <button 
            onClick={() => setIsOpen(true)}
            style={{ 
              background: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.5)", color: "white", 
              padding: "6px 12px", borderRadius: "8px", cursor: "pointer", 
              fontWeight: "bold", fontSize: "1rem", display: "flex", alignItems: "center", transition: "all 0.2s" 
            }}>
            🛒 <span style={{ background: "#e74c3c", borderRadius: "12px", padding: "2px 8px", fontSize: "0.8rem", marginLeft: "8px" }}>{totalItems}</span>
          </button>
          
          {user ? (
            <>
              <span style={{ color: "white", fontWeight: "bold", marginLeft: "10px" }}>
                Welcome, {(user.name || user.rider_name || "User").split(' ')[0]}!
              </span>
              <button 
                onClick={handleLogout}
                style={{ 
                  color: "white", background: "#e74c3c", border: "none", fontWeight: "bold",
                  padding: "6px 15px", borderRadius: "20px", display: "flex", alignItems: "center", cursor: "pointer", boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
                }}>
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="login-link" style={{ 
                color: "white", textDecoration: "none", fontWeight: "600",
                border: "1px solid white", padding: "6px 15px", borderRadius: "20px"
              }}>
                Login
              </Link>
              
              <Link to="/signup" className="signup-link" style={{ 
                color: "#9575cd", background: "white", textDecoration: "none", fontWeight: "bold",
                padding: "6px 15px", borderRadius: "20px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
              }}>
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
