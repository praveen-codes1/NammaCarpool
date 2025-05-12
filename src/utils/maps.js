// Bangalore boundaries
const BANGALORE_BOUNDS = {
  north: 13.023577,
  south: 12.823577,
  east: 77.747774,
  west: 77.447774,
};

// Create autocomplete options with Bangalore restrictions
export const createAutocompleteOptions = () => ({
  bounds: new google.maps.LatLngBounds(
    { lat: BANGALORE_BOUNDS.south, lng: BANGALORE_BOUNDS.west },
    { lat: BANGALORE_BOUNDS.north, lng: BANGALORE_BOUNDS.east }
  ),
  componentRestrictions: { country: 'IN' },
  strictBounds: true,
  types: ['geocode', 'establishment'],
});

// Get default map options centered on Bangalore
export const getMapOptions = () => ({
  center: { lat: 12.923577, lng: 77.597774 }, // Bangalore center
  zoom: 12,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  zoomControl: true,
  restriction: {
    latLngBounds: BANGALORE_BOUNDS,
    strictBounds: true,
  },
});

// Get route between two points
export const getRoute = (origin, destination) => {
  const directionsService = new google.maps.DirectionsService();

  return new Promise((resolve, reject) => {
    directionsService.route(
      {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
          resolve(result);
        } else {
          reject(new Error(`Failed to get route: ${status}`));
        }
      }
    );
  });
};

// Format address from Google Places result
export const formatAddress = (place) => {
  const addressComponents = place.address_components;
  const location = place.geometry.location;

  return {
    fullAddress: place.formatted_address,
    location: {
      lat: location.lat(),
      lng: location.lng(),
    },
    placeId: place.place_id,
    components: addressComponents.reduce((acc, component) => {
      const type = component.types[0];
      acc[type] = component.long_name;
      return acc;
    }, {}),
  };
};

// Check if coordinates are within Bangalore bounds
export const isWithinBangalore = (lat, lng) => {
  return (
    lat >= BANGALORE_BOUNDS.south &&
    lat <= BANGALORE_BOUNDS.north &&
    lng >= BANGALORE_BOUNDS.west &&
    lng <= BANGALORE_BOUNDS.east
  );
}; 