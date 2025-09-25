import AuthService from '../auth/authService.js';
import ThemeService from '../theme/theme-service.js';
import SpeechToTextService from '../speech/speechToTextService.js';
import TextToSpeechService from '../speech/textToSpeechService.js';
import AccessTokenService from '../token/accessTokenService.js';

class LLMInterpreter {
    constructor(options = {}) {
        this.options = options;
        this.speechService = new SpeechToTextService();
        this.accessTokenService = new AccessTokenService();
        this.authService = new AuthService();
        this.themeService = new ThemeService();
        this.textToSpeechService = new TextToSpeechService();
        
        this.isRecognizing = false;
        this.isTTSInitialized = false;
        this.voices = null;
        this.statusCallback = options.statusCallback || null;
        this.resultCallback = options.resultCallback || null;
        this.authLoadingOverlay = document.getElementById('auth-loading-overlay');
        this.mainContent = document.getElementById('main-content');
        
        this.currentLanguage = 'en-US';
        this.init();
    }

        async init() {
        try {
            // Show auth loading spinner
            this.showAuthLoading();
            
            // Add a small delay to show the beautiful spinner
            await this.delay(1500);
            
            // Check authentication first
            await this.checkLoginAccessAuth();
            
            // Hide loading spinner and show main content
            await this.hideAuthLoadingAndShowContent();
            
        } catch (error) {
            console.error('Failed to initialize about page:', error);
            // Hide loading spinner even on error
            this.hideAuthLoading();
        }
    }

    updateStatus(message, type = 'info') {
        console.log(`[LLM Interpreter ${type.toUpperCase()}] ${message}`);
        if (this.statusCallback) {
            this.statusCallback(message, type);
        }
    }

   async getAvailableLanguages() {
        await this.textToSpeechService.init();
        this.languages = await this.textToSpeechService.getVoices();
        return this.languages;
    }

        setLanguage(languageCode) {
            const langObj = this.languages.find(l => l.locale === languageCode);

            if (langObj) {
                this.currentLanguage = langObj.locale;
                this.updateStatus(`Language set to: ${langObj.localeName || langObj.locale}`, "info");
                return true;
            }

            this.updateStatus(`Invalid language code: ${languageCode}`, "error");
            return false;
        }


    getSourceLanguage() {
        return this.currentLanguage;
    }

    async initializeAccessToken() {
        try {
            if (!this.accessTokenService) {
                throw new Error('Access token service not available');
            }
            
            this.updateStatus('Initializing speech services...', 'loading');
            const tokenResponse = await this.accessTokenService.getAccessToken();
            
            this.updateStatus(`Speech service initialized (${tokenResponse.provider})`, 'success');
            return tokenResponse;
            
        } catch (error) {
            this.updateStatus(`Failed to initialize speech services: ${error.message}`, 'error');
            throw error;
        }
    }

    async initializeTextToSpeech() {
        if (this.isTTSInitialized && this.textToSpeechService?.isReady()) {
            return this.textToSpeechService;
        }

        try {
            this.updateStatus('Initializing text-to-speech service...', 'loading');
            await this.textToSpeechService.init();
            this.isTTSInitialized = true;
            
            this.updateStatus('Text-to-speech service initialized successfully', 'success');
            return this.textToSpeechService;
            
        } catch (error) {
            this.updateStatus(`Failed to initialize text-to-speech: ${error.message}`, 'error');
            this.isTTSInitialized = false;
            throw error;
        }
    }

    async getAvailableVoices(languageFilter = null, forceRefresh = false) {
        try {
            await this.initializeTextToSpeech();
            
            this.updateStatus('Loading available voices...', 'loading');
            const voices = await this.textToSpeechService.getVoices(languageFilter, forceRefresh);
            
            this.voices = voices;
            this.updateStatus(`Loaded ${voices.length} voices${languageFilter ? ` for ${languageFilter}` : ''}`, 'success');
            
            return voices;
            
        } catch (error) {
            this.updateStatus(`Failed to load voices: ${error.message}`, 'error');
            throw error;
        }
    }

    async getRecommendedVoices(language = null, maxCount = 5) {
        try {
            await this.initializeTextToSpeech();
            
            const targetLanguage = language || this.currentLanguage;
            const voices = await this.textToSpeechService.getRecommendedVoices(targetLanguage, maxCount);
            
            this.updateStatus(`Found ${voices.length} recommended voices for ${targetLanguage}`, 'success');
            return voices;
            
        } catch (error) {
            this.updateStatus(`Failed to get recommended voices: ${error.message}`, 'error');
            throw error;
        }
    }

