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
  Autocomplete,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format } from 'date-fns';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { createAutocompleteOptions, getMapOptions, getRoute, formatAddress, isWithinBangalore, searchLocation } from '../utils/maps';
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

const FindRide = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);
  const [bookingSeats, setBookingSeats] = useState(1);
  const [routeGeometry, setRouteGeometry] = useState(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(true);

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

  const [sourceOptions, setSourceOptions] = useState([]);
  const [destinationOptions, setDestinationOptions] = useState([]);

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
    
    setSearchData(prev => ({
      ...prev,
      source: place.display_name,
      sourceDetails: formattedPlace
    }));
    
    console.log('Source location set:', formattedPlace);
    
    if (searchData.destinationDetails && searchData.destinationDetails.location) {
      try {
        const routeResult = await getRoute(
          { lat: place.lat, lng: place.lng },
          searchData.destinationDetails.location
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
    
    setSearchData(prev => ({
      ...prev,
      destination: place.display_name,
      destinationDetails: formattedPlace
    }));
    
    console.log('Destination location set:', formattedPlace);
    
    if (searchData.sourceDetails && searchData.sourceDetails.location) {
      try {
        const routeResult = await getRoute(
          searchData.sourceDetails.location,
          { lat: place.lat, lng: place.lng }
        );
        setRouteGeometry(routeResult.geometry);
      } catch (err) {
        console.error('Error getting route:', err);
        // Don't show the error to the user, just log it
      }
    }
  };

  const calculateDistance = (point1, point2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = point1.lat * Math.PI/180;
    const φ2 = point2.lat * Math.PI/180;
    const Δφ = (point2.lat - point1.lat) * Math.PI/180;
    const Δλ = (point2.lng - point1.lng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  const handleSearch = async () => {
    try {
      setError('');
      setLoading(true);
      console.log('Starting search with data:', searchData);
      
      if (!searchData.sourceDetails || !searchData.destinationDetails) {
        setError('Please select valid source and destination locations');
        setLoading(false);
        return;
      }

      // Check if locations have valid coordinates
      if (!searchData.sourceDetails.location || !searchData.destinationDetails.location) {
        console.error('Invalid location objects:', {
          source: searchData.sourceDetails,
          destination: searchData.destinationDetails
        });
        setError('Location data is invalid. Please reselect your locations.');
        setLoading(false);
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
      
      console.log('Executing Firestore query');
      // Execute query
      const querySnapshot = await getDocs(ridesQuery);
      console.log('Query completed, processing results');
      
      // Process results
      const rides = [];
      querySnapshot.forEach((doc) => {
        try {
          const rideData = doc.data();
          
          // Validate ride data has required location properties
          if (!rideData.sourceLocation || !rideData.destinationLocation) {
            console.warn('Skipping ride with invalid location data:', doc.id);
            return;
          }
          
          // Calculate distance between search points and ride points
          const sourceDistance = calculateDistance(
            searchData.sourceDetails.location,
            rideData.sourceLocation
          );
          
          const destinationDistance = calculateDistance(
            searchData.destinationDetails.location,
            rideData.destinationLocation
          );
          
          // Filter rides within 2km radius of search points
          if (sourceDistance <= 2000 && destinationDistance <= 2000) {
            rides.push({
              id: doc.id,
              ...rideData,
            });
          }
        } catch (itemError) {
          console.error('Error processing ride item:', itemError);
        }
      });
      
      console.log('Found matching rides:', rides.length);
      setSearchResults(rides);

      // Show route on map if results found
      if (rides.length > 0) {
        try {
          console.log('Fetching route between points');
          const routeResult = await getRoute(
            searchData.sourceDetails.location,
            searchData.destinationDetails.location
          );
          setRouteGeometry(routeResult.geometry);
        } catch (err) {
          console.error('Error getting route:', err);
          // Don't fail completely if route fetching fails
        }
      }
    } catch (err) {
      console.error('Search error details:', err);
      setError('Failed to search for rides: ' + (err.message || 'Unknown error'));
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>Find a Ride</Typography>
        
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        
        <Box component="form" noValidate>
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <Autocomplete
                id="source-autocomplete"
                freeSolo
                options={sourceOptions}
                getOptionLabel={(option) => typeof option === 'string' ? option : option.display_name || ''}
                inputValue={searchData.source}
                onInputChange={(event, newInputValue) => {
                  setSearchData(prev => ({
                    ...prev,
                    source: newInputValue
                  }));
                  handleSourceSearch(event, newInputValue);
                }}
                onChange={handleSourceSelect}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Source Location"
                    required
                    fullWidth
                    variant="outlined"
                    placeholder="Enter source location"
                    error={!searchData.sourceDetails && searchData.source.length > 0}
                    helperText={!searchData.sourceDetails && searchData.source.length > 0 ? "Please select a location from the dropdown" : ""}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={5}>
              <Autocomplete
                id="destination-autocomplete"
                freeSolo
                options={destinationOptions}
                getOptionLabel={(option) => typeof option === 'string' ? option : option.display_name || ''}
                inputValue={searchData.destination}
                onInputChange={(event, newInputValue) => {
                  setSearchData(prev => ({
                    ...prev,
                    destination: newInputValue
                  }));
                  handleDestinationSearch(event, newInputValue);
                }}
                onChange={handleDestinationSelect}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Destination Location"
                    required
                    fullWidth
                    variant="outlined"
                    placeholder="Enter destination location"
                    error={!searchData.destinationDetails && searchData.destination.length > 0}
                    helperText={!searchData.destinationDetails && searchData.destination.length > 0 ? "Please select a location from the dropdown" : ""}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Date"
                  value={searchData.date}
                  onChange={(newDate) => setSearchData(prev => ({ ...prev, date: newDate }))}
                  slotProps={{ textField: { fullWidth: true } }}
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
        </Box>
      </Paper>

      {/* Map Display */}
      <Box sx={{ mt: 4 }}>
        <Paper sx={{ p: 4, mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            Available Rides
          </Typography>
          <Box sx={{ height: '300px', width: '100%', mb: 3 }}>
            <MapContainer
              {...getMapOptions()}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {routeGeometry && (
                <GeoJSON data={routeGeometry} style={{ color: '#0066ff', weight: 4 }} />
              )}
              {searchResults.map((ride) => (
                <Marker
                  key={ride.id}
                  position={[ride.sourceLocation.lat, ride.sourceLocation.lng]}
                >
                  <Popup>
                    <Typography variant="subtitle2">Pickup: {ride.source}</Typography>
                    <Typography variant="body2">
                      Available seats: {ride.seats}<br />
                      Price: ₹{ride.price} per seat
                    </Typography>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </Box>
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
  );
};

export default FindRide; 