/**
 * Services Exports
 */

export { speechService } from './speechService';
export type { SpeechRecognitionResult, SpeechServiceConfig } from './speechService';

// Tutor services now use backend proxy - see tutorClient.ts
export type { TutorMessage, TutorFeedback, SentencePractice, LanguageLevel } from './tutorClient';
