import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, Snackbar, Alert } from '@mui/material';
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
import { db } from './config/firebase';

// Separate component for notification handling
const NotificationHandler = () => {
  const { currentUser } = useAuth();
  const [notificationError, setNotificationError] = useState(null);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // Only prompt for notification permission after user has been active
  useEffect(() => {
    if (currentUser) {
      // Wait until user has been active for a while
      const timer = setTimeout(() => {
        setShowNotificationPrompt(true);
      }, 30000); // 30 seconds
      
      return () => clearTimeout(timer);
    }
  }, [currentUser]);

  const handleRequestNotifications = async () => {
    try {
      if (currentUser && showNotificationPrompt) {
        const fcmToken = await requestNotificationPermission();
        
        // Store the FCM token in Firestore
        if (fcmToken) {
          await setDoc(doc(db, 'users', currentUser.uid), {
            fcmToken,
            email: currentUser.email,
            updatedAt: new Date()
          }, { merge: true });

          // Setup foreground message handler
          onForegroundMessage((payload) => {
            const { notification } = payload;
            handleNotification(notification.type, notification.data);
          });
          
          setShowNotificationPrompt(false);
        }
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
      setNotificationError(error.message || 'Failed to initialize notifications');
      setSnackbarOpen(true);
    }
  };

  // Request permissions when prompt is shown
  useEffect(() => {
    if (showNotificationPrompt) {
      handleRequestNotifications();
    }
  }, [showNotificationPrompt]);

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  return (
    <>
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="error">
          {notificationError}
        </Alert>
      </Snackbar>
    </>
  );
};

function App() {
  const [appError, setAppError] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

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
        
        <Snackbar 
          open={snackbarOpen} 
          autoHideDuration={6000} 
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseSnackbar} severity="error">
            {appError}
          </Alert>
        </Snackbar>
      </Box>
    </AuthProvider>
  );
}

export default App; 