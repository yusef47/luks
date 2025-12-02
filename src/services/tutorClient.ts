/**
 * Tutor Client - Frontend
 * ⚠️ SECURITY: All calls go through backend proxy
 * NO API keys in frontend
 */

// @ts-ignore - Vite env
const env = (import.meta as any).env || {};

const BACKEND_URL = env.VITE_BACKEND_URL || 'http://localhost:5000/api';

export type LanguageLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export interface TutorMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface TutorFeedback {
  correctedSentence: string;
  mistakes: {
    original: string;
    corrected: string;
    explanation: string;
  }[];
  pronunciationTips: string[];
  score: number;
}

export interface SentencePractice {
  sentence: string;
  topic: string;
  level: LanguageLevel;
  hints?: string[];
}

/**
 * Generate tutor response via backend
 */
export const generateTutorResponse = async (
  history: TutorMessage[],
  userMessage: string,
  level: LanguageLevel = 'B1'
): Promise<string> => {
  try {
    console.log(`\n📤 Sending tutor request to ${BACKEND_URL}/tutor/generate-response`);
    console.log(`   Message: "${userMessage.substring(0, 30)}..."`);
    console.log(`   Level: ${level}`);
    
    const response = await fetch(`${BACKEND_URL}/tutor/generate-response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        history,
        userMessage,
        level
      })
    });

    console.log(`📥 Response status: ${response.status}`);

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const result = await response.json();
    console.log(`✅ Got result:`, result);

    if (!result.success) {
      throw new Error(result.error || 'Failed to generate response');
    }

    console.log(`✅ Returning response: "${result.data?.substring(0, 50)}..."`);
    return result.data || '';
  } catch (error: any) {
    console.error('❌ Tutor response error:', error);
    throw error;
  }
};

/**
 * Generate practice sentence via backend
 */
export const generatePracticeSentence = async (
  level: LanguageLevel = 'B1',
  topic?: string
): Promise<SentencePractice> => {
  try {
    const response = await fetch(`${BACKEND_URL}/tutor/generate-practice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        level,
        topic
      })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to generate practice');
    }

    return result.data;
  } catch (error: any) {
    console.error('❌ Practice generation error:', error);
    throw error;
  }
};

/**
 * Evaluate student attempt via backend
 */
export const evaluateAttempt = async (
  targetSentence: string,
  studentAttempt: string,
  level: LanguageLevel = 'B1'
): Promise<TutorFeedback> => {
  try {
    const response = await fetch(`${BACKEND_URL}/tutor/evaluate-attempt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetSentence,
        studentAttempt,
        level
      })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to evaluate attempt');
    }

    return result.data;
  } catch (error: any) {
    console.error('❌ Evaluation error:', error);
    throw error;
  }
};

export default {
  generateTutorResponse,
  generatePracticeSentence,
  evaluateAttempt
};
