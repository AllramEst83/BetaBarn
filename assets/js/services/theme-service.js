/**
 * Theme Service - Handles dark/light mode toggling
 */
class ThemeService {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.themeToggle = document.getElementById('themeToggle');
        this.init();
    }

    /**
     * Initialize theme service
     */
    init() {
        // Apply saved theme
        this.applyTheme(this.currentTheme);
        
        // Add event listener to theme toggle button
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        console.log('Theme Service initialized');
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(this.currentTheme);
        localStorage.setItem('theme', this.currentTheme);
    }

    /**
     * Apply theme to document
     * @param {string} theme - 'light' or 'dark'
     */
    applyTheme(theme) {
        const html = document.documentElement;
        
        if (theme === 'dark') {
            html.setAttribute('data-theme', 'dark');
            this.updateThemeToggleIcon('☀️'); // Sun icon for dark mode
        } else {
            html.removeAttribute('data-theme');
            this.updateThemeToggleIcon('🌙'); // Moon icon for light mode
        }
    }

    /**
     * Update the theme toggle button icon
     * @param {string} icon - The emoji icon to display
     */
    updateThemeToggleIcon(icon) {
        // Update original theme toggle
        if (this.themeToggle) {
            this.themeToggle.textContent = icon;
        }
        
        // Update auth theme toggle if it exists
        const authThemeToggle = document.getElementById('themeToggleAuth');
        if (authThemeToggle) {
            authThemeToggle.textContent = icon;
        }
    }

    /**
     * Get current theme
     * @returns {string} Current theme ('light' or 'dark')
     */
    getCurrentTheme() {
        return this.currentTheme;
    }
}

export default ThemeService;