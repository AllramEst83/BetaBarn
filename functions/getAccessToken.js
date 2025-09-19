
const AccessTokenService = require('./services/tokenService');

exports.handler = async function (event, context) {
    console.log('Access token request received');
    
    const tokenService = new AccessTokenService();
    
    try {
        // Get provider from query params or use default
        const queryParams = event.queryStringParameters || {};
        const requestedProvider = queryParams.provider;
        
        // Log available providers for debugging
        const providerInfo = tokenService.getProviderInfo();
        console.log('Provider info:', JSON.stringify(providerInfo, null, 2));
        
        // Get token from the requested or default provider
        const tokenResponse = await tokenService.getToken(requestedProvider);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
            },
            body: JSON.stringify({
                ...tokenResponse,
                availableProviders: tokenService.getAvailableProviders()
            })
        };
    } catch (error) {
        console.error('Token service error:', error.message);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                error: error.message,
                availableProviders: tokenService.getAvailableProviders()
            })
        };
    }
};