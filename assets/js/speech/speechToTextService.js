import AccessTokenService from '../token/accessTokenService.js';

class SpeechToTextService {
    constructor() {
        this.accessTokenService = new AccessTokenService();
        this.speechConfig = null;
        this.recognizer = null;
        this.onResult = null; // Callback for recognition results
        this.onError = null;  // Callback for errors
        this.onEnd = null;    // Callback for recognition end
    }

    async init() {
        // Check if Speech SDK is available
        if (typeof SpeechSDK === 'undefined') {
            throw new Error('Microsoft Speech SDK not loaded. Please include the Speech SDK script.');
        }       

        // Get access token
        const tokenResponse = await this.accessTokenService.getAccessToken();
        console.log("Fetched token from accessTokenService:", {
            provider: tokenResponse.provider,
            region: tokenResponse.region,
            hasToken: !!tokenResponse.token,
            tokenLength: tokenResponse.token ? tokenResponse.token.length : 0
        });
        
        // Create speech config using authorization token (our function returns an auth token, not subscription key)
        this.speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
            tokenResponse.token, 
            tokenResponse.region
        );
        
        // Set additional properties for better recognition
        this.speechConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, "5000");
        this.speechConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, "5000");
        
        console.log('Speech config initialized successfully');
    }

    async setupSpeechRecognizer(sourceLanguage = "en-US") {
        if (!this.speechConfig) {
            throw new Error('Speech service not initialized. Call init() first.');
        }

        // Set the recognition language
        this.speechConfig.speechRecognitionLanguage = sourceLanguage;
        
        // Create audio config for microphone input
        const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
        
        // Create the speech recognizer
        this.recognizer = new SpeechSDK.SpeechRecognizer(this.speechConfig, audioConfig);

        // Set up event handlers
        this.recognizer.recognizing = (s, e) => {
            if (e.result.reason === SpeechSDK.ResultReason.RecognizingSpeech) {
                console.log(`RECOGNIZING: Text=${e.result.text}`);
                if (this.onResult) {
                    this.onResult(e.result.text, false); // Interim result
                }
            }
        };

        this.recognizer.recognized = (s, e) => {
            if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                console.log(`RECOGNIZED: Text=${e.result.text}`);
                if (this.onResult) {
                    this.onResult(e.result.text, true); // Final result
                }
            } else if (e.result.reason === SpeechSDK.ResultReason.NoMatch) {
                console.log("NOMATCH: Speech could not be recognized.");
            }
        };

        this.recognizer.canceled = (s, e) => {
            console.log(`CANCELED: Reason=${e.reason}`);
            
            if (e.reason === SpeechSDK.CancellationReason.Error) {
                console.log(`CANCELED: ErrorCode=${e.errorCode}`);
                console.log(`CANCELED: ErrorDetails=${e.errorDetails}`);
                
                if (this.onError) {
                    this.onError(`Recognition canceled: ${e.errorDetails}`);
                }
            }
            
            if (this.onEnd) {
                this.onEnd();
            }
        };

        this.recognizer.sessionStarted = (s, e) => {
            console.log(`SESSION STARTED: SessionId=${e.sessionId}`);
        };

        this.recognizer.sessionStopped = (s, e) => {
            console.log(`SESSION STOPPED: SessionId=${e.sessionId}`);
            if (this.onEnd) {
                this.onEnd();
            }
        };

        this.recognizer.speechStartDetected = (s, e) => {
            console.log("Speech start detected.");
        };

        this.recognizer.speechEndDetected = (s, e) => {
            console.log("Speech end detected.");
        };
    }

    startContinuousRecognition() {
        return new Promise((resolve, reject) => {
            if (this.recognizer) {
                this.recognizer.startContinuousRecognitionAsync(
                    () => { 
                        console.log("Continuous recognition started"); 
                        resolve();
                    },
                    (err) => { 
                        console.error("Failed to start recognition:", err); 
                        reject(new Error(err));
                    }
                );
            } else {
                reject(new Error("Recognizer not initialized"));
            }
        });
    }

    stopContinuousRecognition() {
        return new Promise((resolve, reject) => {
            if (this.recognizer) {
                this.recognizer.stopContinuousRecognitionAsync(
                    () => { 
                        console.log("Continuous recognition stopped"); 
                        resolve();
                    },
                    (err) => { 
                        console.error("Failed to stop recognition:", err); 
                        reject(new Error(err));
                    }
                );
            } else {
                reject(new Error("Recognizer not initialized"));
            }
        });
    }

    close() {
        if (this.recognizer) {
            this.recognizer.close();
            this.recognizer = null;
            console.log("Recognizer closed.");
        }
        if (this.speechConfig) {
            this.speechConfig = null;
            console.log("Speech config cleared.");
        }   
    }
}

export default SpeechToTextService;

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpeechToTextService;
}