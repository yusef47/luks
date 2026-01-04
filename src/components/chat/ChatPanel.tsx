/**
 * ChatPanel Component
 * لوحة المحادثة الرئيسية
 */

import React, { useRef, useEffect } from 'react';
import { Conversation, Exchange, Agent, StepResult, Clarification } from '../../../types';
import { ComputerIcon, OrchestratorIcon, LoadingSpinnerIcon } from '../../../components/icons';
import { ChatMessage } from '../ChatMessage';
import { ClarificationRequest } from '../ClarificationRequest';
import { StreamingMarkdownRenderer } from '../StreamingMarkdownRenderer';
import { ThinkingAccordion } from './ThinkingAccordion';
import { ChatInput } from './ChatInput';

interface TutorMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  // Conversation
  activeConversation: Conversation | null;
  isLoading: boolean;

  // Input
  prompt: string;
  setPrompt: (value: string) => void;
  onSubmit: () => void;

  // File handling
  previewUrl: string | null;
  fileName?: string | null;
  fileType?: string | null;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearAttachment: () => void;

  // Voice
  isListening: boolean;
  onToggleListening: () => void;
  isTutorMode: boolean;

  // Tutor messages (for tutor mode)
  tutorMessages?: TutorMessage[];

  // Settings
  isSettingsOpen: boolean;
  onToggleSettings: () => void;
  cycleCount: number;
  setCycleCount: (count: number) => void;

  // Computer panel
  showComputer: boolean;
  onToggleComputer: () => void;

  // Clarification
  onClarificationResponse: (convoId: string, exchangeId: string, exchange: Exchange, option: { key: string; value: string }) => void;

  // Localization
  t: (key: string) => string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  activeConversation,
  isLoading,
  prompt,
  setPrompt,
  onSubmit,
  previewUrl,
  fileName,
  fileType,
  onFileSelect,
  onClearAttachment,
  isListening,
  onToggleListening,
  isTutorMode,
  tutorMessages = [],
  isSettingsOpen,
  onToggleSettings,
  cycleCount,
  setCycleCount,
  showComputer,
  onToggleComputer,
  onClarificationResponse,
  t
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom (only if user is at the very bottom)
  useEffect(() => {
    const scrollContainer = chatEndRef.current?.parentElement;
    if (scrollContainer) {
      // Only scroll if user is at the very bottom (within 50px)
      const isAtBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 50;
      if (isAtBottom) {
        // Instant scroll, no smooth animation to prevent jumping
        chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }
    }
  }, [activeConversation?.exchanges?.length]); // Only trigger on new messages

  const renderExchangeResponse = (exchange: Exchange) => {
    if (exchange.status === 'completed') {
      // Find the final answer from Orchestrator agent
      const finalAnswer = exchange.results.find(r => r.agent === Agent.Orchestrator);
      const finalImage = exchange.results.find(r => r.imageBase64);
      if (!finalAnswer && !finalImage) return null;

      const allSources = Array.from(
        new Map(exchange.results.flatMap(r => r.sources || []).map(s => [s.uri, s])).values()
      );

      return (
        <>
          {finalAnswer && (
            <ChatMessage
              agent={Agent.Orchestrator}
              content={<StreamingMarkdownRenderer content={finalAnswer.result} />}
              sources={allSources}
            />
          )}
          {finalImage && (
            <ChatMessage
              agent={Agent.Orchestrator}
              content={
                <img
                  src={`data:image/png;base64,${finalImage.imageBase64}`}
                  alt={finalImage.task}
                  className="rounded-lg max-w-full h-auto"
                />
              }
            />
          )}
        </>
      );
    }

    if (exchange.status === 'clarification_needed' && exchange.clarification && activeConversation) {
      return (
        <ChatMessage
          agent={Agent.Orchestrator}
          content={
            <ClarificationRequest
              clarification={exchange.clarification}
              onSelect={(option) => onClarificationResponse(activeConversation.id, exchange.id, exchange, option)}
              disabled={isLoading}
            />
          }
        />
      );
    }

    if (exchange.status === 'error' && exchange.errorMessage) {
      return (
        <ChatMessage
          agent={Agent.Orchestrator}
          content={`${t('errorMessage')}: ${exchange.errorMessage}`}
        />
      );
    }

    // Show streaming result
    if (exchange.status === 'executing' && exchange.results.length > 0) {
      const latestResult = exchange.results[exchange.results.length - 1];
      if (latestResult.result) {
        return (
          <ChatMessage
            agent={Agent.Orchestrator}
            content={<StreamingMarkdownRenderer content={latestResult.result} />}
          />
        );
      }
    }

    return null;
  };

  const activeExchange = activeConversation?.exchanges[activeConversation.exchanges.length - 1];

  const renderThinking = () => {
    if (!activeExchange || activeExchange.status === 'planning' || activeExchange.status === 'clarification_needed' || activeExchange.results.length === 0) return null;

    const steps = activeExchange.results.map(r => ({
      id: r.step.toString(),
      label: r.task,
      status: r.status as 'pending' | 'active' | 'completed',
      detail: r.result ? (r.result.length > 100 ? r.result.substring(0, 100) + '...' : r.result) : undefined
    }));

    // Only show if we have steps
    if (steps.length === 0) return null;

    return (
      <div className="max-w-3xl w-full mx-auto px-4 mt-4">
        <ThinkingAccordion steps={steps} isExpanded={isLoading} />
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 w-full">
      <div className="flex flex-col h-full overflow-hidden relative bg-[var(--bg-color)]">
        {/* Header - Manus Style */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--text-secondary-color)]">
              {isTutorMode ? 'English Tutor' : 'Lukas'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleComputer}
              className={`p-1.5 rounded-lg transition-colors ${showComputer
                ? 'bg-[var(--accent-color)] text-white'
                : 'text-[var(--text-secondary-color)] hover:bg-[var(--hover-bg-color)]'
                }`}
              title={t('toggleComputer')}
            >
              <ComputerIcon className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Messages */}
        <main className="flex-grow min-h-0 w-full overflow-y-auto p-4 space-y-6 pb-4 custom-scrollbar">
          {!activeConversation ? (
            // Welcome Screen
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
              <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary-color)] flex items-center justify-center mb-6">
                <span className="text-3xl" style={{ fontFamily: 'var(--font-serif)' }}>L</span>
              </div>
              <h2 className="text-3xl font-semibold mb-3" style={{ fontFamily: 'var(--font-serif)' }}>
                {isTutorMode ? "Ready to practice English?" : "How can I help you?"}
              </h2>
              <p className="text-[var(--text-secondary-color)] max-w-md mx-auto">
                {isTutorMode
                  ? "Click the microphone and start speaking. I'll help you improve your English!"
                  : "I can help you research, analyze data, generate content, and more using my autonomous agents."
                }
              </p>

              {/* Center Input (Manus Style) */}
              <div className="w-full max-w-2xl mt-8">
                <ChatInput
                  prompt={prompt}
                  setPrompt={setPrompt}
                  onSubmit={onSubmit}
                  isLoading={isLoading}
                  previewUrl={previewUrl}
                  fileName={fileName}
                  fileType={fileType}
                  onFileSelect={onFileSelect}
                  onClearAttachment={onClearAttachment}
                  isListening={isListening}
                  onToggleListening={onToggleListening}
                  isTutorMode={isTutorMode}
                  isSettingsOpen={isSettingsOpen}
                  onToggleSettings={onToggleSettings}
                  cycleCount={cycleCount}
                  setCycleCount={setCycleCount}
                  t={t}
                  variant="center"
                />
              </div>

              {/* Example Prompts (only show in normal mode) - Moved below input */}
              {!isTutorMode && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 w-full max-w-2xl px-2">
                  <button
                    onClick={() => setPrompt("Research the latest developments in quantum computing")}
                    className="p-3 rounded-xl bg-[var(--bg-tertiary-color)] hover:bg-[var(--hover-bg-color)] text-left transition-all group"
                  >
                    <span className="text-sm font-medium block mb-1 group-hover:text-[var(--accent-color)]">Quantum Computing</span>
                    <span className="text-[11px] text-[var(--text-secondary-color)]">Research developments</span>
                  </button>
                  <button
                    onClick={() => setPrompt("Create a marketing plan for a new coffee brand")}
                    className="p-3 rounded-xl bg-[var(--bg-tertiary-color)] hover:bg-[var(--hover-bg-color)] text-left transition-all group"
                  >
                    <span className="text-sm font-medium block mb-1 group-hover:text-[var(--accent-color)]">Marketing Plan</span>
                    <span className="text-[11px] text-[var(--text-secondary-color)]">Launch a coffee brand</span>
                  </button>
                  <button
                    onClick={() => setPrompt("Analyze Apple (AAPL) stock performance")}
                    className="p-3 rounded-xl bg-[var(--bg-tertiary-color)] hover:bg-[var(--hover-bg-color)] text-left transition-all group"
                  >
                    <span className="text-sm font-medium block mb-1 group-hover:text-[var(--accent-color)]">Stock Analysis</span>
                    <span className="text-[11px] text-[var(--text-secondary-color)]">Analyze AAPL</span>
                  </button>
                </div>
              )}

              {/* Tutor Tips */}
              {isTutorMode && (
                <div className="grid grid-cols-1 gap-3 mt-8 w-full max-w-md">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-left">
                    <span className="text-sm font-medium block mb-1 text-emerald-400">💡 Tips</span>
                    <ul className="text-xs text-[var(--text-secondary-color)] space-y-1">
                      <li>• Speak clearly and naturally</li>
                      <li>• Don't worry about mistakes - I'll help you!</li>
                      <li>• Try to use complete sentences</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Conversation Messages or Tutor Messages
            <>
              {isTutorMode ? (
                // Tutor Mode - show tutor messages
                <>
                  {tutorMessages.map((msg, index) => (
                    <ChatMessage
                      key={index}
                      agent={msg.role === 'user' ? Agent.User : Agent.Orchestrator}
                      content={msg.content}
                    />
                  ))}
                  {isLoading && (
                    <ChatMessage
                      agent={Agent.Orchestrator}
                      content={
                        <div className="flex justify-center items-center p-2">
                          <LoadingSpinnerIcon className="w-6 h-6" />
                        </div>
                      }
                    />
                  )}
                </>
              ) : (
                // Orchestrator Mode - show exchanges
                <>
                  {activeConversation.exchanges.map(exchange => (
                    <React.Fragment key={exchange.id}>
                      <ChatMessage agent={Agent.User} content={exchange.prompt} />
                      {renderExchangeResponse(exchange)}
                    </React.Fragment>
                  ))}
                  {isLoading && activeExchange && activeExchange.status !== 'completed' && (
                    <ChatMessage
                      agent={Agent.Orchestrator}
                      content={
                        <div className="flex justify-center items-center p-2">
                          <LoadingSpinnerIcon className="w-6 h-6" />
                        </div>
                      }
                    />
                  )}
                </>
              )}
              <div ref={chatEndRef} />
            </>
          )}
          {/* Active Exchange Thinking Process */}
          {activeConversation && activeConversation.exchanges[activeConversation.exchanges.length - 1].id === activeExchange?.id && renderThinking()}
        </main>

        {/* Input */}
        {/* Input (Bottom) - Only show if conversation is active */}
        {activeConversation && (
          <ChatInput
            prompt={prompt}
            setPrompt={setPrompt}
            onSubmit={onSubmit}
            isLoading={isLoading}
            previewUrl={previewUrl}
            fileName={fileName}
            fileType={fileType}
            onFileSelect={onFileSelect}
            onClearAttachment={onClearAttachment}
            isListening={isListening}
            onToggleListening={onToggleListening}
            isTutorMode={isTutorMode}
            isSettingsOpen={isSettingsOpen}
            onToggleSettings={onToggleSettings}
            cycleCount={cycleCount}
            setCycleCount={setCycleCount}
            t={t}
            variant="bottom"
          />
        )}
      </div>
    </div>
  );
};

export default ChatPanel;
