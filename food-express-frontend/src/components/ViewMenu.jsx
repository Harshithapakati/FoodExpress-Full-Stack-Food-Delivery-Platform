import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './ViewMenu.css';
import { API } from '../services/api';


function ViewMenu() {
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [addingToCart, setAddingToCart] = useState({});
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const restaurantId = searchParams.get('id');


  useEffect(() => {
    if (restaurantId) {
      fetchMenu(restaurantId);
    } else {
      setError('No restaurant ID provided');
      setLoading(false);
    }
  }, [restaurantId]);


  const fetchMenu = async (restaurantId) => {
    try {
  const response = await fetch(`${API}/menu/${restaurantId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json(); 
      setRestaurant(data.restaurant);
      setMenuItems(data.menuItems);
    } catch (error) {
      setError(error.message);
    }
    setLoading(false);
  };


  const goBack = () => {
    navigate('/browse');
  };


  const addToCart = async (item) => {
    const token = localStorage.getItem('token'); 
    if (!token) {
      alert('Please login to add items to cart');
      navigate('/login');
      return;
    }


    setAddingToCart({ ...addingToCart, [item._id]: true });


    try {
  const response = await fetch(`${API}/cart/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          menuItemId: item._id,
          name: item.name,
          price: item.price,
          image: item.image,
          restaurantId: item.restaurantId,
            restaurantName: item.restaurantName || restaurant.name,
            token
        })
      });


      const data = await response.json(); 
      if (data.success) {
        alert('✅ Item added to cart!');
      } else {
        alert('Failed to add item to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Error adding item to cart');
    }


    setAddingToCart({ ...addingToCart, [item._id]: false });
  };


  const categories = ['All', ...new Set(menuItems.map(item => item.category).filter(Boolean))];


  const filteredItems = selectedCategory === 'All' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);


  if (loading) return <div className="loading">Loading menu...</div>;
  if (error) return <div className="error">{error}</div>;


  return (
    <div className="view-menu">
      {/* Header */}
      <header className="menu-header">
        <div className="header-content">
          <button className="back-btn" onClick={goBack}>
          </button>
          <div className="logo">
            <h1>🍽️ FoodHub</h1>
          </div>
        </div>
      </header>


      {/* Restaurant Info Banner */}
      {restaurant && (
        <section className="restaurant-banner">
          <div className="banner-content">
            <img 
              src={restaurant.image || 'https://via.placeholder.com/150'} 
              alt={restaurant.name}
              className="banner-image"
            />
            <div className="banner-info">
              <h1>{restaurant.name}</h1>
              <p className="cuisine">{restaurant.cuisine}</p>
              <div className="rating">
                <span className="rating-badge">
                  <span>{restaurant.rating || 'N/A'}</span>
                  <span className="star">⭐</span>
                </span>
              </div>
            </div>
          </div>
        </section>
      )}


      {/* Category Filter */}
      <section className="category-section">
        <div className="category-container">
          <h3>Menu Categories</h3>
          <div className="category-filter">
            {categories.map(category => (
              <button
                key={category}
                className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>


      {/* Menu Items */}
      <section className="menu-section">
        <div className="menu-container">
          {filteredItems.length === 0 ? (
            <div className="no-items">No menu items available</div>
          ) : (
            <div className="menu-grid">
              {filteredItems.map((item) => (
                <div key={item._id} className="menu-card">
                  <div className="menu-image">
                    <img 
                      src={item.image || 'https://via.placeholder.com/200'} 
                      alt={item.name} 
                    />
                    <span className={`veg-badge ${item.isVeg ? 'veg' : 'non-veg'}`}>
                      {item.isVeg ? '🟢' : '🔴'}
                    </span>
                  </div>
                  <div className="menu-info">
                    <div className="menu-header-row">
                      <h3 className="menu-name">{item.name}</h3>
                    </div>
                    {item.description && (
                      <p className="menu-description">{item.description}</p>
                    )}
                    <div className="menu-meta">
                      {item.category && (
                        <span className="category-tag">{item.category}</span>
                      )}
                      {item.spicyLevel && (
                        <span className="spice-tag">🌶️ {item.spicyLevel}</span>
                      )}
                      {item.rating && (
                        <span className="rating-tag">⭐ {item.rating}</span>
                      )}
                    </div>
                    <div className="menu-footer">
                      <span className="menu-price">₹{item.price}</span>
                      <button 
                        className="add-btn"
                        onClick={() => addToCart(item)}
                        disabled={addingToCart[item._id]}
                      >
                        {addingToCart[item._id] ? 'Adding...' : 'Add +'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}


export default ViewMenu;