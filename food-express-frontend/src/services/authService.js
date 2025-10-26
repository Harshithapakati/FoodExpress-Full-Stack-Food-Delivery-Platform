import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/auth';

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
      
      return { success: true, token: response.data.token };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.msg || 'Login failed'
      };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
  }
};

export default authService;
