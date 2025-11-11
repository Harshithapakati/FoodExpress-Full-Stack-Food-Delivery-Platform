import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { requestAndRegisterToken } from '../services/notificationService';
import firebaseConfig from '../services/firebaseConfig';
import '../styles/Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await authService.login(formData.email, formData.password);

    if (result.success) {
      setMessage('Login successful! Welcome to FoodHub!');
      setMessageType('success');

      const token = result.data?.token || result.token;
      if (token) localStorage.setItem('token', token);

      // unified userObj used later for redirect
      let userObj = null;

      // CASE 1 — backend returned user
      if (result.data?.user) {
        userObj = result.data.user;
        localStorage.setItem('user', JSON.stringify(userObj));
      }

      // CASE 2 — no user object, extract from JWT
      else if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));

          userObj = {
            email: payload.email,
            name: payload.email?.split('@')[0] || '',
            userId: payload.id || payload.userId || null,
            role: payload.role || 'user'
          };

          localStorage.setItem('user', JSON.stringify(userObj));
        } catch (e) {
          // ignore token parse error
        }
      }

      // Notification registration
      try {
        if (firebaseConfig && typeof window !== 'undefined') {
          const reg = await requestAndRegisterToken(firebaseConfig);
          console.log('Notification registration result:', reg);
        }
      } catch (e) {
        console.warn('Notification registration failed:', e.message);
      }

      // Redirect (partner → /partner, otherwise /browse)
      setTimeout(() => {
        try {
          const storedUser = userObj || JSON.parse(localStorage.getItem('user') || 'null');
          if (storedUser && storedUser.role === 'partner') {
            navigate('/partner');
            return;
          }
        } catch {}

        navigate('/browse');
      }, 1500);
    }

    else {
      setMessage(result.message);
      setMessageType('error');
    }

    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>FoodExpress</h1>
          <h2>Welcome Back</h2>
          <p>Sign in to continue to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {message && (
            <div className={`message ${messageType}`}>
              {message}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
            />
          </div>

          <div className="forgot-password-link">
            <Link to="/forgot-password">Forgot Password?</Link>
          </div>

          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Do not have an account? <Link to="/register">Sign Up</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
