import { GoogleGenAI } from "@google/genai";

class GoogleService {
  #ai;

  constructor(apiKey) {
    if (!apiKey) {
      throw new Error("API key is required for GoogleService.");
    }
    this.#ai = new GoogleGenAI({ apiKey });
  }

  async translateStream(text, langCode1, langCode2, uiService, onChunk) {
    const langName1 = uiService.languages[langCode1];
    const langName2 = uiService.languages[langCode2];
    const prompt = `You are a professional interpreter. Interpret the following text from ${langName1} to ${langName2}. Respond ONLY with the translated text, without any introductory phrases, explanations, or commentary. If the text is already in ${langName2}, still provide the translation to ensure proper ${langName2} grammar and style. The text to translate is: "${text}"`;

    try {
      const response = await this.#ai.models.generateContentStream({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      let fullText = "";
      for await (const chunk of response) {
        if (chunk.text) {
          fullText += chunk.text;
          console.log("Gemini intermittent/completed text:", chunk.text);
          // Pass the accumulated full text, not just the chunk
          onChunk(fullText, false);
        }
      }
      // Signal completion with the final accumulated text
      onChunk(fullText, true);
      return fullText;
    } catch (error) {
      console.error("Gemini stream error:", error);
      const errorMessage = "Sorry, an error occurred during translation.";
      onChunk(errorMessage, true);
      return "Error";
    }
  }
}

export default GoogleService;
