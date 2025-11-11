import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { API } from '../services/api';
const API_BASE = `${API}/partner`;

function PartnerDashboard() {
  const [available, setAvailable] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    try {
      // try header first, then query-token fallback
      let aRes = await fetch(`${API_BASE}/available`, { headers });
      let aData = await aRes.json();
      if (aRes.status === 401 || !aData.success) {
        aRes = await fetch(`${API_BASE}/available?token=${encodeURIComponent(token)}`);
        aData = await aRes.json();
      }
      if (aData.success) setAvailable(aData.orders || []);

      let sRes = await fetch(`${API_BASE}/assigned`, { headers });
      let sData = await sRes.json();
      if (sRes.status === 401 || !sData.success) {
        sRes = await fetch(`${API_BASE}/assigned?token=${encodeURIComponent(token)}`);
        sData = await sRes.json();
      }
      if (sData.success) setAssigned(sData.orders || []);
    } catch (err) {
      console.error('Failed to fetch partner lists', err);
    } finally {
      setLoading(false);
    }
  };

  const accept = async (orderId) => {
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    try {
      let res = await fetch(`${API_BASE}/${orderId}/accept`, { method: 'POST', headers });
      let data = await res.json();
      if (res.status === 401 || !data.success) {
        // try body fallback
        res = await fetch(`${API_BASE}/${orderId}/accept?token=${encodeURIComponent(token)}`, { method: 'POST', headers });
        data = await res.json();
      }
      if (data.success) {
        fetchLists();
      } else {
        alert(data.message || 'Failed to accept');
      }
    } catch (err) {
      console.error('Accept failed', err);
      alert('Accept request failed');
    }
  };

  const advanceStatus = async (orderId, nextStatus) => {
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    try {
      let res = await fetch(`${API_BASE}/${orderId}/status`, { method: 'PUT', headers, body: JSON.stringify({ status: nextStatus }) });
      let data = await res.json();
      if (res.status === 401 || !data.success) {
        res = await fetch(`${API_BASE}/${orderId}/status?token=${encodeURIComponent(token)}`, { method: 'PUT', headers, body: JSON.stringify({ status: nextStatus, token }) });
        data = await res.json();
      }
      if (data.success) {
        fetchLists();
      } else {
        alert(data.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Status update failed', err);
      alert('Status update request failed');
    }
  };

  const renderOrder = (order, showActions = false) => {
    return (
      <div key={order._id} style={{ border: '1px solid #ddd', padding: '12px', marginBottom: '8px', borderRadius: '8px' }}>
        <div><b>Order:</b> {order._id}</div>
        <div><b>Restaurant:</b> {order.restaurantName}</div>
        <div><b>Address:</b> {order.deliveryAddress}</div>
        <div><b>Status:</b> {order.status}</div>
        <div style={{ marginTop: '8px' }}>
          <b>Items:</b>
          <ul>
            {order.items && order.items.map(i => (
              <li key={i.name}>{i.name} x{i.quantity}</li>
            ))}
          </ul>
        </div>
        {showActions && (
          <div style={{ marginTop: '8px' }}>
            <button onClick={() => accept(order._id)}>Accept</button>
          </div>
        )}
      </div>
    );
  };

  // For assigned orders, compute next action based on status
  const nextActionFor = (status) => {
    const order = {
      placed: 'accepted',
      accepted: 'reached_restaurant',
      reached_restaurant: 'picked_up',
      picked_up: 'out_for_delivery',
      out_for_delivery: 'reached_destination',
      reached_destination: 'delivered'
    };
    return order[status] || null;
  };

  return (
    <div style={{ padding: '16px' }}>
      <h2>Delivery Partner Dashboard</h2>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
        <button onClick={fetchLists} style={{ marginRight: '12px' }}>Refresh</button>
        <button onClick={async () => {
          try {
            const token = localStorage.getItem('token');
            if (token) {
              await fetch(`${API.replace(/\/api$/, '')}/device-token`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
              });
            }
          } catch (e) {
            // ignore
          } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login');
          }
        }} style={{ marginRight: '12px' }}>Logout</button>
      </div>
      {loading && <div>Loading...</div>}

      <h3>Available Orders</h3>
      {available.length === 0 ? <div>No available orders</div> : available.map(o => renderOrder(o, true))}

      <h3 style={{ marginTop: '20px' }}>Your Assigned Orders</h3>
      {assigned.length === 0 ? <div>No assigned orders</div> : assigned.map(o => (
        <div key={o._id} style={{ border: '1px solid #ccc', padding: '12px', marginBottom: '8px', borderRadius: '8px' }}>
          {renderOrder(o, false)}
          <div style={{ marginTop: '8px' }}>
            <b>Actions:</b>
            {(() => {
              const next = nextActionFor(o.status);
              if (!next) return <div>No further actions</div>;
              return (
                <>
                  <button onClick={() => advanceStatus(o._id, next)} style={{ marginRight: '8px' }}>Mark {next.replace(/_/g,' ')}</button>
                </>
              );
            })()}
          </div>
        </div>
      ))}
    </div>
  );
}

export default PartnerDashboard;