    async startSpeechRecognition() {
        if (this.isRecognizing) {
            this.updateStatus('Speech recognition is already running', 'warning');
            return;
        }

        try {
            this.updateStatus('Starting speech recognition...', 'loading');
            
            // Initialize access token first
            await this.initializeAccessToken();

            await this.speechService.init();
            
            this.updateStatus('Requesting microphone permission...', 'loading');
            
            // Setup speech recognizer with current language
            await this.speechService.setupSpeechRecognizer(this.getSourceLanguage());
            
            // Set up event handlers
            this.speechService.onResult = async (text, isFinal) => {
                if (isFinal) {
                    this.updateStatus(`Recognized: "${text}"`, 'success');
                    if (this.resultCallback) {
                        this.resultCallback(text, isFinal);
                        
                        const recommendedVoices = await this.textToSpeechService.getRecommendedVoices(this.currentLanguage, 1);
                        const voiceName = recommendedVoices.length > 0 ? recommendedVoices[0].shortName : undefined;

                        this.textToSpeechService.speak(text, { 
                            language: this.currentLanguage, 
                            voice: voiceName 
                        });
                    }
                } else {
                    this.updateStatus(`Recognizing... "${text}"`, 'info');
                    if (this.resultCallback) {
                        this.resultCallback(text, isFinal);
                    }
                }
            };
            
            this.speechService.onError = (error) => {
                this.updateStatus(`Speech recognition error: ${error}`, 'error');
                this.isRecognizing = false;
            };
            
            this.speechService.onEnd = () => {
                this.updateStatus('Speech recognition stopped', 'info');
                this.isRecognizing = false;
            };
            
            // Start continuous recognition
            await this.speechService.startContinuousRecognition();
            this.isRecognizing = true;
            
            // Get language display name
            let languageName = this.currentLanguage;
            if (this.languages) {
                const langObj = this.languages.find(l => l.locale === this.currentLanguage);
                languageName = langObj ? (langObj.localeName || langObj.locale) : this.currentLanguage;
            }
            
            this.updateStatus(`🎤 Listening in ${languageName}...`, 'success');
            
        } catch (error) {
            this.updateStatus(`Failed to start speech recognition: ${error.message}`, 'error');
            this.isRecognizing = false;
            throw error;
        }
    }

    async stopSpeechRecognition() {
        if (!this.isRecognizing) {
            this.updateStatus('Speech recognition is not running', 'warning');
            return;
        }

        try {
            this.updateStatus('Stopping speech recognition...', 'loading');
            
            if (this.speechService) {
                await this.speechService.stopContinuousRecognition();
            }
            
            this.isRecognizing = false;
            this.updateStatus('🛑 Speech recognition stopped', 'info');
            
        } catch (error) {
            this.updateStatus(`Error stopping speech recognition: ${error.message}`, 'error');
            this.isRecognizing = false;
            throw error;
        }
    }

    isRecognizingAudio() {
        return this.isRecognizing;
    }

    async speakText(text, options = {}) {
        try {
            if (!text || text.trim().length === 0) {
                throw new Error('Text cannot be empty');
            }

            await this.initializeTextToSpeech();
            
            // Use current language if no language specified
            const speechOptions = {
                language: this.currentLanguage,
                ...options
            };

            this.updateStatus(`Speaking: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`, 'info');
            
            await this.textToSpeechService.speak(text, speechOptions);
            
            this.updateStatus('Speech completed', 'success');
            
        } catch (error) {
            this.updateStatus(`Failed to speak text: ${error.message}`, 'error');
            throw error;
        }
    }

    async synthesizeToAudio(text, options = {}) {
        try {
            if (!text || text.trim().length === 0) {
                throw new Error('Text cannot be empty');
            }

            await this.initializeTextToSpeech();
            
            // Use current language if no language specified
            const speechOptions = {
                language: this.currentLanguage,
                ...options
            };

            this.updateStatus(`Synthesizing audio for: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`, 'info');
            
            const audioData = await this.textToSpeechService.synthesize(text, speechOptions);
            
            this.updateStatus('Audio synthesis completed', 'success');
            return audioData;
            
        } catch (error) {
            this.updateStatus(`Failed to synthesize audio: ${error.message}`, 'error');
            throw error;
        }
    }

    stopSpeaking() {
        try {
            if (this.textToSpeechService && this.isTTSInitialized) {
                this.textToSpeechService.stop();
                this.updateStatus('Speech stopped', 'info');
            }
        } catch (error) {
            this.updateStatus(`Error stopping speech: ${error.message}`, 'error');
        }
    }

    isTTSReady() {
        return this.isTTSInitialized && this.textToSpeechService?.isReady();
    }

    async close() {
        try {
            if (this.isRecognizing) {
                await this.stopSpeechRecognition();
            }
            
            if (this.speechService) {
                this.speechService.close();
                this.speechService = null;
            }

            if (this.textToSpeechService && this.isTTSInitialized) {
                this.textToSpeechService.dispose();
                this.textToSpeechService = null;
                this.isTTSInitialized = false;
            }
            
            this.updateStatus('LLM Interpreter closed', 'info');
            
        } catch (error) {
            this.updateStatus(`Error closing LLM Interpreter: ${error.message}`, 'error');
        }
    }

