import BaseTokenProvider from './BaseTokenProvider.js';
import { createClient } from "@deepgram/sdk";

/**
 * Azure Speech Services token provider
 * Handles token acquisition for Azure Cognitive Services Speech API
 */
class DeepGramSpeechProvider extends BaseTokenProvider {
    constructor(config) {
        super(config);
        this.deepgramClient = createClient({ key: config.apiKey });
    }

    validateConfig() {
        if (!this.config.apiKey) {
            throw new Error('Missing DEEPGRAM_KEY in configuration');
        }
    }

    getProviderName() {
        return 'deepgram-speech';
    }

    async getToken() {
        const { result, error } = await this.deepgramClient.auth.grantToken();
        if (error) {
            throw new Error(`Failed to get auth token: ${error.message}`);
        }
        console.log('DeepGram Auth Token:', result.access_token );
        return { access_token: result.access_token, expires_in: result.expires_in} ;
    }
}

// Useage: 
// const tempClient = createClient({ accessToken: result.access_token });

export default DeepGramSpeechProvider;