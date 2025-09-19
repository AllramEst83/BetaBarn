import { AUTH_CONFIG } from '../auth/auth-config.js';
import { AuthApiService } from '../auth/auth-api.js';
import { AuthStorageService } from '../auth/auth-storage.js';
import { RouteGuardService } from '../auth/route-guard.js';

/**
 * Main Authentication Service
 * Orchestrates all authentication-related functionality
 */
class AuthService {
    constructor() {
        this.apiService = new AuthApiService();
        this.storageService = new AuthStorageService();
        this.routeGuard = new RouteGuardService();
        
        // Event listeners for session management
        this.setupEventListeners();
        
        // Initialize auth state
        this.init();
    }

    /**
     * Initialize the authentication service
     */
    init() {
        // Check for expired sessions
        this.checkSessionExpiry();
        
        // Set up periodic session checks
        this.startSessionMonitoring();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for storage changes (multi-tab support)
        window.addEventListener('storage', (e) => {
            if (e.key === AUTH_CONFIG.STORAGE_KEYS.IS_AUTHENTICATED) {
                this.handleStorageChange(e);
            }
        });

        // Listen for beforeunload to clean up
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    /**
     * Attempt to log in a user
     */
    async login(username, password) {
        try {
            // Validate input
            if (!username?.trim() || !password) {
                return {
                    success: false,
                    message: 'Username and password are required'
                };
            }

            // Call the API
            const response = await this.apiService.signIn(username.trim(), password);

            if (response.success && response.data.success) {
                // Store authentication data with user info from server
                const userData = response.data.user || { username: username.trim() };
                const stored = this.storageService.setAuthData(userData);

                if (!stored) {
                    return {
                        success: false,
                        message: 'Failed to store authentication data'
                    };
                }

                // Emit login event
                this.emitAuthEvent('login', userData);

                return {
                    success: true,
                    message: response.data.message || AUTH_CONFIG.MESSAGES.LOGIN_SUCCESS,
                    user: userData
                };
            } else {
                return {
                    success: false,
                    message: response.data?.message || response.error || AUTH_CONFIG.MESSAGES.LOGIN_FAILED
                };
            }
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                message: AUTH_CONFIG.MESSAGES.NETWORK_ERROR
            };
        }
    }

    /**
     * Log out the current user
     */
    logout() {
        const user = this.getCurrentUser();
        
        // Clear storage
        this.storageService.clearAuthData();
        
        // Emit logout event
        this.emitAuthEvent('logout', user);
        
        // Redirect to login
        this.routeGuard.redirectToLogin();
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.storageService.isAuthenticated();
    }

    /**
     * Get current user data
     */
    getCurrentUser() {
        return this.storageService.getCurrentUser();
    }

    /**
     * Require authentication for current page
     */
    requireAuth() {
        return this.routeGuard.protectRoute();
    }

    /**
     * Check if user should access login page
     */
    checkLoginAccess() {
        return this.routeGuard.checkLoginPageAccess();
    }

    /**
     * Redirect after successful login
     */
    redirectAfterLogin() {
        this.routeGuard.redirectAfterLogin();
    }

    /**
     * Check session expiry
     */
    checkSessionExpiry() {
        if (this.storageService.isSessionExpiringSoon()) {
            this.showSessionWarning();
        }
    }

    /**
     * Start monitoring session
     */
    startSessionMonitoring() {
        // Check session every minute
        setInterval(() => {
            this.checkSessionExpiry();
        }, 60000);
    }

    /**
     * Show session expiry warning
     */
    showSessionWarning() {
        // This could show a modal or notification
        console.warn('Session expiring soon');
        // You could implement a countdown timer here
    }

    /**
     * Handle storage changes (for multi-tab support)
     */
    handleStorageChange(event) {
        if (event.newValue === null) {
            // User was logged out in another tab
            window.location.reload();
        }
    }

    /**
     * Emit authentication events
     */
    emitAuthEvent(type, data) {
        const event = new CustomEvent(`auth:${type}`, {
            detail: data
        });
        window.dispatchEvent(event);
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        // Clean up any timers, listeners, etc.
        // This could be expanded based on needs
    }

    /**
     * Get authentication status for UI
     */
    getAuthStatus() {
        return {
            isAuthenticated: this.isAuthenticated(),
            user: this.getCurrentUser(),
            sessionExpiringSoon: this.storageService.isSessionExpiringSoon()
        };
    }
}

// Export singleton instance
export default AuthService;

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthService;
}
