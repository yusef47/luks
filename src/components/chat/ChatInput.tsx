/**
 * ChatInput Component
 * مكون إدخال الرسائل مع دعم الصوت والمرفقات
 */

import React, { useRef, useEffect } from 'react';
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

  // Localization
  t: (key: string) => string;
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
  t
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <footer className="flex-shrink-0 p-6 relative z-10 flex justify-center w-full bg-gradient-to-t from-[var(--bg-color)] via-[var(--bg-color)] to-transparent pt-10">
      <div className="w-full max-w-3xl relative">
        {/* Settings Popover */}
        <SettingsPopover
          isOpen={isSettingsOpen}
          cycleCount={cycleCount}
          setCycleCount={setCycleCount}
          onClose={onToggleSettings}
          t={t}
        />

        {/* File Preview */}
        {(previewUrl || fileName) && (
          <div className="relative mb-2 p-2 border border-[var(--border-color)] rounded-xl bg-[var(--bg-tertiary-color)] flex items-center gap-2">
            {/* Show image preview for images, icon for other files */}
            {fileType?.startsWith('image/') ? (
              <img src={previewUrl!} className="w-16 h-16 object-cover rounded-lg" alt="Preview" />
            ) : (
              <div className="w-16 h-16 flex items-center justify-center rounded-lg bg-[var(--hover-bg-color)]">
                {fileType?.includes('pdf') && (
                  <span className="text-2xl">📄</span>
                )}
                {(fileType?.includes('word') || fileType?.includes('document') || fileName?.endsWith('.docx') || fileName?.endsWith('.doc')) && (
                  <span className="text-2xl">📝</span>
                )}
                {(fileType?.includes('sheet') || fileType?.includes('excel') || fileName?.endsWith('.xlsx') || fileName?.endsWith('.xls')) && (
                  <span className="text-2xl">📊</span>
                )}
                {fileType?.includes('text') && (
                  <span className="text-2xl">📃</span>
                )}
                {fileType?.startsWith('video/') && (
                  <span className="text-2xl">🎬</span>
                )}
                {!fileType?.startsWith('image/') && !fileType?.includes('pdf') && !fileType?.includes('word') && !fileType?.includes('sheet') && !fileType?.includes('text') && !fileType?.startsWith('video/') && !fileName?.endsWith('.docx') && !fileName?.endsWith('.xlsx') && (
                  <span className="text-2xl">📎</span>
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--text-color)] truncate">{fileName || 'Attached file'}</p>
              <p className="text-xs text-[var(--text-secondary-color)]">
                {fileType?.includes('pdf') && 'PDF Document'}
                {(fileType?.includes('word') || fileName?.endsWith('.docx') || fileName?.endsWith('.doc')) && 'Word Document'}
                {(fileType?.includes('sheet') || fileName?.endsWith('.xlsx') || fileName?.endsWith('.xls')) && 'Excel Sheet'}
                {fileType?.includes('text') && 'Text File'}
                {fileType?.startsWith('image/') && 'Image'}
                {fileType?.startsWith('video/') && 'Video'}
              </p>
            </div>
            <button
              onClick={onClearAttachment}
              className="p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
            >
              <WindowCloseIcon className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Input Container - Manus Pill Style */}
        <div className="pill-input p-3 flex items-end gap-2">
          {/* File Input (hidden) */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileSelect}
            className="hidden"
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          />

          {/* Attachment Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="p-2 rounded-xl text-[var(--text-secondary-color)] hover:bg-[var(--hover-bg-color)] hover:text-[var(--text-color)] transition-colors flex-shrink-0 h-10 w-10 flex items-center justify-center disabled:opacity-50"
            title="Attach file"
          >
            <PaperclipIcon className="w-5 h-5" />
          </button>

          {/* Microphone Button */}
          <button
            onClick={onToggleListening}
            disabled={isLoading}
            className={`p-2 rounded-xl transition-colors flex-shrink-0 h-10 w-10 flex items-center justify-center ${isListening
              ? 'bg-red-500/20 text-red-500 animate-pulse'
              : 'text-[var(--text-secondary-color)] hover:bg-[var(--hover-bg-color)] hover:text-[var(--text-color)]'
              }`}
            title={isListening ? "Recording..." : "Click to speak"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>

          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isTutorMode ? "Type or speak in English..." : t('promptPlaceholder')}
            className="flex-grow bg-transparent focus:outline-none resize-none text-base p-2 max-h-40 text-[var(--text-color)] placeholder-[var(--text-secondary-color)]"
            rows={1}
            disabled={isLoading}
          />

          {/* Settings Button (hide in Tutor mode) */}
          {!isTutorMode && (
            <button
              onClick={onToggleSettings}
              className="p-2 rounded-xl text-[var(--text-secondary-color)] hover:bg-[var(--hover-bg-color)] hover:text-[var(--text-color)] transition-colors h-10 w-10 flex items-center justify-center flex-shrink-0"
              title="Settings"
            >
              <CogIcon className="w-5 h-5" />
            </button>
          )}

          {/* Submit Button */}
          <button
            onClick={onSubmit}
            disabled={isLoading || !prompt.trim()}
            className="p-2 rounded-xl bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] transition-all h-10 w-10 flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            title="Send"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <ArrowRightIcon className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Disclaimer */}
        <div className="text-center mt-2">
          <p className="text-[10px] text-[var(--text-secondary-color)] opacity-50">
            Lukas can make mistakes. Check important info.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default ChatInput;
