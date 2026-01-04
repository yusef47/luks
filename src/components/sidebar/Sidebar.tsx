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
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
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
  theme,
  onToggleTheme,
  t
}) => {
  return (
    <div className="flex-shrink-0 w-[300px] bg-[var(--bg-secondary-color)] border-r border-[var(--border-color)] flex flex-col z-20">
      {/* Header - Manus Style */}
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[var(--accent-color)] rounded-xl flex items-center justify-center">
            <span className="font-bold text-[var(--accent-text)] text-lg" style={{ fontFamily: 'var(--font-serif)' }}>L</span>
          </div>
          <span className="font-semibold text-xl tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>Lukas</span>
        </div>
      </div>

      {/* New Task Button */}
      <div className="px-4 py-2 space-y-2">
        <button
          onClick={onNewChat}
          className="w-full bg-[#f3f3f3] hover:bg-[#eaeaea] dark:bg-[#27272a] dark:hover:bg-[#3f3f46] text-[var(--text-color)] rounded-xl py-2.5 px-4 flex items-center gap-3 transition-colors mb-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 dark:text-gray-400">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span className="font-medium text-[15px]">{t('newChat')}</span>
        </button>
      </div>

      {/* Navigation */}
      {/* Navigation */}
      <div className="px-4 space-y-[2px]">
        <button
          onClick={onOpenDailyFeed}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-[var(--text-secondary-color)] hover:bg-[var(--hover-bg-color)] hover:text-[var(--text-color)]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <span className="text-[15px]">Search</span>
        </button>

        <button
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-[var(--text-secondary-color)] hover:bg-[var(--hover-bg-color)] hover:text-[var(--text-color)]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
            <circle cx="11" cy="11" r="2" />
          </svg>
          <span className="text-[15px]">Library</span>
        </button>
      </div>

      <div className="px-4 mt-6 mb-2">
        <div className="flex items-center justify-between text-xs font-medium text-[var(--text-secondary-color)] px-3 mb-1">
          <span>Projects</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cursor-pointer hover:text-[var(--text-color)]">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </div>
        <button
          onClick={onTogglePresentation}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${isPresentationMode
            ? 'bg-[var(--hover-bg-color)] text-[var(--text-color)]'
            : 'text-[var(--text-secondary-color)] hover:bg-[var(--hover-bg-color)] hover:text-[var(--text-color)]'
            }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z" />
            <path d="M12 11h4" />
            <path d="M14 9v4" />
          </svg>
          <span className="text-[15px]">New project</span>
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
          <div className="w-8 h-8 rounded-full bg-[var(--accent-color)] flex items-center justify-center text-[var(--accent-text)] font-medium text-sm">
            U
          </div>
          <div className="flex-grow text-left rtl:text-right">
            <div className="text-sm font-medium text-[var(--text-color)]">User</div>
          </div>
        </div>
      </div>

      {/* Theme Toggle - NEW */}
      <div className="px-4 pb-4">
        <button
          onClick={onToggleTheme}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-[var(--text-secondary-color)] hover:bg-[var(--hover-bg-color)] hover:text-[var(--text-color)] transition-all"
        >
          <span className="flex items-center gap-3">
            {theme === 'light' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
            <span>{theme === 'light' ? 'Light Mode' : 'Dark Mode'}</span>
          </span>

          {/* Toggle Switch UI */}
          <div className={`w-8 h-4 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-[var(--accent-color)]' : 'bg-gray-300'}`}>
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${theme === 'dark' ? 'left-[18px]' : 'left-[2px]'}`} />
          </div>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
