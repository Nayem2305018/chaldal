import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import { login, signup, verifyToken } from "../services/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if token exists in localStorage on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("auth_token");
      const storedUser = localStorage.getItem("auth_user");

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));

        // Verify token is still valid
        try {
          await verifyToken(storedToken);
        } catch (err) {
          console.error("Token verification failed:", err);
          // Clear invalid token
          localStorage.removeItem("auth_token");
          localStorage.removeItem("auth_user");
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const handleLogin = useCallback(async (email, password) => {
    try {
      setError(null);
      setLoading(true);

      const response = await login(email, password);

      // Store token and user info
      localStorage.setItem("auth_token", response.token);
      localStorage.setItem("auth_user", JSON.stringify(response.user));
      localStorage.setItem("auth_role", response.role);

      setToken(response.token);
      setUser(response.user);

      return response;
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || "Login failed. Please try again.";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSignup = useCallback(async (signupData) => {
    try {
      setError(null);
      setLoading(true);

      const response = await signup(signupData);
      return response;
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || "Signup failed. Please try again.";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    // Clear token and user
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_role");

    setToken(null);
    setUser(null);
    setError(null);
  }, []);

  const isAuthenticated = !!token && !!user;
  const userRole = localStorage.getItem("auth_role");

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    userRole,
    login: handleLogin,
    signup: handleSignup,
    logout: handleLogout,
    setError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
