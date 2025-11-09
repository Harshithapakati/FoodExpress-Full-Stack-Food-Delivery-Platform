import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { CartProvider } from './components/CartContext'; // Import CartProvider
import './App.css';

// Initialize firebase messaging foreground handler so onMessage shows a notification
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

      // Prefer showing notification via service worker registration for consistent system notifications
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.showNotification) {
          reg.showNotification(title, { body, data, icon: '/favicon.ico' });
          return;
        }
      }

      // Fallback: use the Notification API directly
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

// Small DOM toast helper for in-app visible notifications (foreground)
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

    // remove on click
    // click navigates to URL if present on dataset, otherwise just remove
    toast.addEventListener('click', () => {
      try {
        const target = toast.dataset && toast.dataset.url;
        if (target) {
          // If it's an absolute or relative path, open in same tab
          window.location.href = target;
          return;
        }
      } catch (e) {}
      toast.remove();
    });

    container.appendChild(toast);

    // keep toast longer so users have time to notice; if timeout is 0, don't auto-remove
    if (timeout > 0) {
      setTimeout(() => {
        try { toast.remove(); } catch (e) { }
      }, timeout);
    }
  } catch (e) {
    console.warn('Failed to show in-app toast:', e);
  }
}

// Hook into foreground handler to always show an in-app toast as visible fallback
try {
  // Re-register a small wrapper to use the same onForegroundMessage
  onForegroundMessage((payload) => {
    const title = payload.notification?.title || payload.data?.title || 'FoodExpress';
    const body = payload.notification?.body || payload.data?.body || '';
    // log for debugging
    console.log('Foreground message payload received (page):', payload);
    // if payload contains a url in data, pass it so the toast can navigate
    const url = payload.data?.url || payload.data?.click_action || null;
    const t = payload.notification?.title || payload.data?.title || 'FoodExpress';
    showInAppToast(t, body || 'You have a new notification', 15000);
  });
} catch (e) {
  // ignore if messaging not initialized
}

// Listen for messages posted from the service worker (background pushes)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    try {
      const data = event.data;
      if (!data) return;
      if (data.type === 'FCM_BACKGROUND_MESSAGE') {
        const payload = data.payload || {};
        console.log('SW -> page FCM_BACKGROUND_MESSAGE received:', payload);
        const title = payload.notification?.title || payload.data?.title || 'FoodExpress';
        const body = payload.notification?.body || payload.data?.body || '';
        const url = payload.data?.url || payload.data?.click_action || null;
        // create toast and attach url to dataset so clicking navigates
        const result = showInAppToast(title, body || 'You have a new notification', 15000);
        try {
          // set data-url attribute for navigation when clicked
          const container = document.getElementById('fe-toast-container');
          if (container && container.lastChild && url) {
            container.lastChild.dataset = container.lastChild.dataset || {};
            container.lastChild.dataset.url = url;
          }
        } catch (e) { console.warn('Failed to attach url to toast', e); }
      }
    } catch (err) {
      // ignore message handling errors
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CartProvider>
      <App />
    </CartProvider>
  </React.StrictMode>,
);
