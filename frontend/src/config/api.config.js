const API_CONFIG = {
    BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
    SOCKET_URL: process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000',
    MAPS_API_KEY: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    ENDPOINTS: {
        EVENTS: '/events',
        ANALYTICS: '/analytics/events',
        NOTIFICATIONS: '/notifications',
        REGISTER: (eventId) => `/events/${eventId}/register`,
        ACTIVITY: '/events/recent-activity'
    }
};

export default API_CONFIG;
