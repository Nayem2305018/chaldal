import React, { useEffect, useState } from "react";
import { getAllUsers } from "../../../services/api";

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data.users || []);
      setError("");
    } catch (err) {
      console.error("Failed to load users", err);
      setError(err?.response?.data?.error || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
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
        <h2 style={{ marginTop: 0, marginBottom: 0 }}>All Users</h2>
        <button className="admin-btn" onClick={fetchUsers} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loading ? (
        <p>Loading users...</p>
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
      ) : users.length === 0 ? (
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
          No users found.
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.user_id}>
                <td>#{user.user_id}</td>
                <td>{user.name || "N/A"}</td>
                <td>{user.email || "N/A"}</td>
                <td>{user.phone || "N/A"}</td>
                <td>
                  {user.created_at
                    ? new Date(user.created_at).toLocaleDateString()
                    : "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default UsersList;
