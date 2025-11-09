import React, { useEffect, useState, useRef } from 'react';
import './OrderHistory.css';
import { useNavigate, useLocation } from 'react-router-dom';

function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const listRef = useRef(null);
  const location = useLocation();
  const [retrying, setRetrying] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrderHistory();
  }, []);

  useEffect(() => {
    // If query param orderId present, highlight that order after fetch
    const params = new URLSearchParams(location.search);
    const q = params.get('orderId');
    if (q && orders && orders.length > 0) {
      // find element with data-orderid
      setTimeout(() => {
        const el = document.querySelector(`[data-orderid=\"${q}\"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.boxShadow = '0 0 0 3px rgba(0,150,136,0.18)';
          setTimeout(() => { el.style.boxShadow = ''; }, 5000);
        }
      }, 200);
    }
  }, [location.search, orders]);

  const fetchOrderHistory = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const res = await fetch('http://localhost:5001/api/orders/history', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      setOrders(data.orders);
    }
    setLoading(false);
  };

  const handleRetryPayment = async (order) => {
    setRetrying(order._id);
    const token = localStorage.getItem('token');

    try {
      // Step 1: Create new Razorpay order for retry
      const retryRes = await fetch(`http://localhost:5001/api/payment/retry/${order._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const retryData = await retryRes.json();
      if (!retryData.success) {
        throw new Error(retryData.error || 'Failed to initiate retry');
      }

      // Step 2: Open Razorpay checkout
      const options = {
        key: retryData.key_id,
        amount: retryData.amount,
        currency: retryData.currency,
        order_id: retryData.order_id,
        name: 'FoodExpress',
        description: `Retry payment for Order #${order._id.slice(-6)}`,
        handler: async function (response) {
          // Payment successful - verify on server
          try {
            const verifyRes = await fetch(`http://localhost:5001/api/payment/retry-verify/${order._id}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            const verifyData = await verifyRes.json();
            
            if (verifyData.success) {
              setRetrying(null);
              // Force immediate refresh
              await fetchOrderHistory();
              alert('Payment successful! Order has been confirmed.');
            } else {
              alert('Payment verification failed: ' + (verifyData.error || 'Unknown error'));
              setRetrying(null);
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            alert('Payment verification failed: ' + error.message);
            setRetrying(null);
          }
        },
        prefill: {
          email: JSON.parse(localStorage.getItem('user') || '{}').email || ''
        },
        theme: {
          color: '#e23744'
        },
        modal: {
          ondismiss: function() {
            console.log('Retry payment modal closed by user');
            setRetrying(null);
          }
        }
      };

      // Minimal method exposure
      options.method = { card: true };

      const rzp = new window.Razorpay(options);
      rzp.open();

      rzp.on('payment.failed', function (response) {
        alert('Payment failed: ' + (response.error.description || 'Unknown error'));
        setRetrying(null);
      });

    } catch (error) {
      console.error('Retry payment error:', error);
      alert('Failed to retry payment: ' + error.message);
      setRetrying(null);
    }
  };

  if (loading) return <div>Loading order history...</div>;

  return (
    <div className="order-history-container">
      <button 
        onClick={() => navigate('/browse')}  
        className="back-button"
      >
        Back to Home
      </button>
      <h2>Your Order History</h2>
      {orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        orders.map(order => (
          <div key={order._id} data-orderid={order._id} className="order-card">
            <b>Date:</b> {new Date(order.createdAt).toLocaleString()}<br />
            <b>Restaurant:</b> {order.restaurantName}<br />
            <b>Status:</b> <span className={`order-status ${order.status.toLowerCase().replace(' ', '-')}`}>{order.status}</span><br />

            <b className="order-items-title">Items:</b>
            <ul>
              {order.items.map(item => (
                <li key={item.name + order._id}>
                  {item.name} x {item.quantity} — ₹{item.price * item.quantity}
                </li>
              ))}
            </ul>

            <div className="order-total-row">Total: ₹{order.totalAmount}</div>

            {order.status === 'Pending Payment' && (
              <button 
                className="retry-payment-btn"
                onClick={() => handleRetryPayment(order)}
                disabled={retrying === order._id}
              >
                {retrying === order._id ? 'Processing...' : 'Retry Payment'}
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default OrderHistory;
