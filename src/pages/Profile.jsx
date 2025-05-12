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
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const Profile = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profileData, setProfileData] = useState({
    fullName: '',
    phone: '',
    gender: '',
    age: '',
    address: '',
    emergencyContact: '',
    preferredPickupLocations: '',
    preferredDropLocations: '',
  });

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const profileDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (profileDoc.exists()) {
          const data = profileDoc.data();
          setProfileData(prevData => ({
            ...prevData,
            ...data
          }));
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [currentUser, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Validate required fields
      if (!profileData.fullName || !profileData.phone) {
        setError('Name and phone number are required');
        return;
      }

      await setDoc(doc(db, 'users', currentUser.uid), {
        ...profileData,
        email: currentUser.email,
        updatedAt: new Date(),
      }, { merge: true });

      setSuccess('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) {
    return null;
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
              alt={profileData.fullName || currentUser.email}
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
              {success}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="fullName"
                  label="Full Name"
                  fullWidth
                  value={profileData.fullName}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="phone"
                  label="Phone Number"
                  fullWidth
                  value={profileData.phone}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="gender"
                  label="Gender"
                  fullWidth
                  value={profileData.gender}
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
                  value={profileData.age}
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
                  value={profileData.address}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="emergencyContact"
                  label="Emergency Contact"
                  fullWidth
                  value={profileData.emergencyContact}
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
                  value={profileData.preferredPickupLocations}
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
                  value={profileData.preferredDropLocations}
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
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Profile'}
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={logout}
                  >
                    Sign Out
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