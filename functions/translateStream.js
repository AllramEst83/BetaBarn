const GeminiService = require('./services/llm/geminiService.js');
const languageService = require('./services/languageService.js');

exports.handler = async (event, context) => {
  // Set CORS and SSE headers
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
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
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
    const geminiService = new GeminiService(apiKey);

    // Since Netlify functions don't support true streaming responses,
    // we'll return the stream as Server-Sent Events format
    let sseData = '';
    let chunkIndex = 0;
    let previousText = '';

    try {
      await geminiService.translateStream(
        text, 
        langCode1, 
        langCode2, 
        uiService,
        (currentText, isDone = false) => {
          // Only send new content, not the full accumulated text each time
          const newContent = currentText.slice(previousText.length);
          
          if (newContent.length > 0 || isDone) {
            sseData += `data: ${JSON.stringify({ 
              chunk: newContent,
              fullText: currentText,
              index: chunkIndex++,
              isDone: isDone
            })}\n\n`;
            
            previousText = currentText;
            console.log('Sent chunk:', newContent);
          }
        }
      );

      // Add final completion message
      sseData += `data: ${JSON.stringify({ 
        complete: true,
        final: true
      })}\n\n`;
      
      sseData += 'data: [DONE]\n\n';

      return {
        statusCode: 200,
        headers,
        body: sseData
      };

    } catch (streamError) {
      console.error('Streaming translation error:', streamError);
      
      const errorSseData = `data: ${JSON.stringify({ 
        error: 'Translation failed', 
        message: streamError.message 
      })}\n\n`;

      return {
        statusCode: 500,
        headers,
        body: errorSseData
      };
    }

  } catch (error) {
    console.error('Translation request error:', error);
    
    const errorResponse = `data: ${JSON.stringify({ 
      error: 'Request processing failed', 
      message: error.message 
    })}\n\n`;
    
    return {
      statusCode: 500,
      headers,
      body: errorResponse
    };
  }
};