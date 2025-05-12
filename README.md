# NammaCarpool

A carpooling application for Bangalore residents.

## Features

- User authentication
- Offer rides with route visualization
- Find and book rides
- Real-time notifications
- Location-based search
- Recurring rides support

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/NammaCarpool.git
cd NammaCarpool
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your Firebase configuration:
```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
REACT_APP_FIREBASE_VAPID_KEY=your_vapid_key
```

4. Start the development server:
```bash
npm run dev
```

## Build

To create a production build:
```bash
npm run build
```

## Technologies Used

- React
- Firebase (Authentication, Firestore, Cloud Messaging)
- Google Maps API
- Material-UI
- Vite