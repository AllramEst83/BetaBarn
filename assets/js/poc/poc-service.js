import AuthService from '../auth/authService.js';
import ProjectService from './projectService.js';
/**
 * POC Service - Manages Proof of Concept projects
 */
class POCService {
    constructor() {
        this.authService = new AuthService();
        this.projectService = new ProjectService();

        this.projects = [];
        this.gridContainer = null;
        this.isLoading = false;
        this.init();
    }

    /**
     * Initialize POC service
     */
    async init() {
        this.gridContainer = document.getElementById('pocGrid');
        
        // Load projects from API
        await this.loadProjectsFromAPI();
        
        // Render projects if grid container exists
        if (this.gridContainer) {
            this.renderProjects();
        }
        
        console.log('POC Service initialized with', this.projects.length, 'projects');
    }

    /**
     * Load projects from API
     */
    async loadProjectsFromAPI() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoadingSpinner();
        
        try {
            const response = await this.projectService.getProjects();
            
            if (response.success && response.data.success) {
                this.projects = response.data.data.projects || [];
                console.log('Projects loaded successfully:', this.projects.length);
            } else {
                console.error('Failed to load projects:', response.data?.message || response.error);
                this.showError(response.data?.message || 'Failed to load projects');
            }
        } catch (error) {
            console.error('Error loading projects:', error);
            this.showError('Network error while loading projects');
        } finally {
            this.isLoading = false;
            this.hideLoadingSpinner();
        }
    }

    /**
     * Show loading spinner
     */
    showLoadingSpinner() {
        if (!this.gridContainer) return;
        
        this.gridContainer.innerHTML = `
            <div class="text-center w-100">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading projects...</span>
                </div>
                <p class="mt-2 text-muted">Loading proof of concepts...</p>
            </div>
        `;
    }

    /**
     * Hide loading spinner
     */
    hideLoadingSpinner() {
        // The renderProjects method will replace the spinner content
    }

    /**
     * Show error message
     */
    showError(message) {
        if (!this.gridContainer) return;
        
        this.gridContainer.innerHTML = `
            <div class="text-center w-100">
                <div class="alert alert-danger" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${message}
                </div>
                <button class="btn btn-outline-primary" onclick="location.reload()">
                    <i class="fas fa-refresh me-2"></i>Retry
                </button>
            </div>
        `;
    }

    /**
     * Load sample POC projects (legacy method - now unused)
     */
    loadSampleProjects() {
        // This method is no longer used as projects are loaded from API
        console.warn('loadSampleProjects is deprecated. Use loadProjectsFromAPI instead.');
    }

    /**
     * Reload projects from API
     */
    async reloadProjects() {
        await this.loadProjectsFromAPI();
        if (this.gridContainer) {
            this.renderProjects();
        }
    }

    /**
     * Render all projects to the grid
     */
    renderProjects() {
        if (!this.gridContainer) return;

        // Clear current content
        this.gridContainer.innerHTML = '';

        // Check if there are projects to display
        if (this.projects.length === 0) {
            this.gridContainer.innerHTML = `
                <div class="text-center w-100">
                    <div class="alert alert-info" role="alert">
                        <i class="fas fa-info-circle me-2"></i>
                        No projects available at the moment.
                    </div>
                </div>
            `;
            return;
        }

        // Create project cards
        this.projects.forEach(project => {
            const projectCard = this.createProjectCard(project);
            this.gridContainer.appendChild(projectCard);
        });
    }

    /**
     * Create a project card element
     * @param {Object} project - Project data
     * @returns {HTMLElement} Project card element
     */
    createProjectCard(project) {
        const card = document.createElement('div');
        card.className = 'poc-card card h-100';
        card.setAttribute('data-status', project.status);

        const statusClass = `status-${project.status}`;
        const statusText = project.status.charAt(0).toUpperCase() + project.status.slice(1);

        card.innerHTML = `
            <div class="card-body d-flex flex-column">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div class="poc-icon">${project.icon}</div>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                
                <h5 class="card-title poc-title">${project.title}</h5>
                <p class="card-text poc-description flex-grow-1">${project.description}</p>
                
                <div class="poc-technologies mb-3">
                    ${project.technologies.map(tech => 
                        `<span class="tech-badge">${tech}</span>`
                    ).join('')}
                </div>
                
                <div class="poc-features mb-3">
                    <small class="text-muted">Key Features:</small>
                    <ul class="feature-list">
                        ${project.features.slice(0, 3).map(feature => 
                            `<li>${feature}</li>`
                        ).join('')}
                    </ul>
                </div>
                
                <div class="card-actions mt-auto">
                    <a href="${project.isDisabled ? '#' : project.demoUrl}" class="btn btn-primary btn-sm w-100${project.isDisabled ? ' disabled' : ''}" ${project.isDisabled ? 'tabindex="-1" aria-disabled="true"' : ''}>
                        View Demo
                    </a>
                </div>
            </div>
        `;

        // Prevent navigation if demo is disabled
        const demoBtn = card.querySelector('.btn');
        if (project.demoIsDisabled) {
            demoBtn.addEventListener('click', function(e) {
                e.preventDefault();
            });
        }

        return card;
    }

    /**
     * Add a new POC project
     * @param {Object} project - Project object with title, description, status, etc.
     */
    addProject(project) {
        this.projects.push(project);
        if (this.gridContainer) {
            this.renderProjects();
        }
        console.log('Project added:', project.title);
    }

    /**
     * Get all POC projects
     * @returns {Array} Array of POC projects
     */
    getProjects() {
        return this.projects;
    }

    /**
     * Get project by ID
     * @param {string} id - Project ID
     * @returns {Object|null} Project object or null if not found
     */
    getProjectById(id) {
        return this.projects.find(project => project.id === id) || null;
    }

    /**
     * Update project status
     * @param {string} id - Project ID
     * @param {string} status - New status ('planning', 'development', 'completed')
     */
    updateProjectStatus(id, status) {
        const project = this.getProjectById(id);
        if (project) {
            project.status = status;
            if (this.gridContainer) {
                this.renderProjects();
            }
            console.log(`Project ${project.title} status updated to: ${status}`);
        }
    }

    /**
     * Remove a project
     * @param {string} id - Project ID
     */
    removeProject(id) {
        const index = this.projects.findIndex(project => project.id === id);
        if (index !== -1) {
            const removedProject = this.projects.splice(index, 1)[0];
            if (this.gridContainer) {
                this.renderProjects();
            }
            console.log('Project removed:', removedProject.title);
        }
    }

    /**
     * Filter projects by status
     * @param {string} status - Status to filter by
     */
    filterByStatus(status) {
        const cards = this.gridContainer.querySelectorAll('.poc-card');
        cards.forEach(card => {
            if (status === 'all' || card.getAttribute('data-status') === status) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }
}

export default POCService;

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = POCService;
}