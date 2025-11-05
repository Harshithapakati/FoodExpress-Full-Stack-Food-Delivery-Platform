import React, { useEffect, useState } from 'react';
import './OrderHistory.css';
import { useNavigate } from 'react-router-dom';

function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrderHistory();
  }, []);

  const fetchOrderHistory = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('http://localhost:5000/api/orders/history', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) setOrders(data.orders);
    setLoading(false);
  };

  if (loading) return <div>Loading order history...</div>;

  return (
    <div className="order-history-container">
      <button 
        onClick={() => navigate(-1)} 
        className="back-button"
      >
        Back
      </button>
      <h2>Your Order History</h2>
      {orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        orders.map(order => (
          <div key={order._id} className="order-card">
            <b>Date:</b> {new Date(order.createdAt).toLocaleString()}<br />
            <b>Restaurant:</b> {order.restaurantName}<br />
            <b>Status:</b> {order.status}<br />

            <b className="order-items-title">Items:</b>
            <ul>
              {order.items.map(item => (
                <li key={item.name + order._id}>
                  {item.name} x {item.quantity} — ₹{item.price * item.quantity}
                </li>
              ))}
            </ul>

            <div className="order-total-row">Total: ₹{order.totalAmount}</div>
          </div>
        ))
      )}
    </div>
  );
}

export default OrderHistory;
