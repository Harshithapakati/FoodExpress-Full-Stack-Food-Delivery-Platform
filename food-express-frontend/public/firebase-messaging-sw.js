importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Firebase web app configuration (kept in sync with app firebaseConfig.js)
const firebaseConfig = {
  apiKey: "AIzaSyBElhcc78GVO7dmDwLmvU-sx-kkLbVBHjk",
  authDomain: "foodexpress-41056.firebaseapp.com",
  projectId: "foodexpress-41056",
  storageBucket: "foodexpress-41056.firebasestorage.app",
  messagingSenderId: "800450847647",
  appId: "1:800450847647:web:0948dfbc59bc4c0ee753aa",
  measurementId: "G-1TTRCMS848"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages and always show a system notification.
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // Prefer a notification object if present, otherwise fall back to data fields.
  const notif = payload.notification || {};
  const data = payload.data || {};

  const title = notif.title || data.title || 'FoodExpress';
  const body = notif.body || data.body || 'You have an update';
  const icon = notif.icon || '/favicon.ico';

  const options = {
    body,
    icon,
    data: Object.assign({}, data, { firebasePayload: payload }),
    // You can add actions, badge, tag, vibrate etc. if desired.
  };

  // Show the notification (system-level)
  self.registration.showNotification(title, options);

  // Also post the payload to any open clients so the page can show an in-app toast as a fallback
  try {
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        try {
          client.postMessage({ type: 'FCM_BACKGROUND_MESSAGE', payload });
        } catch (e) {
          // ignore per-client postMessage failures
        }
      }
    });
  } catch (e) {
    // ignore errors posting to clients
  }
});

// When notification is clicked, try to focus an existing window or open a new one.
self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification click Received.', event.notification && event.notification.data);
  event.notification && event.notification.close();

  const clickAction = (event.notification && event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        // If the client URL already matches, focus it.
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.pathname === clickAction || client.url === clickAction) {
            if (client.focus) return client.focus();
          }
        } catch (e) {
          // ignore URL parsing errors and continue
        }
      }
      // If no matching client, open a new window/tab to the clickAction
      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});
