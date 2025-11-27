/**
 * Tutor Service
 * خدمة المعلم - English Tutor AI Logic
 * مع Key Rotation تلقائي
 */

import { GoogleGenAI } from "@google/genai";

// Model configuration
const TUTOR_MODEL = 'gemini-2.0-flash-lite-preview-02-05';

// ============================================
// DIRECT KEY ROTATION - مباشر وبسيط
// ============================================

// @ts-ignore - Vite env
const env = (import.meta as any).env || {};

const ALL_KEYS = [
  env.VITE_GEMINI_API_KEY_1,
  env.VITE_GEMINI_API_KEY_2,
  env.VITE_GEMINI_API_KEY_3,
  env.VITE_GEMINI_API_KEY_4,
  env.VITE_GEMINI_API_KEY_5,
  env.VITE_GEMINI_API_KEY_6,
  env.VITE_GEMINI_API_KEY_7,
  env.VITE_GEMINI_API_KEY_8,
  env.VITE_GEMINI_API_KEY_9,
  env.VITE_GEMINI_API_KEY_10,
  env.VITE_GEMINI_API_KEY_11,
  env.VITE_GEMINI_API_KEY_12,
  env.VITE_GEMINI_API_KEY_13,
  env.VITE_API_KEY
].filter(Boolean) as string[];

console.log(`🔑 TutorService: ${ALL_KEYS.length} API keys loaded`);

// Track key status
const keyStatus = new Map<number, { failures: number; blockedUntil: number }>();
ALL_KEYS.forEach((_, i) => keyStatus.set(i, { failures: 0, blockedUntil: 0 }));

let currentIndex = 0;

// Get next available key
const getNextKey = (): { key: string; index: number } => {
  const now = Date.now();
  
  for (let i = 0; i < ALL_KEYS.length; i++) {
    const idx = (currentIndex + i) % ALL_KEYS.length;
    const status = keyStatus.get(idx)!;
    
    if (status.blockedUntil <= now) {
      currentIndex = (idx + 1) % ALL_KEYS.length;
      return { key: ALL_KEYS[idx], index: idx };
    }
  }
  
  // All blocked - reset and use first
  console.warn('⚠️ All keys blocked! Resetting...');
  keyStatus.forEach(s => { s.blockedUntil = 0; s.failures = 0; });
  return { key: ALL_KEYS[0], index: 0 };
};

// Mark key as failed
const markKeyFailed = (index: number) => {
  const status = keyStatus.get(index)!;
  status.failures++;
  status.blockedUntil = Date.now() + Math.min(status.failures * 20000, 120000);
  console.log(`⏱️ Key ${index + 1} blocked for ${(status.blockedUntil - Date.now()) / 1000}s`);
};

// Mark key as success
const markKeySuccess = (index: number) => {
  const status = keyStatus.get(index)!;
  status.failures = Math.max(0, status.failures - 1);
};

