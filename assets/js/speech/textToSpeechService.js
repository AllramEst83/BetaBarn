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

        // Audio queue properties
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.lastQueuedEndTime = 0;
        this.maxQueuedDuration = 10; // For UI normalization
        this.queueObserverInterval = null;
        this.onQueueUpdate = null;
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

            // Initialize single synthesizer for in-memory synthesis (always use queueing)
            const audioConfig = SpeechSDK.AudioConfig.fromStreamOutput(SpeechSDK.PullAudioOutputStream.create());
            this.synthesizer = new SpeechSDK.SpeechSynthesizer(this.speechConfig, audioConfig);
            
            this.isInitialized = true;
            console.log('TextToSpeechService initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize TextToSpeechService:', error);
            throw error;
        }
    }
    
    /**
     * Starts a periodic observer to report queue status.
     * @param {function} onUpdate - Callback function that receives queue status.
     */
    startQueueObserver(onUpdate) {
        if (typeof onUpdate !== 'function') {
            throw new Error('onUpdate callback must be a function.');
        }
        this.onQueueUpdate = onUpdate;

        if (this.queueObserverInterval) {
            clearInterval(this.queueObserverInterval);
        }

        this.queueObserverInterval = setInterval(() => {
            const remaining = Math.max(this.lastQueuedEndTime - this.audioContext.currentTime, 0);
            this.maxQueuedDuration = Math.max(this.maxQueuedDuration, remaining);

            this.onQueueUpdate({
                remaining,
                maxQueuedDuration: this.maxQueuedDuration,
                isQueueActive: remaining > 0.1,
            });
        }, 100);
    }

    /**
     * Stops the queue observer.
     */
    stopQueueObserver() {
        if (this.queueObserverInterval) {
            clearInterval(this.queueObserverInterval);
            this.queueObserverInterval = null;
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
     * Synthesize text and play it through the audio queue.
     * @param {string} text - Text to synthesize.
     * @param {Object} [options] - Synthesis options.
     * @returns {Promise<void>}
     */
    async speakQueued(text, options = {}) {
        if (!text || !text.trim()) {
            return; // Do nothing if text is empty
        }

        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        
        try {
            const audioData = await this.synthesize(text, options);
            const decodedBuffer = await this._decodeAudio(audioData);
            this._enqueueAndPlay(decodedBuffer);
        } catch (error) {
            console.error('Failed to synthesize and queue audio:', error);
            throw error;
        }
    }

    /**
     * Decodes an ArrayBuffer into an AudioBuffer.
     * @param {ArrayBuffer} audioBuffer - The raw audio data.
     * @returns {Promise<AudioBuffer>}
     * @private
     */
    _decodeAudio(audioBuffer) {
        return new Promise((resolve, reject) => {
            if (!(audioBuffer instanceof ArrayBuffer)) {
                return reject(new Error('Input must be an ArrayBuffer.'));
            }
            this.audioContext.decodeAudioData(audioBuffer, resolve, reject);
        });
    }

    /**
     * Schedules the playback of a decoded audio buffer.
     * @param {AudioBuffer} decodedBuffer - The buffer to play.
     * @private
     */
    _enqueueAndPlay(decodedBuffer) {
        const source = this.audioContext.createBufferSource();
        source.buffer = decodedBuffer;
        source.connect(this.audioContext.destination);

        const now = this.audioContext.currentTime;
        const bufferDuration = decodedBuffer.duration;

        // Schedule to play after the last queued item, or now if queue is empty.
        const startTime = Math.max(now, this.lastQueuedEndTime);

        source.start(startTime, 0, bufferDuration);

        // Update the end time of the queue, adding a small buffer to prevent clicks.
        this.lastQueuedEndTime = startTime + bufferDuration + 0.25;
    }

    /**
     * Play synthesized audio using queueing logic
     * @param {string} text - Text to synthesize and play
     * @param {Object} [options] - Synthesis options
     * @returns {Promise<void>} Promise that resolves when audio is queued
     */
    async speak(text, options = {}) {
        if (!this.isInitialized) {
            throw new Error("TextToSpeechService not initialized. Call init() first.");
        }

        // Use the same queueing logic for all audio playback
        return this.speakQueued(text, options);
    }

    /**
     * Stop current speech synthesis and clear the audio queue
     */
    stop() {
        if (this.synthesizer) {
            this.synthesizer.close();
            console.log('Speech synthesis stopped');
        }
        
        // Clear the audio queue by resetting the end time
        this.lastQueuedEndTime = 0;
        
        // Stop any currently playing audio by suspending the audio context temporarily
        if (this.audioContext && this.audioContext.state === 'running') {
            this.audioContext.suspend().then(() => {
                this.audioContext.resume();
            });
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

        // Clean up audio queue resources
        this.stopQueueObserver();
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }

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