exports.handler = async function (event, context) {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, message: 'Method not allowed' })
        };
    }

    try {
        const { username, password } = JSON.parse(event.body);
        
        // Validate input
        if (!username || !password) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, message: 'Username and password are required' })
            };
        }

        // Define valid users from environment variables
        const validUsers = [
            {
                username: process.env.KAYS_USERNAME,
                password: process.env.KAYS_PASSWORD
            },
            {
                username: process.env.JUSTYN_USERNAME,
                password: process.env.JUSTYN_PASSWORD
            }
        ].filter(user => user.username && user.password); // Only include users with both username and password

        // Check credentials against valid users
        const authenticatedUser = validUsers.find(user => 
            user.username === username && user.password === password
        );
        
        if (authenticatedUser) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, message: 'Login successful' })
            };
        } else {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ success: false, message: 'Invalid credentials' })
            };
        }
    } catch (error) {
        console.error('Login error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: 'Internal server error' })
        };
    }
};