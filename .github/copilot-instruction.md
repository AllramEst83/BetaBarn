# Beta Barn - Coding Guidelines & Best Practices

## Core Technology Stack

### Primary Technologies
- **HTML5**: Semantic markup with accessibility in mind
- **CSS3**: Modern CSS with custom properties (CSS variables)
- **Vanilla JavaScript**: No frameworks, pure ES6+ JavaScript
- **Bootstrap 5**: For responsive design and UI components

### Module System
- Use ES6 modules with `type="module"` on script tags
- Implement proper import/export statements
- Organize code into logical modules and services

## Architecture Patterns

### Service Pattern
All business logic should be organized into service classes:

```javascript
// Example service structure
export class ExampleService {
    constructor() {
        this.data = [];
    }
    
    init() {
        // Initialize service
    }
    
    // Business logic methods
}
```

### Module Organization
```
js/
├── app.js              # Main application entry point
├── services/           # Business logic services
│   ├── ThemeService.js
│   ├── POCService.js
│   └── DataService.js
├── components/         # Reusable UI components
├── utils/              # Utility functions
└── constants/          # Application constants
```

## Component-Based Architecture
To keep the UI organized and maintainable, adopt a simple component-based architecture. A component is a self-contained, reusable piece of the UI, encapsulated within a class.

### Component Structure
Each component should be a class that handles its own state, rendering, and event listeners.

```javascript
// components/ExampleComponent.js
export class ExampleComponent {
    constructor(elementId, options = {}) {
        this.element = document.getElementById(elementId);
        this.options = options;
        this.state = {
            // initial state
        };

        if (!this.element) {
            throw new Error(`Element with id "${elementId}" not found.`);
        }
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.render();
    }

    render() {
        // Generate HTML based on state
        this.element.innerHTML = `
            <h2>${this.options.title}</h2>
            <p>Current count: ${this.state.count}</p>
            <button class="increment-btn">Increment</button>
        `;
        this.bindEvents();
    }

    bindEvents() {
        const button = this.element.querySelector('.increment-btn');
        button.addEventListener('click', () => {
            this.setState({ count: (this.state.count || 0) + 1 });
        });
    }

    init() {
        this.render();
    }
}
```

### Component Lifecycle
1.  **Constructor**: Initialize properties and find the root element.
2.  **init()**: Perform the initial render and event binding.
3.  **setState()**: Update the component's state and trigger a re-render.
4.  **render()**: Generate and apply the component's HTML to the DOM.
5.  **bindEvents()**: Attach necessary event listeners.

## Code Standards

### JavaScript Best Practices

#### 1. Use Modern JavaScript Features
- Prefer `const` and `let` over `var`
- Use arrow functions when appropriate
- Implement template literals for string interpolation
- Use destructuring for object and array assignments
- **Leverage `async/await`** for cleaner asynchronous code.
- **Use `Promise.all`** to run multiple promises concurrently and wait for all to resolve. This is efficient for independent async tasks.
- **Use `Promise.allSettled`** when you need to wait for all promises to complete, regardless of whether they resolve or reject. This is useful for fetching multiple resources where some may fail.

#### 2. Error Handling
```javascript
// Always implement proper error handling
try {
    const data = await fetchData();
    return data;
} catch (error) {
    console.error('Failed to fetch data:', error);
    // Handle error appropriately
}
```

#### 3. Function Documentation
```javascript
/**
 * Brief description of the function
 * @param {string} param1 - Description of parameter
 * @param {Object} options - Configuration options
 * @returns {Promise<Array>} Description of return value
 */
async function exampleFunction(param1, options = {}) {
    // Implementation
}
```

#### 4. Event Handling
- Use event delegation when appropriate
- Always clean up event listeners
- Implement debouncing for performance-critical events

#### 5. DOM Manipulation
- **Cache DOM element references** to avoid redundant queries.
- **Use `DocumentFragment` for bulk updates**: When adding multiple elements, append them to a `DocumentFragment` first, then append the fragment to the DOM. This minimizes reflows and is more secure than `innerHTML`.
- **Avoid `innerHTML` with dynamic content**: To prevent XSS vulnerabilities, use `textContent` to insert text. Only use `innerHTML` for static, trusted HTML.
- **Always check if an element exists** before attempting to manipulate it.

#### 6. Functional Concepts
- **Embrace Pure Functions**: Write functions that have no side effects and return the same output for the same input. This makes code more predictable, testable, and easier to reason about.
- **Prefer Immutability**: Avoid directly modifying objects and arrays. Instead, create new ones with the updated values. This prevents unintended side effects and simplifies state management.

```javascript
// Good: Returns a new, sorted array
const sortedArr = [...myArray].sort((a, b) => a - b);

// Bad: Mutates the original array
myArray.sort((a, b) => a - b);
```

### CSS Best Practices

#### 1. CSS Variables (Custom Properties)
```css
:root {
    /* Define all color variables */
    --primary-color: #2563eb;
    --text-primary: #1e293b;
    
    /* Theme-specific overrides */
}

[data-theme="dark"] {
    --primary-color: #3b82f6;
    --text-primary: #f1f5f9;
}
```

#### 2. Naming Conventions
- Use kebab-case for CSS classes
- Follow BEM methodology when appropriate
- Prefix custom classes to avoid conflicts with Bootstrap

#### 3. Responsive Design
- Mobile-first approach
- Use CSS Grid and Flexbox
- Implement fluid typography and spacing

