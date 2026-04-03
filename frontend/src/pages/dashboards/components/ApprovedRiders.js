import React, { useEffect, useState } from "react";
import { getAllRiders } from "../../../services/api";

const statusColors = {
  available: { bg: "#e8f8f5", text: "#1d8348" },
  on_delivery: { bg: "#eaf2ff", text: "#1f4fa3" },
  offline: { bg: "#fdecea", text: "#a93226" },
};

const normalizeStatus = (value) => String(value || "").toLowerCase();

const ApprovedRiders = () => {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRiders = async () => {
    setLoading(true);
    try {
      const data = await getAllRiders();
      setRiders(data.riders || []);
      setError("");
    } catch (err) {
      console.error("Failed to load riders", err);
      setError(err?.response?.data?.error || "Failed to load approved riders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiders();
  }, []);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 0 }}>Approved Riders</h2>
        <button className="admin-btn" onClick={fetchRiders} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loading ? (
        <p>Loading approved riders...</p>
      ) : error ? (
        <div
          style={{
            marginTop: "20px",
            background: "#fff6f6",
            border: "1px solid #f2b8b5",
            color: "#7f1d1d",
            borderRadius: "8px",
            padding: "12px 14px",
          }}
        >
          {error}
        </div>
      ) : riders.length === 0 ? (
        <div
          style={{
            padding: "40px",
            background: "#f8f9fa",
            borderRadius: "8px",
            border: "1px dashed #d1c4e9",
            marginTop: "20px",
            textAlign: "center",
          }}
        >
          No approved riders found.
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Rider ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {riders.map((rider) => {
              const status = normalizeStatus(rider.current_status);
              const style = statusColors[status] || {
                bg: "#f1f2f6",
                text: "#57606f",
              };

              return (
                <tr key={rider.rider_id}>
                  <td>#{rider.rider_id}</td>
                  <td>{rider.rider_name || "N/A"}</td>
                  <td>{rider.email || "N/A"}</td>
                  <td>{rider.phone || "N/A"}</td>
                  <td>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: "999px",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        background: style.bg,
                        color: style.text,
                        textTransform: "capitalize",
                      }}
                    >
                      {status || "unknown"}
                    </span>
                  </td>
                  <td>
                    {rider.created_at
                      ? new Date(rider.created_at).toLocaleDateString()
                      : "N/A"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ApprovedRiders;
