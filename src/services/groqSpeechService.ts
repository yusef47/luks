/**
 * Groq Speech Service
 * خدمة الصوت باستخدام Groq - بديل لـ Web Speech API
 * 
 * يستخدم:
 * - Whisper Large v3 Turbo للتعرف على الصوت (STT)
 * - PlayAI TTS لإنشاء الصوت (TTS)
 */

class GroqSpeechService {
    private audio: HTMLAudioElement | null = null;
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private isRecording = false;
    private _isSpeaking = false;

    constructor() {
        if (typeof window !== 'undefined') {
            this.audio = new Audio();
            this.audio.onended = () => {
                this._isSpeaking = false;
            };
        }
    }

    /**
     * Check if speech synthesis is available
     */
    isSynthesisSupported(): boolean {
        return true; // Always supported via API
    }

    /**
     * Check if speech recognition is available
     */
    isRecognitionSupported(): boolean {
        return typeof window !== 'undefined' &&
            navigator.mediaDevices &&
            typeof navigator.mediaDevices.getUserMedia === 'function';
    }

    /**
     * Check if currently speaking
     */
    isSpeaking(): boolean {
        return this._isSpeaking;
    }

    /**
     * Speak text using Groq PlayAI TTS
     */
    async speak(text: string, options: {
        voice?: string;
        speed?: 'slow' | 'normal' | 'fast';
    } = {}): Promise<void> {
        if (!text || !this.audio) return;

        try {
            this._isSpeaking = true;

            const response = await fetch('/api/tutor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'tts',
                    text,
                    voice: options.voice || 'emma',
                    speed: options.speed || 'normal'
                })
            });

            if (!response.ok) {
                throw new Error('TTS API error');
            }

            const data = await response.json();

            if (data.success && data.data?.audio) {
                return new Promise((resolve, reject) => {
                    if (!this.audio) {
                        reject(new Error('Audio not available'));
                        return;
                    }

                    this.audio.src = `data:audio/mp3;base64,${data.data.audio}`;
                    this.audio.onended = () => {
                        this._isSpeaking = false;
                        resolve();
                    };
                    this.audio.onerror = (e) => {
                        this._isSpeaking = false;
                        reject(e);
                    };
                    this.audio.play().catch(reject);
                });
            }
        } catch (error) {
            this._isSpeaking = false;
            console.error('TTS Error:', error);
            throw error;
        }
    }

    /**
     * Stop speaking
     */
    stopSpeaking(): void {
        if (this.audio) {
            this.audio.pause();
            this.audio.currentTime = 0;
        }
        this._isSpeaking = false;
    }

    /**
     * Start recording audio for STT
     */
    async startRecording(): Promise<void> {
        if (this.isRecording) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.start();
            this.isRecording = true;
        } catch (error) {
            console.error('Recording error:', error);
            throw error;
        }
    }

    /**
     * Stop recording and transcribe audio
     */
    async stopRecordingAndTranscribe(): Promise<string> {
        if (!this.isRecording || !this.mediaRecorder) {
            return '';
        }

        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                resolve('');
                return;
            }

            this.mediaRecorder.onstop = async () => {
                this.isRecording = false;

                try {
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                    const base64Audio = await this.blobToBase64(audioBlob);

                    const response = await fetch('/api/tutor', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'stt',
                            audio: base64Audio
                        })
                    });

                    if (!response.ok) {
                        throw new Error('STT API error');
                    }

                    const data = await response.json();

                    if (data.success && data.data?.text) {
                        resolve(data.data.text);
                    } else {
                        resolve('');
                    }
                } catch (error) {
                    console.error('STT Error:', error);
                    reject(error);
                }

                // Stop all tracks
                if (this.mediaRecorder?.stream) {
                    this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
                }
            };

            this.mediaRecorder.stop();
        });
    }

    /**
     * Cancel recording without transcribing
     */
    cancelRecording(): void {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            if (this.mediaRecorder.stream) {
                this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            }
        }
        this.isRecording = false;
        this.audioChunks = [];
    }

    /**
     * Check if currently recording
     */
    isCurrentlyRecording(): boolean {
        return this.isRecording;
    }

    /**
     * Convert blob to base64
     */
    private blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                // Remove the data URL prefix
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}

// Export singleton instance
export const groqSpeechService = new GroqSpeechService();
export default groqSpeechService;
