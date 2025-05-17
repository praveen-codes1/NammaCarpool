import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';
import { writeFileSync } from 'fs';

// Initialize dotenv
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const swConfig = `
// This file is auto-generated. Do not edit directly.
const firebaseConfig = {
  apiKey: '${process.env.VITE_FIREBASE_API_KEY}',
  authDomain: '${process.env.VITE_FIREBASE_AUTH_DOMAIN}',
  projectId: '${process.env.VITE_FIREBASE_PROJECT_ID}',
  storageBucket: '${process.env.VITE_FIREBASE_STORAGE_BUCKET}',
  messagingSenderId: '${process.env.VITE_FIREBASE_MESSAGING_SENDER_ID}',
  appId: '${process.env.VITE_FIREBASE_APP_ID}',
  measurementId: '${process.env.VITE_FIREBASE_MEASUREMENT_ID}'
};

// Make sure Firebase is initialized with the proper configuration
firebase.initializeApp(firebaseConfig);

// Set the VAPID key for push notifications
firebase.messaging().getToken({
  vapidKey: '${process.env.VITE_FIREBASE_VAPID_KEY || ''}'
});
`;

const swPath = join(__dirname, '../public/firebase-messaging-sw-config.js');
writeFileSync(swPath, swConfig);
console.log('Service worker config generated successfully!'); 