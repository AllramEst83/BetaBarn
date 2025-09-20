/**
 * Client-side access token service
 * Handles communication with the Netlify function to get access tokens
 */
class AccessTokenService {
    constructor() {
        this.baseUrl = '/.netlify/functions';
        this.cache = new Map();
        this.cacheTimeout = 9 * 60 * 1000; // 9 minutes (tokens typically expire in 10 minutes)
    }

    /**
     * Get an access token from the specified provider
     * @param {string} [provider] - The provider to use (optional, uses server default if not specified)
     * @returns {Promise<Object>} Token response object
     */
    async getAccessToken(provider = null) {
        const cacheKey = provider || 'default';
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            const now = Date.now();
            
            if (now - cached.timestamp < this.cacheTimeout) {
                console.log(`Using cached token for provider: ${cacheKey}`);
                return cached.data;
            } else {
                console.log(`Cache expired for provider: ${cacheKey}`);
                this.cache.delete(cacheKey);
            }
        }

        try {
            const url = provider 
                ? `${this.baseUrl}/getAccessToken?provider=${encodeURIComponent(provider)}`
                : `${this.baseUrl}/getAccessToken`;
            
            console.log(`Fetching access token from: ${url}`);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.error || 
                    `HTTP ${response.status}: Failed to fetch access token`
                );
            }

            const data = await response.json();
            
            // Cache the successful response
            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });

            console.log(`Successfully retrieved token from provider: ${data.provider || 'default'}`);
            return data;

        } catch (error) {
            console.error('Access token service error:', error.message);
            throw error;
        }
    }

    /**
     * Get list of available providers from the server
     * @returns {Promise<string[]>} Array of available provider names
     */
    async getAvailableProviders() {
        try {
            const response = await fetch(`${this.baseUrl}/getAccessToken`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Failed to fetch providers`);
            }

            const data = await response.json();
            return data.availableProviders || [];

        } catch (error) {
            console.error('Failed to fetch available providers:', error.message);
            return [];
        }
    }

    /**
     * Clear the token cache
     * @param {string} [provider] - Specific provider to clear, or all if not specified
     */
    clearCache(provider = null) {
        if (provider) {
            this.cache.delete(provider);
            console.log(`Cleared cache for provider: ${provider}`);
        } else {
            this.cache.clear();
            console.log('Cleared all token cache');
        }
    }

    /**
     * Check if a token is cached for a specific provider
     * @param {string} [provider] - Provider name (or 'default')
     * @returns {boolean} True if cached and not expired
     */
    isCached(provider = 'default') {
        if (!this.cache.has(provider)) {
            return false;
        }

        const cached = this.cache.get(provider);
        const now = Date.now();
        return (now - cached.timestamp) < this.cacheTimeout;
    }
}

export default AccessTokenService;

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AccessTokenService;
}