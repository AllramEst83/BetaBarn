async function testGeminiStream() {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    console.log("No API key found");
    return;
  }

  console.log("Testing Gemini streaming...");
  
  try {
    // Test with direct fetch to see raw response format
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Say hello in 3 words" }] }]
        })
      }
    );

    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let chunkCount = 0;
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      console.log(`\n--- Chunk ${chunkCount++} ---`);
      console.log('Raw chunk:', JSON.stringify(chunk));
      console.log('Chunk content:');
      console.log(chunk);
      console.log('--- End Chunk ---\n');
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
}

testGeminiStream();