    // Public API for UI integration
    async toggleRecognition() {
        if (this.isRecognizing) {
            await this.stopSpeechRecognition();
        } else {
            await this.startSpeechRecognition();
        }
        return this.isRecognizing;
    }

    // Initialize both STT and TTS services
    async initializeAllServices() {
        try {
            this.updateStatus('Initializing all speech services...', 'loading');
            
            // Initialize access token first
            await this.initializeAccessToken();
            
            // Initialize TTS service
            await this.initializeTextToSpeech();
            
            this.updateStatus('All speech services initialized successfully', 'success');
            
        } catch (error) {
            this.updateStatus(`Failed to initialize services: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Initialize authentication
     */
    async checkLoginAccessAuth() {
        // Check if user needs to be redirected to login
        if (!this.authService.requireAuth()) {
            return; // Will redirect to login
        }

        // Check if authenticated user is on login page
        this.authService.checkLoginAccess();

        // If we reach here, user is authenticated and on a valid page
        this.addUserInfo();
    }

        /**
     * Show auth loading spinner
     */
    showAuthLoading() {
        if (this.authLoadingOverlay) {
            this.authLoadingOverlay.style.display = 'flex';
            this.authLoadingOverlay.classList.remove('fade-out');
        }
        if (this.mainContent) {
            this.mainContent.style.display = 'none';
        }
    }

    async hideAuthLoadingAndShowContent() {
        return new Promise((resolve) => {
            if (this.authLoadingOverlay) {
                this.authLoadingOverlay.classList.add('fade-out');
                setTimeout(() => {
                    this.authLoadingOverlay.style.display = 'none';
                    if (this.mainContent) {
                        this.mainContent.style.display = 'block';
                    }
                    resolve();
                }, 500); // Match the CSS transition duration
            } else {
                if (this.mainContent) {
                    this.mainContent.style.display = 'block';
                }
                resolve();
            }
        });
    }

        /**
     * Utility function to add delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

        /**
     * Add user information to navbar
     */
    addUserInfo() {
        const navbarCollapse = document.querySelector('#navbarNav');
        if (!navbarCollapse) return;

        const user = this.authService.getCurrentUser();
        if (!user) return;

        // Remove existing auth UI
        const existingAuthUI = navbarCollapse.querySelector('.auth-ui');
        if (existingAuthUI) {
            existingAuthUI.remove();
        }

        // Find the theme toggle button
        const themeToggle = navbarCollapse.querySelector('.theme-toggle');
        
        // Create auth UI container
        const authUI = document.createElement('div');
        authUI.className = 'auth-ui d-flex align-items-center ms-auto';
        authUI.innerHTML = `
            <div class="d-flex align-items-center flex-wrap gap-2">
                <!-- User info - responsive text -->
                <span class="navbar-text d-none d-md-inline-block me-2">
                    <i class="fas fa-user me-1"></i>
                    Welcome, <strong>${user.username}</strong>!
                </span>
                
                <!-- Mobile user info - compact -->
                <span class="navbar-text d-md-none me-2">
                    <i class="fas fa-user me-1"></i>
                    <strong>${user.username}</strong>
                </span>
                
                <!-- Button group for theme toggle and logout -->
                <div class="btn-group" role="group">
                    <button class="btn btn-outline-secondary btn-sm theme-toggle-auth" id="themeToggleAuth" title="Toggle Theme">
                        🌙
                    </button>
                    <button class="btn btn-outline-primary btn-sm" id="logoutBtn">
                        <i class="fas fa-sign-out-alt d-md-none"></i>
                        <span class="d-none d-md-inline">
                            <i class="fas fa-sign-out-alt me-1"></i>
                            Logout
                        </span>
                        <span class="d-md-none ms-1">Logout</span>
                    </button>
                </div>
            </div>
        `;

        // Insert before the original theme toggle or at the end
        if (themeToggle) {
            // Hide the original theme toggle since we're adding our own
            themeToggle.style.display = 'none';
            themeToggle.parentNode.insertBefore(authUI, themeToggle);
        } else {
            navbarCollapse.appendChild(authUI);
        }

        // Add logout functionality
        const logoutBtn = authUI.querySelector('#logoutBtn');
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });

        // Add theme toggle functionality to the new button
        const themeToggleAuth = authUI.querySelector('#themeToggleAuth');
        if (themeToggleAuth && this.themeService) {
            // Set initial icon based on current theme
            const currentTheme = this.themeService.getCurrentTheme();
            themeToggleAuth.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
            
            // Add click handler that uses the theme service
            themeToggleAuth.addEventListener('click', () => {
                this.themeService.toggleTheme();
            });
        }
    }

    /**
     * Handle user logout
     */
    handleLogout() {
        this.authService.logout();
    }
}

// Export for both module systems and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LLMInterpreter;
} else {
    window.LLMInterpreter = LLMInterpreter;
}