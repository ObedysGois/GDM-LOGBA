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
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'gdm-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Abrir'
      },
      {
        action: 'close',
        title: 'Fechar'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification click received.');

  event.notification.close();

  if (event.action === 'open') {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});