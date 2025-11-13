// Centralized API configuration
// Use VITE_API_ROOT to override backend host (e.g. VITE_API_ROOT=http://localhost:5001)
// Determine API root in a way that works both for Vite (import.meta.env) in the browser
// and for Node/Jest (process.env). Preference order:
// 1. Vite's import.meta.env.VITE_API_ROOT (browser/dev)
// 2. process.env.VITE_API_ROOT (tests or Node environment)
// 3. globalThis.VITE_API_ROOT (manual global override)
// 4. fallback to localhost:5001
let _root;
// Try to read Vite's import.meta.env at runtime using eval so the lexer/parser
// doesn't choke in Node/Jest. In Vite/browser this will yield the correct value.
try {
  const viteVal = eval('(() => (import.meta && import.meta.env && import.meta.env.VITE_API_ROOT) ? import.meta.env.VITE_API_ROOT : undefined)()');
  if (viteVal) _root = viteVal;
} catch (_e) {
  // If eval fails (Node/Jest), we'll fall back to process.env or defaults below.
}

const _apiRootFromProcess = (typeof process !== 'undefined' && process.env && process.env.VITE_API_ROOT) ? process.env.VITE_API_ROOT : undefined;
const _apiRootFromGlobal = (typeof globalThis !== 'undefined' && globalThis.VITE_API_ROOT) ? globalThis.VITE_API_ROOT : undefined;

// Default to the backend dev port used in this project (.env shows 5001)
export const API_ROOT = _root || _apiRootFromProcess || _apiRootFromGlobal || 'http://localhost:5001';
export const API = `${API_ROOT}/api`;

// Helpful runtime debug: prints which API root the app is using in the browser console.
// This is intentionally lightweight and will be tree-shaken away in production builds.
// Prefer calling window.console.log when available (so tests that mock it see the call).
// Also call the global console.log as a fallback/secondary sink so the message
// appears in environments where window isn't present.
// If a `window.console.log` is available (test or browser), call it so that
// tests that mock `window.console.log` receive the call. Otherwise use the
// global console.log (Node / non-window environments).
if (typeof window !== 'undefined' && window?.console && typeof window.console.log === 'function') {
  try {
    window.console.log('[API] Using API_ROOT =', API_ROOT);
  } catch (_e) {
    // If calling window.console.log throws for any reason, silently ignore
    // to avoid breaking the app (logging is diagnostic only).
  }
} else {
   
  console.log('[API] Using API_ROOT =', API_ROOT);
}

export default API;
