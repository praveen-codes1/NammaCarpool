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
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  // Only prompt for notification permission after user has been active
  useEffect(() => {
    if (currentUser) {
      // Wait until user has been active for a while 
      // Increased to 60 seconds to reduce interruptions
      const timer = setTimeout(() => {
        setShowNotificationPrompt(true);
      }, 60000); // 60 seconds
      
      return () => clearTimeout(timer);
    }
  }, [currentUser]);

  const handleRequestNotifications = async () => {
    try {
      if (currentUser && showNotificationPrompt) {
        const fcmToken = await requestNotificationPermission();
        
        if (fcmToken) {
          // Store the token only if we got one (even if it's a dummy)
          await setDoc(doc(db, 'users', currentUser.uid), {
            fcmToken,
            email: currentUser.email,
            updatedAt: new Date()
          }, { merge: true });
        }
        
        // No matter what happens, don't show the prompt again for this session
        setShowNotificationPrompt(false);
      }
    } catch (error) {
      // Just log the error but don't show anything to the user
      console.log('Notification setup issue:', error);
      setShowNotificationPrompt(false);
    }
  };

  // Request permissions when prompt is shown
  useEffect(() => {
    if (showNotificationPrompt) {
      handleRequestNotifications();
    }
  }, [showNotificationPrompt]);

  // No visual elements - just handle permissions in the background
  return null;
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