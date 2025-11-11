import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { CartProvider } from './components/CartContext';
import './App.css';

// Initialize firebase messaging foreground handler
import firebaseConfig from './services/firebaseConfig';
import { initFirebase, onForegroundMessage } from './services/notificationService';

try {
  initFirebase(firebaseConfig);

  // display a system notification when the page is focused (foreground messages)
  onForegroundMessage(async (payload) => {
    try {
      console.log('Foreground FCM payload received:', payload);
      const title = payload.notification?.title || payload.data?.title || 'FoodExpress';
      const body = payload.notification?.body || payload.data?.body || '';
      const data = payload.data || {};

      // Only show notifications intended for the current user or its role
      const allowed = (() => {
        try {
          const stored = localStorage.getItem('user');
          if (!stored) return false; // no logged-in user, don't show
          const user = JSON.parse(stored);
          // If payload targets a specific userId, only show if it matches
          if (data.userId) {
            const uid = String(data.userId);
            const cur = String(user.userId || user.id || user._id || '');
            return uid === cur;
          }
          // If payload targets partners, only show to partner role
          if (data.target === 'partners' || data.for === 'partners') {
            return (user.role || '').toLowerCase() === 'partner';
          }
          // If payload explicitly targets all, show
          if (data.target === 'all' || data.for === 'all') return true;
          // Otherwise default to not showing (safer)
          return false;
        } catch (e) {
          return false;
        }
      })();

      if (!allowed) return;

      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.showNotification) {
          reg.showNotification(title, { body, data, icon: '/favicon.ico' });
          return;
        }
      }

      if (Notification.permission === 'granted') {
        new Notification(title, { body, data, icon: '/favicon.ico' });
      }
    } catch (err) {
      console.warn('Failed to display foreground notification:', err);
    }
  });
} catch (e) {
  console.warn('Firebase init/onMessage setup failed:', e.message || e);
}

// Small DOM toast helper for visible in-app notifications
function showInAppToast(title, message, timeout = 5000) {
  try {
    let container = document.getElementById('fe-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'fe-toast-container';
      container.style.position = 'fixed';
      container.style.top = '16px';
      container.style.right = '16px';
      container.style.zIndex = '99999';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '8px';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'fe-toast';
    toast.style.background = 'rgba(0,0,0,0.85)';
    toast.style.color = 'white';
    toast.style.padding = '12px 16px';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    toast.style.maxWidth = '320px';
    toast.style.fontFamily = 'Arial, sans-serif';
    toast.style.cursor = 'pointer';

    const t = document.createElement('div');
    t.style.fontWeight = '600';
    t.style.marginBottom = '6px';
    t.textContent = title;

    const b = document.createElement('div');
    b.style.fontSize = '13px';
    b.textContent = message;

    toast.appendChild(t);
    toast.appendChild(b);

    toast.addEventListener('click', () => toast.remove());

    container.appendChild(toast);

    setTimeout(() => {
      try { toast.remove(); } catch (_) {}
    }, timeout);
  } catch (e) {
    console.warn('Failed to show in-app toast:', e);
  }
}

// Always show in-app toast for foreground messages
try {
  onForegroundMessage((payload) => {
    const title = payload.notification?.title || payload.data?.title || 'FoodExpress';
    const body = payload.notification?.body || payload.data?.body || '';
    showInAppToast(title, body || 'You have a new notification');
  });
} catch (_) {}


// ✅ ✅ MERGED CLEANLY — kept BOTH versions’ meaning
// Listen for messages posted from the service worker (background pushes)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    try {
      const data = event.data;
      if (!data) return;

      if (data.type === 'FCM_BACKGROUND_MESSAGE') {
        const payload = data.payload || {};
        const title = payload.notification?.title || payload.data?.title || 'FoodExpress';
        const body = payload.notification?.body || payload.data?.body || '';
        const pd = payload.data || {};

        // Apply same filtering as foreground: only show if intended for current user/role/all
        try {
          const stored = localStorage.getItem('user');
          const user = stored ? JSON.parse(stored) : null;
          let allowedBg = false;
          if (user) {
            if (pd.userId) {
              allowedBg = String(pd.userId) === String(user.userId || user.id || user._id || '');
            } else if (pd.target === 'partners' || pd.for === 'partners') {
              allowedBg = (user.role || '').toLowerCase() === 'partner';
            } else if (pd.target === 'all' || pd.for === 'all') {
              allowedBg = true;
            }
          }
          if (allowedBg) showInAppToast(title, body || 'You have a new notification');
        } catch (e) {
          // silent
        }
      }
    } catch (_) {}
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CartProvider>
      <App />
    </CartProvider>
  </React.StrictMode>,
);
