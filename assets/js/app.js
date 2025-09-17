import ThemeService from './services/theme-service.js';
import POCService from './services/poc-service.js';

/**
 * Main App Class - Orchestrates the application
 */
class App {
    constructor() {
        this.themeService = new ThemeService();
        this.pocService = new POCService();
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {        
        console.log('🚀 Beta Barn initialized successfully');
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
