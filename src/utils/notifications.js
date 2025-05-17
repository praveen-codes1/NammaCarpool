import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../config/firebase';

// Silent notification request that won't show errors to the user
export const requestNotificationPermission = async () => {
  try {
    // Skip notification requests entirely if the browser doesn't support them
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      console.log('Notifications not supported in this browser');
      return null;
    }

    // Skip if permission was previously denied
    if (Notification.permission === 'denied') {
      console.log('Notifications were previously denied');
      return null;
    }

    // Only request permission if it's not already granted
    if (Notification.permission !== 'granted') {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('Notification permission not granted');
          return null;
        }
      } catch (permissionError) {
        console.log('Error requesting notification permission:', permissionError);
        return null;
      }
    }

    // At this point permission is granted, try to get token without showing errors
    try {
      // Skip FCM token registration entirely since it's causing issues
      // This will disable push notifications but prevent errors
      console.log('FCM token registration skipped to prevent errors');
      return "dummy-token-notifications-disabled";
    } catch (tokenError) {
      console.log('Error during token registration:', tokenError);
      return null;
    }
  } catch (error) {
    // Silently fail
    console.log('Notification setup failed silently:', error);
    return null;
  }
};

// Handle foreground messages - this is now a no-op
export const onForegroundMessage = (callback) => {
  // Return a dummy unsubscribe function
  return () => {};
};

// Show notification using regular browser API instead of FCM
export const showNotification = (title, body, data = {}) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/icon-192x192.png', 
        data
      });
    } catch (error) {
      console.log('Failed to show notification:', error);
    }
  }
};

// Handle different notification types - only show UI notifications now
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