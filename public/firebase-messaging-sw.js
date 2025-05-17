// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase libraries
// are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Wrap in try-catch to handle potential import errors
try {
  importScripts('/firebase-messaging-sw-config.js');

  // Retrieve an instance of Firebase Messaging so that it can handle background messages.
  const messaging = firebase.messaging();

  // Handle background messages
  messaging.onBackgroundMessage((payload) => {
    const { notification } = payload;
    
    // Only show notification if all required data is available
    if (notification && notification.title) {
      self.registration.showNotification(notification.title, {
        body: notification.body || '',
        icon: '/icon-192x192.png',
        data: notification.data || {}
      });
    }
  });
} catch (error) {
  console.error('Error initializing Firebase Messaging in service worker:', error);
} 