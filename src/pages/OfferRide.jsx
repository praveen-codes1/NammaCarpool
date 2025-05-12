import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Divider,
  CircularProgress,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { GoogleMap, LoadScript, DirectionsRenderer, Autocomplete } from '@react-google-maps/api';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { createAutocompleteOptions, getMapOptions, getRoute, formatAddress, isWithinBangalore } from '../utils/maps';
import { handleNotification } from '../utils/notifications';
import { loadGoogleMaps } from '../utils/loadGoogleMaps';

const libraries = ['places'];

const OfferRide = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [directions, setDirections] = useState(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  
  const sourceAutocomplete = useRef(null);
  const destinationAutocomplete = useRef(null);
  const mapRef = useRef(null);

  const [formData, setFormData] = useState({
    source: '',
    sourceDetails: null,
    destination: '',
    destinationDetails: null,
    date: null,
    time: null,
    seats: '',
    price: '',
    carModel: '',
    carNumber: '',
    recurringDays: {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    },
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

    setFormData(prev => ({
      ...prev,
      source: place.formatted_address,
      sourceDetails: address
    }));

    if (formData.destinationDetails) {
      try {
        const routeResult = await getRoute(
          { lat: address.location.lat, lng: address.location.lng },
          { 
            lat: formData.destinationDetails.location.lat, 
            lng: formData.destinationDetails.location.lng 
          }
        );
        setDirections(routeResult);
      } catch (err) {
        console.error('Error getting route:', err);
      }
    }
  };

  const handleDestinationSelect = async () => {
    const place = destinationAutocomplete.current.getPlace();
    if (!place.geometry) return;

    const address = formatAddress(place);
    if (!isWithinBangalore(address.location.lat, address.location.lng)) {
      setError('Destination location must be within Bangalore');
      return;
    }

    setFormData(prev => ({
      ...prev,
      destination: place.formatted_address,
      destinationDetails: address
    }));

    if (formData.sourceDetails) {
      try {
        const routeResult = await getRoute(
          { 
            lat: formData.sourceDetails.location.lat, 
            lng: formData.sourceDetails.location.lng 
          },
          { lat: address.location.lat, lng: address.location.lng }
        );
        setDirections(routeResult);
      } catch (err) {
        console.error('Error getting route:', err);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRecurringDayChange = (day) => {
    setFormData(prev => ({
      ...prev,
      recurringDays: {
        ...prev.recurringDays,
        [day]: !prev.recurringDays[day]
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);

      if (!formData.sourceDetails || !formData.destinationDetails) {
        setError('Please select valid source and destination locations');
        return;
      }

      // Combine date and time
      const rideDateTime = new Date(formData.date);
      const timeDate = new Date(formData.time);
      rideDateTime.setHours(timeDate.getHours());
      rideDateTime.setMinutes(timeDate.getMinutes());

      // Create base ride document
      const rideData = {
        source: formData.source,
        sourceLocation: formData.sourceDetails.location,
        destination: formData.destination,
        destinationLocation: formData.destinationDetails.location,
        dateTime: rideDateTime,
        seats: parseInt(formData.seats),
        price: parseFloat(formData.price),
        carModel: formData.carModel,
        carNumber: formData.carNumber,
        driverId: currentUser.uid,
        driverEmail: currentUser.email,
        createdAt: new Date(),
        status: 'active',
        isRecurring: isRecurring,
        recurringDays: isRecurring ? formData.recurringDays : null,
      };

      // Add to Firestore
      const rideRef = await addDoc(collection(db, 'rides'), rideData);

      // If this is an update to an existing ride, notify booked passengers
      if (formData.rideId) {
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('rideId', '==', formData.rideId),
          where('status', '==', 'active')
        );
        
        const bookingsSnapshot = await getDocs(bookingsQuery);
        bookingsSnapshot.forEach((doc) => {
          const booking = doc.data();
          handleNotification('RIDE_UPDATE', {
            source: rideData.source,
            destination: rideData.destination,
            dateTime: rideData.dateTime,
            passengerEmail: booking.passengerEmail
          });
        });
      }
      
      // Navigate to rides list
      navigate('/my-rides');
    } catch (err) {
      setError('Failed to create ride offer. Please try again.');
      console.error('Error creating ride:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 4 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>
              Please login to offer a ride
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
          <Paper sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom>
              Offer a Ride
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
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
                    </GoogleMap>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Autocomplete
                    onLoad={autocomplete => {
                      sourceAutocomplete.current = autocomplete;
                    }}
                    onPlaceChanged={handleSourceSelect}
                    options={createAutocompleteOptions()}
                  >
                    <TextField
                      name="source"
                      label="From"
                      fullWidth
                      value={formData.source}
                      onChange={handleChange}
                      required
                      placeholder="Enter pickup location"
                    />
                  </Autocomplete>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Autocomplete
                    onLoad={autocomplete => {
                      destinationAutocomplete.current = autocomplete;
                    }}
                    onPlaceChanged={handleDestinationSelect}
                    options={createAutocompleteOptions()}
                  >
                    <TextField
                      name="destination"
                      label="To"
                      fullWidth
                      value={formData.destination}
                      onChange={handleChange}
                      required
                      placeholder="Enter drop location"
                    />
                  </Autocomplete>
                </Grid>

                <Grid item xs={12} md={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Date"
                      value={formData.date}
                      onChange={(newDate) => setFormData(prev => ({ ...prev, date: newDate }))}
                      renderInput={(params) => <TextField {...params} fullWidth required />}
                      minDate={new Date()}
                    />
                  </LocalizationProvider>
                </Grid>

                <Grid item xs={12} md={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <TimePicker
                      label="Time"
                      value={formData.time}
                      onChange={(newTime) => setFormData(prev => ({ ...prev, time: newTime }))}
                      renderInput={(params) => <TextField {...params} fullWidth required />}
                    />
                  </LocalizationProvider>
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isRecurring}
                        onChange={(e) => setIsRecurring(e.target.checked)}
                      />
                    }
                    label="This is a recurring ride"
                  />
                </Grid>

                {isRecurring && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>
                      Select recurring days:
                    </Typography>
                    <FormGroup row>
                      {Object.keys(formData.recurringDays).map((day) => (
                        <FormControlLabel
                          key={day}
                          control={
                            <Checkbox
                              checked={formData.recurringDays[day]}
                              onChange={() => handleRecurringDayChange(day)}
                            />
                          }
                          label={day.charAt(0).toUpperCase() + day.slice(1)}
                        />
                      ))}
                    </FormGroup>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Available Seats</InputLabel>
                    <Select
                      name="seats"
                      value={formData.seats}
                      onChange={handleChange}
                      label="Available Seats"
                    >
                      {[1, 2, 3, 4, 5, 6].map((num) => (
                        <MenuItem key={num} value={num}>
                          {num}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    name="price"
                    label="Price per Seat"
                    type="number"
                    fullWidth
                    value={formData.price}
                    onChange={handleChange}
                    required
                    InputProps={{
                      startAdornment: '₹',
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    name="carModel"
                    label="Car Model"
                    fullWidth
                    value={formData.carModel}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Honda City"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    name="carNumber"
                    label="Car Number"
                    fullWidth
                    value={formData.carNumber}
                    onChange={handleChange}
                    required
                    placeholder="e.g., KA-01-AB-1234"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    size="large"
                    fullWidth
                    disabled={loading}
                  >
                    {loading ? 'Creating Ride Offer...' : 'Offer Ride'}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Box>
      </Container>
    </LoadScript>
  );
};

export default OfferRide; 