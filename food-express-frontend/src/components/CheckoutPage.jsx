import React, { useState } from "react";
import { useCart } from "./CartContext";
import { useNavigate } from 'react-router-dom';
import "./CheckoutPage.css";

function PaymentPage({ onBack }) {
  return (
    <div className="checkout-payment-page">
      <h2>Complete Your Payment</h2>
      <p>Redirecting to UPI/Payment Gateway...</p>
      <button onClick={onBack} className="checkout-btn">Back to Checkout</button>
    </div>
  );
}

export default function CheckoutPage() {
  const { cartItems, updateQuantity, removeFromCart, setCartItems } = useCart();
  const navigate = useNavigate();

  const [address, setAddress] = useState({ name: "", phone: "", house: "", street: "", city: "Bengaluru", pincode: "" });
  const [payMethod, setPayMethod] = useState("cash");
  const [placed, setPlaced] = useState(false);
  const [paymentStarted, setPaymentStarted] = useState(false);
  const [errors, setErrors] = useState({});

  const restaurantInfo = cartItems.length > 0 ? {
    name: cartItems[0].restaurantName,
    id: cartItems[0].restaurantId || '',
  } : null;

  const subtotal = cartItems.reduce((sum, item) => sum + item.qty * item.price, 0);
  const delivery = subtotal > 500 ? 0 : 50;
  const taxes = Math.round(subtotal * 0.05);
  const total = subtotal + delivery + taxes;

  const validate = () => {
    let currErrors = {};
    if (!address.name.trim()) currErrors.name = "Name is required";
    if (!/^\d{10}$/.test(address.phone)) currErrors.phone = "Phone must be 10 digits";
    if (!address.house.trim()) currErrors.house = "House no./Flat is required";
    if (!address.street.trim()) currErrors.street = "Street/Area is required";
    if (!address.city.trim()) currErrors.city = "City is required";
    if (!/^\d{6}$/.test(address.pincode)) currErrors.pincode = "Pincode must be 6 digits";
    setErrors(currErrors);
    return Object.keys(currErrors).length === 0;
  };

  const handleRemoveItem = async (_id) => {
    await removeFromCart(_id);
    // cartItems update asynchronously from context, triggers re-render
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      alert("Cart is empty. Add items before checkout.");
      return;
    }
    if (!validate()) return;

    const token = localStorage.getItem("token");

    const orderPayload = {
      restaurantName: restaurantInfo?.name || "",
      items: cartItems.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.qty,
        image: item.img
      })),
      deliveryAddress: `${address.house}, ${address.street}, ${address.city} - ${address.pincode}`,
      paymentMethod: payMethod,
      totalAmount: subtotal + delivery + taxes
    };

    // Debugging logs: show token and exact payload sent
    console.log('Placing order. Token present:', !!token);
    console.log('Order payload about to be sent:', orderPayload);

    try {
      // Place order
      const orderRes = await fetch("http://localhost:5000/api/orders/place", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(orderPayload)
      });
      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error("Order placement failed");

      // Clear cart
      await fetch("http://localhost:5000/api/cart/clear", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      setCartItems([]);

      if (payMethod === "card") setPaymentStarted(true);
      else setPlaced(true);
    } catch (error) {
      alert("Order failed: " + error.message);
    }
  };


  const handleAddMore = () => {
    if (cartItems.length === 0) {
      navigate("/browse");
    } else if (restaurantInfo && restaurantInfo.id) {
      navigate(`/menu?id=${restaurantInfo.id}`);
    }
  };

  if (paymentStarted) return <PaymentPage onBack={() => setPaymentStarted(false)} />;
  if (placed) {
    return (
      <div className="checkout-success-container">
        <h2>Order Placed!</h2>
        <img src="https://img.icons8.com/color/96/ok--v1.png" alt="Success" />
        <div>Your order has been placed successfully.<br />You'll receive confirmation soon.</div>
        <a href="/" className="back-to-home">Back to Home</a>
      </div>
    );
  }

  return (
    <div className="checkout-page-container">
      <div className="checkout-main-container">
        <div className="checkout-cart-section">
          {restaurantInfo ? (
            <div className="checkout-restaurant-header">
              <div>
                <div className="checkout-restaurant-name">{restaurantInfo.name}</div>
              </div>
            </div>
          ) : (
            <div>No restaurant info available</div>
          )}

          {cartItems.length === 0 && <div>Your cart is empty.</div>}

          {cartItems.map(item => (
            <div key={item._id} className="checkout-cart-item">
              <img src={item.img || 'https://via.placeholder.com/80'} alt={item.name} className="checkout-cart-item-img" />
              <div className="checkout-cart-item-details">
                <div className="checkout-cart-item-name">{item.name}</div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  Qty:
                  <button
                    className="quantity-btn"
                    style={{ marginLeft: 8 }}
                    onClick={() => updateQuantity(item._id, Math.max(1, item.qty - 1))}
                    disabled={item.qty <= 1}
                  >−</button>
                  <span style={{ margin: "0 8px" }}>{item.qty}</span>
                  <button
                    className="quantity-btn"
                    onClick={() => updateQuantity(item._id, item.qty + 1)}
                  >+</button>
                  <button
                    className="remove-btn"
                    style={{ marginLeft: 14, color: "#e23744", fontWeight: "bold", border: "none", background: "transparent", fontSize: "18px", cursor: "pointer" }}
                    onClick={() => handleRemoveItem(item._id)}
                    title="Remove item"
                  >🗑️</button>
                </div>
              </div>
              <div className="checkout-cart-item-price">₹{item.price * item.qty}</div>
            </div>
          ))}

          <button onClick={handleAddMore} className="checkout-btn add-more-btn">
            {cartItems.length === 0 ? "Add Items" : "Add More Items"}
          </button>

          <div className="checkout-bill-summary">
            <div><span>Subtotal</span><span>₹{subtotal}</span></div>
            <div><span>Delivery Charges</span><span>{delivery === 0 ? "Free" : `₹${delivery}`}</span></div>
            <div><span>Taxes & GST</span><span>₹{taxes}</span></div>
            <div className="checkout-bill-total"><span>Total Amount</span><span>₹{total}</span></div>
          </div>
        </div>
        <form className="checkout-form-section" onSubmit={handlePlaceOrder} noValidate>
          <h2>Delivery Details</h2>
          <input required placeholder="Full name" className={`checkout-input ${errors.name ? "input-error" : ""}`} value={address.name} onChange={e => setAddress({ ...address, name: e.target.value })} />
          {errors.name && <div className="error-msg">{errors.name}</div>}
          <input required placeholder="Phone number" className={`checkout-input ${errors.phone ? "input-error" : ""}`} value={address.phone} onChange={e => setAddress({ ...address, phone: e.target.value })} />
          {errors.phone && <div className="error-msg">{errors.phone}</div>}
          <input required placeholder="Flat/House no." className={`checkout-input ${errors.house ? "input-error" : ""}`} value={address.house} onChange={e => setAddress({ ...address, house: e.target.value })} />
          {errors.house && <div className="error-msg">{errors.house}</div>}
          <input required placeholder="Street/Area" className={`checkout-input ${errors.street ? "input-error" : ""}`} value={address.street} onChange={e => setAddress({ ...address, street: e.target.value })} />
          {errors.street && <div className="error-msg">{errors.street}</div>}
          <div className="checkout-city-pincode">
            <input required placeholder="City" className={`checkout-input small-input ${errors.city ? "input-error" : ""}`} value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })} />
            {errors.city && <div className="error-msg">{errors.city}</div>}
            <input required placeholder="Pincode" className={`checkout-input small-input ${errors.pincode ? "input-error" : ""}`} value={address.pincode} onChange={e => setAddress({ ...address, pincode: e.target.value })} />
            {errors.pincode && <div className="error-msg">{errors.pincode}</div>}
          </div>
          <h2>Payment Method</h2>
          <div className="checkout-payment-methods">
            <label><input type="radio" name="pay" value="cash" checked={payMethod === "cash"} onChange={() => setPayMethod("cash")} /> Cash on Delivery</label>
            <label><input type="radio" name="pay" value="card" checked={payMethod === "card"} onChange={() => setPayMethod("card")} /> Card/UPI</label>
          </div>
          <button type="submit" className="checkout-place-order-btn">Place Order</button>
        </form>
      </div>
    </div>
  );
}
