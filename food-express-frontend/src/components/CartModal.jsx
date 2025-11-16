import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CartModal.css';
import { API } from '../services/api';
import { useCart } from './CartContext';

function CartModal({ onClose, updateCartCount }) {
  const { cartItems, updateQuantity, removeFromCart, clearCart, refreshCart } = useCart();
  const loading = false; // CartContext fetches on provider mount
  const navigate = useNavigate();
  useEffect(() => {
    if (typeof updateCartCount === 'function') updateCartCount();
  }, [cartItems, updateCartCount]);

  const calculateTotal = () => {
    if (!cartItems || cartItems.length === 0) return 0;
    return cartItems.reduce((total, item) => total + item.price * item.qty, 0);
  };

  const singleRestaurant = cartItems && cartItems.length > 0 && cartItems.every(item => item.restaurantName === cartItems[0].restaurantName);

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

        {cartItems && cartItems.length > 0 ? (
          <>
            <div className="cart-items">
              {cartItems.map(item => (
                <div key={item._id} className="cart-item">
                  <img
                    src={item.img || 'https://via.placeholder.com/80'}
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
                        onClick={async () => { await updateQuantity(item._id, item.qty - 1); if (typeof updateCartCount === 'function') updateCartCount(); }}
                        className="quantity-btn"
                        disabled={item.qty <= 1}
                      >−</button>
                      <span className="quantity">{item.qty}</span>
                      <button
                        onClick={async () => { await updateQuantity(item._id, item.qty + 1); if (typeof updateCartCount === 'function') updateCartCount(); }}
                        className="quantity-btn"
                      >+</button>
                    </div>
                    <button
                      onClick={async () => { await removeFromCart(item._id); if (typeof updateCartCount === 'function') updateCartCount(); }}
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
              <button className="clear-cart-btn" onClick={async () => { if (!window.confirm('Are you sure you want to clear your cart?')) return; await clearCart(); if (typeof updateCartCount === 'function') updateCartCount(); }}>
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
