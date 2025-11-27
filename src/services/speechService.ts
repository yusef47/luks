/**
 * Speech Service
 * خدمة الصوت - Text-to-Speech و Speech-to-Text
 * مع دعم الشخصيات المختلفة
 */

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
}

export interface VoiceInfo {
  name: string;
  lang: string;
  gender: 'male' | 'female' | 'unknown';
  isLocal: boolean;
}

export interface SpeechServiceConfig {
  lang?: string;
  rate?: number;
  pitch?: number;
  voiceHints?: string[];
  voiceName?: string;
}

class SpeechService {
  private recognition: any = null;
  private isListening: boolean = false;
  private continuousMode: boolean = false;
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private voicesLoaded: boolean = false;

  constructor() {
    // Preload voices
    this.loadVoices();
  }

  /**
   * Load available voices
   */
  private loadVoices(): void {
    if (!('speechSynthesis' in window)) return;

    const loadVoicesHandler = () => {
      this.cachedVoices = window.speechSynthesis.getVoices();
      this.voicesLoaded = true;
      console.log(`🎤 Loaded ${this.cachedVoices.length} voices`);
    };

    // Try to load immediately
    loadVoicesHandler();

    // Also listen for voiceschanged event (for Chrome)
    window.speechSynthesis.onvoiceschanged = loadVoicesHandler;
  }

  /**
   * Get all available voices
   */
  getAvailableVoices(): VoiceInfo[] {
    if (!this.voicesLoaded) {
      this.cachedVoices = window.speechSynthesis?.getVoices() || [];
    }

    return this.cachedVoices.map(v => ({
      name: v.name,
      lang: v.lang,
      gender: this.guessGender(v.name),
      isLocal: v.localService
    }));
  }

  /**
   * Guess gender from voice name
   */
  private guessGender(name: string): 'male' | 'female' | 'unknown' {
    const lowerName = name.toLowerCase();
    const femaleHints = ['zira', 'samantha', 'female', 'woman', 'jenny', 'aria', 'sara', 'emma', 'sofia', 'michelle', 'catherine', 'karen', 'moira', 'tessa', 'fiona', 'victoria', 'susan'];
    const maleHints = ['david', 'mark', 'male', 'man', 'guy', 'eric', 'james', 'daniel', 'tom', 'alex', 'fred', 'ralph', 'lee', 'oliver'];

    if (femaleHints.some(h => lowerName.includes(h))) return 'female';
    if (maleHints.some(h => lowerName.includes(h))) return 'male';
    return 'unknown';
  }

  /**
   * Find best matching voice for persona
   */
  findVoiceForPersona(voiceHints: string[], preferredGender?: 'male' | 'female'): SpeechSynthesisVoice | null {
    if (!this.voicesLoaded) {
      this.cachedVoices = window.speechSynthesis?.getVoices() || [];
    }

    // Filter to English voices only
    const englishVoices = this.cachedVoices.filter(v => 
      v.lang.startsWith('en-US') || v.lang.startsWith('en')
    );

    if (englishVoices.length === 0) {
      console.warn('⚠️ No English voices found');
      return this.cachedVoices[0] || null;
    }

    // Try to find a voice matching the hints
    for (const hint of voiceHints) {
      const found = englishVoices.find(v => 
        v.name.toLowerCase().includes(hint.toLowerCase())
      );
      if (found) {
        console.log(`✅ Found voice matching hint "${hint}": ${found.name}`);
        return found;
      }
    }

    // Fallback: find by gender
    if (preferredGender) {
      const genderMatch = englishVoices.find(v => 
        this.guessGender(v.name) === preferredGender
      );
      if (genderMatch) {
        console.log(`✅ Found ${preferredGender} voice: ${genderMatch.name}`);
        return genderMatch;
      }
    }

    // Final fallback: first English voice
    console.log(`ℹ️ Using default voice: ${englishVoices[0].name}`);
    return englishVoices[0];
  }

