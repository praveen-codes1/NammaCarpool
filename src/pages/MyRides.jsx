import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

const MyRides = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offeredRides, setOfferedRides] = useState([]);
  const [bookedRides, setBookedRides] = useState([]);

  useEffect(() => {
    fetchRides();
  }, [currentUser]);

  const fetchRides = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch offered rides
      const offeredQuery = query(
        collection(db, 'rides'),
        where('driverId', '==', currentUser.uid)
      );
      const offeredSnapshot = await getDocs(offeredQuery);
      const offeredData = offeredSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOfferedRides(offeredData);

      // Fetch booked rides
      const bookedQuery = query(
        collection(db, 'bookings'),
        where('passengerId', '==', currentUser.uid)
      );
      const bookedSnapshot = await getDocs(bookedQuery);
      const bookedData = [];
      
      for (const bookingDoc of bookedSnapshot.docs) {
        const bookingData = bookingDoc.data();
        const rideDoc = await getDocs(doc(db, 'rides', bookingData.rideId));
        if (rideDoc.exists()) {
          bookedData.push({
            bookingId: bookingDoc.id,
            ...bookingData,
            ride: {
              id: rideDoc.id,
              ...rideDoc.data()
            }
          });
        }
      }
      setBookedRides(bookedData);

    } catch (err) {
      console.error('Error fetching rides:', err);
      setError('Failed to load rides');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRide = async (rideId) => {
    try {
      await updateDoc(doc(db, 'rides', rideId), {
        status: 'cancelled'
      });
      await fetchRides();
    } catch (err) {
      console.error('Error cancelling ride:', err);
      setError('Failed to cancel ride');
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'cancelled'
      });
      await fetchRides();
    } catch (err) {
      console.error('Error cancelling booking:', err);
      setError('Failed to cancel booking');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'completed':
        return 'info';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

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
        <Typography variant="h4" gutterBottom>
          My Rides
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper sx={{ mb: 4 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            variant="fullWidth"
          >
            <Tab label="Rides Offered" />
            <Tab label="Rides Booked" />
          </Tabs>
        </Paper>

        {activeTab === 0 ? (
          <Grid container spacing={3}>
            {offeredRides.map((ride) => (
              <Grid item xs={12} key={ride.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        {ride.source} to {ride.destination}
                      </Typography>
                      <Chip
                        label={ride.status}
                        color={getStatusColor(ride.status)}
                        size="small"
                      />
                    </Box>
                    <Typography color="textSecondary">
                      {format(ride.dateTime.toDate(), 'PPP p')}
                    </Typography>
                    <Typography>
                      Available Seats: {ride.seats}
                    </Typography>
                    <Typography>
                      Price: ₹{ride.price}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    {ride.status === 'active' && (
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleCancelRide(ride.id)}
                      >
                        Cancel Ride
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
            {offeredRides.length === 0 && (
              <Grid item xs={12}>
                <Typography color="textSecondary" align="center">
                  You haven't offered any rides yet.
                </Typography>
              </Grid>
            )}
          </Grid>
        ) : (
          <Grid container spacing={3}>
            {bookedRides.map((booking) => (
              <Grid item xs={12} key={booking.bookingId}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        {booking.ride.source} to {booking.ride.destination}
                      </Typography>
                      <Chip
                        label={booking.status}
                        color={getStatusColor(booking.status)}
                        size="small"
                      />
                    </Box>
                    <Typography color="textSecondary">
                      {format(booking.ride.dateTime.toDate(), 'PPP p')}
                    </Typography>
                    <Typography>
                      Seats Booked: {booking.seats}
                    </Typography>
                    <Typography>
                      Total Price: ₹{booking.seats * booking.ride.price}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Driver: {booking.ride.driverEmail}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    {booking.status === 'active' && (
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleCancelBooking(booking.bookingId)}
                      >
                        Cancel Booking
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
            {bookedRides.length === 0 && (
              <Grid item xs={12}>
                <Typography color="textSecondary" align="center">
                  You haven't booked any rides yet.
                </Typography>
              </Grid>
            )}
          </Grid>
        )}
      </Box>
    </Container>
  );
};

export default MyRides; 