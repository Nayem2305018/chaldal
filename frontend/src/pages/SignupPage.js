import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Auth.css";

const SignupPage = () => {
  const navigate = useNavigate();
  const { signup: signupAuth } = useAuth();

  const [role, setRole] = useState("user");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    appointment_code: "",
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (fieldErrors[e.target.name]) {
      setFieldErrors({ ...fieldErrors, [e.target.name]: null });
    }
    setServerError("");
  };

  const validateForm = () => {
    const errors = {};
    const { name, email, password, phone, appointment_code } = formData;

    if (!name.trim()) errors.name = "Full name is required.";

    if (!email.trim()) {
      errors.email = "Email is required.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.email = "Please enter a valid email address.";
      }
    }

    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters long.";
    }

    if (!phone.trim()) errors.phone = "Phone number is required.";

    // Rider-specific validation
    if (role === "rider" && !appointment_code.trim()) {
      errors.appointment_code =
        "Appointment code is required for rider signup.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const signupData = { ...formData, role };
      const response = await signupAuth(signupData);

      setSuccess(response.message);

      if (role === "user") {
        // Users can login immediately
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else if (role === "rider") {
        // Riders need to wait for admin approval
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    } catch (err) {
      setServerError(err.response?.data?.error || "Failed to sign up.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="auth-container"
      style={{ margin: "100px auto", maxWidth: "500px" }}
    >
      <div className="auth-box">
        <h2>Create an Account</h2>
        <p
          style={{
            textAlign: "center",
            color: "#7f8c8d",
            marginBottom: "20px",
            fontSize: "0.9rem",
          }}
        >
          Join us as a User or Rider
        </p>

        {serverError && <div className="error-message">{serverError}</div>}
        {success && (
          <div
            className="auth-success"
            style={{
              color: "green",
              marginBottom: "1rem",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Role Selection */}
          <div className="form-group">
            <label>I want to sign up as:</label>
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button
                type="button"
                onClick={() => setRole("user")}
                style={{
                  flex: 1,
                  padding: "12px",
                  border:
                    role === "user" ? "2px solid #9575cd" : "2px solid #ecf0f1",
                  background: role === "user" ? "#f3e5f5" : "white",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: role === "user" ? "bold" : "normal",
                  transition: "all 0.3s",
                }}
              >
                User
              </button>
              <button
                type="button"
                onClick={() => setRole("rider")}
                style={{
                  flex: 1,
                  padding: "12px",
                  border:
                    role === "rider"
                      ? "2px solid #9575cd"
                      : "2px solid #ecf0f1",
                  background: role === "rider" ? "#f3e5f5" : "white",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: role === "rider" ? "bold" : "normal",
                  transition: "all 0.3s",
                }}
              >
                Rider
              </button>
            </div>
          </div>

          {/* Full Name */}
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
            />
            {fieldErrors.name && (
              <span className="field-error">{fieldErrors.name}</span>
            )}
          </div>

          {/* Email */}
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
            />
            {fieldErrors.email && (
              <span className="field-error">{fieldErrors.email}</span>
            )}
          </div>

          {/* Password */}
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Min 6 characters"
            />
            {fieldErrors.password && (
              <span className="field-error">{fieldErrors.password}</span>
            )}
          </div>

          {/* Phone */}
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="017xxxxxxxx"
            />
            {fieldErrors.phone && (
              <span className="field-error">{fieldErrors.phone}</span>
            )}
          </div>

          {/* Appointment Code - Only for Riders */}
          {role === "rider" && (
            <div className="form-group">
              <label>Appointment Code *</label>
              <input
                type="text"
                name="appointment_code"
                value={formData.appointment_code}
                onChange={handleChange}
                placeholder="Enter your appointment code"
              />
              {fieldErrors.appointment_code && (
                <span className="field-error">
                  {fieldErrors.appointment_code}
                </span>
              )}
              <small
                style={{
                  color: "#666",
                  fontSize: "12px",
                  display: "block",
                  marginTop: "5px",
                }}
              >
                Contact admin for an appointment code to become a rider
              </small>
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Signing up..." : "Sign Up"}
          </button>

          <div className="auth-toggle" style={{ marginTop: "20px" }}>
            Already have an account?{" "}
            <Link to="/login" className="toggle-btn">
              Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignupPage;
