import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from "react";
import { fetchCart, updateCartItem, placeOrder } from "../services/api";
import { useAuth } from "./AuthContext";

const CartContext = createContext();

const outOfStockMessage = "Product is out of stock.";
const limitedStockMessage = "Sorry! Limited quantity available";
const emptyCartState = { items: [], cart_id: null };

const getKnownStockQuantity = (...candidates) => {
  for (const value of candidates) {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue) && numericValue >= 0) {
      return numericValue;
    }
  }

  return null;
};

const normalizeCartErrorMessage = (message) => {
  const normalized = String(message || "").toLowerCase();

  if (normalized.includes("limited quantity")) {
    return limitedStockMessage;
  }

  if (normalized.includes("out of stock")) {
    return outOfStockMessage;
  }

  return message || "Failed to update cart";
};

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const { user, isAuthenticated, loading: authLoading, userRole } = useAuth();
  const [cart, setCart] = useState(emptyCartState);
  const [isOpen, setIsOpen] = useState(false);
  const [loadInFlightCount, setLoadInFlightCount] = useState(0);
  const [mutationInFlightCount, setMutationInFlightCount] = useState(0);
  const mutationQueueRef = useRef(new Map());
  const mutationVersionRef = useRef(new Map());
  const loadRequestRef = useRef(0);
  const cartRef = useRef(emptyCartState);

  const isCartLoading = loadInFlightCount > 0;
  const isCartMutating = mutationInFlightCount > 0;

  const applyServerCart = (data) => {
    if (!data) return;
    const nextCart = {
      cart_id: data.cart_id ?? null,
      items: Array.isArray(data.items) ? data.items : [],
    };
    cartRef.current = nextCart;
    setCart(nextCart);
  };

  const resetCartState = useCallback(() => {
    loadRequestRef.current += 1;
    mutationQueueRef.current = new Map();
    mutationVersionRef.current = new Map();
    setLoadInFlightCount(0);
    setMutationInFlightCount(0);
    setIsOpen(false);
    cartRef.current = emptyCartState;
    setCart(emptyCartState);
  }, []);

  const loadCart = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    setLoadInFlightCount((count) => count + 1);

    try {
      const data = await fetchCart();
      if (data && requestId === loadRequestRef.current) {
        applyServerCart(data);
      }
    } catch (err) {
      console.error("Could not load cart");
    } finally {
      setLoadInFlightCount((count) => Math.max(0, count - 1));
    }
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated || userRole === "admin" || userRole === "rider") {
      resetCartState();
      return;
    }

    loadCart();
  }, [
    authLoading,
    isAuthenticated,
    userRole,
    user?.id,
    user?.region_id,
    loadCart,
    resetCartState,
  ]);

  const changeQuantity = async (productId, change, fallbackItem = {}) => {
    const numericChange = Number(change);

    if (!Number.isFinite(numericChange) || numericChange === 0) {
      return { success: false, error: "Invalid quantity change" };
    }

    const currentItemSnapshot = cartRef.current.items.find(
      (i) => i.product_id === productId,
    );
    const currentQuantity = Number(currentItemSnapshot?.quantity || 0);
    const knownStock = getKnownStockQuantity(
      currentItemSnapshot?.stock_quantity,
      currentItemSnapshot?.available_quantity,
      currentItemSnapshot?.fallback_stock_quantity,
      fallbackItem?.stock_quantity,
      fallbackItem?.available_quantity,
      fallbackItem?.fallback_stock_quantity,
    );
    const hasKnownStock = knownStock !== null;

    if (numericChange > 0 && hasKnownStock) {
      if (knownStock <= 0) {
        return { success: false, error: outOfStockMessage };
      }

      if (currentQuantity + numericChange > knownStock) {
        return { success: false, error: limitedStockMessage };
      }
    }

    // Mark a new logical mutation so older server responses cannot overwrite newer local state.
    const mutationVersion =
      (mutationVersionRef.current.get(productId) || 0) + 1;
    mutationVersionRef.current.set(productId, mutationVersion);

    // Any in-flight loadCart response from before this mutation should be ignored.
    loadRequestRef.current += 1;

    // Optimistic update with functional state to prevent stale closures.
    setCart((prev) => {
      const currentItem = prev.items.find((i) => i.product_id === productId);
      let nextItems = [...prev.items];

      if (currentItem) {
        const newQuantity = Number(currentItem.quantity) + numericChange;
        if (newQuantity <= 0) {
          nextItems = nextItems.filter((i) => i.product_id !== productId);
        } else {
          const unitPrice = Number(
            currentItem.price ??
              currentItem.unit_price ??
              fallbackItem.price ??
              0,
          );
          const lineTotal = Number((newQuantity * unitPrice).toFixed(2));
          nextItems = nextItems.map((i) =>
            i.product_id === productId
              ? {
                  ...i,
                  quantity: newQuantity,
                  price: unitPrice,
                  stock_quantity: getKnownStockQuantity(
                    i.stock_quantity,
                    fallbackItem.stock_quantity,
                  ),
                  line_total: lineTotal,
                }
              : i,
          );
        }
      } else if (numericChange > 0) {
        const unitPrice = Number(fallbackItem.price ?? 0);
        const quantity = numericChange;
        nextItems.push({
          product_id: productId,
          product_name: fallbackItem.product_name,
          photourl: fallbackItem.photourl,
          unit: fallbackItem.unit,
          stock_quantity: getKnownStockQuantity(
            fallbackItem.stock_quantity,
            fallbackItem.available_quantity,
            fallbackItem.fallback_stock_quantity,
          ),
          quantity,
          price: unitPrice,
          line_total: Number((quantity * unitPrice).toFixed(2)),
        });
      }

      const nextCart = { ...prev, items: nextItems };
      cartRef.current = nextCart;
      return nextCart;
    });

    const executeMutation = async () => {
      setMutationInFlightCount((count) => count + 1);
      try {
        const response = await updateCartItem(productId, numericChange);

        const latestVersion = mutationVersionRef.current.get(productId) || 0;
        const isLatest = latestVersion === mutationVersion;

        if (!isLatest) {
          return { success: true, stale: true };
        }

        if (response && Array.isArray(response.items)) {
          applyServerCart(response);
        } else {
          await loadCart();
        }
        return { success: true };
      } catch (err) {
        const latestVersion = mutationVersionRef.current.get(productId) || 0;
        const isLatest = latestVersion === mutationVersion;

        // Ignore old failures if a newer mutation for this product already exists.
        if (!isLatest) {
          return { success: true, stale: true };
        }

        await loadCart();
        const msg = normalizeCartErrorMessage(err.response?.data?.error);
        return { success: false, error: msg };
      } finally {
        setMutationInFlightCount((count) => Math.max(0, count - 1));
      }
    };

    const previous =
      mutationQueueRef.current.get(productId) || Promise.resolve();
    const current = previous.then(executeMutation, executeMutation);

    mutationQueueRef.current.set(
      productId,
      current.finally(() => {
        if (mutationQueueRef.current.get(productId) === current) {
          mutationQueueRef.current.delete(productId);
        }
      }),
    );

    return current;
  };

  const checkout = async () => {
    try {
      await placeOrder();
      cartRef.current = emptyCartState;
      setCart(emptyCartState);
      setIsOpen(false);
      alert("Order placed successfully!");
    } catch (err) {
      alert("Checkout failed. Make sure you're logged in as a normal user.");
    }
  };

  const getQuantity = (productId) => {
    const item = cart.items.find((i) => i.product_id === productId);
    return item ? item.quantity : 0;
  };

  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.items.reduce(
    (sum, item) =>
      sum +
      Number(item.line_total ?? (Number(item.price) || 0) * item.quantity),
    0,
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        isOpen,
        setIsOpen,
        changeQuantity,
        checkout,
        getQuantity,
        totalItems,
        totalPrice,
        loadCart,
        isCartLoading,
        isCartMutating,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
