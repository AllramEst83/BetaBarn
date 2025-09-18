/**
 * Authentication Configuration
 * Centralized configuration for authentication system
 */
export const AUTH_CONFIG = {
    // API Endpoints
    ENDPOINTS: {
        SIGNIN: 'signIn',
        GET_PROJECTS: 'getProjects'
    },
    
    // Storage Keys
    STORAGE_KEYS: {
        IS_AUTHENTICATED: 'bb_is_authenticated',
        USER_DATA: 'bb_user_data',
        AUTH_TOKEN: 'bb_auth_token'
    },
    
    // Routes
    ROUTES: {
        LOGIN: '/assets/pages/auth/login.html',
        HOME: '/index.html',
        UNAUTHORIZED: '/assets/pages/auth/unauthorized.html'
    },
    
    // Messages
    MESSAGES: {
        LOGIN_SUCCESS: 'Login successful! Redirecting...',
        LOGIN_FAILED: 'Invalid credentials. Please try again.',
        NETWORK_ERROR: 'Network error. Please check your connection.',
        SESSION_EXPIRED: 'Your session has expired. Please log in again.',
        UNAUTHORIZED: 'You must be logged in to access this page.'
    },
    
    // Settings
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    AUTO_LOGOUT_WARNING: 5 * 60 * 1000,   // 5 minutes warning
    
    // API Configuration
    API: {
        TIMEOUT: 10000, // 10 seconds
        RETRY_ATTEMPTS: 3
    }
};

/**
 * Environment detection
 */
export const ENV = {
    isDevelopment: window.location.hostname === 'localhost',
    isProduction: window.location.hostname !== 'localhost',
    
    getApiBaseUrl() {
        return this.isDevelopment 
            ? 'http://localhost:8888/.netlify/functions'
            : '/.netlify/functions';
    }
};