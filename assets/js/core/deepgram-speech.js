import {
  createClient,
  LiveTranscriptionEvents
} from 'https://cdn.jsdelivr.net/npm/@deepgram/sdk/+esm';
import AccessTokenService from '../token/accessTokenService.js';

class DeepgramService {
  #deepgramClient;
  #connection;
  #onTranscriptCallback;
  #onStatusChangeCallback;
  #refreshTimer;

  constructor(onTranscript, onStatusChange, language = 'sv') {
    this.#onTranscriptCallback = onTranscript;
    this.#onStatusChangeCallback = onStatusChange;
    this.accessTokenService = new AccessTokenService();
    this.language = language;
  }

async connect() {
  this.#onStatusChangeCallback('connecting', 'Connecting...');

  try {
  const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        channelCount: 1,
        sampleRate: 44100,
        echoCancellation: true,
        noiseSuppression: true
      } 
    });
    
    // Use linear16 with MediaRecorder
    // Use linear16 encoding if supported, otherwise fallback to opus/webm
    let options = {};
    if (MediaRecorder.isTypeSupported('audio/wav;codecs=linear')) {
      options.mimeType = 'audio/wav;codecs=linear';
    } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      options.mimeType = 'audio/webm;codecs=opus';
    } else {
      console.warn("No supported mimeType for linear16 or opus, using default.");
    }
    
    this.mediaRecorder = new MediaRecorder(stream, options);

    this.mediaRecorder.addEventListener("start", () => {
      console.log("Recorder started");
    });

    this.mediaRecorder.addEventListener("stop", () => {
      console.log("Recorder stopped");
    });

  } catch (error) {
    console.error("Microphone access denied:", error);
    this.#onStatusChangeCallback('error', 'Mic access denied');
    throw new Error("Microphone access was denied. Please allow access to continue.");
  }

  const tokenResponse = await this.accessTokenService.getAccessToken("deepgram-speech");
  console.log("Fetched token:", tokenResponse);

  this.#deepgramClient = createClient({ accessToken: tokenResponse.access_token });

  this.#connection = await this.#deepgramClient.listen.live({
    language: this.language,
    model: "nova-3", // nova-2
    punctuate: true,
    smart_format: true,
    interim_results: true,
    filler_words: false,

    // language: 'multi',
    // endpointing: 100
  });

  this.#setupEventListeners();

  this.#onStatusChangeCallback('listening', 'Listening...');
}

disconnect() {
  this.mediaRecorder?.stop();
  this.mediaRecorder = null;

  this.#connection?.finish();
  clearTimeout(this.#refreshTimer);

  this.#connection = null;
  this.#deepgramClient = null;
  this.#onStatusChangeCallback('idle', 'Idle');
  console.log("Disconnected from Deepgram.");
}



  // --- Private ---
#setupEventListeners() {
  this.#connection.on(LiveTranscriptionEvents.Open, () => {
    console.log("Deepgram connection opened.");

    this.mediaRecorder.addEventListener("dataavailable", async (event) => {
      // Add null check for connection
      if (event.data.size > 0 && this.#connection && this.#connection.getReadyState() === 1) {
        console.log("Sending audio chunk:", event.data.size, "bytes");
        const arrayBuffer = await event.data.arrayBuffer();
        this.#connection.send(arrayBuffer);
      }
    });

    this.mediaRecorder.start(250);
  });

  this.#connection.on(LiveTranscriptionEvents.Transcript, (data) => {
    console.log("Transcript event:", data);
    
    // Access the alternatives array correctly
    const alternatives = data.channel?.alternatives;
    
    if (alternatives && alternatives.length > 0) {

      // Check if this how the data is structured
      let transcript = '';
      if(data.is_final){
        transcript = alternatives[0].transcript;
      }else{
        transcript += alternatives[0].transcript;
      }

      
      console.log("Raw transcript:", transcript);
      console.log("Alternatives:", JSON.stringify(alternatives, null, 2));
      console.log("Is final:", data.is_final);
      
      if (transcript && transcript.trim().length > 0) {
        console.log("Valid transcript found:", transcript);
        this.#onTranscriptCallback(transcript, data);
      }
    } else {
      console.log("No alternatives in response");
    }
  });

  this.#connection.on(LiveTranscriptionEvents.Metadata, (data) => {
    console.log("Metadata:", data);
  });

  this.#connection.on(LiveTranscriptionEvents.Close, () => {
    console.log("Deepgram connection closed.");
    this.disconnect();
  });

  this.#connection.on(LiveTranscriptionEvents.Error, (err) => {
    console.error("Deepgram error:", err);
    this.#onStatusChangeCallback("error", "Connection Error");
    this.disconnect();
  });
}

}

export { DeepgramService };
