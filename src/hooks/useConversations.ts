/**
 * useConversations Hook
 * هوك إدارة المحادثات - يدير كل منطق المحادثات والـ State
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Conversation, Exchange, StepResult, PlanStep, Clarification, StoredFile, Agent } from '../../types';

export interface ConversationsState {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  activeExchange: Exchange | null;
}

export function useConversations() {
  // Load from localStorage on init
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem('lukas_conversations');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return parsed.map((convo: Conversation) => ({
        ...convo,
        exchanges: convo.exchanges.map((ex: any) => ({
          ...ex,
          imageFile: null,
          videoFile: null,
        }))
      }));
    } catch {
      return [];
    }
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Derived state
  const activeConversation = useMemo(() => 
    conversations.find(c => c.id === activeConversationId) || null,
    [conversations, activeConversationId]
  );

  const activeExchange = useMemo(() => {
    if (!activeConversation) return null;
    return activeConversation.exchanges[activeConversation.exchanges.length - 1] || null;
  }, [activeConversation]);

  // Persist to localStorage
  useEffect(() => {
    const serializableConversations = conversations.map(convo => ({
      ...convo,
      exchanges: convo.exchanges.map(({ imageFile, videoFile, ...rest }) => rest)
    }));
    localStorage.setItem('lukas_conversations', JSON.stringify(serializableConversations));
  }, [conversations]);

  /**
   * Create a new conversation
   */
  const createConversation = useCallback((title: string, initialExchange?: Exchange): string => {
    const newConvoId = Date.now().toString();
    const newConvo: Conversation = {
      id: newConvoId,
      title,
      exchanges: initialExchange ? [initialExchange] : []
    };
    setConversations(prev => [...prev, newConvo]);
    setActiveConversationId(newConvoId);
    return newConvoId;
  }, []);

  /**
   * Delete a conversation
   */
  const deleteConversation = useCallback((convoId: string) => {
    setConversations(prev => prev.filter(c => c.id !== convoId));
    if (activeConversationId === convoId) {
      setActiveConversationId(null);
    }
  }, [activeConversationId]);

  /**
   * Clear all conversations
   */
  const clearAllConversations = useCallback(() => {
    setConversations([]);
    setActiveConversationId(null);
  }, []);

  /**
   * Start a new chat (deselect current)
   */
  const startNewChat = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  /**
   * Add an exchange to a conversation
   */
  const addExchange = useCallback((convoId: string, exchange: Exchange) => {
    setConversations(prev => prev.map(c => {
      if (c.id !== convoId) return c;
      return { ...c, exchanges: [...c.exchanges, exchange] };
    }));
  }, []);

  /**
   * Update an exchange in a conversation
   */
  const updateExchange = useCallback((convoId: string, exchangeId: string, updates: Partial<Exchange>) => {
    setConversations(prev => prev.map(c => {
      if (c.id !== convoId) return c;
      const newExchanges = c.exchanges.map(ex =>
        ex.id === exchangeId ? { ...ex, ...updates } : ex
      );
      return { ...c, exchanges: newExchanges };
    }));
  }, []);

  /**
   * Update a step result in an exchange
   */
  const updateStepResult = useCallback((
    convoId: string, 
    exchangeId: string, 
    step: number, 
    updates: Partial<StepResult>, 
    appendResult: string = ''
  ) => {
    setConversations(prev => prev.map(c => {
      if (c.id !== convoId) return c;
      const newExchanges = c.exchanges.map(ex => {
        if (ex.id !== exchangeId) return ex;
        const newResults = ex.results.map(r => 
          r.step === step 
            ? { 
                ...r, 
                ...updates, 
                result: (updates.result !== undefined) ? updates.result : r.result + appendResult 
              } 
            : r
        );
        return { ...ex, results: newResults };
      });
      return { ...c, exchanges: newExchanges };
    }));
  }, []);

  /**
   * Get conversation history for AI context
   */
  const getConversationHistory = useCallback((convoId: string) => {
    const convo = conversations.find(c => c.id === convoId);
    if (!convo) return [];
    
    return convo.exchanges
      .filter(ex => ex.status === 'completed')
      .map(ex => ({ prompt: ex.prompt, results: ex.results }));
  }, [conversations]);

  /**
   * Create a new exchange for a prompt
   */
  const createExchange = useCallback((
    prompt: string,
    imageFile?: File | null,
    videoFile?: File | null
  ): Exchange => {
    return {
      id: Date.now().toString(),
      prompt,
      imageFile: imageFile || null,
      videoFile: videoFile || null,
      plan: null,
      results: [],
      status: 'planning'
    };
  }, []);

  /**
   * Get or create conversation for a new prompt
   */
  const getOrCreateConversation = useCallback((prompt: string, exchange: Exchange): string => {
    if (activeConversationId) {
      addExchange(activeConversationId, exchange);
      return activeConversationId;
    } else {
      return createConversation(prompt, exchange);
    }
  }, [activeConversationId, addExchange, createConversation]);

  return {
    // State
    conversations,
    activeConversationId,
    activeConversation,
    activeExchange,

    // Actions
    setActiveConversationId,
    createConversation,
    deleteConversation,
    clearAllConversations,
    startNewChat,
    addExchange,
    updateExchange,
    updateStepResult,
    getConversationHistory,
    createExchange,
    getOrCreateConversation
  };
}

export default useConversations;
