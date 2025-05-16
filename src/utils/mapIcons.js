import L from 'leaflet';

// Define marker icon URLs
const MARKER_ICON_URL = '/map-markers/marker-icon.png';
const MARKER_ICON_2X_URL = '/map-markers/marker-icon-2x.png';
const MARKER_SHADOW_URL = '/map-markers/marker-shadow.png';

// Configure default marker icons
export const configureMapIcons = () => {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: MARKER_ICON_2X_URL,
    iconUrl: MARKER_ICON_URL,
    shadowUrl: MARKER_SHADOW_URL,
  });
}; 