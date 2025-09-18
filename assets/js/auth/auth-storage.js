import { AUTH_CONFIG } from './auth-config.js';

/**
 * Authentication Storage Service
 * Handles secure storage and retrieval of authentication data
 */
export class AuthStorageService {
    constructor() {
        this.storage = sessionStorage; // Could be configurable to use localStorage
    }

    /**
     * Store authentication data
     */
    setAuthData(userData) {
        try {
            const authData = {
                user: userData,
                timestamp: Date.now(),
                expiresAt: Date.now() + AUTH_CONFIG.SESSION_TIMEOUT
            };

            this.storage.setItem(AUTH_CONFIG.STORAGE_KEYS.IS_AUTHENTICATED, 'true');
            this.storage.setItem(AUTH_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(authData));
            
            return true;
        } catch (error) {
            console.error('Failed to store auth data:', error);
            return false;
        }
    }

    /**
     * Get authentication data
     */
    getAuthData() {
        try {
            const isAuth = this.storage.getItem(AUTH_CONFIG.STORAGE_KEYS.IS_AUTHENTICATED) === 'true';
            const userDataStr = this.storage.getItem(AUTH_CONFIG.STORAGE_KEYS.USER_DATA);

            if (!isAuth || !userDataStr) {
                return null;
            }

            const authData = JSON.parse(userDataStr);
            
            // Check if session has expired
            if (Date.now() > authData.expiresAt) {
                this.clearAuthData();
                return null;
            }

            return authData;
        } catch (error) {
            console.error('Failed to retrieve auth data:', error);
            this.clearAuthData();
            return null;
        }
    }

    /**
     * Clear all authentication data
     */
    clearAuthData() {
        try {
            this.storage.removeItem(AUTH_CONFIG.STORAGE_KEYS.IS_AUTHENTICATED);
            this.storage.removeItem(AUTH_CONFIG.STORAGE_KEYS.USER_DATA);
            this.storage.removeItem(AUTH_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        } catch (error) {
            console.error('Failed to clear auth data:', error);
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const authData = this.getAuthData();
        return authData !== null;
    }

    /**
     * Get current user data
     */
    getCurrentUser() {
        const authData = this.getAuthData();
        return authData ? authData.user : null;
    }

    /**
     * Check if session is about to expire
     */
    isSessionExpiringSoon() {
        const authData = this.getAuthData();
        if (!authData) return false;
        
        const timeUntilExpiry = authData.expiresAt - Date.now();
        return timeUntilExpiry <= AUTH_CONFIG.AUTO_LOGOUT_WARNING;
    }
}