// Execute with retry
const executeWithRetry = async <T>(
  operation: (ai: GoogleGenAI) => Promise<T>,
  maxRetries: number = ALL_KEYS.length
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const { key, index } = getNextKey();
    
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const result = await operation(ai);
      markKeySuccess(index);
      console.log(`✅ Success with key ${index + 1}`);
      return result;
    } catch (error: any) {
      const is429 = error?.status === 429 || error?.code === 429 || 
                    error?.message?.includes('429') || error?.message?.includes('Resource exhausted');
      
      if (is429) {
        markKeyFailed(index);
        console.log(`🔄 Key ${index + 1} exhausted, trying next... (${attempt + 1}/${maxRetries})`);
        lastError = error;
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError || new Error('All keys exhausted');
};

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

const levelDescriptions: Record<LanguageLevel, {
  description: string;
  vocabulary: string;
  sentenceLength: string;
  corrections: string;
  examples: string;
}> = {
  'A1': {
    description: 'ABSOLUTE BEGINNER',
    vocabulary: 'Use ONLY the 500 most common English words. Avoid any complex words.',
    sentenceLength: 'Use VERY SHORT sentences (3-5 words max). Example: "That is good." "I like it."',
    corrections: 'Give corrections in VERY simple way. Just show the correct word.',
    examples: 'Good: "Hello! How are you?" Bad: "Hello! How are you doing today?"'
  },
  'A2': {
    description: 'ELEMENTARY',
    vocabulary: 'Use simple everyday words only. No idioms, no phrasal verbs.',
    sentenceLength: 'Use short sentences (5-8 words). Keep it simple.',
    corrections: 'Explain mistakes simply. One correction at a time.',
    examples: 'Good: "Where do you live?" Bad: "Whereabouts do you reside?"'
  },
  'B1': {
    description: 'INTERMEDIATE',
    vocabulary: 'Use common vocabulary. You can introduce some expressions.',
    sentenceLength: 'Normal sentences. Can be a bit longer (8-12 words).',
    corrections: 'Explain grammar rules briefly when correcting.',
    examples: 'Can use phrases like "What do you think about...?" or "That sounds interesting!"'
  },
  'B2': {
    description: 'UPPER-INTERMEDIATE',
    vocabulary: 'Use varied vocabulary including some idioms and phrasal verbs.',
    sentenceLength: 'Natural length sentences. Can be complex.',
    corrections: 'Give detailed grammar explanations. Introduce alternatives.',
    examples: 'Can use: "That\'s a great point!" or "I see what you mean, however..."'
  },
  'C1': {
    description: 'ADVANCED',
    vocabulary: 'Use sophisticated vocabulary, idioms, nuanced expressions.',
    sentenceLength: 'Natural, flowing sentences. Complex structures are fine.',
    corrections: 'Discuss nuances, register, style. Challenge the student.',
    examples: 'Discuss topics in depth, use academic language when appropriate.'
  }
};

class TutorService {
  /**
   * Generate a conversational response from the tutor
   */
  async generateResponse(
    history: TutorMessage[],
    userMessage: string,
    level: LanguageLevel = 'B1',
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const levelInfo = levelDescriptions[level];
    
    const systemPrompt = `You are "Lukas", an English Tutor for Arabic-speaking students.

=== CRITICAL: STUDENT LEVEL IS ${level} (${levelInfo.description}) ===

YOU MUST FOLLOW THESE RULES STRICTLY:

1. VOCABULARY: ${levelInfo.vocabulary}

2. SENTENCE LENGTH: ${levelInfo.sentenceLength}

3. CORRECTIONS: ${levelInfo.corrections}

4. EXAMPLES: ${levelInfo.examples}

=== TEACHING STYLE ===
- You are a REAL TEACHER, not just chatting
- ALWAYS correct mistakes - this is how students learn!
- After correction, ask a follow-up question to continue
- Be encouraging but also educational
- Remember what the student said before - refer to previous topics
- If they make the same mistake twice, explain it more clearly

=== RESPONSE FORMAT ===
1. React to what they said (1 sentence)
2. If there's a mistake, correct it gently (1-2 sentences)
3. Ask a follow-up question to keep the conversation going (1 question)

=== IMPORTANT ===
- NEVER use complex words for A1/A2 students
- ALWAYS adapt your language to ${level} level
- Keep responses SHORT (2-4 sentences max)`;

    const conversationText = history.map(msg =>
      `${msg.role === 'user' ? 'Student' : 'Tutor'}: ${msg.content}`
    ).join('\n\n');

    const fullPrompt = `${systemPrompt}\n\nConversation so far:\n${conversationText}\n\nStudent: ${userMessage}\n\nTutor:`;

    // استخدام executeWithRetry للـ streaming مع retry تلقائي
    let fullText = '';
    
    const streamOperation = async (ai: any) => {
      const responseStream = await ai.models.generateContentStream({
        model: TUTOR_MODEL,
        contents: fullPrompt
      });
      
      for await (const chunk of responseStream) {
        const chunkText = chunk.text;
        fullText += chunkText;
        onChunk?.(chunkText);
      }
      
      return fullText;
    };

    return executeWithRetry(streamOperation, 5);
  }

  /**
   * Generate a practice sentence for the student to repeat
   */
  async generatePracticeSentence(
    level: LanguageLevel = 'B1',
    topic?: string
  ): Promise<SentencePractice> {
    const levelInfo = levelDescriptions[level];
    const topicPrompt = topic ? `about "${topic}"` : 'about any everyday topic';

    const prompt = `Generate a practice sentence for ${level} (${levelInfo.description}) level student ${topicPrompt}.

STRICT REQUIREMENTS FOR ${level} LEVEL:
- ${levelInfo.vocabulary}
- ${levelInfo.sentenceLength}

Examples for ${level}:
${level === 'A1' ? '- "I like coffee." / "This is my book." / "How are you?"' : ''}
${level === 'A2' ? '- "I go to work every day." / "My sister lives in Cairo."' : ''}
${level === 'B1' ? '- "I have been studying English for two years." / "What do you think about this?"' : ''}
${level === 'B2' ? '- "If I had more time, I would travel more often."' : ''}
${level === 'C1' ? '- "The implications of this policy remain to be seen."' : ''}

Respond in JSON format:
{
  "sentence": "the practice sentence",
  "topic": "the topic category",
  "hints": ["pronunciation hint 1", "pronunciation hint 2"]
}`;

    return executeWithRetry(async (ai) => {
      const response = await ai.models.generateContent({
        model: TUTOR_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const result = JSON.parse(response.text);
      return {
        sentence: result.sentence,
        topic: result.topic,
        level,
        hints: result.hints
      };
    }, 5);
  }

  /**
   * Evaluate a student's attempt at repeating a sentence
   */
  async evaluateAttempt(
    targetSentence: string,
    studentAttempt: string,
    level: LanguageLevel = 'B1'
  ): Promise<TutorFeedback> {
    const prompt = `You are an English pronunciation and grammar evaluator for Arabic-speaking students.

Target sentence: "${targetSentence}"
Student's attempt (as recognized by speech-to-text): "${studentAttempt}"
Student level: ${level}

Evaluate the student's attempt and provide feedback. Consider common mistakes Arabic speakers make:
- p/b confusion
- v/f confusion
- th sounds
- vowel length
- word stress

Respond in JSON format:
{
  "correctedSentence": "the corrected version if needed, or the original if correct",
  "mistakes": [
    {
      "original": "what the student said",
      "corrected": "what they should say",
      "explanation": "brief explanation"
    }
  ],
  "pronunciationTips": ["tip 1", "tip 2"],
  "score": 85
}

Score should be 0-100 based on accuracy.`;

    return executeWithRetry(async (ai) => {
      const response = await ai.models.generateContent({
        model: TUTOR_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      return JSON.parse(response.text);
    }, 5);
  }

  /**
   * Get conversation topics for the student's level
   */
  getTopicsForLevel(level: LanguageLevel): string[] {
    const topics: Record<LanguageLevel, string[]> = {
      'A1': ['Greetings', 'Family', 'Numbers', 'Colors', 'Food', 'Weather'],
      'A2': ['Shopping', 'Daily Routine', 'Hobbies', 'Directions', 'Health', 'School'],
      'B1': ['Travel', 'Work', 'Movies', 'Technology', 'Environment', 'Culture'],
      'B2': ['News', 'Politics', 'Science', 'Business', 'Education', 'Social Issues'],
      'C1': ['Philosophy', 'Economics', 'Art', 'Literature', 'Psychology', 'Innovation']
    };
    return topics[level];
  }

  /**
   * Get the level description
   */
  getLevelDescription(level: LanguageLevel): string {
    return levelDescriptions[level].description;
  }

  /**
   * Get full level info
   */
  getLevelInfo(level: LanguageLevel) {
    return levelDescriptions[level];
  }
}

// Export singleton instance
export const tutorService = new TutorService();
export default tutorService;
