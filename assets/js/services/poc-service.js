/**
 * POC Service - Manages Proof of Concept projects
 */
class POCService {
    constructor() {
        this.projects = [];
        this.init();
    }

    /**
     * Initialize POC service
     */
    init() {
        // Placeholder for future POC functionality
        console.log('POC Service initialized');
    }

    /**
     * Add a new POC project
     * @param {Object} project - Project object with title, description, status, etc.
     */
    addProject(project) {
        this.projects.push(project);
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
            console.log('Project removed:', removedProject.title);
        }
    }
}

export default POCService;