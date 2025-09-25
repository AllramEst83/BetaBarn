import AccessTokenService from '../token/accessTokenService.js';


class TextToSpeechService {
    constructor() {
        this.speechConfig = null;
        this.synthesizer = null;
        this.accessTokenService = new AccessTokenService();
        this.voicesCache = null;
        this.voicesCacheTimestamp = null;
        this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
        this.isInitialized = false;
    }

    async init() {
        // Check if Speech SDK is available
        if (typeof SpeechSDK === 'undefined') {
            throw new Error('Microsoft Speech SDK not loaded. Please include the Speech SDK script.');
        }    

        try {
            const tokenResponse = await this.accessTokenService.getAccessToken();
            console.log("Fetched token for TTS:", {
                provider: tokenResponse.provider,
                region: tokenResponse.region,
                hasToken: !!tokenResponse.token
            });
            
            // Create speech config using authorization token
            this.speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
                tokenResponse.token, 
                tokenResponse.region
            );

            // Set default output format
            this.speechConfig.speechSynthesisOutputFormat = SpeechSDK.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

            // Initialize synthesizer
            this.synthesizer = new SpeechSDK.SpeechSynthesizer(this.speechConfig);
            
            this.isInitialized = true;
            console.log('TextToSpeechService initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize TextToSpeechService:', error);
            throw error;
        }
    }
    
    /**
     * Get available voices with caching and filtering options
     * @param {string} [languageFilter] - Filter voices by language (e.g., 'en-US', 'en')
     * @param {boolean} [forceRefresh=false] - Force refresh of voice cache
     * @returns {Promise<Array>} Array of available voices
     */
    async getVoices(languageFilter = "en-US", forceRefresh = false) {
        if (!this.isInitialized) {
            throw new Error("TextToSpeechService not initialized. Call init() first.");
        }

        const now = Date.now();
        if (!forceRefresh && this.voicesCache && this.voicesCacheTimestamp &&
            (now - this.voicesCacheTimestamp) < this.cacheTimeout) {
            console.log("Using cached voices");
            return this.filterVoices(this.voicesCache, languageFilter);
        }

        if (!this.synthesizer) {
            throw new Error("Synthesizer not initialized");
        }

        console.log("Fetching voices from Azure Speech Services...");

        try {
            const result = await this.synthesizer.getVoicesAsync();

            if (result.reason !== SpeechSDK.ResultReason.VoicesListRetrieved) {
                throw new Error(`Failed to retrieve voices: ${result.reason}`);
            }

            const voices = result.voices || [];
            this.voicesCache = voices;
            this.voicesCacheTimestamp = now;

            console.log(`Successfully fetched ${voices.length} voices from Azure`);
            return voices;

        } catch (err) {
            console.error("Failed to get voices:", err);
            throw new Error(`Failed to get voices: ${err.message || err}`);
        }
    }

    /**
     * Filter voices by language or other criteria
     * @param {Array} voices - Array of voice objects
     * @param {string} [languageFilter] - Language filter (e.g., 'en-US', 'en')
     * @returns {Array} Filtered voices
     */
    filterVoices(voices, languageFilter = null) {
        if (!languageFilter) {
            return voices;
        }

        return voices.filter(voice => {
            const voiceLocale = voice.locale || '';
            
            // Support both exact match (en-US) and language match (en)
            if (languageFilter.includes('-')) {
                return voiceLocale.toLowerCase() === languageFilter.toLowerCase();
            } else {
                return voiceLocale.toLowerCase().startsWith(languageFilter.toLowerCase() + '-');
            }
        });
    }

    /**
     * Get voices grouped by language
     * @param {boolean} [forceRefresh=false] - Force refresh of voice cache
     * @returns {Promise<Object>} Object with languages as keys and voice arrays as values
     */
    async getVoicesByLanguage(forceRefresh = false) {
        const voices = await this.getVoices(null, forceRefresh);
        const grouped = {};

        voices.forEach(voice => {
            const locale = voice.locale || 'unknown';
            if (!grouped[locale]) {
                grouped[locale] = [];
            }
            grouped[locale].push(voice);
        });

        return grouped;
    }

    /**
     * Get recommended voices for a specific language
     * @param {string} language - Language code (e.g., 'en-US')
     * @param {number} [maxCount=5] - Maximum number of voices to return
     * @returns {Promise<Array>} Array of recommended voices
     */
    async getRecommendedVoices(language, maxCount = 5) {
        const voices = await this.getVoices(language);
        
        // Sort by neural voices first, then by name
       const sortedVoices = voices.sort((a, b) => {
            const aIsNeural = String(a.voiceType || '').toLowerCase().includes('neural');
            const bIsNeural = String(b.voiceType || '').toLowerCase().includes('neural');
            
            if (aIsNeural && !bIsNeural) return -1;
            if (!aIsNeural && bIsNeural) return 1;
            
            return String(a.displayName || a.name || '').localeCompare(String(b.displayName || b.name || ''));
        });

        return sortedVoices.slice(0, maxCount);
    }

    /**
     * Synthesize text to speech
     * @param {string} text - Text to synthesize
     * @param {Object} [options] - Synthesis options
     * @param {string} [options.voice] - Voice name to use
     * @param {string} [options.language] - Language/locale to use
     * @param {number} [options.rate] - Speech rate (0.5 - 2.0)
     * @param {number} [options.pitch] - Speech pitch (0.5 - 2.0)
     * @returns {Promise<ArrayBuffer>} Audio data
     */
    async synthesize(text, options = {}) {
        if (!this.isInitialized) {
            throw new Error("TextToSpeechService not initialized. Call init() first.");
        }

        if (!text || text.trim().length === 0) {
            throw new Error("Text cannot be empty");
        }

        return new Promise((resolve, reject) => {
            try {
                let ssml = text;

                // If options are provided, create SSML
                if (options.voice || options.language || options.rate || options.pitch) {
                    ssml = this.createSSML(text, options);
                }

                console.log('Synthesizing text:', { textLength: text.length, options });

                this.synthesizer.speakSsmlAsync(
                    ssml,
                    (result) => {
                        if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
                            console.log('Text-to-speech synthesis completed successfully');
                            resolve(result.audioData);
                        } else {
                            const errorMsg = `Speech synthesis failed: ${result.reason}`;
                            console.error(errorMsg, result.errorDetails);
                            reject(new Error(`${errorMsg}. ${result.errorDetails || ''}`));
                        }
                    },
                    (error) => {
                        console.error('Speech synthesis error:', error);
                        reject(new Error(`Speech synthesis error: ${error}`));
                    }
                );
            } catch (error) {
                console.error('Error in synthesize method:', error);
                reject(error);
            }
        });
    }

    /**
     * Create SSML (Speech Synthesis Markup Language) from text and options
     * @param {string} text - Text to synthesize
     * @param {Object} options - Synthesis options
     * @returns {string} SSML string
     */
    createSSML(text, options = {}) {
        let ssml = '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">';
        
        if (options.voice) {
            ssml += `<voice name="${options.voice}">`;
        }
        
        if (options.rate || options.pitch) {
            ssml += '<prosody';
            if (options.rate) {
                const rate = Math.max(0.5, Math.min(2.0, options.rate));
                ssml += ` rate="${rate}"`;
            }
            if (options.pitch) {
                const pitch = Math.max(0.5, Math.min(2.0, options.pitch));
                ssml += ` pitch="${pitch}"`;
            }
            ssml += '>';
        }
        
        // Escape XML characters
        const escapedText = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
        
        ssml += escapedText;
        
        if (options.rate || options.pitch) {
            ssml += '</prosody>';
        }
        
        if (options.voice) {
            ssml += '</voice>';
        }
        
        ssml += '</speak>';
        
        return ssml;
    }

    /**
     * Play synthesized audio directly
     * @param {string} text - Text to synthesize and play
     * @param {Object} [options] - Synthesis options
     * @returns {Promise<void>} Promise that resolves when audio finishes playing
     */
    async speak(text, options = {}) {
        if (!this.isInitialized) {
            throw new Error("TextToSpeechService not initialized. Call init() first.");
        }

        return new Promise((resolve, reject) => {
            try {
                let ssml = text;

                // If options are provided, create SSML
                if (options.voice || options.language || options.rate || options.pitch) {
                    ssml = this.createSSML(text, options);
                }

                console.log('Speaking text:', { textLength: text.length, options });

                this.synthesizer.speakSsmlAsync(
                    ssml,
                    (result) => {
                        if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
                            console.log('Speech playback completed successfully');
                            resolve();
                        } else {
                            const errorMsg = `Speech synthesis failed: ${result.reason}`;
                            console.error(errorMsg, result.errorDetails);
                            reject(new Error(`${errorMsg}. ${result.errorDetails || ''}`));
                        }
                    },
                    (error) => {
                        console.error('Speech synthesis error:', error);
                        reject(new Error(`Speech synthesis error: ${error}`));
                    }
                );
            } catch (error) {
                console.error('Error in speak method:', error);
                reject(error);
            }
        });
    }

    /**
     * Stop current speech synthesis
     */
    stop() {
        if (this.synthesizer) {
            this.synthesizer.close();
            console.log('Speech synthesis stopped');
        }
    }

    /**
     * Clean up resources
     */
    dispose() {
        if (this.synthesizer) {
            this.synthesizer.close();
            this.synthesizer = null;
        }
        if (this.speechConfig) {
            this.speechConfig = null;
        }
        this.voicesCache = null;
        this.voicesCacheTimestamp = null;
        this.isInitialized = false;
        console.log('TextToSpeechService disposed');
    }

    /**
     * Check if the service is initialized and ready to use
     * @returns {boolean} True if initialized
     */
    isReady() {
        return this.isInitialized && this.synthesizer !== null;
    }
}

export default TextToSpeechService;

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextToSpeechService;
}