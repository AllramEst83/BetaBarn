/**
 * Centralized Language Service
 * Provides consistent language mapping for Gemini translation services
 */

class LanguageService {
  constructor() {
    // Comprehensive language mapping for better Gemini understanding
    this.languageMap = {
      'en-US': 'English (United States)',
      'en-GB': 'English (United Kingdom)',
      'es-ES': 'Spanish (Spain)',
      'es-MX': 'Spanish (Mexico)',
      'fr-FR': 'French (France)',
      'fr-CA': 'French (Canada)',
      'de-DE': 'German (Germany)',
      'it-IT': 'Italian (Italy)',
      'pt-BR': 'Portuguese (Brazil)',
      'pt-PT': 'Portuguese (Portugal)',
      'ru-RU': 'Russian (Russia)',
      'ja-JP': 'Japanese (Japan)',
      'ko-KR': 'Korean (South Korea)',
      'zh-CN': 'Chinese (Simplified, China)',
      'zh-TW': 'Chinese (Traditional, Taiwan)',
      'ar-SA': 'Arabic (Saudi Arabia)',
      'hi-IN': 'Hindi (India)',
      'th-TH': 'Thai (Thailand)',
      'vi-VN': 'Vietnamese (Vietnam)',
      'pl-PL': 'Polish (Poland)',
      'nl-NL': 'Dutch (Netherlands)',
      'sv-SE': 'Swedish (Sweden)',
      'da-DK': 'Danish (Denmark)',
      'no-NO': 'Norwegian (Norway)',
      'fi-FI': 'Finnish (Finland)',
      'tr-TR': 'Turkish (Turkey)',
      'he-IL': 'Hebrew (Israel)',
      'cs-CZ': 'Czech (Czech Republic)',
      'sk-SK': 'Slovak (Slovakia)',
      'hu-HU': 'Hungarian (Hungary)',
      'ro-RO': 'Romanian (Romania)',
      'bg-BG': 'Bulgarian (Bulgaria)',
      'hr-HR': 'Croatian (Croatia)',
      'sl-SI': 'Slovenian (Slovenia)',
      'et-EE': 'Estonian (Estonia)',
      'lv-LV': 'Latvian (Latvia)',
      'lt-LT': 'Lithuanian (Lithuania)',
      'uk-UA': 'Ukrainian (Ukraine)',
      'be-BY': 'Belarusian (Belarus)',
      'mk-MK': 'Macedonian (North Macedonia)',
      'sr-RS': 'Serbian (Serbia)',
      'bs-BA': 'Bosnian (Bosnia and Herzegovina)',
      'mt-MT': 'Maltese (Malta)',
      'is-IS': 'Icelandic (Iceland)',
      'ga-IE': 'Irish (Ireland)',
      'cy-GB': 'Welsh (Wales)',
      'eu-ES': 'Basque (Spain)',
      'ca-ES': 'Catalan (Spain)',
      'gl-ES': 'Galician (Spain)'
    };
  }

  /**
   * Get the full language map
   * @returns {Object} Complete language mapping object
   */
  getLanguageMap() {
    return this.languageMap;
  }

  /**
   * Get language name by code
   * @param {string} langCode - Language code (e.g., 'en-US')
   * @returns {string} Language name or the original code if not found
   */
  getLanguageName(langCode) {
    return this.languageMap[langCode] || langCode;
  }

  /**
   * Check if a language code is supported
   * @param {string} langCode - Language code to check
   * @returns {boolean} True if supported, false otherwise
   */
  isSupported(langCode) {
    return langCode in this.languageMap;
  }

  /**
   * Get all supported language codes
   * @returns {string[]} Array of supported language codes
   */
  getSupportedCodes() {
    return Object.keys(this.languageMap);
  }

  /**
   * Create UI service object for Gemini compatibility
   * @returns {Object} UI service object with languages property
   */
  createUIService() {
    return {
      languages: this.languageMap
    };
  }
}

export default new LanguageService();