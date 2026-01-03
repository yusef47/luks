/**
 * Sidebar Component - Manus Style
 * الـ Sidebar الرئيسي للتطبيق
 */

import React from 'react';
import { Conversation } from '../../../types';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  isPresentationMode: boolean;
  onTogglePresentation: () => void;
  isAutonomousMode?: boolean;
  onToggleAutonomous?: () => void;
  onOpenDailyFeed?: () => void;
  t: (key: string) => string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  isPresentationMode,
  onTogglePresentation,
  isAutonomousMode,
  onToggleAutonomous,
  onOpenDailyFeed,
  t
}) => {
  return (
    <div className="flex-shrink-0 w-[300px] bg-[var(--bg-secondary-color)] border-r border-[var(--border-color)] flex flex-col z-20">
      {/* Header - Manus Style */}
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[var(--accent-color)] rounded-xl flex items-center justify-center">
            <span className="font-bold text-white text-lg" style={{ fontFamily: 'var(--font-serif)' }}>L</span>
          </div>
          <span className="font-semibold text-xl tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>Lukas</span>
        </div>
      </div>

      {/* New Task Button */}
      <div className="px-4 py-2 space-y-2">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-3 px-4 py-3 btn-primary rounded-xl transition-all group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="text-sm font-medium">New task</span>
        </button>
      </div>

      {/* Navigation */}
      <div className="px-4 py-3 space-y-1">
        <button
          onClick={onOpenDailyFeed}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-[var(--text-secondary-color)] hover:bg-[var(--hover-bg-color)] hover:text-[var(--text-color)]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <span className="text-sm">Search</span>
        </button>

        <button
          onClick={onTogglePresentation}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isPresentationMode
            ? 'bg-[var(--hover-bg-color)] text-[var(--text-color)]'
            : 'text-[var(--text-secondary-color)] hover:bg-[var(--hover-bg-color)] hover:text-[var(--text-color)]'
            }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 17V7l7 5-7 5z" />
          </svg>
          <span className="text-sm">Presentations</span>
        </button>

        <button
          onClick={onToggleAutonomous}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isAutonomousMode
            ? 'bg-[var(--hover-bg-color)] text-[var(--text-color)]'
            : 'text-[var(--text-secondary-color)] hover:bg-[var(--hover-bg-color)] hover:text-[var(--text-color)]'
            }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
          </svg>
          <span className="text-sm">Autonomous</span>
        </button>
      </div>

      {/* Recents Section */}
      <div className="flex-grow overflow-y-auto px-4 py-2 space-y-1">
        <div className="text-xs font-medium text-[var(--text-secondary-color)] px-3 py-2 uppercase tracking-wider">
          Recents
        </div>
        {conversations.slice().reverse().map(convo => (
          <button
            key={convo.id}
            onClick={() => onSelectConversation(convo.id)}
            className={`w-full text-left rtl:text-right px-3 py-2.5 rounded-lg text-sm truncate transition-all ${activeConversationId === convo.id
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

      {/* User Account - Minimal */}
      <div className="p-4 border-t border-[var(--border-color)]">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-[var(--accent-color)] flex items-center justify-center text-white font-medium text-sm">
            U
          </div>
          <div className="flex-grow text-left rtl:text-right">
            <div className="text-sm font-medium text-[var(--text-color)]">User</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
