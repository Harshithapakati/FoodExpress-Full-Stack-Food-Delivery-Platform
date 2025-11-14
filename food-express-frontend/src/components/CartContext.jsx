import React, { createContext, useState, useContext, useEffect } from 'react';
import { API } from '../services/api';

const CartContext = createContext();

// Export CartContext for testing
export { CartContext };

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  // Fetch cart when context loads
  const fetchCartFromBackend = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      // include token in query string as a fallback for environments where headers
      // might be stripped; still include Authorization header as normal.
      const res = await fetch(`${API}/cart?token=${encodeURIComponent(token)}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        const items = data.cart.items.map(item => ({
          name: item.name,
          qty: item.quantity,
          price: item.price,
          img: item.image,
          restaurantName: item.restaurantName,
          restaurantImage: item.restaurantImage,
          restaurantId: item.restaurantId,
          restaurantAddress: item.restaurantAddress,
          _id: item._id,
        }));
        setCartItems(items);
      }
    } catch (error) {
      console.error('Fetch cart error:', error);
    }
  };

  useEffect(() => {
    fetchCartFromBackend();
  }, []);

  // Update quantity: calls API then fetches latest cart
  const updateQuantity = async (itemId, newQty) => {
    try {
      if (newQty < 1) {
        await removeFromCart(itemId);
        return;
      }
      const token = localStorage.getItem('token');
      if (!token) return;
      await fetch(`${API}/cart/update/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ quantity: newQty })
      });
      // Refresh cart after update
      await fetchCartFromBackend();
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  // Remove item by ID and refresh cart
  const removeFromCart = async (itemId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      await fetch(`${API}/cart/remove/${itemId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      // Refresh cart after removal
      await fetchCartFromBackend();
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  // Clear entire cart
  const clearCart = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      await fetch(`${API}/cart/clear`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refresh cart after clearing
      await fetchCartFromBackend();
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  // expose a refresh function so callers can re-sync the cart after mutating it
  const refreshCart = fetchCartFromBackend;

  return (
    <CartContext.Provider value={{ cartItems, setCartItems, updateQuantity, removeFromCart, clearCart, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
