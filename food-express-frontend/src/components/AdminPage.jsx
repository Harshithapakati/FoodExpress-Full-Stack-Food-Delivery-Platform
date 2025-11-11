import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminPage.css";
import MenuModal from "./MenuModal";
import AdminDashboardStats from "./AdminDashboardStats";  // <-- Import the stats panel

function AdminPage() {
  const [users, setUsers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('users');
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const navigate = useNavigate();

  const formatAddress = (addr) => {
    if (!addr) return 'N/A';
    if (typeof addr === 'string') return addr;
    try {
      const parts = [];
      if (addr.street) parts.push(addr.street);
      if (addr.city) parts.push(addr.city);
      if (addr.state) parts.push(addr.state);
      if (addr.zipCode) parts.push(addr.zipCode);
      return parts.join(', ') || 'N/A';
    } catch (e) {
      return 'N/A';
    }
  };

  useEffect(() => {
    const checkAdminStatus = () => {
      const userRaw = localStorage.getItem('user');
      if (!userRaw) {
        navigate('/login');
        return false;
      }
      try {
        const user = JSON.parse(userRaw);
        const role = (user?.role || '').toString().toLowerCase();
        if (role !== 'admin') {
          navigate('/');
          return false;
        }
      } catch (e) {
        navigate('/login');
        return false;
      }
      return true;
    };

    const fetchData = async () => {
      if (!checkAdminStatus()) return;

      try {
        const token = localStorage.getItem('token');
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        const [usersResponse, restaurantsResponse] = await Promise.all([
          fetch("/api/admin/users", { headers }),
          fetch("/api/admin/restaurants", { headers })
        ]);

        if (!usersResponse.ok || !restaurantsResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const [usersDataRaw, restaurantsDataRaw] = await Promise.all([
          usersResponse.json(),
          restaurantsResponse.json()
        ]);

        const usersData = Array.isArray(usersDataRaw) ? usersDataRaw : (usersDataRaw.data || []);
        const restaurantsData = Array.isArray(restaurantsDataRaw) ? restaurantsDataRaw : (restaurantsDataRaw.data || []);

        setUsers(usersData);
        setRestaurants(restaurantsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleStatusChange = async (itemId, newStatus, type) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/${type}/${itemId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update status');

      if (type === 'users') {
        setUsers(users.map(user => 
          user._id === itemId ? { ...user, status: newStatus } : user
        ));
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleViewMenu = async (restaurant) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/restaurants/${restaurant._id}/menu`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch menu items');

      const data = await response.json();
      setSelectedRestaurant(restaurant);
      setMenuItems(data.menuItems || []);
      setMenuModalOpen(true);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="admin-loading">Loading...</div>;
  if (error) return <div className="admin-error">Error: {error}</div>;

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <button onClick={handleLogout} className="logout-button">Logout</button>
      </header>

      {/* --- NEW PERFORMANCE PANEL --- */}
      <AdminDashboardStats />

      <nav className="admin-nav">
        <button 
          className={`nav-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button 
          className={`nav-tab ${activeTab === 'restaurants' ? 'active' : ''}`}
          onClick={() => setActiveTab('restaurants')}
        >
          Restaurants
        </button>
      </nav>

      {activeTab === 'users' && (
        <section className="admin-section">
          <div className="section-header">
            <h2>Users Management</h2>
            <p>Total Users: {users.length}</p>
          </div>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Created At</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem' }}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map(user => (
                    <tr key={user._id}>
                      <td>{user.email}</td>
                      <td>{user.role}</td>
                      <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        <span className={`status ${user.status || 'active'}`}>
                          {user.status || 'active'}
                        </span>
                      </td>
                      <td>
                        <select 
                          value={user.status || 'active'}
                          onChange={(e) => handleStatusChange(user._id, e.target.value, 'users')}
                          className="status-select"
                        >
                          <option value="active">Active</option>
                          <option value="blocked">Blocked</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'restaurants' && (
        <section className="admin-section">
          <div className="section-header">
            <h2>Restaurants Management</h2>
            <p>Total Restaurants: {restaurants.length}</p>
          </div>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Address</th>
                  <th>Menu Items</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {restaurants.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem' }}>
                      No restaurants found.
                    </td>
                  </tr>
                ) : (
                  restaurants.map(restaurant => (
                    <tr key={restaurant._id}>
                      <td>{restaurant.name}</td>
                      <td>{formatAddress(restaurant.address)}</td>
                      <td>{restaurant.menuCount || 0}</td>
                      <td>
                        <span className={`status ${restaurant.status || 'active'}`}>
                          {restaurant.status || 'active'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => handleViewMenu(restaurant)}
                            className="view-menu-button"
                          >
                            View Menu
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {menuModalOpen && (
        <MenuModal
          isOpen={menuModalOpen}
          restaurant={selectedRestaurant}
          menuItems={menuItems}
          onClose={() => setMenuModalOpen(false)}
        />
      )}
    </div>
  );
}

export default AdminPage;
