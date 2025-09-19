const AzureSpeechProvider = require('../tokenProviders/AzureSpeechProvider');

/**
 * Main access token service that manages multiple token providers
 * Provides a unified interface for getting tokens from different providers
 */
class AccessTokenService {
    constructor() {
        this.providers = new Map();
        this.defaultProvider = null;
        this.initializeProviders();
    }

    /**
     * Initialize all available token providers based on environment configuration
     */
    initializeProviders() {
        console.log('Initializing token providers...');

        // Register Azure Speech provider if configured
        if (process.env.AZURE_REGION && process.env.AZURE_API_KEY) {
            try {
                const azureProvider = new AzureSpeechProvider({
                    region: process.env.AZURE_REGION,
                    apiKey: process.env.AZURE_API_KEY
                });
                this.providers.set('azure-speech', azureProvider);
                
                // Set as default provider if none is set
                if (!this.defaultProvider) {
                    this.defaultProvider = 'azure-speech';
                }
                
                console.log('Azure Speech provider initialized successfully');
            } catch (error) {
                console.error('Failed to initialize Azure Speech provider:', error.message);
            }
        } else {
            console.warn('Azure Speech provider not configured (missing AZURE_REGION or AZURE_API_KEY)');
        }

        // Future providers can be added here
        // Example for Google Speech:
        // if (process.env.GOOGLE_API_KEY) {
        //     try {
        //         const googleProvider = new GoogleSpeechProvider({
        //             apiKey: process.env.GOOGLE_API_KEY
        //         });
        //         this.providers.set('google-speech', googleProvider);
        //         console.log('Google Speech provider initialized successfully');
        //     } catch (error) {
        //         console.error('Failed to initialize Google Speech provider:', error.message);
        //     }
        // }

        console.log(`Initialized ${this.providers.size} token provider(s)`);
    }

    /**
     * Get list of available provider names
     * @returns {string[]} Array of provider names
     */
    getAvailableProviders() {
        return Array.from(this.providers.keys());
    }

    /**
     * Check if a specific provider is available
     * @param {string} providerName - Name of the provider
     * @returns {boolean} True if provider is available
     */
    hasProvider(providerName) {
        return this.providers.has(providerName);
    }

    /**
     * Get a token from the specified provider
     * @param {string} [providerName] - Name of the provider (uses default if not specified)
     * @returns {Promise<Object>} Token response object
     */
    async getToken(providerName = null) {
        const targetProvider = providerName || this.defaultProvider;
        
        if (!targetProvider) {
            throw new Error('No token providers are available. Please check your configuration.');
        }

        const provider = this.providers.get(targetProvider);
        
        if (!provider) {
            const available = this.getAvailableProviders();
            throw new Error(
                `Provider '${targetProvider}' not found or not configured. ` +
                `Available providers: ${available.length > 0 ? available.join(', ') : 'none'}`
            );
        }

        console.log(`Getting token from provider: ${targetProvider}`);
        return await provider.getToken();
    }

    /**
     * Get information about all providers
     * @returns {Object} Provider information
     */
    getProviderInfo() {
        const info = {};
        
        for (const [name, provider] of this.providers) {
            info[name] = {
                name: provider.getProviderName(),
                configured: provider.isConfigured(),
                isDefault: name === this.defaultProvider
            };
        }
        
        return {
            providers: info,
            defaultProvider: this.defaultProvider,
            totalProviders: this.providers.size
        };
    }
}

module.exports = AccessTokenService;