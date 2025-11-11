import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CartModal.css';
import { API } from '../services/api';

function CartModal({ onClose, updateCartCount }) {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const token = localStorage.getItem('token');
      // Try header first, then fallback to query-param if needed
      let response = await fetch(`${API}/cart`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let data = await response.json();
      if (response.status === 401) {
        response = await fetch(`${API}/cart?token=${encodeURIComponent(token)}`);
        data = await response.json();
      }
      if (data.success) {
        setCart(data.cart);
        console.log('Cart data fetched in modal:', data.cart);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
    setLoading(false);
  };

  const updateQuantity = async (itemId, newQuantity) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/cart/update/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ quantity: newQuantity, token })
      });
      const data = await response.json();
      if (data.success) {
        setCart(data.cart);
        updateCartCount();
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const removeItem = async (itemId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/cart/remove/${itemId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ token })
      });
      const data = await response.json();
      if (data.success) {
        setCart(data.cart);
        updateCartCount();
      }
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const clearCart = async () => {
    if (!window.confirm('Are you sure you want to clear your cart?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/cart/clear`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ token })
      });
      const data = await response.json();
      if (data.success) {
        setCart(data.cart);
        updateCartCount();
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const calculateTotal = () => {
    if (!(cart && cart.items)) return 0;
    return cart.items.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const singleRestaurant =
    cart &&
    cart.items &&
    cart.items.length > 0 &&
    cart.items.every(item => item.restaurantName === cart.items[0].restaurantName);

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content cart-modal" onClick={e => e.stopPropagation()}>
          <div className="loading">Loading cart...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content cart-modal" onClick={e => e.stopPropagation()}>
        <div className="cart-header">
          <h2>🛒 Your Cart</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {cart && cart.items && cart.items.length > 0 ? (
          <>
            <div className="cart-items">
              {cart.items.map(item => (
                <div key={item._id} className="cart-item">
                  <img
                    src={item.image || 'https://via.placeholder.com/80'}
                    alt={item.name}
                    className="cart-item-image"
                  />
                  <div className="cart-item-info">
                    <h4>{item.name}</h4>
                    <p className="cart-item-restaurant">{item.restaurantName}</p>
                    <p className="cart-item-price">₹{item.price}</p>
                  </div>
                  <div className="cart-item-actions">
                    <div className="quantity-controls">
                      <button
                        onClick={() => updateQuantity(item._id, item.quantity - 1)}
                        className="quantity-btn"
                        disabled={item.quantity <= 1}
                      >−</button>
                      <span className="quantity">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item._id, item.quantity + 1)}
                        className="quantity-btn"
                      >+</button>
                    </div>
                    <button
                      onClick={() => removeItem(item._id)}
                      className="remove-btn"
                    >🗑️</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-footer">
              <div className="cart-total">
                <span>Total:</span>
                <span className="total-amount">₹{calculateTotal()}</span>
              </div>

              {singleRestaurant ? (
                <button
                  className="checkout-btn"
                  onClick={() => {
                    onClose();
                    navigate('/checkout');
                  }}
                >
                  Proceed to Checkout
                </button>
              ) : (
                <div className="cart-warning">
                  <p>
                    You can only order from one restaurant at a time.
                    <br />
                    Please remove items from other restaurants.
                  </p>
                </div>
              )}
              <button className="clear-cart-btn" onClick={clearCart}>
                Clear Cart
              </button>
            </div>
          </>
        ) : (
          <div className="empty-cart">
            <p>🛒</p>
            <h3>Your cart is empty</h3>
            <p>Add items from menu to get started</p>
          </div>
        )}
      </div>
    </div >
  );
}

export default CartModal;
