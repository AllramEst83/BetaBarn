import ThemeService from '../services/theme-service.js';
import AuthService from '../services/authService.js';

/**
 * About Page App Class - Handles about page specific functionality
 */
class AboutApp {
    constructor() {
        this.themeService = new ThemeService();
        this.authService = new AuthService();
       
        this.authLoadingOverlay = document.getElementById('auth-loading-overlay');
        this.mainContent = document.getElementById('main-content');
        this.init();
    }

    /**
     * Initialize the about page application
     */
    async init() {
        try {
            // Show auth loading spinner
            this.showAuthLoading();
            
            // Add a small delay to show the beautiful spinner
            await this.delay(1500);
            
            // Check authentication first
            await this.initializeAuth();
            
            // Initialize other services
            this.setupEventListeners();
            
            // Hide loading spinner and show main content
            await this.hideAuthLoadingAndShowContent();
            
            console.log('🚀 Beta Barn About page initialized successfully');
        } catch (error) {
            console.error('Failed to initialize about page:', error);
            // Hide loading spinner even on error
            this.hideAuthLoading();
        }
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

    /**
     * Hide auth loading spinner
     */
    hideAuthLoading() {
        if (this.authLoadingOverlay) {
            this.authLoadingOverlay.classList.add('fade-out');
            setTimeout(() => {
                this.authLoadingOverlay.style.display = 'none';
            }, 500); // Match the CSS transition duration
        }
    }

    /**
     * Hide auth loading and show main content with smooth transition
     */
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
     * Initialize authentication
     */
    async initializeAuth() {
        // Check if user needs to be redirected to login
        if (!this.authService.requireAuth()) {
            return; // Will redirect to login
        }

        // Check if authenticated user is on login page
        this.authService.checkLoginAccess();

        // If we reach here, user is authenticated and on a valid page
        this.setupAuthenticatedUI();
    }

    /**
     * Setup UI for authenticated users
     */
    setupAuthenticatedUI() {
        this.addUserInfo();
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
     * Add logout button (fallback method)
     */
    addLogoutButton() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
    }

    /**
     * Handle logout
     */
    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            this.authService.logout();
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for auth events
        window.addEventListener('auth:login', (event) => {
            console.log('User logged in:', event.detail);
            this.setupAuthenticatedUI();
        });

        window.addEventListener('auth:logout', (event) => {
            console.log('User logged out:', event.detail);
            // UI cleanup will happen on page redirect
        });

        // Listen for session warnings
        window.addEventListener('auth:sessionWarning', (event) => {
            this.showSessionWarning(event.detail);
        });
    }

    /**
     * Show session warning
     */
    showSessionWarning(timeLeft) {
        // This could show a toast or modal
        console.warn(`Session expires in ${Math.floor(timeLeft / 60000)} minutes`);
        
        // You could implement a more sophisticated warning system here
        const shouldExtend = confirm(
            `Your session will expire in ${Math.floor(timeLeft / 60000)} minutes. ` +
            'Do you want to stay logged in?'
        );

        if (!shouldExtend) {
            this.authService.logout();
        }
    }
}

// Initialize about app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AboutApp();
});