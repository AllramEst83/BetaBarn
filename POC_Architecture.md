

#### LLM Interpreter
The architecture of the POC interpreter consists of the following layers:

###### Speech to Text Layer
- Provides speech-to-text conversion using various providers:
	- Azure Speech Services

###### Evaluation Layer
- Evaluates the transcribed text using a set of rules to determine which LLM should process the input for interpretation and response generation.
- This layer may itself be an LLM, applying strict criteria to select the most suitable LLM.

###### LLM Layer
- Contains multiple Large Language Models (LLMs) that ingest the speech-to-text output and generate responses:
	- OpenAI
	- Google Gemini
	- Anthropic Claude

###### Text to Speech Layer
- Converts the LLM-generated text responses back into speech using providers such as:
	- Azure Speech Services