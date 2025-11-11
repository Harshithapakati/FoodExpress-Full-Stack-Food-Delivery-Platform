import React from 'react';
import './MenuModal.css';

const MenuModal = ({ isOpen, onClose, restaurant, menuItems }) => {
  if (!isOpen) return null;

  return (
    <div className="menu-modal-overlay" onClick={onClose}>
      <div className="menu-modal" onClick={e => e.stopPropagation()}>
        <div className="menu-modal-header">
          <h2 className="menu-modal-title">{restaurant.name} - Menu</h2>
          <button className="menu-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="menu-items-grid">
          {menuItems.length === 0 ? (
            <p>No menu items found.</p>
          ) : (
            menuItems.map((item) => (
              <div key={item._id} className="menu-item-card">
                {item.image && (
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="menu-item-image"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                )}
                <div className="menu-item-name">{item.name}</div>
                {item.description && (
                  <div className="menu-item-description">{item.description}</div>
                )}
                <div className="menu-item-footer">
                  <span className="menu-item-price">₹{item.price.toFixed(2)}</span>
                  <span className={`menu-item-badge ${item.isVeg ? 'menu-item-veg' : 'menu-item-nonveg'}`}>
                    {item.isVeg ? 'Veg' : 'Non-veg'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuModal;