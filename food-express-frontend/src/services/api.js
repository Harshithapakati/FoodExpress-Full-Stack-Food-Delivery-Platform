// Centralized API configuration
// Use VITE_API_ROOT to override backend host (e.g. VITE_API_ROOT=http://localhost:5001)
// Jest (Node) doesn't support `import.meta.env`. Use process.env as a safe alternative
// Vite will replace process.env.VITE_API_ROOT at build time if needed, and tests can
// set process.env.VITE_API_ROOT as well. Fallback to localhost for development.
const _apiRootFromProcess = (typeof process !== 'undefined' && process.env && process.env.VITE_API_ROOT) ? process.env.VITE_API_ROOT : undefined;
const _apiRootFromGlobal = (typeof globalThis !== 'undefined' && globalThis.VITE_API_ROOT) ? globalThis.VITE_API_ROOT : undefined;
export const API_ROOT = _apiRootFromProcess || _apiRootFromGlobal || 'http://localhost:5000';
export const API = `${API_ROOT}/api`;

export default API;
