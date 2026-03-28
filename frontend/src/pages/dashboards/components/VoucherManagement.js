import React, { useEffect, useMemo, useState } from "react";
import {
  createProductDiscountOffer,
  createVoucherOffer,
  fetchProducts,
  getProductDiscountOffers,
  getVoucherOffers,
  getVoucherUsageHistory,
  setProductDiscountOfferActive,
  setVoucherOfferActive,
  updateProductDiscountOffer,
  updateVoucherOffer,
} from "../../../services/api";

const OFFER_TYPES = [
  { value: "percentage", label: "Percentage (%)" },
  { value: "fixed_amount", label: "Fixed Amount (BDT)" },
];

const toInputDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offsetMs = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - offsetMs);
  return local.toISOString().slice(0, 16);
};

const cleanOptionalNumber = (value) =>
  value === "" || value === null || value === undefined ? null : Number(value);

const cleanOptionalDate = (value) => (value ? value : null);

const formatMoney = (value) => Number(value || 0).toFixed(2);

const VoucherManagement = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [products, setProducts] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [productDiscounts, setProductDiscounts] = useState([]);
  const [usageHistory, setUsageHistory] = useState([]);

  const [voucherForm, setVoucherForm] = useState({
    code: "",
    discount_type: "percentage",
    discount_value: "",
    min_order_amount: "0",
    max_discount_amount: "",
    usage_limit_per_user: "1",
    start_at: "",
    end_at: "",
    is_active: true,
  });

  const [productDiscountForm, setProductDiscountForm] = useState({
    product_id: "",
    discount_type: "percentage",
    discount_value: "",
    max_discount_amount: "",
    start_at: "",
    end_at: "",
    is_active: true,
  });

  const productNameById = useMemo(() => {
    const map = new Map();
    for (const p of products) {
      map.set(Number(p.product_id), p.product_name);
    }
    return map;
  }, [products]);

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsRes, vouchersRes, discountsRes, usageRes] =
        await Promise.all([
          fetchProducts(),
          getVoucherOffers(),
          getProductDiscountOffers(),
          getVoucherUsageHistory(),
        ]);

      setProducts(Array.isArray(productsRes) ? productsRes : []);
      setVouchers(
        Array.isArray(vouchersRes?.vouchers) ? vouchersRes.vouchers : [],
      );
      setProductDiscounts(
        Array.isArray(discountsRes?.discounts) ? discountsRes.discounts : [],
      );
      setUsageHistory(
        Array.isArray(usageRes?.usage_history) ? usageRes.usage_history : [],
      );
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load offer data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateVoucher = async (e) => {
    e.preventDefault();
    resetMessages();

    try {
      await createVoucherOffer({
        code: voucherForm.code.trim().toUpperCase(),
        discount_type: voucherForm.discount_type,
        discount_value: Number(voucherForm.discount_value),
        min_order_amount: Number(voucherForm.min_order_amount || 0),
        max_discount_amount: cleanOptionalNumber(
          voucherForm.max_discount_amount,
        ),
        usage_limit_per_user: Number(voucherForm.usage_limit_per_user || 1),
        start_at: cleanOptionalDate(voucherForm.start_at),
        end_at: cleanOptionalDate(voucherForm.end_at),
        is_active: Boolean(voucherForm.is_active),
      });
      setSuccess("Voucher created successfully.");
      setVoucherForm({
        code: "",
        discount_type: "percentage",
        discount_value: "",
        min_order_amount: "0",
        max_discount_amount: "",
        usage_limit_per_user: "1",
        start_at: "",
        end_at: "",
        is_active: true,
      });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Error creating voucher.");
    }
  };

  const handleCreateProductDiscount = async (e) => {
    e.preventDefault();
    resetMessages();

    try {
      await createProductDiscountOffer({
        product_id: Number(productDiscountForm.product_id),
        discount_type: productDiscountForm.discount_type,
        discount_value: Number(productDiscountForm.discount_value),
        max_discount_amount: cleanOptionalNumber(
          productDiscountForm.max_discount_amount,
        ),
        start_at: cleanOptionalDate(productDiscountForm.start_at),
        end_at: cleanOptionalDate(productDiscountForm.end_at),
        is_active: Boolean(productDiscountForm.is_active),
      });

      setSuccess("Product discount created successfully.");
      setProductDiscountForm({
        product_id: "",
        discount_type: "percentage",
        discount_value: "",
        max_discount_amount: "",
        start_at: "",
        end_at: "",
        is_active: true,
      });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Error creating product discount.");
    }
  };

  const handleToggleVoucher = async (voucher) => {
    resetMessages();
    try {
      await setVoucherOfferActive(voucher.voucher_id, !voucher.is_active);
      setSuccess("Voucher status updated.");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update voucher status.");
    }
  };

  const handleToggleProductDiscount = async (discount) => {
    resetMessages();
    try {
      await setProductDiscountOfferActive(
        discount.product_discount_id,
        !discount.is_active,
      );
      setSuccess("Product discount status updated.");
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to update product discount status.",
      );
    }
  };

  const handleEditVoucher = async (voucher) => {
    resetMessages();

    const code = window.prompt("Voucher code", voucher.code);
    if (!code) return;

    const discountType = window.prompt(
      "discount_type: percentage or fixed_amount",
      voucher.discount_type,
    );
    if (!discountType) return;

    const discountValue = window.prompt(
      "discount_value",
      voucher.discount_value,
    );
    if (!discountValue) return;

    const minOrder = window.prompt(
      "min_order_amount",
      voucher.min_order_amount,
    );
    if (minOrder === null) return;

    const maxDiscount = window.prompt(
      "max_discount_amount (leave empty for none)",
      voucher.max_discount_amount || "",
    );
    if (maxDiscount === null) return;

    const usageLimit = window.prompt(
      "usage_limit_per_user",
      voucher.usage_limit_per_user,
    );
    if (!usageLimit) return;

    const startAt = window.prompt(
      "start_at (yyyy-mm-dd hh:mm:ss) leave empty for none",
      voucher.start_at || "",
    );
    if (startAt === null) return;

    const endAt = window.prompt(
      "end_at (yyyy-mm-dd hh:mm:ss) leave empty for none",
      voucher.end_at || "",
    );
    if (endAt === null) return;

    try {
      await updateVoucherOffer(voucher.voucher_id, {
        code,
        discount_type: discountType,
        discount_value: Number(discountValue),
        min_order_amount: Number(minOrder || 0),
        max_discount_amount: cleanOptionalNumber(maxDiscount),
        usage_limit_per_user: Number(usageLimit),
        start_at: cleanOptionalDate(startAt),
        end_at: cleanOptionalDate(endAt),
        is_active: voucher.is_active,
      });

      setSuccess("Voucher updated successfully.");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update voucher.");
    }
  };

  const handleEditProductDiscount = async (discount) => {
    resetMessages();

    const productId = window.prompt("product_id", discount.product_id);
    if (!productId) return;

    const discountType = window.prompt(
      "discount_type: percentage or fixed_amount",
      discount.discount_type,
    );
    if (!discountType) return;

    const discountValue = window.prompt(
      "discount_value",
      discount.discount_value,
    );
    if (!discountValue) return;

    const maxDiscount = window.prompt(
      "max_discount_amount (leave empty for none)",
      discount.max_discount_amount || "",
    );
    if (maxDiscount === null) return;

    const startAt = window.prompt(
      "start_at (yyyy-mm-dd hh:mm:ss) leave empty for none",
      discount.start_at || "",
    );
    if (startAt === null) return;

    const endAt = window.prompt(
      "end_at (yyyy-mm-dd hh:mm:ss) leave empty for none",
      discount.end_at || "",
    );
    if (endAt === null) return;

    try {
      await updateProductDiscountOffer(discount.product_discount_id, {
        product_id: Number(productId),
        discount_type: discountType,
        discount_value: Number(discountValue),
        max_discount_amount: cleanOptionalNumber(maxDiscount),
        start_at: cleanOptionalDate(startAt),
        end_at: cleanOptionalDate(endAt),
        is_active: discount.is_active,
      });

      setSuccess("Product discount updated successfully.");
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.error || "Failed to update product discount.",
      );
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Offer & Discount Management</h2>
      <p style={{ color: "#666" }}>
        Manage voucher discounts, product-level offers, and voucher usage
        history.
      </p>

      {error && (
        <div
          style={{
            background: "#fdecea",
            color: "#b71c1c",
            borderRadius: "8px",
            padding: "10px 12px",
            marginBottom: "12px",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            background: "#e8f5e9",
            color: "#1b5e20",
            borderRadius: "8px",
            padding: "10px 12px",
            marginBottom: "12px",
          }}
        >
          {success}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          marginTop: "20px",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "24px",
            borderRadius: "10px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Create Voucher</h3>
          <form
            onSubmit={handleCreateVoucher}
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            <input
              className="admin-input"
              placeholder="Code (e.g. SAVE20)"
              value={voucherForm.code}
              onChange={(e) =>
                setVoucherForm((prev) => ({
                  ...prev,
                  code: e.target.value.toUpperCase(),
                }))
              }
              required
            />

            <select
              className="admin-input"
              value={voucherForm.discount_type}
              onChange={(e) =>
                setVoucherForm((prev) => ({
                  ...prev,
                  discount_type: e.target.value,
                }))
              }
            >
              {OFFER_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <input
              className="admin-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="Discount value"
              value={voucherForm.discount_value}
              onChange={(e) =>
                setVoucherForm((prev) => ({
                  ...prev,
                  discount_value: e.target.value,
                }))
              }
              required
            />

            <input
              className="admin-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="Minimum order amount"
              value={voucherForm.min_order_amount}
              onChange={(e) =>
                setVoucherForm((prev) => ({
                  ...prev,
                  min_order_amount: e.target.value,
                }))
              }
            />

            <input
              className="admin-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="Maximum discount amount (optional)"
              value={voucherForm.max_discount_amount}
              onChange={(e) =>
                setVoucherForm((prev) => ({
                  ...prev,
                  max_discount_amount: e.target.value,
                }))
              }
            />

            <input
              className="admin-input"
              type="number"
              min="1"
              step="1"
              placeholder="Usage limit per user"
              value={voucherForm.usage_limit_per_user}
              onChange={(e) =>
                setVoucherForm((prev) => ({
                  ...prev,
                  usage_limit_per_user: e.target.value,
                }))
              }
            />

            <div>
              <label
                style={{
                  fontWeight: "bold",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Start At (optional)
              </label>
              <input
                className="admin-input"
                type="datetime-local"
                value={voucherForm.start_at}
                onChange={(e) =>
                  setVoucherForm((prev) => ({
                    ...prev,
                    start_at: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <label
                style={{
                  fontWeight: "bold",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                End At (optional)
              </label>
              <input
                className="admin-input"
                type="datetime-local"
                value={voucherForm.end_at}
                onChange={(e) =>
                  setVoucherForm((prev) => ({
                    ...prev,
                    end_at: e.target.value,
                  }))
                }
              />
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontWeight: "bold",
              }}
            >
              <input
                type="checkbox"
                checked={voucherForm.is_active}
                onChange={(e) =>
                  setVoucherForm((prev) => ({
                    ...prev,
                    is_active: e.target.checked,
                  }))
                }
              />
              Active now
            </label>

            <button type="submit" className="admin-btn">
              Create Voucher
            </button>
          </form>
        </div>

        <div
          style={{
            background: "white",
            padding: "24px",
            borderRadius: "10px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Create Product Discount</h3>
          <form
            onSubmit={handleCreateProductDiscount}
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            <select
              className="admin-input"
              value={productDiscountForm.product_id}
              onChange={(e) =>
                setProductDiscountForm((prev) => ({
                  ...prev,
                  product_id: e.target.value,
                }))
              }
              required
            >
              <option value="">Select Product</option>
              {products.map((product) => (
                <option key={product.product_id} value={product.product_id}>
                  #{product.product_id} - {product.product_name}
                </option>
              ))}
            </select>

            <select
              className="admin-input"
              value={productDiscountForm.discount_type}
              onChange={(e) =>
                setProductDiscountForm((prev) => ({
                  ...prev,
                  discount_type: e.target.value,
                }))
              }
            >
              {OFFER_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <input
              className="admin-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="Discount value"
              value={productDiscountForm.discount_value}
              onChange={(e) =>
                setProductDiscountForm((prev) => ({
                  ...prev,
                  discount_value: e.target.value,
                }))
              }
              required
            />

            <input
              className="admin-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="Maximum discount amount (optional)"
              value={productDiscountForm.max_discount_amount}
              onChange={(e) =>
                setProductDiscountForm((prev) => ({
                  ...prev,
                  max_discount_amount: e.target.value,
                }))
              }
            />

            <div>
              <label
                style={{
                  fontWeight: "bold",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Start At (optional)
              </label>
              <input
                className="admin-input"
                type="datetime-local"
                value={productDiscountForm.start_at}
                onChange={(e) =>
                  setProductDiscountForm((prev) => ({
                    ...prev,
                    start_at: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <label
                style={{
                  fontWeight: "bold",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                End At (optional)
              </label>
              <input
                className="admin-input"
                type="datetime-local"
                value={productDiscountForm.end_at}
                onChange={(e) =>
                  setProductDiscountForm((prev) => ({
                    ...prev,
                    end_at: e.target.value,
                  }))
                }
              />
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontWeight: "bold",
              }}
            >
              <input
                type="checkbox"
                checked={productDiscountForm.is_active}
                onChange={(e) =>
                  setProductDiscountForm((prev) => ({
                    ...prev,
                    is_active: e.target.checked,
                  }))
                }
              />
              Active now
            </label>

            <button type="submit" className="admin-btn">
              Create Product Discount
            </button>
          </form>
        </div>
      </div>

      <div
        style={{
          marginTop: "24px",
          background: "white",
          borderRadius: "10px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          padding: "20px",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Vouchers</h3>
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ marginTop: 0 }}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Value</th>
                <th>Min Order</th>
                <th>Limit/User</th>
                <th>Usage</th>
                <th>Window</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((voucher) => (
                <tr key={voucher.voucher_id}>
                  <td>{voucher.code}</td>
                  <td>{voucher.discount_type}</td>
                  <td>{formatMoney(voucher.discount_value)}</td>
                  <td>{formatMoney(voucher.min_order_amount)}</td>
                  <td>{voucher.usage_limit_per_user}</td>
                  <td>{voucher.usage_count_total}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {toInputDateTime(voucher.start_at) || "-"} to{" "}
                    {toInputDateTime(voucher.end_at) || "-"}
                  </td>
                  <td>{voucher.is_active ? "Active" : "Inactive"}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="btn-edit"
                        onClick={() => handleEditVoucher(voucher)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleToggleVoucher(voucher)}
                      >
                        {voucher.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {vouchers.length === 0 && (
                <tr>
                  <td colSpan="9">No vouchers yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div
        style={{
          marginTop: "24px",
          background: "white",
          borderRadius: "10px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          padding: "20px",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Product Discounts</h3>
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ marginTop: 0 }}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Type</th>
                <th>Value</th>
                <th>Max Cap</th>
                <th>Window</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {productDiscounts.map((discount) => (
                <tr key={discount.product_discount_id}>
                  <td>
                    #{discount.product_id}{" "}
                    {discount.product_name ||
                      productNameById.get(Number(discount.product_id)) ||
                      ""}
                  </td>
                  <td>{discount.discount_type}</td>
                  <td>{formatMoney(discount.discount_value)}</td>
                  <td>
                    {discount.max_discount_amount
                      ? formatMoney(discount.max_discount_amount)
                      : "-"}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {toInputDateTime(discount.start_at) || "-"} to{" "}
                    {toInputDateTime(discount.end_at) || "-"}
                  </td>
                  <td>{discount.is_active ? "Active" : "Inactive"}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="btn-edit"
                        onClick={() => handleEditProductDiscount(discount)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleToggleProductDiscount(discount)}
                      >
                        {discount.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {productDiscounts.length === 0 && (
                <tr>
                  <td colSpan="7">No product discounts yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div
        style={{
          marginTop: "24px",
          background: "white",
          borderRadius: "10px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          padding: "20px",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Voucher Usage History</h3>
        {loading ? (
          <p>Loading usage history...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table" style={{ marginTop: 0 }}>
              <thead>
                <tr>
                  <th>Used At</th>
                  <th>Voucher</th>
                  <th>User</th>
                  <th>Order</th>
                  <th>Discount</th>
                </tr>
              </thead>
              <tbody>
                {usageHistory.map((usage) => (
                  <tr key={usage.usage_id}>
                    <td>{toInputDateTime(usage.used_at) || "-"}</td>
                    <td>{usage.voucher_code}</td>
                    <td>
                      #{usage.user_id} {usage.user_name} ({usage.user_email})
                    </td>
                    <td>#{usage.order_id}</td>
                    <td>৳ {formatMoney(usage.discount_amount)}</td>
                  </tr>
                ))}
                {usageHistory.length === 0 && (
                  <tr>
                    <td colSpan="5">No usage records yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoucherManagement;
