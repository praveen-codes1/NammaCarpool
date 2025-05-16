import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../config/firebase';

// Request notification permission and get FCM token
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      });
      return token;
    }
    throw new Error('Notification permission denied');
  } catch (error) {
    console.error('Error getting notification permission:', error);
    throw error;
  }
};

// Handle foreground messages
export const onForegroundMessage = (callback) => {
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};

// Show notification
export const showNotification = (title, body, data = {}) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/logo192.png', // Add your app icon path
      data
    });
  }
};

// Handle different notification types
export const handleNotification = (type, data) => {
  switch (type) {
    case 'BOOKING_CONFIRMATION':
      showNotification(
        'Booking Confirmed!',
        `Your ride from ${data.source} to ${data.destination} has been confirmed.`
      );
      break;
    case 'RIDE_UPDATE':
      showNotification(
        'Ride Update',
        `There's an update to your ride on ${new Date(data.dateTime).toLocaleDateString()}`
      );
      break;
    case 'RIDE_CANCELLATION':
      showNotification(
        'Ride Cancelled',
        `The ride from ${data.source} to ${data.destination} has been cancelled.`
      );
      break;
    case 'NEW_MESSAGE':
      showNotification(
        'New Message',
        `New message from ${data.senderName}`
      );
      break;
    default:
      break;
  }
}; 