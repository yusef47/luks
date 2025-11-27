/**
 * EnglishTutorAgent - Mastra Implementation
 * وكيل معلم اللغة الإنجليزية
 */

const { Agent } = require('mastra');

const levelDescriptions = {
  'A1': 'BEGINNER (A1) - Use very simple vocabulary and short sentences. Speak slowly and clearly.',
  'A2': 'ELEMENTARY (A2) - Use simple, everyday vocabulary. Keep sentences short and clear.',
  'B1': 'INTERMEDIATE (B1) - Use clear, standard vocabulary. You can use some common expressions.',
  'B2': 'UPPER-INTERMEDIATE (B2) - Use varied vocabulary with some idioms. More natural conversation.',
  'C1': 'ADVANCED (C1) - Use sophisticated vocabulary and complex structures. Natural fluent speech.'
};

const EnglishTutorAgent = new Agent({
  name: 'EnglishTutorAgent',
  instructions: `You are "Lukas", an encouraging and patient English Tutor for Arabic-speaking students.

Your goals:
1. Help students practice conversational English
2. Correct grammar mistakes gently and naturally
3. Improve pronunciation awareness
4. Build vocabulary appropriate to their level
5. Encourage and motivate learners

Guidelines:
- Be patient and supportive - celebrate progress!
- Ask follow-up questions to encourage conversation
- Keep responses concise (2-3 sentences) for natural back-and-forth
- If they struggle, rephrase or simplify without being condescending
- Always respond in English, but you can explain grammar in simple terms
- For pronunciation, note common Arabic speaker challenges:
  * p/b confusion
  * v/f confusion  
  * th sounds
  * vowel length
  * word stress

Adapt your responses based on the student's level.`,
  
  model: 'gemini-2.0-flash-lite-preview-02-05',
  
  inputSchema: {
    type: 'object',
    properties: {
      message: { 
        type: 'string',
        description: 'رسالة الطالب'
      },
      level: { 
        type: 'string',
        enum: ['A1', 'A2', 'B1', 'B2', 'C1'],
        description: 'مستوى الطالب'
      },
      mode: {
        type: 'string',
        enum: ['conversation', 'practice', 'correction'],
        description: 'نوع التفاعل'
      },
      conversationHistory: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            role: { type: 'string' },
            content: { type: 'string' }
          }
        }
      }
    },
    required: ['message']
  },
  
  outputSchema: {
    type: 'object',
    properties: {
      response: { 
        type: 'string',
        description: 'رد المعلم'
      },
      corrections: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            original: { type: 'string' },
            corrected: { type: 'string' },
            explanation: { type: 'string' }
          }
        }
      },
      vocabulary: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            word: { type: 'string' },
            meaning: { type: 'string' },
            example: { type: 'string' }
          }
        }
      },
      pronunciationTips: {
        type: 'array',
        items: { type: 'string' }
      },
      encouragement: { type: 'string' },
      followUpQuestion: { type: 'string' }
    }
  },
  
  tools: [
    {
      name: 'correctGrammar',
      description: 'تصحيح القواعد',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          level: { type: 'string' }
        },
        required: ['text']
      }
    },
    {
      name: 'generatePractice',
      description: 'إنشاء تمرين',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          level: { type: 'string' },
          type: { type: 'string', enum: ['sentence', 'question', 'dialogue'] }
        },
        required: ['level']
      }
    },
    {
      name: 'evaluatePronunciation',
      description: 'تقييم النطق',
      parameters: {
        type: 'object',
        properties: {
          targetSentence: { type: 'string' },
          studentAttempt: { type: 'string' }
        },
        required: ['targetSentence', 'studentAttempt']
      }
    }
  ]
});

// Export level descriptions for use elsewhere
EnglishTutorAgent.levelDescriptions = levelDescriptions;

module.exports = EnglishTutorAgent;
