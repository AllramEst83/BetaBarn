// import services using ES module syntax
import GoogleService from './googleService.js';
import AnthropicService from './anthropicService.js';
import OpenAIService from './openaiService.js';

export function getLLMService(sentence, googleApiKey, openAIKey) {
  const wordCount = sentence.trim().split(/\s+/).length;


  // Implement a llm to determine which service to use
  if (wordCount > 3) {
    console.log("Routing to GoogleService for text:", sentence);  
    return new GoogleService(googleApiKey);
  }else if (wordCount <= 3) {
    console.log("Routing to OpenAIService for text:", sentence);
    return new OpenAIService(openAIKey);

  }else{
    return new AnthropicService();
  }
}

export default { getLLMService };