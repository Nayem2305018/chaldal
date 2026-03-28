import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useCart } from "../context/CartContext";
import { placeOrder, previewOrderPricing } from "../services/api";

const formatMoney = (value) => Number(value || 0).toFixed(2);

const CheckoutPage = () => {
  const { cart, totalPrice, loadCart } = useCart();
  const [formData, setFormData] = useState({
    delivery_address: "",
    preferred_delivery_time: "",
  });
  const [voucherCodeInput, setVoucherCodeInput] = useState("");
  const [appliedVoucherCode, setAppliedVoucherCode] = useState("");
  const [voucherMessage, setVoucherMessage] = useState("");
  const [pricing, setPricing] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const refreshPricing = useCallback(
    async (voucherCode = "") => {
      if (!cart.items || cart.items.length === 0) {
        setPricing(null);
        return { success: true };
      }

      try {
        setPricingLoading(true);
        const response = await previewOrderPricing(
          voucherCode ? { voucher_code: voucherCode } : {},
        );
        setPricing(response);
        setError("");
        return { success: true, data: response };
      } catch (err) {
        const message =
          err.response?.data?.error || "Failed to calculate pricing";
        return { success: false, error: message };
      } finally {
        setPricingLoading(false);
      }
    },
    [cart.items],
  );

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!cart.items || cart.items.length === 0) {
        if (!cancelled) {
          setPricing(null);
          setVoucherMessage("");
          setAppliedVoucherCode("");
        }
        return;
      }

      const result = await refreshPricing(appliedVoucherCode);

      if (cancelled) {
        return;
      }

      if (!result.success && appliedVoucherCode) {
        setVoucherMessage(result.error);
        setAppliedVoucherCode("");
        await refreshPricing("");
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [cart.items, appliedVoucherCode, refreshPricing]);

  const handleApplyVoucher = async () => {
    const normalized = String(voucherCodeInput || "")
      .trim()
      .toUpperCase();

    if (!normalized) {
      setVoucherMessage("Please enter a voucher code.");
      return;
    }

    const result = await refreshPricing(normalized);

    if (!result.success) {
      setVoucherMessage(result.error);
      return;
    }

    setAppliedVoucherCode(normalized);
    setVoucherCodeInput(normalized);
    setVoucherMessage("Voucher applied successfully.");
  };

  const handleRemoveVoucher = async () => {
    setAppliedVoucherCode("");
    setVoucherCodeInput("");
    setVoucherMessage("Voucher removed.");
    await refreshPricing("");
  };

  const totals = useMemo(() => {
    const subtotalBeforeDiscount = Number(
      pricing?.subtotal_before_discount ?? totalPrice,
    );
    const productDiscountTotal = Number(pricing?.product_discount_total || 0);
    const subtotalAfterProductDiscount = Number(
      pricing?.subtotal_after_product_discount ?? subtotalBeforeDiscount,
    );
    const voucherDiscountTotal = Number(pricing?.voucher_discount_total || 0);
    const finalTotal = Number(
      pricing?.final_total ?? subtotalAfterProductDiscount,
    );

    return {
      subtotalBeforeDiscount,
      productDiscountTotal,
      subtotalAfterProductDiscount,
      voucherDiscountTotal,
      finalTotal,
    };
  }, [pricing, totalPrice]);

  const handleProceed = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.delivery_address || !formData.preferred_delivery_time) {
      setError("Please fill in both address and delivery time.");
      return;
    }

    if (cart.items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    try {
      setLoading(true);
      await placeOrder({
        ...formData,
        voucher_code: appliedVoucherCode || undefined,
      });
      setSuccess(true);

      // Clear local cart context UI state instantly, refresh to clear completely visually
      await loadCart();

      setTimeout(() => {
        window.location.href = "/user/dashboard";
      }, 2500);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to place order.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ textAlign: "center", padding: "100px 20px" }}>
        <h1 style={{ color: "#27ae60", fontSize: "3rem" }}>✅</h1>
        <h2>Order Confirmed!</h2>
        <p>Your order has been placed successfully. Redirecting you...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "100px 20px",
        maxWidth: "800px",
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "40px",
      }}
    >
      {/* Checkout Form */}
      <div>
        <h2>Secure Checkout 🛡️</h2>
        <p style={{ color: "#666" }}>Please provide your delivery details.</p>

        {error && (
          <div
            style={{
              color: "red",
              padding: "10px",
              background: "#ffeaa7",
              borderRadius: "5px",
              marginBottom: "15px",
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleProceed}
          style={{ display: "flex", flexDirection: "column", gap: "15px" }}
        >
          <div>
            <label
              style={{
                fontWeight: "bold",
                display: "block",
                marginBottom: "5px",
              }}
            >
              Delivery Address *
            </label>
            <textarea
              name="delivery_address"
              value={formData.delivery_address}
              onChange={handleChange}
              rows="3"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "5px",
                border: "1px solid #ccc",
                fontFamily: "inherit",
              }}
              placeholder="e.g. 123 Main Street, Apt 4B, Dhaka"
            />
          </div>
          <div>
            <label
              style={{
                fontWeight: "bold",
                display: "block",
                marginBottom: "5px",
              }}
            >
              Preferred Delivery Time *
            </label>
            <input
              type="text"
              name="preferred_delivery_time"
              value={formData.preferred_delivery_time}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "5px",
                border: "1px solid #ccc",
              }}
              placeholder="e.g. Today 4:00 PM - 5:00 PM"
            />
          </div>

          <div>
            <label
              style={{
                fontWeight: "bold",
                display: "block",
                marginBottom: "5px",
              }}
            >
              Voucher Code
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                value={voucherCodeInput}
                onChange={(e) =>
                  setVoucherCodeInput(e.target.value.toUpperCase())
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "5px",
                  border: "1px solid #ccc",
                }}
                placeholder="e.g. SAVE20"
              />
              <button
                type="button"
                onClick={handleApplyVoucher}
                disabled={pricingLoading}
                style={{
                  padding: "10px 12px",
                  background: "#2f80ed",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  minWidth: "90px",
                }}
              >
                Apply
              </button>
              {appliedVoucherCode && (
                <button
                  type="button"
                  onClick={handleRemoveVoucher}
                  style={{
                    padding: "10px 12px",
                    background: "#e74c3c",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    minWidth: "90px",
                  }}
                >
                  Remove
                </button>
              )}
            </div>
            {voucherMessage && (
              <div
                style={{
                  marginTop: "8px",
                  color: appliedVoucherCode ? "#1e7e34" : "#c0392b",
                  fontWeight: "bold",
                  fontSize: "0.9rem",
                }}
              >
                {voucherMessage}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || cart.items.length === 0}
            style={{
              marginTop: "10px",
              padding: "15px",
              background: "#27ae60",
              color: "white",
              border: "none",
              borderRadius: "5px",
              fontWeight: "bold",
              fontSize: "1.1rem",
              cursor:
                loading || cart.items.length === 0 ? "not-allowed" : "pointer",
              opacity: loading || cart.items.length === 0 ? 0.7 : 1,
            }}
          >
            {loading
              ? "Processing..."
              : `Pay BDT ${formatMoney(totals.finalTotal)}`}
          </button>
        </form>
      </div>

      {/* Order Summary Summary */}
      <div
        style={{
          background: "#f8f9fa",
          padding: "25px",
          borderRadius: "10px",
          border: "1px solid #eee",
        }}
      >
        <h3>Order Summary</h3>
        <hr
          style={{ border: "0", borderTop: "1px solid #ddd", margin: "15px 0" }}
        />

        {cart.items.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              maxHeight: "300px",
              overflowY: "auto",
              paddingRight: "10px",
            }}
          >
            {(pricing?.items || cart.items).map((item) => {
              const lineBaseTotal = Number(
                item.line_base_total ??
                  Number(item.price) * Number(item.quantity),
              );
              const lineTotal = Number(item.line_total ?? lineBaseTotal);
              const hasDiscount = lineTotal < lineBaseTotal;

              return (
                <div
                  key={item.product_id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.95rem",
                    alignItems: "center",
                  }}
                >
                  <span>
                    {item.quantity}x {item.product_name || "Selected Product"}
                  </span>
                  <div style={{ textAlign: "right" }}>
                    {hasDiscount && (
                      <div
                        style={{
                          color: "#95a5a6",
                          textDecoration: "line-through",
                          fontSize: "0.82rem",
                        }}
                      >
                        ৳ {formatMoney(lineBaseTotal)}
                      </div>
                    )}
                    <div style={{ fontWeight: "bold" }}>
                      ৳ {formatMoney(lineTotal)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <hr
          style={{ border: "0", borderTop: "1px solid #ddd", margin: "15px 0" }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <span>Subtotal</span>
          <span>৳ {formatMoney(totals.subtotalBeforeDiscount)}</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "8px",
            color: totals.productDiscountTotal > 0 ? "#1e7e34" : "#666",
          }}
        >
          <span>Product Discounts</span>
          <span>- ৳ {formatMoney(totals.productDiscountTotal)}</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <span>After Product Discounts</span>
          <span>৳ {formatMoney(totals.subtotalAfterProductDiscount)}</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "10px",
            color: totals.voucherDiscountTotal > 0 ? "#1e7e34" : "#666",
          }}
        >
          <span>
            Voucher{" "}
            {pricing?.applied_voucher?.code
              ? `(${pricing.applied_voucher.code})`
              : ""}
          </span>
          <span>- ৳ {formatMoney(totals.voucherDiscountTotal)}</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "1.2rem",
            fontWeight: "bold",
          }}
        >
          <span>Final Payable:</span>
          <span style={{ color: "#e74c3c" }}>
            ৳ {formatMoney(totals.finalTotal)}
          </span>
        </div>
        {pricingLoading && (
          <p style={{ marginTop: "10px", color: "#777", fontSize: "0.9rem" }}>
            Recalculating offers...
          </p>
        )}
      </div>
    </div>
  );
};

export default CheckoutPage;
