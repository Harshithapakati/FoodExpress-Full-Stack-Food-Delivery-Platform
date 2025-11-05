import React, { createContext, useState, useContext, useEffect } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  // Fetch cart when context loads
  const fetchCartFromBackend = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch("http://localhost:5000/api/cart", {
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
      console.error("Fetch cart error:", error);
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
      const token = localStorage.getItem("token");
      if (!token) return;
      await fetch(`http://localhost:5000/api/cart/update/${itemId}`, {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ quantity: newQty })
      });
      // Refresh cart after update
      await fetchCartFromBackend();
    } catch (error) {
      console.error("Error updating quantity:", error);
    }
  };

  // Remove item by ID and refresh cart
  const removeFromCart = async (itemId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      await fetch(`http://localhost:5000/api/cart/remove/${itemId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      // Refresh cart after removal
      await fetchCartFromBackend();
    } catch (error) {
      console.error("Error removing item:", error);
    }
  };

  return (
    <CartContext.Provider value={{ cartItems, setCartItems, updateQuantity, removeFromCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
