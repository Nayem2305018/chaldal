/**
 * Frontend API Service
 * Central axios client and API wrappers used by pages/components to fetch and mutate backend data.
 */
import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Handle 401 errors (token expired or invalid)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      localStorage.removeItem("auth_role");
      // Optionally redirect to login
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// ============ Authentication Endpoints ============

export const signup = async (userData) => {
  try {
    const response = await api.post("/auth/signup", userData);
    return response.data;
  } catch (error) {
    console.error("Signup error:", error);
    throw error;
  }
};

export const login = async (email, password) => {
  try {
    const response = await api.post("/auth/login", { email, password });
    return response.data;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    const response = await api.post("/auth/logout");
    return response.data;
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
};

export const verifyToken = async (token) => {
  try {
    const response = await api.get("/auth/verify");
    return response.data;
  } catch (error) {
    console.error("Token verification error:", error);
    throw error;
  }
};

export const fetchSignupRegions = async () => {
  try {
    const response = await api.get("/auth/regions");
    return response.data;
  } catch (error) {
    console.error("Signup regions fetch error:", error);
    throw error;
  }
};

// ============ Products Endpoints ============

export const fetchProducts = async () => {
  try {
    const response = await api.get("/products");
    return response.data;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
};

export const fetchActiveProductOffers = async (limit = 6) => {
  try {
    const response = await api.get(`/products/offers/active?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching active product offers:", error);
    throw error;
  }
};

// ============ Categories Endpoints ============

export const fetchCategories = async () => {
  try {
    const response = await api.get("/categories");
    return response.data;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
};

export const fetchProductsByCategory = async (categoryId) => {
  try {
    const response = await api.get(`/products/category/${categoryId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching products by category:", error);
    throw error;
  }
};

// ============ Cart Endpoints ============

export const fetchCart = async () => {
  try {
    const response = await api.get("/cart");
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) return null;
    console.error("Cart error:", error);
    throw error;
  }
};

export const updateCartItem = async (product_id, change_quantity) => {
  try {
    const response = await api.post(`/cart/add/${product_id}`, {
      quantity: change_quantity,
    });
    return response.data;
  } catch (error) {
    console.error("Cart add error:", error);
    throw error;
  }
};

// ============ Order Endpoints ============

export const placeOrder = async (formData) => {
  try {
    const response = await api.post("/order/checkout", formData);
    return response.data;
  } catch (error) {
    console.error("Order error:", error);
    throw error;
  }
};

export const previewOrderPricing = async (payload = {}) => {
  try {
    const response = await api.post("/order/pricing", payload);
    return response.data;
  } catch (error) {
    console.error("Order pricing preview error:", error);
    throw error;
  }
};

export const revalidateCartByRegion = async (payload) => {
  try {
    const response = await api.post("/order/revalidate-region", payload);
    return response.data;
  } catch (error) {
    console.error("Cart region revalidation error:", error);
    throw error;
  }
};

export const fetchOrderRegions = async () => {
  try {
    const response = await api.get("/order/regions");
    return response.data;
  } catch (error) {
    console.error("Order regions fetch error:", error);
    throw error;
  }
};

// ============ Admin Endpoints ============

export const getRiderRequests = async () => {
  try {
    const response = await api.get("/admin/rider-requests");
    return response.data;
  } catch (error) {
    console.error("Error fetching rider requests:", error);
    throw error;
  }
};

export const approveRider = async (requestId) => {
  try {
    const response = await api.post(`/admin/approve-rider/${requestId}`);
    return response.data;
  } catch (error) {
    console.error("Error approving rider:", error);
    throw error;
  }
};

export const rejectRider = async (requestId, reason) => {
  try {
    const response = await api.post(`/admin/reject-rider/${requestId}`, {
      reason,
    });
    return response.data;
  } catch (error) {
    console.error("Error rejecting rider:", error);
    throw error;
  }
};

export const getAllRiders = async () => {
  try {
    const response = await api.get("/admin/riders");
    return response.data;
  } catch (error) {
    console.error("Error fetching riders:", error);
    throw error;
  }
};

export const getAllUsers = async () => {
  try {
    const response = await api.get("/admin/users");
    return response.data;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

export const updateRiderStatus = async (riderId, status) => {
  try {
    const response = await api.put(`/admin/riders/${riderId}/status`, {
      status,
    });
    return response.data;
  } catch (error) {
    console.error("Error updating rider status:", error);
    throw error;
  }
};

export const getAdminDashboardStats = async () => {
  try {
    const response = await api.get("/admin/dashboard-stats");
    return response.data;
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    throw error;
  }
};

export const getVoucherOffers = async () => {
  const response = await api.get("/admin/offers/vouchers");
  return response.data;
};

export const createVoucherOffer = async (payload) => {
  const response = await api.post("/admin/offers/vouchers", payload);
  return response.data;
};

export const updateVoucherOffer = async (voucherId, payload) => {
  const response = await api.put(
    `/admin/offers/vouchers/${voucherId}`,
    payload,
  );
  return response.data;
};

export const setVoucherOfferActive = async (voucherId, isActive) => {
  const response = await api.patch(
    `/admin/offers/vouchers/${voucherId}/active`,
    {
      is_active: isActive,
    },
  );
  return response.data;
};

export const getVoucherUsageHistory = async () => {
  const response = await api.get("/admin/offers/voucher-usage");
  return response.data;
};

export const getProductDiscountOffers = async () => {
  const response = await api.get("/admin/offers/product-discounts");
  return response.data;
};

export const createProductDiscountOffer = async (payload) => {
  const response = await api.post("/admin/offers/product-discounts", payload);
  return response.data;
};

export const updateProductDiscountOffer = async (discountId, payload) => {
  const response = await api.put(
    `/admin/offers/product-discounts/${discountId}`,
    payload,
  );
  return response.data;
};

export const setProductDiscountOfferActive = async (discountId, isActive) => {
  const response = await api.patch(
    `/admin/offers/product-discounts/${discountId}/active`,
    {
      is_active: isActive,
    },
  );
  return response.data;
};

// ============ Rider Endpoints ============

export const getRiderDeliveries = async () => {
  try {
    const response = await api.get("/rider/deliveries");
    return response.data;
  } catch (error) {
    console.error("Error fetching deliveries:", error);
    throw error;
  }
};

export const updateDeliveryStatus = async (deliveryId, status) => {
  try {
    const response = await api.put(`/rider/delivery/${deliveryId}`, { status });
    return response.data;
  } catch (error) {
    console.error("Error updating delivery status:", error);
    throw error;
  }
};

export default api;