  /**
   * Text-to-Speech - تحويل النص إلى صوت
   */
  speak(text: string, config: SpeechServiceConfig = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = config.lang || 'en-US';
      utterance.rate = config.rate || 1.0;
      utterance.pitch = config.pitch || 1.0;

      // Select voice based on hints or name
      if (config.voiceName) {
        const exactMatch = this.cachedVoices.find(v => v.name === config.voiceName);
        if (exactMatch) {
          utterance.voice = exactMatch;
          console.log(`🎙️ Using exact voice: ${exactMatch.name}`);
        }
      } else if (config.voiceHints && config.voiceHints.length > 0) {
        const matchedVoice = this.findVoiceForPersona(config.voiceHints);
        if (matchedVoice) {
          utterance.voice = matchedVoice;
          console.log(`🎙️ Using matched voice: ${matchedVoice.name}`);
        }
      }

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(`Speech error: ${event.error}`));

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Preview a voice with sample text
   */
  previewVoice(voiceHints: string[], sampleText?: string): Promise<void> {
    const text = sampleText || "Hello! I'm your English tutor. Let's practice together!";
    return this.speak(text, { voiceHints, rate: 1.0 });
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return window.speechSynthesis?.speaking || false;
  }

  /**
   * Stop speaking
   */
  stopSpeaking(): void {
    window.speechSynthesis?.cancel();
  }

  /**
   * Check if Speech Recognition is supported
   */
  isRecognitionSupported(): boolean {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  /**
   * Start Speech Recognition - تحويل الصوت إلى نص
   */
  startListening(
    onResult: (result: SpeechRecognitionResult) => void,
    onError?: (error: string) => void,
    config: SpeechServiceConfig = {}
  ): void {
    if (!this.isRecognitionSupported()) {
      onError?.('Speech recognition not supported in this browser');
      return;
    }

    // Stop any existing recognition
    this.stopListening();

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    this.recognition = new SpeechRecognition();

    this.recognition.lang = config.lang || 'en-US';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
      console.log('🎤 Speech recognition started');
    };

    this.recognition.onend = () => {
      console.log('🛑 Speech recognition ended');
      this.isListening = false;
      
      // Auto-restart if in continuous mode and not speaking
      if (this.continuousMode && !this.isSpeaking()) {
        console.log('🔄 Auto-restarting recognition (continuous mode)');
        setTimeout(() => this.restartListening(onResult, onError, config), 300);
      }
    };

    this.recognition.onresult = (event: any) => {
      const result = event.results[0][0];
      console.log('📝 Speech recognized:', result.transcript);
      onResult({
        transcript: result.transcript,
        confidence: result.confidence
      });
    };

    this.recognition.onerror = (event: any) => {
      console.error('❌ Speech recognition error:', event.error);
      
      if (event.error === 'no-speech' && this.continuousMode && !this.isSpeaking()) {
        // Silently restart on no-speech
        setTimeout(() => this.restartListening(onResult, onError, config), 300);
      } else if (event.error !== 'aborted') {
        onError?.(event.error);
      }
    };

    try {
      this.recognition.start();
    } catch (e: any) {
      console.error('❌ Failed to start recognition:', e);
      onError?.(e.message);
    }
  }

  /**
   * Restart listening (internal helper)
   */
  private restartListening(
    onResult: (result: SpeechRecognitionResult) => void,
    onError?: (error: string) => void,
    config: SpeechServiceConfig = {}
  ): void {
    if (this.continuousMode && !this.isSpeaking()) {
      this.startListening(onResult, onError, config);
    }
  }

  /**
   * Start Continuous Listening Mode
   */
  startContinuousListening(
    onResult: (result: SpeechRecognitionResult) => void,
    onError?: (error: string) => void,
    config: SpeechServiceConfig = {}
  ): void {
    this.continuousMode = true;
    this.startListening(onResult, onError, config);
  }

  /**
   * Stop Listening
   */
  stopListening(): void {
    this.continuousMode = false;
    this.isListening = false;
    
    if (this.recognition) {
      try {
        this.recognition.stop();
        this.recognition = null;
      } catch (e) {
        console.error('Error stopping recognition:', e);
      }
    }
  }

  /**
   * Pause listening temporarily (e.g., while AI is speaking)
   */
  pauseListening(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore
      }
    }
  }

  /**
   * Resume listening after pause
   */
  resumeListening(
    onResult: (result: SpeechRecognitionResult) => void,
    onError?: (error: string) => void,
    config: SpeechServiceConfig = {}
  ): void {
    if (this.continuousMode) {
      setTimeout(() => this.startListening(onResult, onError, config), 500);
    }
  }

  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Check if in continuous mode
   */
  isContinuousMode(): boolean {
    return this.continuousMode;
  }
}

// Export singleton instance
export const speechService = new SpeechService();
export default speechService;
