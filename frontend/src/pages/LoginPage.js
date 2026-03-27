import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Auth.css";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, error: authError } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email.trim() || !formData.password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      setLoading(true);
      const response = await login(formData.email, formData.password);

      // Redirect based on role
      const redirectPath = response.redirectPath || "/";
      navigate(redirectPath);
    } catch (err) {
      setError(err.response?.data?.error || "Invalid login credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="auth-container"
      style={{ margin: "100px auto", maxWidth: "450px" }}
    >
      <div className="auth-box">
        <h2>Welcome Back</h2>
        <p
          style={{
            textAlign: "center",
            color: "#7f8c8d",
            marginBottom: "20px",
          }}
        >
          Login with your email and password
        </p>

        {error && <div className="error-message">{error}</div>}
        {authError && <div className="error-message">{authError}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

          <div className="auth-toggle">
            Don't have an account?{" "}
            <Link to="/signup" className="toggle-btn">
              Sign Up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
