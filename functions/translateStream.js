import languageService from './services/languageService.js';
import GoogleService from './services/llm/googleService.js';
import OpenAIService from './services/llm/OpenAIService.js';
import llmRouter, { getLLMService } from './services/llm/llmRouter.js';  
// Netlify Functions 2.0 streaming handler
export default async (req, context) => {
  // Set CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  };

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('', {
      status: 200,
      headers: corsHeaders
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    const { text, langCode1, langCode2 } = await req.json();
    
    if (!text || !langCode1 || !langCode2) {
      return new Response(JSON.stringify({ 
        error: 'Missing required parameters: text, langCode1, langCode2' 
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const googleApiKey = process.env.GEMINI_API_KEY;
    const openAIKey = process.env.OPENAI_API_KEY;
    if (!googleApiKey || !openAIKey) {
      return new Response(JSON.stringify({ error: 'API keys not configured' }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

  // Use static ES module imports with correct relative paths

    // Use centralized language service
    const uiService = languageService.createUIService();
    const encoder = new TextEncoder();

    // Create streaming response using ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        let chunkIndex = 0;
        let previousText = '';

        const llProvider = getLLMService(text, googleApiKey, openAIKey);

        try {
          await llProvider.translateStream(
            text, 
            langCode1, 
            langCode2, 
            uiService,
            (currentText, isDone = false) => {
              try {
                // Only send new content, not the full accumulated text each time
                const newContent = currentText.slice(previousText.length);
                
                if (newContent.length > 0 || isDone) {
                  const sseData = `data: ${JSON.stringify({ 
                    chunk: newContent,
                    fullText: currentText,
                    index: chunkIndex++,
                    isDone: isDone
                  })}\n\n`;

                  controller.enqueue(encoder.encode(sseData));
                  previousText = currentText;
                }
              } catch (error) {
                console.error('Error in streaming callback:', error);
                controller.error(error);
              }
            }
          );

          // Send final completion message
          const completionData = `data: ${JSON.stringify({ 
            complete: true,
            final: true
          })}\n\n`;
          controller.enqueue(encoder.encode(completionData));
          
          const doneData = 'data: [DONE]\n\n';
          controller.enqueue(encoder.encode(doneData));
          
          // Close the stream
          controller.close();

        } catch (streamError) {
          console.error('Streaming translation error:', streamError);
          
          const errorData = `data: ${JSON.stringify({ 
            error: 'Translation failed', 
            message: streamError.message 
          })}\n\n`;
          
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      }
    });

    // Return streaming response
    return new Response(stream, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    console.error('Translation request error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Request processing failed', 
      message: error.message 
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
};