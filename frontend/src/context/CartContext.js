import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from "react";
import { fetchCart, updateCartItem, placeOrder } from "../services/api";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], cart_id: null });
  const [isOpen, setIsOpen] = useState(false);
  const mutationQueueRef = useRef(new Map());
  const mutationVersionRef = useRef(new Map());
  const loadRequestRef = useRef(0);

  const applyServerCart = (data) => {
    if (!data) return;
    setCart({
      cart_id: data.cart_id ?? null,
      items: Array.isArray(data.items) ? data.items : [],
    });
  };

  const loadCart = useCallback(async () => {
    const requestId = ++loadRequestRef.current;

    try {
      const data = await fetchCart();
      if (data && requestId === loadRequestRef.current) {
        applyServerCart(data);
      }
    } catch (err) {
      console.error("Could not load cart");
    }
  }, []);

  useEffect(() => {
    // Only load if logged in
    const user = localStorage.getItem("auth_user");
    if (user) {
      loadCart();
    }
  }, [loadCart]);

  const changeQuantity = async (productId, change, fallbackItem = {}) => {
    if (!Number.isFinite(change) || change === 0) {
      return { success: false, error: "Invalid quantity change" };
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
        const newQuantity = Number(currentItem.quantity) + Number(change);
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
                  line_total: lineTotal,
                }
              : i,
          );
        }
      } else if (change > 0) {
        const unitPrice = Number(fallbackItem.price ?? 0);
        const quantity = Number(change);
        nextItems.push({
          product_id: productId,
          product_name: fallbackItem.product_name,
          photourl: fallbackItem.photourl,
          unit: fallbackItem.unit,
          quantity,
          price: unitPrice,
          line_total: Number((quantity * unitPrice).toFixed(2)),
        });
      }

      return { ...prev, items: nextItems };
    });

    const executeMutation = async () => {
      try {
        const response = await updateCartItem(productId, change);

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
        const msg = err.response?.data?.error || "Failed to update cart";
        return { success: false, error: msg };
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
      setCart({ items: [], cart_id: null });
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
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
