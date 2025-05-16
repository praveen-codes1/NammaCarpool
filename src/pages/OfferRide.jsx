import React, { useState, useEffect } from 'react';
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
  Autocomplete
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { getMapOptions, searchLocation, getRoute, formatAddress, isWithinBangalore } from '../utils/maps';
import { handleNotification } from '../utils/notifications';
import { configureMapIcons } from '../utils/mapIcons';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Configure map icons
configureMapIcons();

const OfferRide = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [routeGeometry, setRouteGeometry] = useState(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [sourceOptions, setSourceOptions] = useState([]);
  const [destinationOptions, setDestinationOptions] = useState([]);
  
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

  const handleSourceSearch = async (event, value) => {
    console.log("Source input:", value);
    if (!value || typeof value !== 'string' || value.length < 3) {
      setSourceOptions([]);
      return;
    }
    
    try {
      setError('');
      const results = await searchLocation(value);
      console.log("Search results:", results);
      // Make sure we've got an array
      if (Array.isArray(results) && results.length > 0) {
        setSourceOptions(results);
      } else {
        setSourceOptions([]);
        if (value.length > 3) {
          console.log("No results found for:", value);
        }
      }
    } catch (error) {
      console.error('Error searching source location:', error);
      setSourceOptions([]);
    }
  };

  const handleDestinationSearch = async (event, value) => {
    console.log("Destination input:", value);
    if (!value || typeof value !== 'string' || value.length < 3) {
      setDestinationOptions([]);
      return;
    }
    
    try {
      setError('');
      const results = await searchLocation(value);
      console.log("Destination search results:", results);
      // Make sure we've got an array
      if (Array.isArray(results) && results.length > 0) {
        setDestinationOptions(results);
      } else {
        setDestinationOptions([]);
        if (value.length > 3) {
          console.log("No results found for:", value);
        }
      }
    } catch (error) {
      console.error('Error searching destination location:', error);
      setDestinationOptions([]);
    }
  };

  const handleSourceSelect = async (event, place) => {
    console.log("Selected source place:", place);
    if (!place || typeof place !== 'object') {
      setError('Please select a location from the suggestions.');
      return;
    }
    
    // Ensure place has necessary properties
    if (!place.lat || !place.lng) {
      console.error('Invalid place object:', place);
      setError('Invalid location data. Please try again.');
      return;
    }
    
    if (!isWithinBangalore(place.lat, place.lng)) {
      setError('Source location must be within Bangalore');
      return;
    }
    
    // Ensure location object is properly formatted
    const formattedPlace = {
      ...place,
      location: {
        lat: place.lat,
        lng: place.lng
      }
    };
    
    setFormData(prev => ({
      ...prev,
      source: place.display_name,
      sourceDetails: formattedPlace
    }));
    
    console.log('Source location set:', formattedPlace);
    
    if (formData.destinationDetails && formData.destinationDetails.location) {
      try {
        const routeResult = await getRoute(
          { lat: place.lat, lng: place.lng },
          formData.destinationDetails.location
        );
        setRouteGeometry(routeResult.geometry);
      } catch (err) {
        console.error('Error getting route:', err);
        // Don't show the error to the user, just log it
      }
    }
  };

  const handleDestinationSelect = async (event, place) => {
    console.log("Selected destination place:", place);
    if (!place || typeof place !== 'object') {
      setError('Please select a location from the suggestions.');
      return;
    }
    
    // Ensure place has necessary properties
    if (!place.lat || !place.lng) {
      console.error('Invalid place object:', place);
      setError('Invalid location data. Please try again.');
      return;
    }
    
    if (!isWithinBangalore(place.lat, place.lng)) {
      setError('Destination location must be within Bangalore');
      return;
    }
    
    // Ensure location object is properly formatted
    const formattedPlace = {
      ...place,
      location: {
        lat: place.lat,
        lng: place.lng
      }
    };
    
    setFormData(prev => ({
      ...prev,
      destination: place.display_name,
      destinationDetails: formattedPlace
    }));
    
    console.log('Destination location set:', formattedPlace);
    
    if (formData.sourceDetails && formData.sourceDetails.location) {
      try {
        const routeResult = await getRoute(
          formData.sourceDetails.location,
          { lat: place.lat, lng: place.lng }
        );
        setRouteGeometry(routeResult.geometry);
      } catch (err) {
        console.error('Error getting route:', err);
        // Don't show the error to the user, just log it
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
      console.log('Starting ride offer submission', formData);

      // Validate required fields
      if (!formData.sourceDetails || !formData.destinationDetails) {
        setError('Please select valid source and destination locations');
        setLoading(false);
        return;
      }

      // Validate location objects
      if (!formData.sourceDetails.location || !formData.destinationDetails.location) {
        console.error('Invalid location objects:', {
          source: formData.sourceDetails,
          destination: formData.destinationDetails
        });
        setError('Location data is invalid. Please reselect your locations.');
        setLoading(false);
        return;
      }

      // Validate date and time
      if (!formData.date || !formData.time) {
        setError('Please select valid date and time');
        setLoading(false);
        return;
      }

      // Combine date and time
      const rideDateTime = new Date(formData.date);
      const timeDate = new Date(formData.time);
      rideDateTime.setHours(timeDate.getHours());
      rideDateTime.setMinutes(timeDate.getMinutes());

      // Validate other required fields
      if (!formData.seats || !formData.price || !formData.carModel || !formData.carNumber) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

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

      console.log('Saving ride data to Firestore', rideData);
      // Add to Firestore
      const rideRef = await addDoc(collection(db, 'rides'), rideData);
      console.log('Ride created with ID:', rideRef.id);

      // If this is an update to an existing ride, notify booked passengers
      if (formData.rideId) {
        try {
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
        } catch (notifyError) {
          console.error('Error notifying passengers:', notifyError);
          // Don't fail the whole submission if notifications fail
        }
      }
      
      // Navigate to rides list - wrap in a try-catch to prevent navigation errors
      try {
        console.log('Navigating to my-rides page');
        navigate('/my-rides');
      } catch (navError) {
        console.error('Navigation error:', navError);
        // If navigation fails, at least show a success message
        setError('');
        alert('Ride offer created successfully!');
      }
    } catch (err) {
      console.error('Error details:', err);
      setError('Failed to create ride offer: ' + (err.message || 'Unknown error'));
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

  return (
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
                  <MapContainer
                    {...getMapOptions()}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {formData.sourceDetails && (
                      <Marker 
                        position={[
                          formData.sourceDetails.location.lat,
                          formData.sourceDetails.location.lng
                        ]}
                      >
                        <Popup>Pickup Location</Popup>
                      </Marker>
                    )}
                    {formData.destinationDetails && (
                      <Marker
                        position={[
                          formData.destinationDetails.location.lat,
                          formData.destinationDetails.location.lng
                        ]}
                      >
                        <Popup>Drop-off Location</Popup>
                      </Marker>
                    )}
                    {routeGeometry && (
                      <GeoJSON data={routeGeometry} style={{ color: '#0066ff', weight: 4 }} />
                    )}
                  </MapContainer>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={sourceOptions}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    return option.display_name || '';
                  }}
                  inputValue={formData.source}
                  onInputChange={(event, newInputValue) => {
                    setFormData(prev => ({
                      ...prev,
                      source: newInputValue
                    }));
                    handleSourceSearch(event, newInputValue);
                  }}
                  onChange={handleSourceSelect}
                  value={formData.sourceDetails || null}
                  isOptionEqualToValue={(option, value) => {
                    // For OpenStreetMap results, compare unique identifiers
                    return option && value ? option.place_id === value.place_id : false;
                  }}
                  noOptionsText="Type at least 3 characters to search"
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="From"
                      fullWidth
                      required
                      placeholder="Enter pickup location"
                      error={!!error && error.includes('source')}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={destinationOptions}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    return option.display_name || '';
                  }}
                  inputValue={formData.destination}
                  onInputChange={(event, newInputValue) => {
                    setFormData(prev => ({
                      ...prev,
                      destination: newInputValue
                    }));
                    handleDestinationSearch(event, newInputValue);
                  }}
                  onChange={handleDestinationSelect}
                  value={formData.destinationDetails || null}
                  isOptionEqualToValue={(option, value) => {
                    // For OpenStreetMap results, compare unique identifiers
                    return option && value ? option.place_id === value.place_id : false;
                  }}
                  noOptionsText="Type at least 3 characters to search"
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="To"
                      fullWidth
                      required
                      placeholder="Enter drop-off location"
                      error={!!error && error.includes('destination')}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Date"
                    value={formData.date}
                    onChange={(newDate) => setFormData(prev => ({ ...prev, date: newDate }))}
                    slotProps={{ textField: { fullWidth: true, required: true } }}
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
                    slotProps={{ textField: { fullWidth: true, required: true } }}
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
  );
};

export default OfferRide; 