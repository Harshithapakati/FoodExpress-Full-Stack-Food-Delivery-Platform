import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './BrowseRestaurants.css';
import CartModal from './CartModal';

function BrowseRestaurants() {
  const [restaurants, setRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCartModal, setShowCartModal] = useState(false);
  const [user, setUser] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRestaurants();
    checkAuth();
  }, []);

  useEffect(() => {
    filterRestaurants();
  }, [searchQuery, restaurants]);

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
      fetchCartCount(token);
    } else if (token) {
      // If we have token but no user data, decode token to get email
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userObj = { email: payload.email, name: payload.email.split('@')[0], userId: payload.userId };
        setUser(userObj);
        localStorage.setItem('user', JSON.stringify(userObj));
        fetchCartCount(token);
      } catch (e) {
        console.error('Error decoding token:', e);
      }
    }
  };

  const fetchCartCount = async (token) => {
    try {
      const response = await fetch('http://localhost:5000/api/cart', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        const count = data.cart.items.reduce((sum, item) => sum + item.quantity, 0);
        setCartCount(count);
      }
    } catch (error) {
      console.error('Error fetching cart count:', error);
    }
  };

  const fetchRestaurants = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/restaurants');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setRestaurants(data.restaurants);
      setFilteredRestaurants(data.restaurants);
    } catch (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  const filterRestaurants = () => {
    let filtered = [...restaurants];

    if (searchQuery.trim()) {
      filtered = filtered.filter(restaurant =>
        restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        restaurant.cuisine.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredRestaurants(filtered);
  };

  const handleViewMenu = (restaurant) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    navigate(`/menu?id=${restaurant._id}`);
  };

  const handleCartClick = () => {
    if (!user) {
      alert('Please login to view cart');
      navigate('/login');
    } else {
      setShowCartModal(true);
    }
  };

  const handleSignUp = () => {
    navigate('/register');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCartCount(0);
  };

  const updateCartCount = () => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchCartCount(token);
    }
  };

  if (loading) return <div className="loading">Loading restaurants...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="browse-restaurants">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo" onClick={() => navigate('/browse')}>
            <h1>🍽️ FoodHub</h1>
          </div>
          <div className="header-right">
            {user ? (
              <>
                <button className="cart-btn" onClick={handleCartClick}>
                  🛒 Cart {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
                </button>
                <div className="user-menu">
                  <span className="user-name">Hi, {user.name || user.email}</span>
                  <button className="logout-btn" onClick={handleLogout}>Logout</button>
                </div>
              </>
            ) : (
              <div className="auth-buttons">
                <button className="login-btn" onClick={handleLogin}>Login</button>
                <button className="signup-btn" onClick={handleSignUp}>Sign Up</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section with Search */}
      <section className="hero-section">
        <div className="hero-content">
          <h2>Order food from your favorite restaurants</h2>
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search for restaurants or cuisines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="search-btn">🔍 Search</button>
          </div>
        </div>
      </section>

      {/* Restaurants Section */}
      <section className="restaurants-section">
        <div className="section-header">
          <h2>All Restaurants</h2>
          <p className="results-count">{filteredRestaurants.length} restaurants found</p>
        </div>

        {filteredRestaurants.length === 0 ? (
          <div className="no-results">
            <p>No restaurants found matching your criteria</p>
          </div>
        ) : (
          <div className="restaurant-grid">
            {filteredRestaurants.map((restaurant) => (
              <div key={restaurant._id} className="restaurant-card">
                <div className="restaurant-image">
                  <img src={restaurant.image || 'https://via.placeholder.com/300x200'} alt={restaurant.name} />
                  <div className="delivery-time-badge">{restaurant.deliveryTime}</div>
                </div>
                <div className="restaurant-info">
                  <div className="restaurant-header">
                    <h3 className="restaurant-name">{restaurant.name}</h3>
                    <div className="restaurant-rating">
                      <span className="rating-value">{restaurant.rating || 'N/A'}</span>
                      <span className="rating-star">⭐</span>
                    </div>
                  </div>
                  <p className="restaurant-cuisine">{restaurant.cuisine}</p>
                  <div className="restaurant-meta">
                    <span className="meta-item">💰 ₹{restaurant.deliveryFee} delivery</span>
                    {restaurant.reviewCount && (
                      <span className="meta-item">📝 {restaurant.reviewCount} reviews</span>
                    )}
                  </div>
                  {restaurant.address?.street && (
                    <p className="restaurant-address">
                      📍 {restaurant.address.street}, {restaurant.address.city}
                    </p>
                  )}
                  <button
                    className="view-menu-btn"
                    onClick={() => handleViewMenu(restaurant)}>
                    View Menu →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>© 2024 FoodHub. All rights reserved.</p>
      </footer>

      {/* Modals */}
      {showCartModal && (
        <CartModal 
          onClose={() => setShowCartModal(false)} 
          updateCartCount={updateCartCount}
        />
      )}
    </div>
  );
}

export default BrowseRestaurants;