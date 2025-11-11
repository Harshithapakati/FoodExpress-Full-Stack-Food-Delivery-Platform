// Centralized API configuration
// Use VITE_API_ROOT to override backend host (e.g. VITE_API_ROOT=http://localhost:5001)
// Determine API root in a way that works both for Vite (import.meta.env) in the browser
// and for Node/Jest (process.env). Preference order:
// 1. Vite's import.meta.env.VITE_API_ROOT (browser/dev)
// 2. process.env.VITE_API_ROOT (tests or Node environment)
// 3. globalThis.VITE_API_ROOT (manual global override)
// 4. fallback to localhost:5000
let _root;
// Try to read Vite's import.meta.env at runtime using eval so the lexer/parser
// doesn't choke in Node/Jest. In Vite/browser this will yield the correct value.
try {
	const viteVal = eval('(() => (import.meta && import.meta.env && import.meta.env.VITE_API_ROOT) ? import.meta.env.VITE_API_ROOT : undefined)()');
	if (viteVal) _root = viteVal;
} catch (e) {
	// If eval fails (Node/Jest), we'll fall back to process.env or defaults below.
}

const _apiRootFromProcess = (typeof process !== 'undefined' && process.env && process.env.VITE_API_ROOT) ? process.env.VITE_API_ROOT : undefined;
const _apiRootFromGlobal = (typeof globalThis !== 'undefined' && globalThis.VITE_API_ROOT) ? globalThis.VITE_API_ROOT : undefined;

// Default to the backend dev port used in this project (.env shows 5001)
export const API_ROOT = _root || _apiRootFromProcess || _apiRootFromGlobal || 'http://localhost:5000';
export const API = `${API_ROOT}/api`;

// Helpful runtime debug: prints which API root the app is using in the browser console.
// This is intentionally lightweight and will be tree-shaken away in production builds.
if (typeof window !== 'undefined' && window?.console?.log) {
	// eslint-disable-next-line no-console
	console.log('[API] Using API_ROOT =', API_ROOT);
}

export default API;
