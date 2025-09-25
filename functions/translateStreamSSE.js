const GeminiService = require('./services/llm/geminiService.js');
const languageService = require('./services/languageService.js');

exports.handler = async (event, context) => {
  // Set CORS headers for SSE
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Credentials': 'true'
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
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Missing required parameters: text, langCode1, langCode2' 
        })
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Gemini API key not configured' })
      };
    }

    // Use centralized language service
    const uiService = languageService.createUIService();

    // Since Netlify functions have limitations with streaming,
    // we'll simulate streaming by collecting chunks and returning the full response
    const geminiService = new GeminiService(apiKey);
    let chunks = [];
    
    const translation = await geminiService.translateStream(
      text, 
      langCode1, 
      langCode2, 
      uiService,
      (chunk) => {
        chunks.push(chunk);
      }
    );

    // Format as Server-Sent Events
    let sseResponse = '';
    chunks.forEach((chunk, index) => {
      sseResponse += `data: ${JSON.stringify({ 
        chunk: chunk, 
        index: index, 
        final: index === chunks.length - 1 
      })}\n\n`;
    });
    
    // Add final message
    sseResponse += `data: ${JSON.stringify({ 
      translation: translation,
      final: true,
      complete: true 
    })}\n\n`;
    
    sseResponse += 'data: [DONE]\n\n';

    return {
      statusCode: 200,
      headers,
      body: sseResponse
    };

  } catch (error) {
    console.error('Translation streaming error:', error);
    
    const errorResponse = `data: ${JSON.stringify({ 
      error: 'Translation failed', 
      message: error.message 
    })}\n\n`;
    
    return {
      statusCode: 500,
      headers,
      body: errorResponse
    };
  }
};