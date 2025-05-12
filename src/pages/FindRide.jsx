import React, { useState, useRef, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format } from 'date-fns';
import { GoogleMap, LoadScript, DirectionsRenderer, Autocomplete, Marker } from '@react-google-maps/api';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { createAutocompleteOptions, getMapOptions, getRoute, formatAddress, isWithinBangalore } from '../utils/maps';
import { handleNotification } from '../utils/notifications';
import { loadGoogleMaps } from '../utils/loadGoogleMaps';

const libraries = ['places'];

const FindRide = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);
  const [bookingSeats, setBookingSeats] = useState(1);
  const [directions, setDirections] = useState(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);

  const sourceAutocomplete = useRef(null);
  const destinationAutocomplete = useRef(null);
  const mapRef = useRef(null);

  const [searchData, setSearchData] = useState({
    source: '',
    sourceDetails: null,
    destination: '',
    destinationDetails: null,
    date: null,
  });

  useEffect(() => {
    loadGoogleMaps()
      .then(() => setMapsLoaded(true))
      .catch(error => console.error('Error loading Google Maps:', error));
  }, []);

  const handleSourceSelect = async () => {
    const place = sourceAutocomplete.current.getPlace();
    if (!place.geometry) return;

    const address = formatAddress(place);
    if (!isWithinBangalore(address.location.lat, address.location.lng)) {
      setError('Source location must be within Bangalore');
      return;
    }

    setSearchData(prev => ({
      ...prev,
      source: place.formatted_address,
      sourceDetails: address
    }));
  };

  const handleDestinationSelect = async () => {
    const place = destinationAutocomplete.current.getPlace();
    if (!place.geometry) return;

    const address = formatAddress(place);
    if (!isWithinBangalore(address.location.lat, address.location.lng)) {
      setError('Destination location must be within Bangalore');
      return;
    }

    setSearchData(prev => ({
      ...prev,
      destination: place.formatted_address,
      destinationDetails: address
    }));
  };

  const handleSearch = async () => {
    try {
      setError('');
      setLoading(true);
      
      if (!searchData.sourceDetails || !searchData.destinationDetails) {
        setError('Please select valid source and destination locations');
        return;
      }

      // Create query
      let ridesQuery = collection(db, 'rides');
      
      // Add date filter if selected
      if (searchData.date) {
        const startDate = new Date(searchData.date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(searchData.date);
        endDate.setHours(23, 59, 59, 999);
        
        ridesQuery = query(ridesQuery, 
          where('dateTime', '>=', startDate),
          where('dateTime', '<=', endDate),
          where('status', '==', 'active')
        );
      } else {
        ridesQuery = query(ridesQuery, where('status', '==', 'active'));
      }
      
      // Execute query
      const querySnapshot = await getDocs(ridesQuery);
      
      // Process results
      const rides = [];
      querySnapshot.forEach((doc) => {
        const rideData = doc.data();
        
        // Calculate distance between search points and ride points
        const sourceDistance = google.maps.geometry.spherical.computeDistanceBetween(
          new google.maps.LatLng(searchData.sourceDetails.location),
          new google.maps.LatLng(rideData.sourceLocation)
        );
        
        const destinationDistance = google.maps.geometry.spherical.computeDistanceBetween(
          new google.maps.LatLng(searchData.destinationDetails.location),
          new google.maps.LatLng(rideData.destinationLocation)
        );
        
        // Filter rides within 2km radius of search points
        if (sourceDistance <= 2000 && destinationDistance <= 2000) {
          rides.push({
            id: doc.id,
            ...rideData,
          });
        }
      });
      
      setSearchResults(rides);

      // Show route on map if results found
      if (rides.length > 0) {
        try {
          const routeResult = await getRoute(
            searchData.sourceDetails.location,
            searchData.destinationDetails.location
          );
          setDirections(routeResult);
        } catch (err) {
          console.error('Error getting route:', err);
        }
      }
    } catch (err) {
      setError('Failed to search for rides. Please try again.');
      console.error('Error searching rides:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookRide = async () => {
    if (!currentUser) {
      setError('Please login to book a ride');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Check if enough seats are available
      if (bookingSeats > selectedRide.seats) {
        setError('Not enough seats available');
        return;
      }

      // Create booking document
      const bookingData = {
        rideId: selectedRide.id,
        passengerId: currentUser.uid,
        passengerEmail: currentUser.email,
        seats: bookingSeats,
        status: 'active',
        createdAt: new Date(),
        source: selectedRide.source,
        destination: selectedRide.destination,
        dateTime: selectedRide.dateTime,
      };

      // Add booking to Firestore
      const bookingRef = await addDoc(collection(db, 'bookings'), bookingData);

      // Update available seats in ride document
      await updateDoc(doc(db, 'rides', selectedRide.id), {
        seats: selectedRide.seats - bookingSeats
      });

      // Get driver details
      const driverDoc = await getDoc(doc(db, 'users', selectedRide.driverId));
      const driverData = driverDoc.data();

      // Send notification to driver
      handleNotification('BOOKING_CONFIRMATION', {
        source: selectedRide.source,
        destination: selectedRide.destination,
        dateTime: selectedRide.dateTime,
        passengerEmail: currentUser.email,
        seats: bookingSeats,
        driverName: driverData?.name || selectedRide.driverEmail
      });

      setShowBookingDialog(false);
      setSelectedRide(null);
      handleSearch(); // Refresh search results
    } catch (err) {
      setError('Failed to book ride. Please try again.');
      console.error('Error booking ride:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!mapsLoaded) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography>Loading maps...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <LoadScript
      googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
      libraries={libraries}
    >
      <Container maxWidth="md">
        <Box sx={{ mt: 4 }}>
          <Paper sx={{ p: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom>
              Find a Ride
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Grid container spacing={3}>
              {/* Map Display */}
              <Grid item xs={12}>
                <Box sx={{ height: '300px', width: '100%', mb: 3 }}>
                  <GoogleMap
                    mapContainerStyle={{ height: '100%', width: '100%' }}
                    options={getMapOptions()}
                    onLoad={map => {
                      mapRef.current = map;
                    }}
                  >
                    {directions && (
                      <DirectionsRenderer
                        directions={directions}
                        options={{
                          suppressMarkers: false,
                          preserveViewport: true,
                        }}
                      />
                    )}
                    {searchResults.map((ride) => (
                      <Marker
                        key={ride.id}
                        position={ride.sourceLocation}
                        title={`Pickup: ${ride.source}`}
                      />
                    ))}
                  </GoogleMap>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Autocomplete
                  onLoad={autocomplete => {
                    sourceAutocomplete.current = autocomplete;
                  }}
                  onPlaceChanged={handleSourceSelect}
                  options={createAutocompleteOptions()}
                >
                  <TextField
                    label="From"
                    fullWidth
                    value={searchData.source}
                    placeholder="Enter pickup location"
                  />
                </Autocomplete>
              </Grid>

              <Grid item xs={12} md={4}>
                <Autocomplete
                  onLoad={autocomplete => {
                    destinationAutocomplete.current = autocomplete;
                  }}
                  onPlaceChanged={handleDestinationSelect}
                  options={createAutocompleteOptions()}
                >
                  <TextField
                    label="To"
                    fullWidth
                    value={searchData.destination}
                    placeholder="Enter drop location"
                  />
                </Autocomplete>
              </Grid>

              <Grid item xs={12} md={4}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Date"
                    value={searchData.date}
                    onChange={(newDate) => setSearchData(prev => ({ ...prev, date: newDate }))}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                    minDate={new Date()}
                  />
                </LocalizationProvider>
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleSearch}
                  fullWidth
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Search Rides'}
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Search Results */}
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom>
              Available Rides
            </Typography>
            {searchResults.length === 0 ? (
              <Typography color="textSecondary" align="center">
                No rides found. Try adjusting your search criteria.
              </Typography>
            ) : (
              <Grid container spacing={3}>
                {searchResults.map((ride) => (
                  <Grid item xs={12} key={ride.id}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6">
                          {ride.source} to {ride.destination}
                        </Typography>
                        <Typography color="textSecondary">
                          {format(ride.dateTime.toDate(), 'PPP p')}
                        </Typography>
                        <Typography>
                          Available Seats: {ride.seats}
                        </Typography>
                        <Typography>
                          Price: ₹{ride.price} per seat
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Driver: {ride.driverEmail}
                        </Typography>
                        <Typography variant="body2">
                          Car: {ride.carModel} ({ride.carNumber})
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          disabled={!currentUser || ride.seats === 0}
                          onClick={() => {
                            setSelectedRide(ride);
                            setShowBookingDialog(true);
                          }}
                        >
                          Book Now
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Box>

        {/* Booking Dialog */}
        <Dialog
          open={showBookingDialog}
          onClose={() => setShowBookingDialog(false)}
        >
          <DialogTitle>Book Ride</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Number of Seats</InputLabel>
                <Select
                  value={bookingSeats}
                  onChange={(e) => setBookingSeats(e.target.value)}
                  label="Number of Seats"
                >
                  {[...Array(selectedRide?.seats || 0)].map((_, index) => (
                    <MenuItem key={index + 1} value={index + 1}>
                      {index + 1}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {selectedRide && (
                <Typography sx={{ mt: 2 }}>
                  Total Price: ₹{bookingSeats * selectedRide.price}
                </Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowBookingDialog(false)}>Cancel</Button>
            <Button
              onClick={handleBookRide}
              variant="contained"
              color="primary"
              disabled={loading}
            >
              {loading ? 'Booking...' : 'Confirm Booking'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LoadScript>
  );
};

export default FindRide; 