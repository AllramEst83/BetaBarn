const GeminiService = require('./services/llm/geminiService.js');
const languageService = require('./services/languageService.js');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'text/plain',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { text, langCode1, langCode2 } = JSON.parse(event.body);
    
    if (!text || !langCode1 || !langCode2) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required parameters: text, langCode1, langCode2' 
        })
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Gemini API key not configured' })
      };
    }

    // Use centralized language service
    const uiService = languageService.createUIService();

    // For streaming response, we need to return immediately and let the client handle the stream
    const geminiService = new GeminiService(apiKey);
    
    // Since Netlify functions don't support true streaming responses,
    // we'll collect the full response and return it
    let fullTranslation = '';
    
    const translation = await geminiService.translateStream(
      text, 
      langCode1, 
      langCode2, 
      uiService,
      (chunk) => {
        fullTranslation = chunk;
      }
    );

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        translation: fullTranslation,
        sourceLanguage: langCode1,
        targetLanguage: langCode2
      })
    };

  } catch (error) {
    console.error('Translation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Translation failed', 
        message: error.message 
      })
    };
  }
};