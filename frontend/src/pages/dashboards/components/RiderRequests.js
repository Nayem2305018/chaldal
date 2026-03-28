import React, { useState, useEffect } from "react";
import {
  getRiderRequests,
  approveRider,
  rejectRider,
} from "../../../services/api";

const RiderRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const data = await getRiderRequests();
      setRequests(data.requests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id) => {
    if (!window.confirm("Approve this rider request?")) return;
    try {
      await approveRider(id);
      fetchRequests();
    } catch (err) {
      alert("Failed to approve rider");
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt("Reason for rejection:");
    if (reason === null) return;
    try {
      await rejectRider(id, reason);
      fetchRequests();
    } catch (err) {
      alert("Failed to reject rider");
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Rider Requests</h2>
      </div>

      {loading ? (
        <p>Loading requests...</p>
      ) : requests.length === 0 ? (
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
          No pending rider requests.
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Code</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.request_id}>
                <td>{req.request_id}</td>
                <td>{req.name}</td>
                <td>{req.email}</td>
                <td>{req.phone}</td>
                <td>{req.appointment_code}</td>
                <td>
                  <div className="table-actions">
                    <button
                      onClick={() => handleApprove(req.request_id)}
                      className="btn-edit"
                      style={{ background: "#1abc9c" }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(req.request_id)}
                      className="btn-delete"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default RiderRequests;
