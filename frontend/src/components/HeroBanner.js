import React, { useState, useEffect } from "react";
import "../styles/HeroBanner.css";

const HeroBanner = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userString = localStorage.getItem("auth_user");
    if (userString) {
      try {
        setUser(JSON.parse(userString));
      } catch (e) {
        console.error("Failed to parse user");
      }
    }
  }, []);

  return (
    <section className="hero-banner">
      <div className="hero-content">
        <h2>{user ? `Welcome back, ${(user.name || user.rider_name || "User").split(' ')[0]}!` : "Your Online Grocery Store"}</h2>
        <p>{user ? "Ready to grab some fresh groceries?" : "Fresh groceries delivered to your doorstep"}</p>
        <div className="hero-features">
          <div className="hero-feature">
            <span className="feature-icon">🚚</span>
            <span>Fast Delivery</span>
          </div>
          <div className="hero-feature">
            <span className="feature-icon">✅</span>
            <span>Fresh Quality</span>
          </div>
          <div className="hero-feature">
            <span className="feature-icon">💰</span>
            <span>Best Prices</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
