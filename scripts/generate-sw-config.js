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
  messagingSenderId: '${process.env.VITE_FIREBASE_MESSAGING_SENDER_ID}',
  projectId: '${process.env.VITE_FIREBASE_PROJECT_ID}',
  apiKey: '${process.env.VITE_FIREBASE_API_KEY}'
};

firebase.initializeApp(firebaseConfig);
`;

const swPath = join(__dirname, '../public/firebase-messaging-sw-config.js');
writeFileSync(swPath, swConfig);
console.log('Service worker config generated successfully!'); 