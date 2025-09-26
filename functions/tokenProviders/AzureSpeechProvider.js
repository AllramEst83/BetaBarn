import BaseTokenProvider from './BaseTokenProvider.js';

/**
 * Azure Speech Services token provider
 * Handles token acquisition for Azure Cognitive Services Speech API
 */
class AzureSpeechProvider extends BaseTokenProvider {
    constructor(config) {
        super(config);
    }

    validateConfig() {
        if (!this.config.region || !this.config.apiKey) {
            throw new Error('Missing AZURE_REGION or AZURE_API_KEY in configuration');
        }
    }

    getProviderName() {
        return 'azure-speech';
    }

    async getToken() {
        const tokenUrl = `https://${this.config.region}.api.cognitive.microsoft.com/sts/v1.0/issuetoken`;

        console.log(`Fetching Azure Speech token from region: ${this.config.region}`);

        try {
            const tokenRes = await fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': this.config.apiKey
                }
            });

            if (tokenRes.status === 200) {
                const authorizationToken = await tokenRes.text();
                return {
                    token: authorizationToken,
                    region: this.config.region,
                    provider: this.getProviderName(),
                    expiresIn: 600, // Azure tokens typically expire in 10 minutes
                    issuedAt: new Date().toISOString()
                };
            } else {
                throw new Error(`HTTP ${tokenRes.status}: Failed to fetch token`);
            }
        } catch (error) {
            console.error('Azure Speech token error:', error.message);
            throw new Error(`Azure Speech token error: ${error.message}`);
        }
    }
}

export default AzureSpeechProvider;