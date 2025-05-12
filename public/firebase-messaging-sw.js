// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase libraries
// are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// Copy these values from your Firebase Console -> Project Settings
firebase.initializeApp({
  apiKey: 'AIzaSyDDpQEu5ZUJPgWUbhTbAzV9FB7i2ET_-lE',
  authDomain: 'nammacarpooling.firebaseapp.com',
  projectId: 'nammacarpooling',
  storageBucket: 'nammacarpooling.appspot.com',
  messagingSenderId: '651387669045',
  appId: '1:651387669045:web:3dbe11c3f2c4392391ff7c'
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const { notification } = payload;
  
  self.registration.showNotification(notification.title, {
    body: notification.body,
    icon: '/logo192.png',
    data: notification.data
  });
}); 