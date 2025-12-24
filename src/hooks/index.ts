/**
 * Frontend Hooks
 * جميع الـ hooks المخصصة للتطبيق
 */

export { useAppContext } from '../context';

// Conversations Hook
export { useConversations } from './useConversations';
export type { ConversationsState } from './useConversations';

// Streaming Chat Hook
export { default as useStreamingChat } from './useStreamingChat';

// Mastra Hook - للتواصل مع Backend
export { useMastra } from './useMastra';
export type { MastraState, OrchestratorResult } from './useMastra';
