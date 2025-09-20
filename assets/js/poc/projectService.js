
import APIService from "../api/apiService.js";
import { AUTH_CONFIG } from '../auth/auth-config.js';

/**
 * Project Service
 * Handles all API calls related to projects
 */
class ProjectService {
    constructor() {
        this.apiService = new APIService();
    }
    /**
     * Get projects (no authentication required)
     * @returns {Promise<Object>} Response object
     */
    async getProjects() {
        return await this.apiService.get(AUTH_CONFIG.ENDPOINTS.GET_PROJECTS);
    }
    
}


export default ProjectService;

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProjectService;
}
