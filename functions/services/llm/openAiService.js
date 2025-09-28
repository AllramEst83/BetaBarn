import OpenAI from "openai";


class OpenAIService {
  #openAI;
  constructor(apiKey) {
    this.#openAI = new OpenAI({ apiKey });
  }

  async translateStream(text, langCode1, langCode2, uiService, onChunk) {
    const langName1 = uiService.languages[langCode1];
    const langName2 = uiService.languages[langCode2];
    const prompt = `You are a professional interpreter. Interpret the following text from ${langName1} to ${langName2}. Respond ONLY with the translated text, without any introductory phrases, explanations, or commentary. If the text is already in ${langName2}, still provide the translation to ensure proper ${langName2} grammar and style. The text to translate is: "${text}"`;

    const stream = await this.#openAI.responses.stream({
      model: "gpt-5-mini",
      input: [{ role: "user", content: prompt }],
    });

    let fullTranslation = "";

    stream
      .on("response.output_text.delta", (event) => {
        const chunk = event.delta || "";
        if (chunk) {
          fullTranslation += chunk;
          console.log("OpenAI intermittent text:", chunk);
          if (onChunk) onChunk(chunk);
        }
      })
      .on("response.output_text.done", () => {
        console.log("✅ OpenAI completed translation:", fullTranslation);
        if (onChunk) onChunk(fullTranslation, true); // signal completion
      })
      .on("response.error", (event) => {
        console.error("OpenAI stream error:", event.error);
      });

    const result = await stream.finalResponse();
    return result;
  }
}

export default OpenAIService;


// How to use OpenAI streaming translation in a server-sent events (SSE) context:
// import OpenAIService from './services/llm/openAIService.js';
// const openAIKey = process.env.OPENAI_API_KEY;
// const openAIService = new OpenAIService(openAIKey);
// await openAIService.translateStream(
//   text, 
//   langCode1, 
//   langCode2, 
//   uiService,
//   (currentText, isDone = false) => {
//     try {
//       // Only send new content, not the full accumulated text each time
//       const newContent = currentText.slice(previousText.length);
      
//       if (newContent.length > 0 || isDone) {
//         const sseData = `data: ${JSON.stringify({ 
//           chunk: newContent,
//           fullText: currentText,
//           index: chunkIndex++,
//           isDone: isDone
//         })}\n\n`;

//         controller.enqueue(encoder.encode(sseData));
//         previousText = currentText;
//       }
//     } catch (error) {
//       console.error('Error in streaming callback:', error);
//       controller.error(error);
//     }
//   }
// );