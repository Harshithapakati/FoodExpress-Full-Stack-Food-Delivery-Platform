importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Firebase web app configuration (keep in sync with your app firebaseConfig.js)
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

// ✅ Handle background push messages
messaging.onBackgroundMessage(function (payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notif = payload.notification || {};
  const data = payload.data || {};

  const title = notif.title || data.title || 'FoodExpress';
  const body = notif.body || data.body || 'You have an update';
  const icon = notif.icon || '/favicon.ico';

  const options = {
    body,
    icon,
    data: { ...data, firebasePayload: payload }
  };

  // Show OS notification
  self.registration.showNotification(title, options);

  // ✅ ALSO forward background payload to open windows (your HEAD block)
  try {
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        for (const client of windowClients) {
          try {
            client.postMessage({
              type: 'FCM_BACKGROUND_MESSAGE',
              payload
            });
          } catch (e) {
            // ignore per-client postMessage failures silently
          }
        }
      });
  } catch (e) {
    // ignore posting failure
  }
});

// ✅ Handle notification click
self.addEventListener('notificationclick', function (event) {
  console.log(
    '[firebase-messaging-sw.js] Notification click received.',
    event.notification && event.notification.data
  );

  event.notification?.close();

  const clickAction =
    (event.notification &&
      event.notification.data &&
      event.notification.data.url) ||
    '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.pathname === clickAction || client.url === clickAction) {
            return client.focus();
          }
        } catch (_) {}
      }

      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});
