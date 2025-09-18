import { AUTH_CONFIG, ENV } from './auth-config.js';

/**
 * Authentication API Service
 * Handles all API calls related to authentication
 */
export class AuthApiService {
    constructor() {
        this.baseUrl = ENV.getApiBaseUrl();
    }

    /**
     * Make an authenticated API request
     */
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}/${endpoint}`;
        
        const defaultOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            timeout: AUTH_CONFIG.API.TIMEOUT
        };

        const requestOptions = { ...defaultOptions, ...options };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), requestOptions.timeout);
            
            const response = await fetch(url, {
                ...requestOptions,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // For authentication endpoints, 401 is a valid response (invalid credentials)
            // We should parse the body even for error status codes
            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (!response.ok) {
                // Return the server's error message for auth-related errors
                return { 
                    success: false, 
                    data,
                    error: data.message || `HTTP error! status: ${response.status}` 
                };
            }

            return { success: true, data };
            
        } catch (error) {
            console.error(`API request failed for ${endpoint}:`, error);
            
            if (error.name === 'AbortError') {
                return { success: false, error: 'Request timeout' };
            }
            
            return { 
                success: false, 
                error: error.message || 'Network error occurred' 
            };
        }
    }

    /**
     * Sign in user
     */
    async signIn(username, password) {
        return await this.makeRequest(AUTH_CONFIG.ENDPOINTS.SIGNIN, {
            body: JSON.stringify({ username, password })
        });
    }

    /**
     * Get projects (no authentication required)
     */
    async getProjects() {
        return await this.makeRequest(AUTH_CONFIG.ENDPOINTS.GET_PROJECTS, {
            method: 'GET'
        });
    }

}