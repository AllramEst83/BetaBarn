import { AUTH_CONFIG, ENV } from './auth-config.js';
import APIService from '../api/apiService.js';

/**
 * Authentication API Service
 * Handles all API calls related to authentication
 */
export class AuthApiService {
    constructor() {
        this.baseUrl = ENV.getApiBaseUrl();
        this.apiService = new APIService(this.baseUrl, {
            timeout: AUTH_CONFIG.API.TIMEOUT || 30000
        });
    }

    /**
     * Sign in user
     * @param {string} username - Username
     * @param {string} password - Password
     * @returns {Promise<Object>} Response object
     */
    async signIn(username, password) {
        return await this.apiService.post(AUTH_CONFIG.ENDPOINTS.SIGNIN, {
            username,
            password
        });
    }
}

export default AuthApiService;

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthApiService;
}