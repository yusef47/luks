/**
 * Frontend Hooks
 * جميع الـ hooks المخصصة للتطبيق
 */

export { useAppContext } from '../context';

// English Tutor Hook
export { useEnglishTutor } from './useEnglishTutor';
export type { TutorState, TutorSession, TutorMode } from './useEnglishTutor';

// Conversations Hook
export { useConversations } from './useConversations';
export type { ConversationsState } from './useConversations';

// Streaming Chat Hook
export { default as useStreamingChat } from './useStreamingChat';

// Mastra Hook - للتواصل مع Backend
export { useMastra } from './useMastra';
export type { MastraState, OrchestratorResult, TutorResult } from './useMastra';
