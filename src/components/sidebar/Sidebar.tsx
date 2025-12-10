/**
 * Sidebar Component
 * الـ Sidebar الرئيسي للتطبيق
 */

import React from 'react';
import { Conversation } from '../../../types';
import { SettingsIcon } from '../../../components/icons';
import { TutorControls } from './TutorControls';
import type { LanguageLevel } from '../../services/tutorClient';

interface SidebarProps {
  // Conversations
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;

  // Tutor
  isTutorMode: boolean;
  onToggleTutor: () => void;
  speechRate: number;
  onSpeechRateChange: (rate: number) => void;
  languageLevel: LanguageLevel;
  onLanguageLevelChange: (level: LanguageLevel) => void;
  personaId: string;
  onPersonaChange: (personaId: string) => void;

  // Presentation
  isPresentationMode: boolean;
  onTogglePresentation: () => void;

  // Autonomous Mode
  isAutonomousMode?: boolean;
  onToggleAutonomous?: () => void;

  // Daily Feed
  onOpenDailyFeed?: () => void;

  // Localization
  t: (key: string) => string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  isTutorMode,
  onToggleTutor,
  speechRate,
  onSpeechRateChange,
  languageLevel,
  onLanguageLevelChange,
  personaId,
  onPersonaChange,
  isPresentationMode,
  onTogglePresentation,
  isAutonomousMode,
  onToggleAutonomous,
  onOpenDailyFeed,
  t
}) => {
  return (
    <div className="flex-shrink-0 w-[280px] bg-[var(--bg-secondary-color)] border-r border-[var(--border-color)] flex flex-col z-20">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="font-bold text-black text-lg">L</span>
          </div>
          <span className="font-bold text-lg tracking-tight">Lukas</span>
        </div>
        <button
          onClick={onNewChat}
          className="p-2 hover:bg-[var(--hover-bg-color)] rounded-lg transition-colors"
          title="New Chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {/* New Project Button */}
      <div className="px-3 py-2 space-y-2">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-3 px-3 py-2.5 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20 group"
        >
          <span className="text-sm font-medium">New Project</span>
        </button>

        {/* Presentation Mode Toggle */}
        <button
          onClick={onTogglePresentation}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all border ${isPresentationMode
            ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/20'
            : 'bg-[var(--bg-tertiary-color)] text-[var(--text-primary-color)] border-[var(--border-color)] hover:border-purple-500/50'
            }`}
        >
          <span className="text-lg">📊</span>
          <span className="text-sm font-medium">Presentation Mode</span>
        </button>

        {/* Autonomous Mode Toggle */}
        <button
          onClick={onToggleAutonomous}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all border ${isAutonomousMode
            ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-500/20'
            : 'bg-[var(--bg-tertiary-color)] text-[var(--text-primary-color)] border-[var(--border-color)] hover:border-amber-500/50'
            }`}
        >
          <span className="text-lg">🧠</span>
          <span className="text-sm font-medium">Autonomous Mode</span>
        </button>

        {/* Daily Feed Toggle */}
        <button
          onClick={onOpenDailyFeed}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all border bg-[var(--bg-tertiary-color)] text-[var(--text-primary-color)] border-[var(--border-color)] hover:border-indigo-500/50 hover:bg-indigo-500/10"
        >
          <span className="text-lg">⭐</span>
          <span className="text-sm font-medium">Daily Intelligence</span>
        </button>
      </div>

      {/* Tutor Controls */}
      <TutorControls
        isActive={isTutorMode}
        onToggle={onToggleTutor}
        speechRate={speechRate}
        onSpeechRateChange={onSpeechRateChange}
        languageLevel={languageLevel}
        onLanguageLevelChange={onLanguageLevelChange}
        personaId={personaId}
        onPersonaChange={onPersonaChange}
      />

      {/* Conversations List */}
      <div className="flex-grow overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
        <div className="text-xs font-medium text-[var(--text-secondary-color)] px-3 py-2 uppercase tracking-wider">
          Recents
        </div>
        {conversations.slice().reverse().map(convo => (
          <button
            key={convo.id}
            onClick={() => onSelectConversation(convo.id)}
            className={`w-full text-left rtl:text-right px-3 py-2 rounded-lg text-sm truncate transition-all ${activeConversationId === convo.id
              ? 'bg-[var(--hover-bg-color)] text-[var(--text-color)] font-medium'
              : 'text-[var(--text-secondary-color)] hover:bg-[var(--hover-bg-color)] hover:text-[var(--text-color)]'
              }`}
          >
            {convo.title || t('newChat')}
          </button>
        ))}
        {conversations.length === 0 && (
          <div className="text-xs text-[var(--text-secondary-color)] px-3 py-4 text-center opacity-50">
            No conversations yet
          </div>
        )}
      </div>

      {/* User Account */}
      <div className="p-3 border-t border-[var(--border-color)]">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--hover-bg-color)] transition-colors text-[var(--text-secondary-color)] hover:text-[var(--text-color)]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
            U
          </div>
          <div className="flex-grow text-left rtl:text-right">
            <div className="text-sm font-medium">User Account</div>
            <div className="text-xs opacity-60">Pro Plan</div>
          </div>
          <SettingsIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
