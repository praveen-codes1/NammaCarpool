let googleMapsPromise = null;

export const loadGoogleMaps = () => {
  if (!googleMapsPromise) {
    googleMapsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.addEventListener('load', () => resolve(window.google));
      script.addEventListener('error', (error) => reject(error));
      
      document.head.appendChild(script);
    });
  }
  return googleMapsPromise;
}; 