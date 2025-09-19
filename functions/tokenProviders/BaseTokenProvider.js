/**
 * Abstract base class for token providers
 * All token providers must extend this class and implement its methods
 */
class BaseTokenProvider {
    constructor(config) {
        this.config = config;
        this.validateConfig();
    }

    /**
     * Get an access token from the provider
     * @returns {Promise<Object>} Token response object
     */
    async getToken() {
        throw new Error('getToken method must be implemented by provider');
    }

    /**
     * Validate the provider configuration
     * @throws {Error} If configuration is invalid
     */
    validateConfig() {
        throw new Error('validateConfig method must be implemented by provider');
    }

    /**
     * Get the provider name
     * @returns {string} Provider name
     */
    getProviderName() {
        throw new Error('getProviderName method must be implemented by provider');
    }

    /**
     * Check if the provider is properly configured
     * @returns {boolean} True if configured
     */
    isConfigured() {
        try {
            this.validateConfig();
            return true;
        } catch {
            return false;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseTokenProvider;
} else {
    window.BaseTokenProvider = BaseTokenProvider;
}