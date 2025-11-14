/**
 * useStreamingChat Hook
 * Hook محسّن للـ Streaming الحقيقي مع Vercel AI SDK
 */

import { useCallback, useState } from 'react';

interface StreamMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export function useStreamingChat() {
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim()) return;

      // Add user message
      const userMsg: StreamMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: userMessage
      };

      setMessages(prev => [...prev, userMsg]);
      setIsLoading(true);
      setError(null);

      // Create assistant message placeholder
      const assistantMsg: StreamMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        isStreaming: true
      };

      setMessages(prev => [...prev, assistantMsg]);

      try {
        // Open EventSource for streaming
        const eventSource = new EventSource(
          `/api/chat/stream?messages=${encodeURIComponent(
            JSON.stringify([
              ...messages,
              userMsg
            ])
          )}`
        );

        eventSource.addEventListener('message', (event) => {
          const data = JSON.parse(event.data);

          if (data.type === 'chunk') {
            // Update assistant message with streamed content
            setMessages(prev => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg.role === 'assistant') {
                lastMsg.content += data.content;
              }
              return updated;
            });
          } else if (data.type === 'complete') {
            // Mark streaming as complete
            setMessages(prev => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg.role === 'assistant') {
                lastMsg.isStreaming = false;
              }
              return updated;
            });
            eventSource.close();
            setIsLoading(false);
          } else if (data.type === 'error') {
            setError(data.error);
            eventSource.close();
            setIsLoading(false);
          }
        });

        eventSource.onerror = () => {
          setError('Connection error');
          eventSource.close();
          setIsLoading(false);
        };

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      }
    },
    [messages]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages
  };
}

export default useStreamingChat;
