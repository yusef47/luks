/**
 * ChatWindow Component
 * مكون نافذة المحادثة مع الـ Streaming
 */

import React, { useState } from 'react';
import useStreamingChat from '../hooks/useStreamingChat';

export function ChatWindow() {
  const { messages, isLoading, error, sendMessage, clearMessages } = useStreamingChat();
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <h1 className="text-2xl font-bold">💬 Lucas Chat</h1>
        <p className="text-sm text-gray-400">Streaming الحقيقي مع Mastra</p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>ابدأ محادثة جديدة...</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-100'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.isStreaming && (
                  <span className="inline-block ml-2 animate-pulse">▌</span>
                )}
              </div>
            </div>
          ))
        )}

        {error && (
          <div className="bg-red-900 text-red-100 p-3 rounded">
            ❌ {error}
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="bg-gray-800 p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب رسالتك..."
            disabled={isLoading}
            className="flex-1 bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded transition"
          >
            {isLoading ? '⏳' : '📤'}
          </button>
          <button
            type="button"
            onClick={clearMessages}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition"
          >
            🗑️
          </button>
        </div>
      </form>
    </div>
  );
}

export default ChatWindow;
