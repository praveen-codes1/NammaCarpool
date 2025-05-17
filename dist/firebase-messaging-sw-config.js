
// This file is auto-generated. Do not edit directly.
const firebaseConfig = {
  apiKey: 'AIzaSyDDpQEu5ZUJPgWUbhTbAzV9FB7i2ET_-lE',
  authDomain: 'nammacarpooling.firebaseapp.com',
  projectId: 'nammacarpooling',
  storageBucket: 'nammacarpooling.appspot.com',
  messagingSenderId: '651387669045',
  appId: '1:651387669045:web:3dbe11c3f2c4392391ff7c',
  measurementId: 'G-4LGZ5LEV59'
};

// Make sure Firebase is initialized with the proper configuration
firebase.initializeApp(firebaseConfig);

// Set the VAPID key for push notifications
firebase.messaging().getToken({
  vapidKey: 'BJA6lPZ84IG83U_6XoaNJUrEZaVCMVAY2BXqnScFybpmiHtfZKDbpF30PZAxR-QR40R7I80-ve_G378V5kNMRIE'
});
