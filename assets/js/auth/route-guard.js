import { AUTH_CONFIG } from './auth-config.js';
import { AuthStorageService } from './auth-storage.js';

/**
 * Route Guard Service
 * Handles route protection and navigation logic
 */
export class RouteGuardService {
    constructor() {
        this.storageService = new AuthStorageService();
        this.publicRoutes = [
            '/assets/pages/auth/login.html',
            '/assets/pages/auth/unauthorized.html'
        ];
    }

    /**
     * Check if current route requires authentication
     */
    requiresAuth(path = window.location.pathname) {
        // Check if current route is public
        return !this.publicRoutes.some(route => path.includes(route));
    }

    /**
     * Protect a route - redirect to login if not authenticated
     */
    protectRoute() {
        if (this.requiresAuth() && !this.storageService.isAuthenticated()) {
            this.redirectToLogin();
            return false;
        }
        return true;
    }

    /**
     * Redirect to login page
     */
    redirectToLogin(returnUrl = null) {
        const currentUrl = returnUrl || window.location.href;
        const loginUrl = new URL(AUTH_CONFIG.ROUTES.LOGIN, window.location.origin);
        
        // Add return URL as query parameter
        if (currentUrl !== window.location.origin + AUTH_CONFIG.ROUTES.LOGIN) {
            loginUrl.searchParams.set('returnUrl', encodeURIComponent(currentUrl));
        }
        
        window.location.href = loginUrl.toString();
    }

    /**
     * Redirect to home page
     */
    redirectToHome() {
        window.location.href = AUTH_CONFIG.ROUTES.HOME;
    }

    /**
     * Get return URL from query parameters
     */
    getReturnUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const returnUrl = urlParams.get('returnUrl');
        
        if (returnUrl) {
            try {
                return decodeURIComponent(returnUrl);
            } catch (error) {
                console.error('Invalid return URL:', error);
            }
        }
        
        return AUTH_CONFIG.ROUTES.HOME;
    }

    /**
     * Redirect after successful login
     */
    redirectAfterLogin() {
        const returnUrl = this.getReturnUrl();
        
        // Ensure we don't redirect to login page
        if (returnUrl.includes('/assets/pages/auth/login.html')) {
            this.redirectToHome();
        } else {
            window.location.href = returnUrl;
        }
    }

    /**
     * Check if user is on login page while authenticated
     */
    checkLoginPageAccess() {
        if (window.location.pathname.includes('/assets/pages/auth/login.html') && 
            this.storageService.isAuthenticated()) {
            this.redirectToHome();
            return false;
        }
        return true;
    }
}