import React, { createContext, useState, useEffect, useContext } from 'react';
import { fetchCart, updateCartItem, placeOrder } from '../services/api';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], cart_id: null });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadCart = async () => {
    try {
      const data = await fetchCart();
      if (data) setCart(data);
    } catch (err) {
      console.error("Could not load cart");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only load if logged in
    const user = localStorage.getItem("chaldal_user");
    if (user) {
      loadCart();
    } else {
      setLoading(false);
    }
  }, []);

  const changeQuantity = async (productId, change) => {
    // Optimistic UI update
    const currentItem = cart.items.find(i => i.product_id === productId);
    let newItems = [...cart.items];
    
    if (currentItem) {
      const newQuantity = currentItem.quantity + change;
      if (newQuantity <= 0) {
        newItems = newItems.filter(i => i.product_id !== productId);
      } else {
        newItems = newItems.map(i => i.product_id === productId ? { ...i, quantity: newQuantity } : i);
      }
    } else if (change > 0) {
      // Mock item until backend responds
      newItems.push({ product_id: productId, quantity: change, price: 0 }); // price resolves on refresh
    }
    setCart({ ...cart, items: newItems });

    try {
      await updateCartItem(productId, change);
      await loadCart(); // sync explicitly
      return { success: true };
    } catch (err) {
      await loadCart(); // revert
      const msg = err.response?.data?.error || "Failed to update cart";
      return { success: false, error: msg };
    }
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
    const item = cart.items.find(i => i.product_id === productId);
    return item ? item.quantity : 0;
  };

  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.items.reduce((sum, item) => sum + (Number(item.price) || 0) * item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, isOpen, setIsOpen, changeQuantity, checkout, getQuantity, totalItems, totalPrice, loadCart }}>
      {children}
    </CartContext.Provider>
  );
};
