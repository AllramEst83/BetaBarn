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
        this.languages = null;
        this.statusCallback = options.statusCallback || null;
        this.resultCallback = options.resultCallback || null;
        this.authLoadingOverlay = document.getElementById('auth-loading-overlay');
        this.mainContent = document.getElementById('main-content');
        
        this.currentLanguage = 'en-US';
        
        // DOM element references
        this.elements = {};
        
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
            
            // Initialize DOM elements and event listeners
            this.initializeDOMElements();
            await this.populateLanguages();
            this.setupEventListeners();
            this.initializeTranslationToggle();
            
            // Hide loading spinner and show main content
            await this.hideAuthLoadingAndShowContent();
            
        } catch (error) {
            console.error('Failed to initialize LLM Interpreter:', error);
            // Hide loading spinner even on error
            this.hideAuthLoading();
        }
    }

    initializeDOMElements() {
        this.elements = {
            startBtn: document.getElementById('startBtn'),
            stopBtn: document.getElementById('stopBtn'),
            language1Select: document.getElementById('language1Select'),
            language2Select: document.getElementById('language2Select'),
            enableTranslation: document.getElementById('enableTranslation'),
            statusDisplay: document.getElementById('statusDisplay'),
            recognitionText: document.getElementById('recognitionText'),
            chatList: document.getElementById('chatList'),
            translationList: document.getElementById('translationList'),
            detectedLanguageDisplay: document.getElementById('detectedLanguageDisplay')
        };
    }

    async populateLanguages() {
        const language1Select = this.elements.language1Select;
        const language2Select = this.elements.language2Select;
        const voices = await this.getAvailableLanguages();

        // Clear all selects
        [language1Select, language2Select].forEach(select => {
            select.innerHTML = "";
        });

        // Deduplicate by locale and keep localeName
        const localeMap = new Map();
        voices.forEach(v => {
            if (!localeMap.has(v.locale)) {
                localeMap.set(v.locale, v.localeName);
            }
        });

        localeMap.forEach((localeName, locale) => {
            // Language 1 select
            const lang1Option = document.createElement("option");
            lang1Option.value = locale;
            lang1Option.textContent = `${localeName}`;
            if (locale === "en-US") {
                lang1Option.selected = true;
            }
            language1Select.appendChild(lang1Option);

            // Language 2 select
            const lang2Option = document.createElement("option");
            lang2Option.value = locale;
            lang2Option.textContent = `${localeName}`;
            if (locale === "es-ES") { // Default to Spanish for demo
                lang2Option.selected = true;
            }
            language2Select.appendChild(lang2Option);
        });

        // Set initial current language (will be overridden by auto-detection)
        this.currentLanguage = language1Select.value;
    }

    setupEventListeners() {
        if (this.elements.startBtn) {
            this.elements.startBtn.addEventListener('click', () => this.startRecognition());
        }
        
        if (this.elements.stopBtn) {
            this.elements.stopBtn.addEventListener('click', () => this.stopRecognition());
        }
        
        if (this.elements.language1Select) {
            this.elements.language1Select.addEventListener('change', () => this.onLanguage1Change());
        }
        
        if (this.elements.language2Select) {
            this.elements.language2Select.addEventListener('change', () => this.onLanguage2Change());
        }
        
        if (this.elements.enableTranslation) {
            this.elements.enableTranslation.addEventListener('change', () => this.onTranslationToggle());
        }

        // Clean up on page unload
        window.addEventListener('beforeunload', () => {
            if (this) {
                this.close();
            }
        });
    }

    initializeTranslationToggle() {
        this.onTranslationToggle();
    }

    async startRecognition() {
        try {
            this.updateButtonStates(true);
            await this.startSpeechRecognition();
        } catch (error) {
            this.updateStatus(`Failed to start: ${error.message}`, 'error');
            this.updateButtonStates(false);
        }
    }

    async stopRecognition() {
        try {
            await this.stopSpeechRecognition();
            this.updateButtonStates(false);
            if (this.elements.recognitionText) {
                this.elements.recognitionText.classList.remove('active');
            }
            
            // Remove any interim message when stopping
            const interimMessage = this.elements.chatList?.querySelector('.interim');
            if (interimMessage) {
                interimMessage.remove();
            }
            
            this.clearChat();

        } catch (error) {
            this.updateStatus(`Failed to stop: ${error.message}`, 'error');
            this.updateButtonStates(false);
        }
    }

    onLanguage1Change() {
        const selectedLanguage = this.elements.language1Select.value;
        const selectedText = this.elements.language1Select.options[this.elements.language1Select.selectedIndex].text;
        
        this.updateStatus(`Language 1 changed to: ${selectedText}`, 'info');
        this.updateDetectedLanguageDisplay('🎙️ Speak in either language - detection will appear here');
    }

    onLanguage2Change() {
        const selectedLanguage = this.elements.language2Select.value;
        const selectedText = this.elements.language2Select.options[this.elements.language2Select.selectedIndex].text;
        
        this.updateStatus(`Language 2 changed to: ${selectedText}`, 'info');
        this.updateDetectedLanguageDisplay('🎙️ Speak in either language - detection will appear here');
    }

    updateDetectedLanguageDisplay(message, type = 'info') {
        const displayEl = this.elements.detectedLanguageDisplay;
        if (displayEl) {
            displayEl.textContent = message;
            
            // Remove all alert classes
            displayEl.className = 'detected-language-display alert';
            
            // Add appropriate Bootstrap alert class
            switch(type) {
                case 'success':
                    displayEl.classList.add('alert-success');
                    break;
                case 'warning':
                    displayEl.classList.add('alert-warning');
                    break;
                case 'detected':
                    displayEl.classList.add('alert-primary');
                    break;
                default:
                    displayEl.classList.add('alert-light');
            }
        }
    }

    onTranslationToggle() {
        const isEnabled = this.elements.enableTranslation?.checked || false;
        
        this.updateStatus(`Real-time translation ${isEnabled ? 'enabled' : 'disabled'}`, 'info');
        
        // Update UI to show/hide translation column
        if (this.elements.recognitionText) {
            if (isEnabled) {
                this.elements.recognitionText.classList.add('translation-enabled');
            } else {
                this.elements.recognitionText.classList.remove('translation-enabled');
            }
        }
    }

    updateButtonStates(isRecognizing) {
        if (this.elements.startBtn) {
            this.elements.startBtn.disabled = isRecognizing;
            
            if (isRecognizing) {
                this.elements.startBtn.innerHTML = '<span class="loading-spinner"></span>Listening...';
                this.elements.startBtn.classList.add('btn-secondary');
                this.elements.startBtn.classList.remove('btn-primary');
            } else {
                this.elements.startBtn.innerHTML = '<span class="mic-icon">🎤</span>Start Listening';
                this.elements.startBtn.classList.add('btn-primary');
                this.elements.startBtn.classList.remove('btn-secondary');
            }
        }
        
        if (this.elements.stopBtn) {
            this.elements.stopBtn.disabled = !isRecognizing;
        }
        
        if (this.elements.language1Select) {
            this.elements.language1Select.disabled = isRecognizing;
        }
        
        if (this.elements.language2Select) {
            this.elements.language2Select.disabled = isRecognizing;
        }
    }

    async updateRecognitionText(text, isFinal, detectedLanguage = null) {
        const chatList = this.elements.chatList;
        const recognitionContainer = this.elements.recognitionText;
        
        if (!chatList || !recognitionContainer) return;
        
        // Remove empty state if it exists
        const emptyState = chatList.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }
        
        // Check if user was scrolled to bottom before updating
        const wasScrolledToBottom = this.isScrolledToBottom();
        
        if (isFinal && text.trim()) {
            // Remove any existing interim message
            const interimMessage = chatList.querySelector('.interim');
            if (interimMessage) {
                interimMessage.remove();
            }
            
            // Add final recognized text
            this.addChatMessage(text, true);
            recognitionContainer.classList.remove('active');
            
            // Update detected language display if we have detection info
            if (detectedLanguage) {
                this.currentLanguage = detectedLanguage;
                const languageName = this.getLanguageDisplayName(detectedLanguage);
                this.updateDetectedLanguageDisplay(`🎯 Detected: ${languageName}`, 'detected');
            }
            
            // Trigger translation if enabled
            if (this.elements.enableTranslation?.checked) {
                await this.translateDetectedText(text, detectedLanguage);
            }

            // Handle TTS for the original detected language
            // if (detectedLanguage) {
            //     try {
            //         await this.initializeTextToSpeech();
            //         const recommendedVoices = await this.textToSpeechService.getRecommendedVoices(detectedLanguage, 1);
            //         const voiceName = recommendedVoices.length > 0 ? recommendedVoices[0].shortName : undefined;

            //         this.textToSpeechService.speakQueued(text, { 
            //             language: detectedLanguage, 
            //             voice: voiceName 
            //         });
            //     } catch (ttsError) {
            //         console.warn('Failed to speak original text:', ttsError);
            //     }
            // }
            
        } else if (text.trim()) {
            // Update or create interim message
            let interimMessage = chatList.querySelector('.interim');
            if (interimMessage) {
                interimMessage.querySelector('.text').textContent = text;
            } else {
                this.addChatMessage(text, false);
            }
            recognitionContainer.classList.add('active');
        }
        
        // Only auto-scroll if user was already at bottom or if this is an interim message
        if (wasScrolledToBottom || !isFinal) {
            this.scrollToBottom();
        }
    }

    getLanguageDisplayName(languageCode) {
        if (this.languages) {
            const langObj = this.languages.find(l => l.locale === languageCode);
            return langObj ? (langObj.localeName || langObj.locale) : languageCode;
        }
        return languageCode;
    }

    determineTargetLanguage(detectedLanguage) {
        const lang1 = this.elements.language1Select?.value;
        const lang2 = this.elements.language2Select?.value;
        
        if (!lang1 || !lang2) return null;
        
        // If detected language matches lang1, translate to lang2
        if (detectedLanguage === lang1) {
            return lang2;
        }
        // If detected language matches lang2, translate to lang1
        else if (detectedLanguage === lang2) {
            return lang1;
        }
        // If detected language doesn't match either, default to translating to lang2
        else {
            console.warn(`Detected language ${detectedLanguage} doesn't match selected languages. Defaulting to translate to language 2.`);
            return lang2;
        }
    }

    async translateDetectedText(text, detectedLanguage) {
        if (!detectedLanguage) {
            this.updateStatus('No language detected, skipping translation', 'warning');
            return;
        }

        const targetLanguage = this.determineTargetLanguage(detectedLanguage);
        if (!targetLanguage) {
            this.updateStatus('Unable to determine target language', 'error');
            return;
        }

        const targetLanguageName = this.getLanguageDisplayName(targetLanguage);
        const detectedLanguageName = this.getLanguageDisplayName(detectedLanguage);

        // Ensure DOM elements are initialized
        if (!this.elements || Object.keys(this.elements).length === 0) {
            this.initializeDOMElements();
        }
        
        const translationList = this.elements.translationList;
        
        if (!translationList) {
            this.updateStatus('Translation error: Translation display area not found', 'error');
            return;
        }
        
        if (detectedLanguage === targetLanguage) {
            this.updateStatus('Detected and target languages are the same', 'warning');
            return;
        }
        
        // Remove empty state from translation list
        const emptyState = translationList.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }
        
        // Add loading message
        const loadingMessage = this.addTranslationMessage('🔄 Translating...', false, true);
        
        try {
            this.updateStatus(`Streaming translation from ${detectedLanguageName} to ${targetLanguageName}...`, 'loading');
            
            // Use streaming translation with real-time updates
            let streamingMessage = null;
            
            await this.translateStreamText(
                text, 
                detectedLanguage, 
                targetLanguage,
                (currentText, isDone) => {
                    // Remove loading message on first chunk
                    if (!streamingMessage && loadingMessage && loadingMessage.parentNode) {
                        loadingMessage.remove();
                    }
                    
                    // Create streaming message if it doesn't exist
                    if (!streamingMessage) {
                        streamingMessage = this.addTranslationMessage('', false);
                    }
                    
                    // Simulate typing effect by gradually showing the text
                    const textElement = streamingMessage.querySelector('.text');
                    if (textElement) {
                        // If this is incremental content, animate it appearing
                        this.animateTextStreaming(textElement, currentText);
                    }
                    
                    // Mark as final when done
                    if (isDone && streamingMessage) {
                        streamingMessage.classList.remove('interim');
                        streamingMessage.classList.add('final');
                    }
                }
            );
            
            this.updateStatus(`Translated from ${detectedLanguageName} to ${targetLanguageName}`, 'success');
            
            // Speak the translated text in the target language
            try {
                await this.initializeTextToSpeech();
                const recommendedVoices = await this.textToSpeechService.getRecommendedVoices(targetLanguage, 1);
                const voiceName = recommendedVoices.length > 0 ? recommendedVoices[0].shortName : undefined;

                this.textToSpeechService.speakQueued(streamingMessage?.querySelector('.text')?.textContent || '', { 
                    language: targetLanguage, 
                    voice: voiceName 
                });
            } catch (ttsError) {
                console.warn('Failed to speak translated text:', ttsError);
                // Don't break the translation flow for TTS errors
            }
            
        } catch (error) {
            console.error('Translation error:', error);
            this.updateStatus(`Translation failed: ${error.message}`, 'error');
            
            // Remove loading message and add error message
            if (loadingMessage && loadingMessage.parentNode) {
                loadingMessage.remove();
            }
            
            this.addTranslationMessage(`❌ Translation failed: ${error.message}`, true, false, 'error');
        }
    }

    animateTextStreaming(textElement, newText) {
        // Cancel any existing animation
        if (this.streamingAnimation) {
            clearInterval(this.streamingAnimation);
        }
        
        const currentText = textElement.textContent;
        
        // If the new text is shorter or completely different, just set it directly
        if (newText.length <= currentText.length || !newText.startsWith(currentText)) {
            textElement.textContent = newText;
            return;
        }
        
        // Animate only the new characters
        const additionalText = newText.slice(currentText.length);
        let charIndex = 0;
        
        this.streamingAnimation = setInterval(() => {
            if (charIndex < additionalText.length) {
                textElement.textContent += additionalText[charIndex];
                charIndex++;
                
                // Auto-scroll to keep the latest text visible
                const translationList = this.elements.translationList;
                if (translationList) {
                    translationList.scrollTo({
                        top: translationList.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            } else {
                clearInterval(this.streamingAnimation);
                this.streamingAnimation = null;
            }
        }, 30); // 30ms per character for smooth typing effect
    }

    addTranslationMessage(text, isFinal, isLoading = false, type = 'success') {
        const translationList = this.elements.translationList;
        if (!translationList) return null;
        
        const messageElement = document.createElement('li');
        
        const timestamp = new Date().toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
        
        let className = `chat-message translation-message ${isFinal ? 'final' : 'interim'}`;
        if (isLoading) className += ' loading';
        if (type === 'error') className += ' error';
        
        messageElement.className = className;
        messageElement.innerHTML = `
            <span class="timestamp small">${timestamp}</span>
            <div class="text">${text}</div>
        `;
        
        translationList.appendChild(messageElement);
        
        // Limit to last 50 messages to prevent memory issues
        const messages = translationList.querySelectorAll('.translation-message');
        if (messages.length > 50) {
            messages[0].remove();
        }
        
        // Auto-scroll translation list
        translationList.scrollTo({
            top: translationList.scrollHeight,
            behavior: 'smooth'
        });
        
        return messageElement;
    }

    scrollToBottom() {
        const chatList = this.elements.chatList;
        if (chatList) {
            // Use smooth scrolling behavior
            chatList.scrollTo({
                top: chatList.scrollHeight,
                behavior: 'smooth'
            });
        }
    }

    isScrolledToBottom() {
        const chatList = this.elements.chatList;
        if (!chatList) return true;
        
        // Check if user is near the bottom (within 50px tolerance)
        return chatList.scrollHeight - chatList.clientHeight <= chatList.scrollTop + 50;
    }

    addChatMessage(text, isFinal) {
        const chatList = this.elements.chatList;
        if (!chatList) return;
        
        const messageElement = document.createElement('li');
        
        const timestamp = new Date().toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
        
        messageElement.className = `chat-message ${isFinal ? 'final' : 'interim'}`;
        messageElement.innerHTML = `
            <span class="timestamp small">${timestamp}</span>
            <div class="text">${text}</div>
        `;
        
        chatList.appendChild(messageElement);
        
        // Limit to last 50 messages to prevent memory issues
        const messages = chatList.querySelectorAll('.chat-message');
        if (messages.length > 50) {
            messages[0].remove();
        }
    }

    clearChat() {
        const chatList = this.elements.chatList;
        const translationList = this.elements.translationList;
        
        if (chatList) {
            chatList.innerHTML = `
                <li class="empty-state text-muted fst-italic p-4">
                    🎤 Recognized text will appear here as you speak...
                </li>
            `;
        }
        
        if (translationList) {
            translationList.innerHTML = `
                <li class="empty-state text-muted fst-italic p-4">
                    🌍 Translated text will appear here...
                </li>
            `;
        }
        
        this.updateStatus('Chat cleared', 'info');
    }

    updateStatus(message, type = 'info') {
        console.log(`[LLM Interpreter ${type.toUpperCase()}] ${message}`);
        
        // Update status display if element exists
        const statusEl = this.elements.statusDisplay;
        if (statusEl) {
            statusEl.textContent = message;
            
            // Remove all alert classes
            statusEl.className = 'alert status-display';
            
            // Add appropriate Bootstrap alert class
            switch(type) {
                case 'success':
                    statusEl.classList.add('alert-success');
                    break;
                case 'error':
                    statusEl.classList.add('alert-danger');
                    break;
                case 'warning':
                    statusEl.classList.add('alert-warning');
                    break;
                case 'loading':
                    statusEl.classList.add('alert-warning');
                    break;
                default:
                    statusEl.classList.add('alert-info');
            }
        }
        
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
            const langObj = this.languages ? this.languages.find(l => l.locale === languageCode) : null;

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
            
            // Get candidate languages for auto-detection
            const lang1 = this.elements.language1Select?.value;
            const lang2 = this.elements.language2Select?.value;
            const candidateLanguages = [lang1, lang2].filter(Boolean);
            
            if (candidateLanguages.length < 2) {
                throw new Error('Please select both languages for auto-detection');
            }
            
            // Setup speech recognizer with auto language detection
            await this.speechService.setupAutoDetectSpeechRecognizer(candidateLanguages);
            
            // Set up event handlers with language detection support
            this.speechService.onResult = async (text, isFinal, detectedLanguage) => {
                if (isFinal) {
                    this.updateStatus(`Recognized: "${text}"`, 'success');
                    
                    // Use the updateRecognitionText method with detected language
                    this.updateRecognitionText(text, isFinal, detectedLanguage);
                
                } else {
                    this.updateStatus(`Recognizing... "${text}"`, 'info');
                    
                    // Use the updateRecognitionText method for interim results
                    this.updateRecognitionText(text, isFinal, detectedLanguage);
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
            
            // Get language display names for both languages
            const lang1Name = this.getLanguageDisplayName(candidateLanguages[0]);
            const lang2Name = this.getLanguageDisplayName(candidateLanguages[1]);
            
            this.updateStatus(`🎤 Listening with auto-detection for ${lang1Name} and ${lang2Name}...`, 'success');
            this.updateDetectedLanguageDisplay('🎙️ Speak in either language - detection will appear here');
            
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

    async translateTextWithLanguages(text, fromLang, toLang) {
        // Use streaming for all translations now
        let finalResult = '';
        await this.translateStreamText(text, fromLang, toLang, (currentText, isDone) => {
            finalResult = currentText;
        });
        return finalResult;
    }

    async translateStreamText(text, fromLang, toLang, onChunk) {
        try {
            if (!text || text.trim().length === 0) {
                throw new Error('Text cannot be empty');
            }

            if (!fromLang || !toLang) {
                throw new Error('Source and target languages must be specified');
            }

            if (fromLang === toLang) {
                throw new Error('Source and target languages cannot be the same');
            }

            this.updateStatus(`Starting streaming translation from ${fromLang} to ${toLang}...`, 'loading');
            
            const response = await fetch('/.netlify/functions/translateStream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    langCode1: fromLang,
                    langCode2: toLang
                })
            });

            if (!response.ok) {
                throw new Error(`Translation service error: ${response.status} ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullTranslation = '';
            let allChunks = [];

            // First, collect all the data (since Netlify sends it all at once anyway)
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                        try {
                            const data = JSON.parse(line.substring(6));
                            
                            if (data.chunk !== undefined && !data.complete) {
                                allChunks.push(data.chunk);
                                fullTranslation += data.chunk;
                            } else if (data.complete) {
                                // Final completion signal
                                break;
                            } else if (data.error) {
                                throw new Error(data.message || 'Translation failed');
                            }
                        } catch (parseError) {
                            console.warn('Failed to parse SSE data:', parseError);
                        }
                    }
                }
            }

            // Now simulate streaming by sending the text progressively
            if (allChunks.length > 0) {
                let accumulatedText = '';
                
                // Send chunks progressively to simulate real streaming
                for (let i = 0; i < allChunks.length; i++) {
                    accumulatedText += allChunks[i];
                    
                    if (onChunk) {
                        // Add a small delay to simulate streaming
                        await new Promise(resolve => setTimeout(resolve, 50));
                        onChunk(accumulatedText, i === allChunks.length - 1);
                    }
                }
                
                // Final call to ensure completion
                if (onChunk) {
                    onChunk(fullTranslation, true);
                }
            } else if (fullTranslation && onChunk) {
                // If no chunks but we have full translation, send it progressively
                const chars = fullTranslation.split('');
                let accumulatedText = '';
                
                for (let i = 0; i < chars.length; i++) {
                    accumulatedText += chars[i];
                    await new Promise(resolve => setTimeout(resolve, 20));
                    onChunk(accumulatedText, i === chars.length - 1);
                }
            }

            this.updateStatus('Streaming translation completed', 'success');
            return fullTranslation;

        } catch (error) {
            this.updateStatus(`Streaming translation failed: ${error.message}`, 'error');
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

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Create global instance
    window.interpreter = new LLMInterpreter();
});