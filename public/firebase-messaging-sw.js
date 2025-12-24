// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBla-ItwmWjbfqZWX-rPJb_L1kuT178uac",
  authDomain: "gdm-log-ba-2f8c5.firebaseapp.com",
  projectId: "gdm-log-ba-2f8c5",
  storageBucket: "gdm-log-ba-2f8c5.appspot.com",
  messagingSenderId: "345609111488",
  appId: "1:345609111488:web:6233ab1ee1de9af737ea25",
  measurementId: "G-FL1VKY0EH9"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve Firebase Messaging object
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || 'GDM LogBA';
  const notificationOptions = {
    body: payload.notification.body || 'Nova notificação',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    image: payload.notification.image || undefined,
    tag: payload.data?.tag || 'gdm-notification',
    requireInteraction: payload.data?.requireInteraction !== false,
    data: payload.data || {},
    actions: [
      {
        action: 'open',
        title: 'Abrir App'
      },
      {
        action: 'close',
        title: 'Fechar'
      }
    ],
    vibrate: [200, 100, 200],
    timestamp: Date.now()
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification click received.');

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  if (event.action === 'open' || !event.action) {
    // Abrir ou focar o app
    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      }).then((clientList) => {
        // Verificar se já existe uma janela aberta
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Se não houver janela aberta, abrir uma nova
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  } else if (event.action === 'close') {
    // Apenas fechar a notificação
    event.notification.close();
  }
});