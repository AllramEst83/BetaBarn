import { AUTH_CONFIG, ENV } from '../auth/auth-config.js';

/**
 * Generic API Service for making HTTP requests
 */
class APIService {
    /**
     * Constructor
     * @param {string} baseUrl - Base URL for API endpoints
     * @param {Object} defaultOptions - Default options for requests
     */
    constructor(baseUrl = '', defaultOptions = {}) {
              
        this.baseUrl = ENV.getApiBaseUrl();
        this.defaultOptions = {
            timeout: 30000, // 30 seconds default
            headers: {
                'Content-Type': 'application/json'
            },
            ...defaultOptions
        };
    }

    /**
     * Make an API request
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response object with success, data, and error properties
     */
    async makeRequest(endpoint, options = {}) {
        const url = this.buildUrl(endpoint);
        
        const requestOptions = this.mergeOptions(options);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), requestOptions.timeout);
            
            const response = await fetch(url, {
                ...requestOptions,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            let data;
            try {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    data = await response.text();
                }
            } catch (parseError) {
                console.warn('Failed to parse response body:', parseError);
                data = null;
            }

            if (!response.ok) {
                return { 
                    success: false, 
                    data,
                    error: this.extractErrorMessage(data, response.status),
                    status: response.status
                };
            }

            return { 
                success: true, 
                data,
                status: response.status
            };
            
        } catch (error) {
            console.error(`API request failed for ${endpoint}:`, error);
            
            if (error.name === 'AbortError') {
                return { 
                    success: false, 
                    error: 'Request timeout',
                    status: 408
                };
            }
            
            return { 
                success: false, 
                error: error.message || 'Network error occurred',
                status: 0
            };
        }
    }

    /**
     * Make a GET request
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response object
     */
    async get(endpoint, options = {}) {
        return this.makeRequest(endpoint, { ...options, method: 'GET' });
    }

    /**
     * Make a POST request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body data
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response object
     */
    async post(endpoint, data = null, options = {}) {
        const requestOptions = { ...options, method: 'POST' };
        if (data !== null) {
            requestOptions.body = this.serializeBody(data, options.headers);
        }
        return this.makeRequest(endpoint, requestOptions);
    }

    /**
     * Make a PUT request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body data
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response object
     */
    async put(endpoint, data = null, options = {}) {
        const requestOptions = { ...options, method: 'PUT' };
        if (data !== null) {
            requestOptions.body = this.serializeBody(data, options.headers);
        }
        return this.makeRequest(endpoint, requestOptions);
    }

    /**
     * Make a DELETE request
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response object
     */
    async delete(endpoint, options = {}) {
        return this.makeRequest(endpoint, { ...options, method: 'DELETE' });
    }

    /**
     * Make a PATCH request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body data
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response object
     */
    async patch(endpoint, data = null, options = {}) {
        const requestOptions = { ...options, method: 'PATCH' };
        if (data !== null) {
            requestOptions.body = this.serializeBody(data, options.headers);
        }
        return this.makeRequest(endpoint, requestOptions);
    }

    /**
     * Build full URL from endpoint
     * @param {string} endpoint - API endpoint
     * @returns {string} Full URL
     */
    buildUrl(endpoint) {
        if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
            return endpoint;
        }
        
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        return this.baseUrl ? `${this.baseUrl}/${cleanEndpoint}` : cleanEndpoint;
    }

    /**
     * Merge request options with defaults
     * @param {Object} options - Request options
     * @returns {Object} Merged options
     */
    mergeOptions(options) {
        return {
            ...this.defaultOptions,
            ...options,
            headers: {
                ...this.defaultOptions.headers,
                ...options.headers
            }
        };
    }

    /**
     * Serialize request body based on content type
     * @param {*} data - Data to serialize
     * @param {Object} headers - Request headers
     * @returns {string|FormData} Serialized body
     */
    serializeBody(data, headers = {}) {
        const contentType = headers['Content-Type'] || headers['content-type'] || this.defaultOptions.headers['Content-Type'];
        
        if (data instanceof FormData) {
            return data;
        }
        
        if (contentType && contentType.includes('application/json')) {
            return JSON.stringify(data);
        }
        
        if (contentType && contentType.includes('application/x-www-form-urlencoded')) {
            return new URLSearchParams(data).toString();
        }
        
        // Default to JSON
        return JSON.stringify(data);
    }

    /**
     * Extract error message from response
     * @param {*} data - Response data
     * @param {number} status - HTTP status code
     * @returns {string} Error message
     */
    extractErrorMessage(data, status) {
        if (typeof data === 'string') {
            return data;
        }
        
        if (typeof data === 'object' && data !== null) {
            return data.message || data.error || data.detail || `HTTP error! status: ${status}`;
        }
        
        return `HTTP error! status: ${status}`;
    }

    /**
     * Set default headers for all requests
     * @param {Object} headers - Headers to set
     */
    setDefaultHeaders(headers) {
        this.defaultOptions.headers = {
            ...this.defaultOptions.headers,
            ...headers
        };
    }

    /**
     * Set authorization header
     * @param {string} token - Authorization token
     * @param {string} type - Token type (Bearer, Basic, etc.)
     */
    setAuthToken(token, type = 'Bearer') {
        this.setDefaultHeaders({
            'Authorization': `${type} ${token}`
        });
    }

    /**
     * Remove authorization header
     */
    clearAuthToken() {
        if (this.defaultOptions.headers.Authorization) {
            delete this.defaultOptions.headers.Authorization;
        }
    }

    /**
     * Set base URL
     * @param {string} baseUrl - New base URL
     */
    setBaseUrl(baseUrl) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }
}

export default APIService;

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIService;
}
