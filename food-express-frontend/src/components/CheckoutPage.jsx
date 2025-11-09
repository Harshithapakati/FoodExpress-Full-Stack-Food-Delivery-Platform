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
    const totalAmount = subtotal + delivery + taxes;

    // For cash on delivery, use the old flow
    if (payMethod === "cash") {
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
        totalAmount: totalAmount
      };

      try {
        const orderRes = await fetch("http://localhost:5000/api/orders/place", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(orderPayload)
        });
        const orderData = await orderRes.json();
        if (!orderData.success) throw new Error(orderData.error || "Order placement failed");

        // Clear cart
        await fetch("http://localhost:5000/api/cart/clear", {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
        setCartItems([]);
        setPlaced(true);
      } catch (error) {
        alert("Order failed: " + error.message);
      }
      return;
    }

  // For card payments, use Razorpay checkout
  if (payMethod === "card") {
      try {
        // Step 1: Create Razorpay order
        const orderRes = await fetch("http://localhost:5000/api/payment/order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ amount: totalAmount })
        });

        const orderData = await orderRes.json();
        if (!orderData.success) {
          throw new Error(orderData.error || "Failed to create payment order");
        }

        // Step 2: Open Razorpay checkout
        // Razorpay Sandbox Test Card Details:
        // Success: 4111 1111 1111 1111 | Expiry: any future MM/YY | CVV: 123 | OTP: any
        // Failure: 4000 0000 0000 0002 | Expiry: any future MM/YY | CVV: 123 | OTP: any
        // Use these only in Test Mode. Do NOT store real card data.
        const options = {
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency,
          order_id: orderData.order_id,
          name: "FoodExpress",
          description: `Order from ${restaurantInfo?.name || "Restaurant"}`,
          handler: async function (response) {
            // Payment successful - verify on server
            try {
              const verifyRes = await fetch("http://localhost:5000/api/payment/verify", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  items: cartItems.map(item => ({
                    name: item.name,
                    price: item.price,
                    quantity: item.qty,
                    image: item.img
                  })),
                  totalAmount: totalAmount,
                  restaurantName: restaurantInfo?.name || "",
                  deliveryAddress: `${address.house}, ${address.street}, ${address.city} - ${address.pincode}`,
                  paymentMethod: "card"
                })
              });

              const verifyData = await verifyRes.json();
              
              if (verifyData.success) {
                // Clear cart
                await fetch("http://localhost:5000/api/cart/clear", {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${token}` }
                });
                setCartItems([]);
                
                // Show success message and redirect to order history
                alert("Payment successful! Order placed successfully.");
                navigate("/order-history");
              } else {
                alert("Payment verification failed: " + (verifyData.error || "Unknown error"));
              }
            } catch (error) {
              console.error("Payment verification error:", error);
              alert("Payment verification failed: " + error.message);
            }
          },
          prefill: {
            name: address.name,
            contact: address.phone,
            email: JSON.parse(localStorage.getItem("user") || "{}").email || ""
          },
          theme: {
            color: "#e23744"
          },
          modal: {
            ondismiss: function() {
              // User closed the payment modal
              console.log("Payment modal closed by user");
            }
          }
        };

        // Minimal method exposure: let Razorpay show default card flow.
        // (Remove UPI completely as requested.)
        options.method = { card: true };

        const rzp = new window.Razorpay(options);
        rzp.open();

        rzp.on("payment.failed", async function (response) {
          console.error("Payment failed:", response.error);
          
          // Create pending order on payment failure
          try {
            const failedOrderRes = await fetch("http://localhost:5000/api/payment/failed", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: orderData.order_id,
                items: cartItems.map(item => ({
                  name: item.name,
                  price: item.price,
                  quantity: item.qty,
                  image: item.img
                })),
                totalAmount: totalAmount,
                restaurantName: restaurantInfo?.name || "",
                deliveryAddress: `${address.house}, ${address.street}, ${address.city} - ${address.pincode}`,
                paymentMethod: "card"
              })
            });

            const failedOrderData = await failedOrderRes.json();
            
            if (failedOrderData.success) {
              // Clear cart even on failure
              await fetch("http://localhost:5000/api/cart/clear", {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
              });
              setCartItems([]);
              
              alert("Payment failed: " + (response.error.description || "Unknown error") + "\nYour order has been saved. You can retry payment from Order History.");
              navigate("/order-history");
            } else {
              alert("Payment failed: " + (response.error.description || "Unknown error"));
            }
          } catch (error) {
            console.error("Failed order creation error:", error);
            alert("Payment failed: " + (response.error.description || "Unknown error"));
          }
        });

      } catch (error) {
        console.error("Payment initiation error:", error);
        alert("Payment failed: " + error.message);
      }
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
            <label><input type="radio" name="pay" value="card" checked={payMethod === "card"} onChange={() => setPayMethod("card")} /> Card</label>
          </div>
          <button type="submit" className="checkout-place-order-btn">Place Order</button>
        </form>
      </div>
    </div>
  );
}
