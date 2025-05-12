import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import OfferRide from './pages/OfferRide';
import FindRide from './pages/FindRide';
import Profile from './pages/Profile';
import MyRides from './pages/MyRides';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { requestNotificationPermission, onForegroundMessage, handleNotification } from './utils/notifications';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Separate component for notification handling
const NotificationHandler = () => {
  const { currentUser } = useAuth();

  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        if (currentUser) {
          const fcmToken = await requestNotificationPermission();
          
          // Store the FCM token in Firestore
          if (fcmToken) {
            await setDoc(doc(db, 'users', currentUser.uid), {
              fcmToken,
              email: currentUser.email,
              updatedAt: new Date()
            }, { merge: true });
          }

          // Handle foreground messages
          onForegroundMessage((payload) => {
            const { notification } = payload;
            handleNotification(notification.type, notification.data);
          });
        }
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };

    initializeNotifications();
  }, [currentUser]);

  return null;
};

function App() {
  return (
    <AuthProvider>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <NotificationHandler />
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/offer-ride" element={<OfferRide />} />
            <Route path="/find-ride" element={<FindRide />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/my-rides" element={<MyRides />} />
          </Routes>
        </Box>
      </Box>
    </AuthProvider>
  );
}

export default App; 