// Bangalore boundaries
export const BANGALORE_BOUNDS = {
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

// Default map options centered on Bangalore
export const getMapOptions = () => ({
  center: [12.923577, 77.597774], // Bangalore center [lat, lng]
  zoom: 12,
  minZoom: 11,
  maxZoom: 18,
  maxBounds: [
    [BANGALORE_BOUNDS.south, BANGALORE_BOUNDS.west],
    [BANGALORE_BOUNDS.north, BANGALORE_BOUNDS.east]
  ]
});

// Get route between two points using OSRM
export const getRoute = async (origin, destination) => {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`
    );

    if (!response.ok) {
      throw new Error('Failed to get route');
    }

    const data = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }

    return {
      geometry: {
        type: 'Feature',
        properties: {},
        geometry: data.routes[0].geometry
      },
      distance: data.routes[0].distance,
      duration: data.routes[0].duration
    };
  } catch (error) {
    console.error('Error getting route:', error);
    throw error;
  }
};

// Search location using OpenStreetMap Nominatim
export const searchLocation = async (query) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&bounded=1&viewbox=${BANGALORE_BOUNDS.west},${BANGALORE_BOUNDS.north},${BANGALORE_BOUNDS.east},${BANGALORE_BOUNDS.south}&countrycodes=in`
    );
    
    if (!response.ok) {
      throw new Error('Failed to search location');
    }

    const data = await response.json();
    return data.filter(place => isWithinBangalore(parseFloat(place.lat), parseFloat(place.lon)));
  } catch (error) {
    console.error('Error searching location:', error);
    return [];
  }
};

// Format address from OpenStreetMap Nominatim response
export const formatAddress = (place) => {
  return {
    location: {
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon || place.lng)
    },
    formattedAddress: place.display_name,
    placeId: place.place_id,
    mainText: place.display_name.split(',')[0],
    secondaryText: place.display_name.split(',').slice(1).join(',').trim()
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