### HTML Best Practices

#### 1. Semantic Markup
- Use appropriate HTML5 semantic elements
- Implement proper heading hierarchy
- Include ARIA attributes for accessibility

#### 2. Performance
- Optimize images and assets
- Use appropriate loading strategies
- Minimize HTTP requests

## Design Patterns
### Recommended Pattern: Service Pattern
For Beta Barn projects, the Service Pattern is recommended as the primary design approach. This pattern organizes business logic into dedicated service classes, promoting modularity, maintainability, and scalability. Services should be placed in the `services/` directory and implemented as ES6 modules.

**Benefits:**
- Clear separation of concerns
- Easier testing and reuse
- Consistent structure across the codebase

**Example:**
```javascript
export class ExampleService {
    constructor() {
        this.data = [];
    }
    init() {
        // Initialize service
    }
    // Business logic methods
}
```

### 1. Observer Pattern
Implement for event-driven communication between components:

```javascript
class EventEmitter {
    constructor() {
        this.events = {};
    }
    
    on(event, listener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }
    
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(listener => listener(data));
        }
    }
}
```

### 2. Factory Pattern
Use for creating similar objects:

```javascript
class ComponentFactory {
    static create(type, options) {
        switch (type) {
            case 'card':
                return new CardComponent(options);
            case 'modal':
                return new ModalComponent(options);
            default:
                throw new Error(`Unknown component type: ${type}`);
        }
    }
}
```

### 3. Singleton Pattern (Module-based)
For services that require a single, shared instance across the application. The modern approach is to leverage ES6 modules, which are singletons by nature. Create an instance of the class within the module and export that instance.

```javascript
// services/ConfigService.js
class ConfigService {
    constructor() {
        // This constructor will only be called once
        this.config = {
            // Default configuration
        };
    }

    get(key) {
        return this.config[key];
    }

    set(key, value) {
        this.config[key] = value;
    }
}

// Export a single, shared instance
export const configService = new ConfigService();
```

To use it, import the instance directly:
```javascript
// app.js
import { configService } from './services/ConfigService.js';

configService.set('theme', 'dark');
```

### 4. State Management (Observable Pattern)
For managing shared application state, use a simple observable pattern. This allows different parts of the application to react to state changes without being tightly coupled.

```javascript
// utils/createStore.js
export function createStore(initialState) {
    let state = initialState;
    const listeners = new Set();

    function getState() {
        return state;
    }

    function setState(newState) {
        state = { ...state, ...newState };
        listeners.forEach(listener => listener(state));
    }

    function subscribe(listener) {
        listeners.add(listener);
        return function unsubscribe() {
            listeners.delete(listener);
        };
    }

    return { getState, setState, subscribe };
}
```

**Usage:**
```javascript
// services/UserStore.js
import { createStore } from '../utils/createStore.js';

const userStore = createStore({ user: null, theme: 'light' });
export default userStore;

// component.js
import userStore from '../services/UserStore.js';

userStore.subscribe(state => {
    console.log('State changed:', state);
    // Update UI based on new state
});

userStore.setState({ theme: 'dark' });
```

## File Organization

### Project Structure
```
BetaBarn/
├── index.html
├── css/
│   ├── styles.css      # Custom styles
│   └── themes.css      # Theme variations
├── js/
│   ├── app.js          # Main entry point
│   ├── services/       # Business logic
│   ├── components/     # UI components
│   ├── utils/          # Helper functions
│   └── constants/      # App constants
├── assets/
│   ├── images/
│   ├── icons/
│   └── fonts/
├── docs/               # Documentation
└── tests/              # Test files
```

## Testing Guidelines

### Unit Testing
- Write tests for all service methods
- Test edge cases and error conditions
- Use descriptive test names

### Integration Testing
- Test component interactions
- Verify service integrations
- Test user workflows

## Performance Guidelines

### 1. Code Splitting
- Load JavaScript modules on demand
- Implement lazy loading for non-critical features

### 2. Caching Strategies
- Use localStorage for user preferences
- Implement proper cache headers
- Cache DOM element references

### 3. Optimization
- Minimize DOM queries
- Debounce expensive operations
- Use requestAnimationFrame for animations

## Security Best Practices

### 1. Input Validation
- Sanitize all user inputs
- Validate data on both client and server
- Use proper encoding for output

### 2. XSS Prevention
- Avoid using `innerHTML` with user data
- Use `textContent` when possible
- Implement Content Security Policy (CSP)

## Accessibility Guidelines

### 1. ARIA Implementation
- Use proper ARIA labels and roles
- Implement keyboard navigation
- Ensure proper focus management

### 2. Color and Contrast
- Maintain WCAG AA contrast ratios
- Don't rely solely on color for information
- Support high contrast modes

## Documentation Standards

### 1. Code Comments
- Write self-documenting code
- Add comments for complex business logic
- Document public API methods

### 2. README Files
- Include setup instructions
- Document API endpoints
- Provide usage examples

## Git Workflow

### 1. Commit Messages
```
feat: add theme switching functionality
fix: resolve mobile navigation issue
docs: update coding guidelines
style: improve button hover states
refactor: extract theme service logic
```

### 2. Branch Naming
- `feature/poc-management-system`
- `bugfix/theme-toggle-issue`
- `hotfix/critical-security-patch`

---

*These guidelines should be followed for all Beta Barn projects to ensure consistency, maintainability, and high code quality.*