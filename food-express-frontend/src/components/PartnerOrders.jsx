import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/partner';

function getAuthHeader() {
	const token = localStorage.getItem('token');
	return token ? { Authorization: `Bearer ${token}` } : {};
}

const PartnerOrders = () => {
	const [available, setAvailable] = useState([]);
	const [assigned, setAssigned] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const fetchLists = async () => {
		setLoading(true);
		setError(null);
		try {
			const [a, b] = await Promise.all([
				axios.get(`${API_BASE}/available`, { headers: getAuthHeader() }),
				axios.get(`${API_BASE}/assigned`, { headers: getAuthHeader() })
			]);
			setAvailable(a.data.orders || []);
			setAssigned(b.data.orders || []);
		} catch (err) {
			console.error('Failed to fetch partner lists', err);
			setError(err.response?.data?.message || 'Failed to load');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { fetchLists(); }, []);

	const acceptOrder = async (id) => {
		try {
			await axios.post(`${API_BASE}/${id}/accept`, {}, { headers: getAuthHeader() });
			fetchLists();
		} catch (err) {
			console.error('Accept failed', err);
			setError(err.response?.data?.message || 'Accept failed');
		}
	};

	const advanceMilestone = async (id, milestone) => {
		try {
			await axios.put(`${API_BASE}/${id}/milestone`, { milestone }, { headers: getAuthHeader() });
			fetchLists();
		} catch (err) {
			console.error('Milestone update failed', err);
			setError(err.response?.data?.message || 'Update failed');
		}
	};

	const renderMilestoneButtons = (order) => {
		// show next possible milestone
		const status = (order.status || '').toLowerCase();
		if (status === 'accepted' || status === 'placed') {
			return (
				<button onClick={() => advanceMilestone(order._id, 'reachedRestaurant')}>Reached Restaurant</button>
			);
		}
		if (status === 'reached_restaurant' || status === 'reached_restaurant'.toLowerCase()) {
			return <button onClick={() => advanceMilestone(order._id, 'pickedUp')}>Picked Up</button>;
		}
		if (status === 'picked_up' || status === 'picked_up'.toLowerCase()) {
			return <button onClick={() => advanceMilestone(order._id, 'outForDelivery')}>Out For Delivery</button>;
		}
		if (status === 'out_for_delivery' || status === 'out_for_delivery'.toLowerCase()) {
			return <button onClick={() => advanceMilestone(order._id, 'reachedDestination')}>Reached Destination</button>;
		}
		if (status === 'reached_destination' || status === 'reached_destination'.toLowerCase()) {
			return <button onClick={() => advanceMilestone(order._id, 'delivered')}>Delivered</button>;
		}
		return null;
	};

	return (
		<div style={{ padding: 20 }}>
			<h2>Partner Dashboard</h2>
			{loading && <div>Loading...</div>}
			{error && <div style={{ color: 'red' }}>{error}</div>}

			<section>
				<h3>Available Orders</h3>
				{available.length === 0 && <div>No available orders</div>}
				<ul>
					{available.map(o => (
						<li key={o._id} style={{ marginBottom: 12 }}>
							<div><strong>{o.restaurantName}</strong> — {o.totalAmount} ₹</div>
							<div>Address: {o.deliveryAddress}</div>
							<div>Items: {o.items?.map(it => `${it.name} x${it.quantity}`).join(', ')}</div>
							<button onClick={() => acceptOrder(o._id)}>Accept</button>
						</li>
					))}
				</ul>
			</section>

			<section style={{ marginTop: 24 }}>
				<h3>Your Assigned Orders</h3>
				{assigned.length === 0 && <div>No assigned orders</div>}
				<ul>
					{assigned.map(o => (
						<li key={o._id} style={{ marginBottom: 12 }}>
							<div><strong>{o.restaurantName}</strong> — {o.totalAmount} ₹</div>
							<div>Status: {o.status}</div>
							<div>Address: {o.deliveryAddress}</div>
							<div>Items: {o.items?.map(it => `${it.name} x${it.quantity}`).join(', ')}</div>
							<div style={{ marginTop: 6 }}>{renderMilestoneButtons(o)}</div>
						</li>
					))}
				</ul>
			</section>

		</div>
	);
};

export default PartnerOrders;
