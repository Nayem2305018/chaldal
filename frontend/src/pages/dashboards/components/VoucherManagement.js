import React, { useState } from "react";
import api from "../../../services/api";

const VoucherManagement = () => {
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("");
  const [expiry, setExpiry] = useState("");
  const [isActive, setIsActive] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/voucher", { 
        code, 
        discount_amount: discount, 
        expiry_date: expiry || null, 
        is_active: isActive 
      });
      alert("Voucher created securely!");
      setCode("");
      setDiscount("");
      setExpiry("");
      setIsActive(true);
    } catch (err) {
      alert("Error generating Voucher.");
    }
  };

  return (
    <div>
      <h2 style={{marginTop: 0}}>Voucher Management 🎟️</h2>
      <p style={{ color: "#666" }}>Generate encrypted discount coupons activating global sales campaigns immediately.</p>
      
      <div style={{ background: "white", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", maxWidth: "500px", marginTop: "20px" }}>
        <h3>Create New Voucher</h3>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          
          <div>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Voucher Code</label>
            <input className="admin-input" placeholder="e.g. SUMMER50" value={code} onChange={e=>setCode(e.target.value)} required />
          </div>

          <div>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Discount Amount (৳)</label>
            <input className="admin-input" type="number" step="0.01" placeholder="e.g. 50" value={discount} onChange={e=>setDiscount(e.target.value)} required />
          </div>

          <div>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: "5px" }}>Expiry Date (Optional)</label>
            <input className="admin-input" type="datetime-local" value={expiry} onChange={e=>setExpiry(e.target.value)} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input type="checkbox" id="activeToggle" checked={isActive} onChange={e=>setIsActive(e.target.checked)} style={{ transform: "scale(1.5)" }} />
            <label htmlFor="activeToggle" style={{ fontWeight: "bold", cursor: "pointer" }}>Voucher is Currently Active</label>
          </div>

          <button type="submit" className="admin-btn" style={{ marginTop: "10px", padding: "12px", fontSize: "1.1rem" }}>
            Generate Voucher
          </button>
        </form>
      </div>
    </div>
  );
};

export default VoucherManagement;
