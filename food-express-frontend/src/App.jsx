import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Register from './components/Register';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import BrowseRestaurants from './components/BrowseRestaurants';
import ViewMenu from './components/ViewMenu';
import CheckoutPage from './components/CheckoutPage';
import OrderHistory from './components/OrderHistory';
import PartnerDashboard from './components/PartnerDashboard';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/browse" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/browse" element={<BrowseRestaurants />} />
          <Route path="/menu" element={<ViewMenu />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-history" element={<OrderHistory />} />
          <Route path="/partner" element={<PartnerDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
