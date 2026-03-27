import React from "react";
import "../styles/Footer.css";

function Footer() {
  const brands = [
    { name: "Pran", icon: "🏢" },
    { name: "Nestle", icon: "🥛" },
    { name: "Cocolla", icon: "🥤" },
    { name: "MGI", icon: "🏭" },
    { name: "Reckitt", icon: "🧼" },
    { name: "Marico", icon: "🛢" },
  ];

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="popular-brands-section">
          <h3 className="popular-brands-title">⭐ Chaldal is Popular on</h3>
          <div className="brands-grid">
            {brands.map((brand, index) => (
              <div key={index} className="brand-item">
                <span className="brand-icon">{brand.icon}</span>
                <span className="brand-name">{brand.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="footer-divider"></div>

        <div className="footer-bottom">
          <p className="footer-text">
            &copy; 2026 Chaldal. All rights reserved. | Trusted by millions for
            fresh groceries and quality products.
          </p>
          <div className="footer-links">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms & Conditions</a>
            <a href="#contact">Contact Us</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
