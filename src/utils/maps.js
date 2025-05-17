// Bangalore boundaries
export const BANGALORE_BOUNDS = {
  north: 13.023577,
  south: 12.823577,
  east: 77.747774,
  west: 77.447774,
};

// Create autocomplete options with Bangalore restrictions (for OSM/Leaflet, just return bounds info)
export const createAutocompleteOptions = () => ({
  bounds: [
    [BANGALORE_BOUNDS.south, BANGALORE_BOUNDS.west],
    [BANGALORE_BOUNDS.north, BANGALORE_BOUNDS.east]
  ],
  country: 'IN',
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
  // Validate input parameters
  if (!origin || !destination || !origin.lat || !origin.lng || !destination.lat || !destination.lng) {
    console.error('Invalid parameters for getRoute:', { origin, destination });
    return { geometry: null, distance: 0, duration: 0 }; // Return empty data instead of throwing
  }

  try {
    console.log('Fetching route between', origin, 'and', destination);
    
    // Add timeout to fetch to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Route API error:', response.status, errorText);
      return { geometry: null, distance: 0, duration: 0 };
    }

    const data = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      console.error('No route found between points');
      return { geometry: null, distance: 0, duration: 0 };
    }

    // Validate geometry data before returning
    if (!data.routes[0].geometry || 
        !data.routes[0].geometry.coordinates || 
        !Array.isArray(data.routes[0].geometry.coordinates) ||
        data.routes[0].geometry.coordinates.length === 0) {
      console.error('Invalid geometry data received');
      return { geometry: null, distance: 0, duration: 0 };
    }

    return {
      geometry: {
        type: 'Feature',
        properties: {},
        geometry: data.routes[0].geometry
      },
      distance: data.routes[0].distance || 0,
      duration: data.routes[0].duration || 0
    };
  } catch (error) {
    console.error('Error getting route:', error);
    return { geometry: null, distance: 0, duration: 0 };
  }
};

// Search location using OpenStreetMap Nominatim
export const searchLocation = async (query) => {
  if (!query || typeof query !== 'string' || query.length < 3) {
    console.warn('Invalid search query:', query);
    return [];
  }

  try {
    console.log('Searching for:', query);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&bounded=1&viewbox=${BANGALORE_BOUNDS.west},${BANGALORE_BOUNDS.north},${BANGALORE_BOUNDS.east},${BANGALORE_BOUNDS.south}&countrycodes=in&limit=10`,
      {
        headers: {
          'User-Agent': 'NammaCarpool/1.0'
        }
      }
    );
    
    if (!response.ok) {
      console.error(`Search API error: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to search location: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Raw search results:', data);
    
    if (!Array.isArray(data)) {
      console.error('Invalid response format:', data);
      return [];
    }
    
    // Ensure each place has the required properties and is within Bangalore
    const formattedResults = data
      .filter(place => {
        if (!place || !place.lat || !place.lon) return false;
        const lat = parseFloat(place.lat);
        const lng = parseFloat(place.lon);
        return !isNaN(lat) && !isNaN(lng) && isWithinBangalore(lat, lng);
      })
      .map(place => ({
        display_name: place.display_name || `Location in Bangalore`,
        place_id: place.place_id || `place_${place.osm_id || Math.random().toString(36).substr(2, 9)}`,
        lat: parseFloat(place.lat),
        lng: parseFloat(place.lon),
        location: {
          lat: parseFloat(place.lat),
          lng: parseFloat(place.lon)
        },
        address: place.address || {},
        type: place.type || 'unknown',
        importance: place.importance || 0
      }));
    
    console.log('Formatted results:', formattedResults);
    return formattedResults;
  } catch (error) {
    console.error('Error searching location:', error);
    return [];
  }
};

// Format address from OpenStreetMap Nominatim response
export const formatAddress = (place) => {
  if (!place) {
    console.error('Invalid place object provided to formatAddress');
    return null;
  }
  
  // Make sure we have the required properties
  const lat = parseFloat(place.lat);
  const lng = parseFloat(place.lon || place.lng);
  
  if (isNaN(lat) || isNaN(lng)) {
    console.error('Invalid coordinates in place object', place);
    return null;
  }
  
  try {
    return {
      location: {
        lat: lat,
        lng: lng
      },
      formattedAddress: place.display_name || 'Unknown location',
      placeId: place.place_id || `place_${Math.random().toString(36).substring(2, 9)}`,
      mainText: place.display_name ? place.display_name.split(',')[0] : 'Unknown location',
      secondaryText: place.display_name ? place.display_name.split(',').slice(1).join(',').trim() : 'Bangalore',
      // Include the original properties to ensure compatibility
      ...place
    };
  } catch (error) {
    console.error('Error formatting address:', error, place);
    return null;
  }
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