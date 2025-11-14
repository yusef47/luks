/**
 * useLucasStream Hook
 * دمج Vercel AI SDK للـ streaming الحقيقي
 */

import { useChat } from 'ai/react';
import { useState, useCallback, FormEvent } from 'react';

interface UseLucasStreamOptions {
  onError?: (error: Error) => void;
  onSuccess?: (message: string) => void;
}

export function useLucasStream(options?: UseLucasStreamOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: originalHandleSubmit,
    isLoading,
    error,
    setMessages
  } = useChat({
    api: '/api/chat',
    onResponse: (response) => {
      setIsStreaming(true);
      setStreamingText('');
    },
    onFinish: (message) => {
      setIsStreaming(false);
      options?.onSuccess?.(message.content);
    },
    onError: (err) => {
      setIsStreaming(false);
      options?.onError?.(err);
    }
  });

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!input.trim()) return;

      try {
        await originalHandleSubmit(e);
      } catch (err) {
        console.error('❌ Error in chat submission:', err);
        options?.onError?.(err as Error);
      }
    },
    [originalHandleSubmit, input, options]
  );

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading: isLoading || isStreaming,
    isStreaming,
    streamingText,
    error,
    setMessages
  };
}

export default useLucasStream;
