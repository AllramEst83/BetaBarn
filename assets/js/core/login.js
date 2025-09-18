 import { authService } from '../services/authService.js';

        document.addEventListener('DOMContentLoaded', function() {
            const loginForm = document.getElementById('loginForm');
            const loginButton = document.getElementById('loginButton');
            const alertDiv = document.getElementById('alert');
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');

            // Check if already authenticated
            if (authService.isAuthenticated()) {
                authService.redirectAfterLogin();
                return;
            }

            function showAlert(message, type = 'error') {
                alertDiv.textContent = message;
                alertDiv.className = `alert ${type} show`;
                
                if (type === 'success') {
                    setTimeout(() => {
                        alertDiv.classList.remove('show');
                    }, 3000);
                }
            }

            function hideAlert() {
                alertDiv.classList.remove('show');
            }

            function setLoading(isLoading) {
                loginButton.disabled = isLoading;
                loginButton.classList.toggle('loading', isLoading);
                
                if (isLoading) {
                    loginButton.querySelector('.button-text').textContent = 'Signing In...';
                } else {
                    loginButton.querySelector('.button-text').textContent = 'Sign In';
                }
            }

            loginForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const username = usernameInput.value.trim();
                const password = passwordInput.value;

                if (!username || !password) {
                    showAlert('Please enter both username and password');
                    return;
                }

                hideAlert();
                setLoading(true);

                try {
                    const result = await authService.login(username, password);
                    
                    if (result.success) {
                        showAlert(result.message, 'success');
                        setTimeout(() => {
                            authService.redirectAfterLogin();
                        }, 1000);
                    } else {
                        showAlert(result.message);
                    }
                } catch (error) {
                    console.error('Login error:', error);
                    showAlert('An unexpected error occurred. Please try again.');
                } finally {
                    setLoading(false);
                }
            });

            // Clear alert when user starts typing
            usernameInput.addEventListener('input', hideAlert);
            passwordInput.addEventListener('input', hideAlert);

            // Focus username field on load
            usernameInput.focus();

            // Listen for auth events
            window.addEventListener('auth:login', (event) => {
                console.log('User logged in:', event.detail);
            });
        });