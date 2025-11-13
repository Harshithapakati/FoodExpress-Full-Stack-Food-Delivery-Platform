import axios from 'axios';
import { API } from './api';

const API_BASE_URL = `${API}/auth`;

const authService = {
  register: async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/register`, {
        email,
        password
      });
      return { success: true, message: response.data.msg };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.msg || 'Registration failed'
      };
    }
  },

  login: async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/login`, {
        email,
        password
      });
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }

      // Return response data as `data` so callers can check for `data.user`
      return { success: true, token: response.data.token, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.msg || 'Login failed'
      };
    }
  },

  // NEW: Request OTP for password reset
  forgotPassword: async (email) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/forgot-password`, {
        email
      });
      return { success: true, message: response.data.msg };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.msg || 'Failed to send OTP'
      };
    }
  },

  // NEW: Verify OTP
  verifyOTP: async (email, otp) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/verify-otp`, {
        email,
        otp
      });
      return { success: true, message: response.data.msg };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.msg || 'Invalid OTP'
      };
    }
  },

  // NEW: Reset password with OTP
  resetPassword: async (email, otp, newPassword) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/reset-password`, {
        email,
        otp,
        newPassword
      });
      return { success: true, message: response.data.msg };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.msg || 'Password reset failed'
      };
    }
  },

  logout: async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // best-effort: tell backend to clear the device token for this user
        await fetch(`${API.replace(/\/api$/, '')}/device-token`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
      }
    } catch (_e) {
      // ignore errors on logout
    } finally {
      localStorage.removeItem('token');
    }
  }
};

export default authService;
