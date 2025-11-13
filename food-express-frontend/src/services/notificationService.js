// Simple Firebase Messaging helper (v9 modular SDK)
// Before using, set configuration values in the Firebase console and in
// `src/services/firebaseConfig.js` (create it with your project config).

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging';
import { VAPID_KEY } from './firebaseConfig';
import axios from 'axios';
import { API } from './api';

let messaging;

export function initFirebase(firebaseConfig) {
  const app = initializeApp(firebaseConfig);
  messaging = getMessaging(app);
  return messaging;
}

export async function requestAndRegisterToken(firebaseConfig) {
  if (!messaging) initFirebase(firebaseConfig);
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { success: false, message: 'Notification permission denied' };

    // VAPID key must be set in firebase console (Web Push certificates)
    const vapidKey = firebaseConfig?.vapidKey || VAPID_KEY || null; // prefer config.vapidKey then exported VAPID_KEY
    // Register service worker for background messages
    let swRegistration = null;
    try {
      if ('serviceWorker' in navigator) {
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      }
    } catch (swErr) {
      console.warn('Service worker registration failed:', swErr.message);
    }

    // Try to force-refresh the token on each login: delete any existing token first
    // so that subsequent getToken() returns a fresh token.
    try {
      const existing = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swRegistration });
      if (existing) {
        try {
          await deleteToken(messaging);
          // small delay to ensure deletion processed before requesting new token
          await new Promise(r => setTimeout(r, 250));
        } catch (delErr) {
          console.warn('Failed to delete existing FCM token (non-fatal):', delErr && delErr.message ? delErr.message : delErr);
        }
      }

      const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swRegistration });
      if (!token) return { success: false, message: 'No token received' };

      // send to backend to save against user
      await axios.post(`${API}/device-token`, { token }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      return { success: true, token };
    } catch (err2) {
      console.error('Token refresh/get failed', err2);
      return { success: false, message: err2?.message || 'Failed to get token' };
    }
  } catch (err) {
    console.error('Request/register token failed', err.message);
    return { success: false, message: err.message };
  }
}

export function onForegroundMessage(callback) {
  if (!messaging) return;
  onMessage(messaging, (payload) => {
    callback(payload);
  });
}
