class GeminiService {
  #apiKey;
  #streamApiUrl =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent";

  constructor(apiKey) {
    if (!apiKey) {
      throw new Error("API key is required for GeminiService.");
    }
    this.#apiKey = apiKey;
  }

  async translateStream(text, langCode1, langCode2, uiService, onChunk) {
    const langName1 = uiService.languages[langCode1];
    const langName2 = uiService.languages[langCode2];
    const prompt = `You are a professional interpreter . Interpreter  the following text from ${langName1} to ${langName2}. Respond ONLY with the translated text, without any introductory phrases, explanations, or commentary. If the text is already in ${langName2}, still provide the translation to ensure proper ${langName2} grammar and style. The text to translate is: "${text}"`;

    const payload = { contents: [{ parts: [{ text: prompt }] }] };
    let fullText = "";
    try {
      const response = await this.fetchWithRetry(
        `${this.#streamApiUrl}?key=${this.#apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const regex = /"text"\s*:\s*"([^"]*)"/g;
        let match;
        while ((match = regex.exec(chunk)) !== null) {
          const textPart = JSON.parse(`"${match[1]}"`);
          fullText += textPart;
          onChunk(fullText);
        }
      }
    } catch (error) {
      console.error("Gemini stream error:", error);
      onChunk("Sorry, an error occurred during translation.");
      fullText = "Error";
    }
    return fullText;
  }

  async fetchWithRetry(url, options, retries = 5, delay = 1000) {
    for (let i = 0; i < retries; i++) {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status === 429 || response.status >= 500) {
        console.warn(`API rate limited. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        throw new Error(
          `API Error: ${response.status} ${response.statusText}`
        );
      }
    }
    throw new Error(`API request failed after multiple retries.`);
  }
}

// Export for CommonJS (Netlify Functions)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GeminiService;
}