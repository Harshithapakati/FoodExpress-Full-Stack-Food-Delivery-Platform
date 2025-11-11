// Centralized API configuration
// Use VITE_API_ROOT to override backend host (e.g. VITE_API_ROOT=http://localhost:5001)
export const API_ROOT = import.meta.env.VITE_API_ROOT || 'http://localhost:5000';
export const API = `${API_ROOT}/api`;

export default API;
