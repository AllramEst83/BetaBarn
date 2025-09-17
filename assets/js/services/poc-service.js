/**
 * POC Service - Manages Proof of Concept projects
 */
class POCService {
    constructor() {
        this.projects = [];
        this.gridContainer = null;
        this.init();
    }

    /**
     * Initialize POC service
     */
    init() {
        this.loadSampleProjects();
        this.gridContainer = document.getElementById('pocGrid');
        
        // Render projects if grid container exists
        if (this.gridContainer) {
            this.renderProjects();
        }
        
        console.log('POC Service initialized with', this.projects.length, 'projects');
    }

    /**
     * Load sample POC projects
     */
    loadSampleProjects() {
        const sampleProjects = [
            {
                id: 'llm-interpreter',
                title: 'LLM Interpreter',
                description: 'A multi-layered AI interpreter system featuring speech-to-text conversion, intelligent LLM evaluation, and text-to-speech output for seamless multilingual communication.',
                status: 'planning',
                technologies: ['Azure Speech Services', 'OpenAI', 'Google Gemini', 'Anthropic Claude'],
                icon: '🗣️',
                demoUrl: '#',
                sourceUrl: '#',
                features: ['Speech-to-text conversion', 'Multi-LLM evaluation layer', 'Intelligent model selection', 'Text-to-speech output']
            }
        ];

        this.projects = sampleProjects;
    }

    /**
     * Render all projects to the grid
     */
    renderProjects() {
        if (!this.gridContainer) return;

        // Clear loading spinner
        this.gridContainer.innerHTML = '';

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
                    <a href="${project.demoUrl}" class="btn btn-primary btn-sm w-100">
                        View Demo
                    </a>
                </div>
            </div>
        `;

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