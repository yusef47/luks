// Service for communicating with the backend orchestrator server

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:5000/api';

export interface IntentResult {
  intent: string;
  agent: string;
  confidence: number;
  keywords: string[];
}

export interface EvaluationResult {
  score: number;
  isAcceptable: boolean;
  feedback: string;
  shouldRetry: boolean;
}

export interface ContextData {
  [key: string]: any;
}

// Classify user intent
export const classifyIntent = async (message: string): Promise<IntentResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/classify-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error classifying intent:', error);
    throw error;
  }
};

// Evaluate agent result
export const evaluateResult = async (
  userRequest: string,
  agentResponse: string,
  agent: string
): Promise<EvaluationResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/evaluate-result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userRequest, agentResponse, agent })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error evaluating result:', error);
    throw error;
  }
};

// Save conversation
export const saveConversation = async (id: string, title: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error saving conversation:', error);
    throw error;
  }
};

// Save message
export const saveMessage = async (
  id: string,
  conversationId: string,
  userMessage: string,
  agentResponse?: string,
  agent?: string,
  status?: string
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        conversationId,
        userMessage,
        agentResponse,
        agent,
        status
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
};

// Get conversation history
export const getConversationHistory = async (conversationId: string): Promise<any[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    throw error;
  }
};

// Save context
export const saveContext = async (
  id: string,
  conversationId: string,
  contextData: ContextData
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, conversationId, contextData })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error saving context:', error);
    throw error;
  }
};

// Get context
export const getContext = async (conversationId: string): Promise<ContextData[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/context/${conversationId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching context:', error);
    throw error;
  }
};

// Health check
export const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
};
