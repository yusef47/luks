/**
 * useEnglishTutor Hook
 * هوك المعلم الإنجليزي - يدير كل منطق الـ Tutor Mode
 * مع دعم الشخصيات المختلفة
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { groqSpeechService } from '../services/groqSpeechService';
import {
  generateTutorResponse,
  generatePracticeSentence,
  evaluateAttempt,
  TutorMessage,
  LanguageLevel,
  TutorFeedback,
  SentencePractice
} from '../services/tutorClient';
import { tutorPersonas, TutorPersona, getPersonaById, defaultPersonaId } from '../config/tutorPersonas';

export type TutorMode = 'conversation' | 'practice' | 'idle';

export interface TutorState {
  isActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  mode: TutorMode;
  languageLevel: LanguageLevel;
  speechRate: number;
  personaId: string;
  currentPractice: SentencePractice | null;
  lastFeedback: TutorFeedback | null;
  error: string | null;
}

export interface TutorSession {
  id: string;
  messages: TutorMessage[];
  startedAt: Date;
  practiceCount: number;
  averageScore: number;
}

export function useEnglishTutor() {
  // State
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<TutorMode>('conversation');
  const [languageLevel, setLanguageLevel] = useState<LanguageLevel>('B1');
  const [speechRate, setSpeechRate] = useState(1.0);
  const [personaId, setPersonaId] = useState<string>(() => {
    // Load from localStorage or use default
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tutor_persona') || defaultPersonaId;
    }
    return defaultPersonaId;
  });
  const [currentPractice, setCurrentPractice] = useState<SentencePractice | null>(null);
  const [lastFeedback, setLastFeedback] = useState<TutorFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasGreeted, setHasGreeted] = useState(false);

  // Get current persona
  const currentPersona = getPersonaById(personaId) || tutorPersonas[0];

  // Save persona to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('tutor_persona', personaId);
  }, [personaId]);

  // Session management
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const sessionRef = useRef<TutorSession>({
    id: Date.now().toString(),
    messages: [],
    startedAt: new Date(),
    practiceCount: 0,
    averageScore: 0
  });

  // Callbacks ref to avoid stale closures
  const onMessageRef = useRef<((message: TutorMessage) => void) | null>(null);
  const onStreamRef = useRef<((chunk: string) => void) | null>(null);

  /**
   * Set callback for new messages
   */
  const setOnMessage = useCallback((callback: (message: TutorMessage) => void) => {
    onMessageRef.current = callback;
  }, []);

  /**
   * Set callback for streaming chunks
   */
  const setOnStream = useCallback((callback: (chunk: string) => void) => {
    onStreamRef.current = callback;
  }, []);

  /**
   * Speak with persona's voice using Groq
   */
  const speakWithPersona = useCallback(async (text: string) => {
    setIsSpeaking(true);
    try {
      await groqSpeechService.speak(text, {
        voice: personaId
      });
    } catch (e) {
      console.error('Speech error:', e);
    } finally {
      setIsSpeaking(false);
    }
  }, [speechRate, personaId]);

  /**
   * Play welcome greeting (English - PlayAI TTS)
   */
  const playWelcome = useCallback(async () => {
    if (hasGreeted) return;

    // Personalized welcome (English for PlayAI TTS)
    const welcomeTexts: Record<string, string> = {
      'emma': "Hi! I'm Emma, your friendly tutor. Happy to help you learn!",
      'james': "Hello, I'm James, your professional instructor.",
      'atlas': "Hello, I'm Atlas. My voice is deep and confident.",
      'basil': "Hello, I'm Basil. Calm and steady.",
      'briggs': "Hey! I'm Briggs! Energetic and enthusiastic!",
      'coral': "Hi! I'm Coral. Warm and expressive!",
      'indigo': "Hello, I'm Indigo. Professional and sophisticated.",
      'jasper': "Hey! I'm Jasper! Friendly and cheerful!"
    };

    const welcomeText = welcomeTexts[personaId] || `Hello! I'm ${currentPersona.name}, your tutor.`;

    await speakWithPersona(welcomeText);
    setHasGreeted(true);
  }, [hasGreeted, personaId, currentPersona, speakWithPersona]);

  /**
   * Activate Tutor Mode
   */
  const activate = useCallback(async () => {
    setIsActive(true);
    setError(null);
    setMessages([]);
    sessionRef.current = {
      id: Date.now().toString(),
      messages: [],
      startedAt: new Date(),
      practiceCount: 0,
      averageScore: 0
    };

    // Play welcome
    await playWelcome();
  }, [playWelcome]);

  /**
   * Deactivate Tutor Mode
   */
  const deactivate = useCallback(() => {
    setIsActive(false);
    setIsListening(false);
    setHasGreeted(false);
    groqSpeechService.cancelRecording();
    groqSpeechService.stopSpeaking();
  }, []);

  /**
   * Toggle Tutor Mode
   */
  const toggle = useCallback(() => {
    if (isActive) {
      deactivate();
    } else {
      activate();
    }
  }, [isActive, activate, deactivate]);

  /**
   * Handle speech recognition result
   */
  const handleSpeechResult = useCallback(async (result: { text: string }) => {
    const userText = result.text.trim();
    if (!userText) return;

    // Add user message
    const userMessage: TutorMessage = { role: 'user', content: userText };
    setMessages(prev => [...prev, userMessage]);
    onMessageRef.current?.(userMessage);

    // Processing (no pause needed with Groq recording)
    // groqSpeechService.cancelRecording();
    setIsListening(false);
    setIsProcessing(true);

    try {
      let responseText = '';

      if (mode === 'practice' && currentPractice) {
        // Evaluate the practice attempt
        const feedback = await evaluateAttempt(
          currentPractice.sentence,
          userText,
          languageLevel
        );
        setLastFeedback(feedback);

        // Update session stats
        sessionRef.current.practiceCount++;
        sessionRef.current.averageScore =
          (sessionRef.current.averageScore * (sessionRef.current.practiceCount - 1) + feedback.score)
          / sessionRef.current.practiceCount;

        responseText = `Score: ${feedback.score}%. ${feedback.correctedSentence !== userText ?
          `The correct way is: "${feedback.correctedSentence}". ` : 'Perfect! '}${feedback.pronunciationTips.length > 0 ? feedback.pronunciationTips[0] : ''}`;
      } else {
        // Conversation mode
        responseText = await generateTutorResponse(
          messages,
          userText,
          languageLevel
        );
      }

      // Add assistant message
      const assistantMessage: TutorMessage = { role: 'assistant', content: responseText };
      setMessages(prev => [...prev, assistantMessage]);
      onMessageRef.current?.(assistantMessage);

      // Speak the response with persona voice
      setIsProcessing(false);

      await speakWithPersona(responseText);

      // Resume listening if still active (using browser recognition for now)
      if (isActive) {
        // Note: Groq STT requires manual recording start
        setIsListening(true);
      }

    } catch (e: any) {
      console.error('Tutor response error:', e);
      setError(e.message);
      setIsProcessing(false);
      setIsSpeaking(false);
    }
  }, [mode, currentPractice, languageLevel, messages, isActive, speakWithPersona]);

  /**
   * Start listening
   */
  const startListening = useCallback(() => {
    if (!groqSpeechService.isRecognitionSupported()) {
      setError('Microphone access not supported.');
      return;
    }

    setError(null);
    // Start Groq recording
    groqSpeechService.startRecording().then(() => {
      setIsListening(true);
    }).catch(err => {
      setError(err.message);
    });
  }, []);

  /**
   * Stop listening
   */
  const stopListening = useCallback(async () => {
    const text = await groqSpeechService.stopRecordingAndTranscribe();
    setIsListening(false);
    if (text) {
      await handleSpeechResult({ text });
    }
  }, [handleSpeechResult]);

  /**
   * Toggle listening
   */
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  /**
   * Send text message (for typing instead of speaking)
   */
  const sendMessage = useCallback(async (text: string) => {
    await handleSpeechResult({ text });
  }, [handleSpeechResult]);

  /**
   * Start a practice session with a new sentence
   */
  const startPractice = useCallback(async (topic?: string) => {
    setMode('practice');
    setIsProcessing(true);
    setError(null);

    try {
      const practice = await generatePracticeSentence(languageLevel, topic);
      setCurrentPractice(practice);

      // Speak the practice sentence
      const instruction = `Please repeat after me: ${practice.sentence}`;
      setIsSpeaking(true);
      await groqSpeechService.speak(instruction, { voice: personaId });
      setIsSpeaking(false);

      // Start listening for the attempt
      startListening();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsProcessing(false);
    }
  }, [languageLevel, speechRate, startListening]);

  /**
   * End practice mode and return to conversation
   */
  const endPractice = useCallback(() => {
    setMode('conversation');
    setCurrentPractice(null);
    setLastFeedback(null);
  }, []);

  /**
   * Get available topics for current level
   */
  const getTopics = useCallback(() => {
    const topics: Record<LanguageLevel, string[]> = {
      'A1': ['Greetings', 'Family', 'Numbers', 'Colors', 'Food', 'Weather'],
      'A2': ['Shopping', 'Daily Routine', 'Hobbies', 'Directions', 'Health', 'School'],
      'B1': ['Travel', 'Work', 'Movies', 'Technology', 'Environment', 'Culture'],
      'B2': ['News', 'Politics', 'Science', 'Business', 'Education', 'Social Issues'],
      'C1': ['Philosophy', 'Economics', 'Art', 'Literature', 'Psychology', 'Innovation']
    };
    return topics[languageLevel];
  }, [languageLevel]);

  /**
   * Get session statistics
   */
  const getSessionStats = useCallback(() => {
    return {
      messageCount: messages.length,
      practiceCount: sessionRef.current.practiceCount,
      averageScore: sessionRef.current.averageScore,
      duration: Date.now() - sessionRef.current.startedAt.getTime()
    };
  }, [messages.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      groqSpeechService.cancelRecording();
      groqSpeechService.stopSpeaking();
    };
  }, []);

  // Auto-activate welcome when tutor is activated
  useEffect(() => {
    if (isActive && !hasGreeted) {
      playWelcome();
    }
  }, [isActive, hasGreeted, playWelcome]);

  return {
    // State
    isActive,
    isListening,
    isSpeaking,
    isProcessing,
    mode,
    languageLevel,
    speechRate,
    currentPractice,
    lastFeedback,
    error,
    messages,

    // Persona
    personaId,
    currentPersona,
    availablePersonas: tutorPersonas,

    // Actions
    activate,
    deactivate,
    toggle,
    startListening,
    stopListening,
    toggleListening,
    sendMessage,
    startPractice,
    endPractice,
    setLanguageLevel,
    setSpeechRate,
    setMode,
    setPersonaId,
    getTopics,
    getSessionStats,
    setOnMessage,
    setOnStream,

    // Helpers
    isSupported: groqSpeechService.isRecognitionSupported()
  };
}

export default useEnglishTutor;
