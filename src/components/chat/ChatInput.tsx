/**
 * ChatInput Component
 * مكون إدخال الرسائل مع دعم الصوت والمرفقات
 */

import React, { useRef, useEffect, useState } from 'react';
import { PaperclipIcon, CogIcon, ArrowRightIcon, WindowCloseIcon } from '../../../components/icons';
import { SettingsPopover } from '../common/SettingsPopover';

interface ChatInputProps {
  // Input
  prompt: string;
  setPrompt: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;

  // File attachment
  previewUrl: string | null;
  fileName?: string | null;
  fileType?: string | null;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearAttachment: () => void;

  // Voice
  isListening: boolean;
  onToggleListening: () => void;
  isTutorMode?: boolean;

  // Settings
  isSettingsOpen: boolean;
  onToggleSettings: () => void;
  cycleCount: number;
  setCycleCount: (count: number) => void;

  // Browser AI
  onOpenBrowserAI?: () => void;

  // Localization
  // Localization
  t: (key: string) => string;
  variant?: 'center' | 'bottom';
}

export const ChatInput: React.FC<ChatInputProps> = ({
  prompt,
  setPrompt,
  onSubmit,
  isLoading,
  previewUrl,
  fileName,
  fileType,
  onFileSelect,
  onClearAttachment,
  isListening,
  onToggleListening,
  isTutorMode = false,
  isSettingsOpen,
  onToggleSettings,
  cycleCount,
  setCycleCount,
  onOpenBrowserAI,
  t,
  variant = 'bottom' // 'center' | 'bottom'
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // Focus textarea on mount if centered
  useEffect(() => {
    if (variant === 'center' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [variant]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className={`transition-all duration-500 ease-in-out w-full
      ${variant === 'center'
        ? 'relative max-w-2xl mx-auto'
        : 'flex-shrink-0 p-6 relative z-10 flex justify-center bg-gradient-to-t from-[var(--bg-color)] via-[var(--bg-color)] to-transparent pt-10'
      }`}>

      <div className={`w-full relative ${variant === 'bottom' ? 'max-w-3xl' : ''}`}>
        {/* Settings Popover */}
        <SettingsPopover
          isOpen={isSettingsOpen}
          cycleCount={cycleCount}
          setCycleCount={setCycleCount}
          onClose={onToggleSettings}
          t={t}
        />

        {/* File Preview - Same for both but adjusted margin */}
        {(previewUrl || fileName) && (
          <div className="relative mb-2 p-2 border border-[var(--border-color)] rounded-xl bg-[var(--bg-tertiary-color)] flex items-center gap-2">
            {/* ... existing file preview ... */}
          </div>
        )}

        {/* Input Container - Conditional Styling */}
        <div className={`
          flex flex-col gap-2 transition-all duration-300 w-full
          ${variant === 'center'
            ? 'bg-[var(--bg-color)] border border-[var(--border-color)] shadow-[var(--shadow-soft)] p-3 rounded-2xl min-h-[140px]'
            : 'pill-input p-2 flex-row items-end'
          }
        `}>

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isTutorMode ? "Type or speak..." : (variant === 'center' ? "Describe your task or ask anything..." : t('promptPlaceholder'))}
            className={`
              block bg-transparent focus:outline-none resize-none text-[var(--text-color)] placeholder-[var(--text-secondary-color)]
              ${variant === 'center'
                ? 'w-full text-lg p-2 min-h-[60px]'
                : 'flex-grow text-base p-2 max-h-40 w-full'
              }
            `}
            rows={1}
            disabled={isLoading}
          />

          {/* Tools Footer (Inside Box for Center, Inline for Bottom) */}
          <div className={`
            flex items-center gap-1
            ${variant === 'center' ? 'justify-between mt-auto pt-2 border-t border-transparent' : 'flex-shrink-0'}
          `}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={onFileSelect}
              className="hidden"
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />

            {/* Left Tools */}
            <div className="flex items-center gap-1 relative">
              {/* Attachment Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  disabled={isLoading}
                  className="p-2 rounded-xl text-[var(--text-secondary-color)] hover:bg-[var(--hover-bg-color)] hover:text-[var(--text-color)] transition-colors h-9 w-9 flex items-center justify-center"
                >
                  <PaperclipIcon className="w-5 h-5" />
                </button>

                {/* Dropdown Menu */}
                {showAttachMenu && (
                  <div className="absolute bottom-full left-0 mb-2 bg-[var(--bg-secondary-color)] border border-[var(--border-color)] rounded-xl shadow-lg overflow-hidden min-w-[180px] z-50">
                    <button
                      onClick={() => {
                        fileInputRef.current?.click();
                        setShowAttachMenu(false);
                      }}
                      className="w-full px-4 py-3 text-sm text-right flex items-center gap-3 hover:bg-[var(--hover-bg-color)] transition-colors"
                    >
                      <span className="text-lg">📎</span>
                      <span>رفع ملف</span>
                    </button>
                    <button
                      onClick={() => {
                        if (onOpenBrowserAI) {
                          onOpenBrowserAI();
                        } else {
                          // Open extension instructions in new tab
                          window.open('https://github.com/yusef47/luks/tree/main/extension', '_blank');
                        }
                        setShowAttachMenu(false);
                      }}
                      className="w-full px-4 py-3 text-sm text-right flex items-center gap-3 hover:bg-[var(--hover-bg-color)] transition-colors border-t border-[var(--border-color)]"
                    >
                      <span className="text-lg">🖥️</span>
                      <span>Browser AI</span>
                      <span className="text-[10px] text-[var(--text-secondary-color)] mr-auto">إضافة</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={onToggleListening}
                disabled={isLoading}
                className={`p-2 rounded-xl transition-colors h-9 w-9 flex items-center justify-center ${isListening
                  ? 'bg-red-500/20 text-red-500 animate-pulse'
                  : 'text-[var(--text-secondary-color)] hover:bg-[var(--hover-bg-color)] hover:text-[var(--text-color)]'
                  }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>

              {/* Settings - Only Show if Center or (Bottom + Not Tutor) */}
              {!isTutorMode && (
                <button
                  onClick={onToggleSettings}
                  className="p-2 rounded-xl text-[var(--text-secondary-color)] hover:bg-[var(--hover-bg-color)] hover:text-[var(--text-color)] transition-colors h-9 w-9 flex items-center justify-center"
                >
                  <CogIcon className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Right Tools (Submit) */}
            <div>
              <button
                onClick={onSubmit}
                disabled={isLoading || !prompt.trim()}
                className={`flex items-center justify-center rounded-xl transition-all shadow-sm
                  ${variant === 'center'
                    ? 'bg-[var(--accent-color)] text-[var(--accent-text)] hover:opacity-90 px-4 py-2 h-9'
                    : 'bg-[var(--accent-color)] text-[var(--accent-text)] h-9 w-9'
                  } 
                  disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <ArrowRightIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Disclaimer - Only show for Bottom variant */}
        {variant === 'bottom' && (
          <div className="text-center mt-2">
            <p className="text-[10px] text-[var(--text-secondary-color)] opacity-50">
              Lukas can make mistakes. Check important info.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInput;
