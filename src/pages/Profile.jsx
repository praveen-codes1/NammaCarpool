import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Button,
  TextField,
  Avatar,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const Profile = () => {
  const navigate = useNavigate();
  const { currentUser, userProfile, updateProfile, error: authError, clearError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    gender: '',
    age: '',
    address: '',
    emergencyContact: '',
    preferredPickupLocations: '',
    preferredDropLocations: '',
  });

  // Load user profile data when available
  useEffect(() => {
    if (userProfile) {
      setFormData({
        fullName: userProfile.fullName || '',
        phone: userProfile.phone || '',
        gender: userProfile.gender || '',
        age: userProfile.age || '',
        address: userProfile.address || '',
        emergencyContact: userProfile.emergencyContact || '',
        preferredPickupLocations: userProfile.preferredPickupLocations || '',
        preferredDropLocations: userProfile.preferredDropLocations || '',
      });
    }
  }, [userProfile]);

  // Clear messages when component unmounts
  useEffect(() => {
    return () => {
      clearError();
      setError('');
      setSuccess(false);
    };
  }, [clearError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Simple validation
    if (!formData.fullName || !formData.phone) {
      setError('Name and phone number are required');
      return;
    }

    try {
      setError('');
      setSuccess(false);
      setLoading(true);
      
      await updateProfile(formData);
      
      setSuccess(true);
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(authError || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // If not logged in, redirect to login
  if (!currentUser) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 4 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>
              Please login to view your profile
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/login')}
            >
              Login
            </Button>
          </Paper>
        </Box>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar
              sx={{ width: 64, height: 64, mr: 2 }}
              alt={formData.fullName || currentUser.email}
              src="/default-avatar.png"
            />
            <Typography variant="h4">
              My Profile
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Profile updated successfully!
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="fullName"
                  label="Full Name"
                  fullWidth
                  value={formData.fullName}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="phone"
                  label="Phone Number"
                  fullWidth
                  value={formData.phone}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="gender"
                  label="Gender"
                  fullWidth
                  value={formData.gender}
                  onChange={handleChange}
                  select
                  SelectProps={{ native: true }}
                >
                  <option value=""></option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="age"
                  label="Age"
                  type="number"
                  fullWidth
                  value={formData.age}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="address"
                  label="Address"
                  fullWidth
                  multiline
                  rows={2}
                  value={formData.address}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="emergencyContact"
                  label="Emergency Contact"
                  fullWidth
                  value={formData.emergencyContact}
                  onChange={handleChange}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Preferences
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  name="preferredPickupLocations"
                  label="Preferred Pickup Locations"
                  fullWidth
                  multiline
                  rows={2}
                  value={formData.preferredPickupLocations}
                  onChange={handleChange}
                  placeholder="Enter common pickup locations (comma separated)"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="preferredDropLocations"
                  label="Preferred Drop Locations"
                  fullWidth
                  multiline
                  rows={2}
                  value={formData.preferredDropLocations}
                  onChange={handleChange}
                  placeholder="Enter common drop locations (comma separated)"
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Profile'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default Profile; 