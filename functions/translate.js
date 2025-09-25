const GeminiService = require('./services/llm/geminiService.js');
const languageService = require('./services/languageService.js');

exports.handler = async (event, context) => {
  console.log('Translation request received:', {
    method: event.httpMethod,
    headers: event.headers,
    body: event.body ? 'Present' : 'Missing'
  });

  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    let requestData;
    try {
      requestData = JSON.parse(event.body);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return {
        statusCode: 400,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: parseError.message 
        })
      };
    }

    const { text, langCode1, langCode2 } = requestData;
    
    console.log('Translation parameters:', { 
      text: text ? `${text.substring(0, 100)}...` : 'undefined',
      langCode1,
      langCode2
    });
    
    if (!text || !langCode1 || !langCode2) {
      return {
        statusCode: 400,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Missing required parameters',
          required: ['text', 'langCode1', 'langCode2'],
          received: {
            text: !!text,
            langCode1: !!langCode1,
            langCode2: !!langCode2
          }
        })
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Gemini API key not found in environment variables');
      return {
        statusCode: 500,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Translation service configuration error',
          message: 'API key not configured'
        })
      };
    }

    console.log('Gemini API key found, initializing service...');

    // Use centralized language service
    const uiService = languageService.createUIService();

    const geminiService = new GeminiService(apiKey);
    
    console.log('Starting translation with Gemini service...');
    
    let fullTranslation = '';
    let lastChunk = '';
    
    try {
      const translation = await geminiService.translateStream(
        text, 
        langCode1, 
        langCode2, 
        uiService,
        (chunk) => {
          console.log('Received chunk:', chunk ? chunk.substring(0, 50) + '...' : 'empty');
          fullTranslation = chunk;
          lastChunk = chunk;
        }
      );

      console.log('Translation completed successfully');

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: true,
          translation: fullTranslation || translation,
          sourceLanguage: langCode1,
          targetLanguage: langCode2,
          sourceLanguageName: languageService.getLanguageName(langCode1),
          targetLanguageName: languageService.getLanguageName(langCode2),
          originalText: text
        })
      };

    } catch (translationError) {
      console.error('Translation service error:', translationError);
      return {
        statusCode: 500,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Translation processing failed', 
          message: translationError.message,
          details: translationError.stack
        })
      };
    }

  } catch (error) {
    console.error('General translation error:', error);
    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};