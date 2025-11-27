/**
 * English Tutor Workflow
 * سير عمل معلم اللغة الإنجليزية
 */

import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Simple Workflow Runner
 */
class SimpleWorkflow {
  constructor(config) {
    this.name = config.name;
    this.description = config.description;
    this.steps = config.steps;
    this.onComplete = config.onComplete;
    this.onError = config.onError;
  }

  async run(context) {
    let currentContext = { ...context };
    
    try {
      for (const step of this.steps) {
        console.log(`Running step: ${step.id}`);
        
        const input = step.input ? step.input(currentContext) : currentContext;
        const result = await step.process(input);
        
        currentContext = { ...currentContext, ...result };
      }
      
      if (this.onComplete) {
        return this.onComplete(currentContext);
      }
      
      return currentContext;
    } catch (error) {
      if (this.onError) {
        return this.onError(error);
      }
      throw error;
    }
  }
}

const TUTOR_MODEL = 'gemini-2.0-flash-lite-preview-02-05';

const levelDescriptions = {
  'A1': 'BEGINNER (A1) - Use very simple vocabulary and short sentences. Speak slowly and clearly.',
  'A2': 'ELEMENTARY (A2) - Use simple, everyday vocabulary. Keep sentences short and clear.',
  'B1': 'INTERMEDIATE (B1) - Use clear, standard vocabulary. You can use some common expressions.',
  'B2': 'UPPER-INTERMEDIATE (B2) - Use varied vocabulary with some idioms. More natural conversation.',
  'C1': 'ADVANCED (C1) - Use sophisticated vocabulary and complex structures. Natural fluent speech.'
};

const englishTutorFlow = new SimpleWorkflow({
  name: 'englishTutorFlow',
  description: 'سير عمل معلم الإنجليزية - محادثة، تصحيح، تدريب',
  
  steps: [
    // Step 1: Analyze Input - تحليل المدخلات
    {
      id: 'analyze',
      process: async (context) => {
        console.log('📝 Analyzing student input...');
        
        const { message, level = 'B1', mode = 'conversation', history = [] } = context;
        
        // Detect potential errors in the input
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
        
        const analysisPrompt = `Analyze this English text from an Arabic-speaking student (Level: ${level}):
"${message}"

Identify:
1. Grammar errors (if any)
2. Vocabulary issues
3. Common Arabic speaker mistakes (p/b, v/f, th sounds)
4. Overall comprehensibility

Return JSON:
{
  "hasErrors": true/false,
  "errors": [{"original": "...", "corrected": "...", "type": "grammar/vocabulary/pronunciation"}],
  "comprehensible": true/false,
  "suggestedLevel": "A1/A2/B1/B2/C1"
}`;

        try {
          const analysis = await ai.models.generateContent({
            model: TUTOR_MODEL,
            contents: analysisPrompt,
            config: { responseMimeType: 'application/json' }
          });
          
          const analysisData = JSON.parse(analysis.text);
          console.log('📝 Analysis complete:', analysisData.hasErrors ? 'Errors found' : 'No errors');
          
          return {
            ...context,
            analysis: analysisData
          };
        } catch (error) {
          console.error('Analysis error:', error);
          return {
            ...context,
            analysis: { hasErrors: false, errors: [], comprehensible: true }
          };
        }
      }
    },
    
    // Step 2: Generate Response - إنشاء الرد
    {
      id: 'respond',
      input: (context) => context,
      process: async (context) => {
        console.log('💬 Generating tutor response...');
        
        const { message, level = 'B1', mode, history = [], analysis } = context;
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
        
        const levelDesc = levelDescriptions[level] || levelDescriptions['B1'];
        
        const systemPrompt = `You are "Lukas", an encouraging and patient English Tutor for Arabic speakers.

Student Level: ${levelDesc}

Guidelines:
- Correct grammar mistakes gently and naturally
- Be patient and supportive - celebrate progress!
- Ask follow-up questions to encourage conversation
- Keep responses concise (2-3 sentences) for natural back-and-forth
- Use vocabulary appropriate for ${level} level
- If they struggle, rephrase or simplify without being condescending
- Always respond in English

${analysis?.hasErrors ? `
Note: The student made these errors:
${analysis.errors.map(e => `- "${e.original}" → "${e.corrected}" (${e.type})`).join('\n')}
Gently correct them in your response.
` : ''}`;

        const conversationHistory = history.map(msg => 
          `${msg.role === 'user' ? 'Student' : 'Tutor'}: ${msg.content}`
        ).join('\n');
        
        const fullPrompt = `${systemPrompt}

${conversationHistory ? `Conversation so far:\n${conversationHistory}\n\n` : ''}Student: ${message}

Tutor:`;

        const response = await ai.models.generateContent({
          model: TUTOR_MODEL,
          contents: fullPrompt
        });
        
        console.log('💬 Response generated');
        
        return {
          ...context,
          tutorResponse: response.text
        };
      }
    },
    
    // Step 3: Prepare Final Output - تجهيز الخرج النهائي
    {
      id: 'finalize',
      input: (context) => context,
      process: async (context) => {
        console.log('✨ Finalizing response...');
        
        const { message, level, analysis, tutorResponse, history = [] } = context;
        
        // Build corrections list
        const corrections = analysis?.errors?.map(e => ({
          original: e.original,
          corrected: e.corrected,
          explanation: `${e.type} error`
        })) || [];
        
        // Update conversation history
        const updatedHistory = [
          ...history,
          { role: 'user', content: message },
          { role: 'assistant', content: tutorResponse }
        ];
        
        return {
          response: tutorResponse,
          corrections,
          analysis: {
            hasErrors: analysis?.hasErrors || false,
            suggestedLevel: analysis?.suggestedLevel || level
          },
          history: updatedHistory,
          timestamp: new Date().toISOString()
        };
      }
    }
  ],
  
  onComplete: (result) => {
    console.log('✅ English Tutor workflow completed');
    return result;
  },
  
  onError: (error) => {
    console.error('❌ English Tutor workflow failed:', error);
    return {
      response: "I'm sorry, I had trouble understanding. Could you please repeat that?",
      error: error.message
    };
  }
});

// Practice sentence generator
englishTutorFlow.generatePractice = async (level = 'B1', topic = null) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
  
  const prompt = `Generate a practice sentence for an English student at ${level} level${topic ? ` about "${topic}"` : ''}.

Return JSON:
{
  "sentence": "the practice sentence",
  "topic": "topic category",
  "hints": ["pronunciation hint 1", "hint 2"],
  "vocabulary": [{"word": "...", "meaning": "..."}]
}`;

  const response = await ai.models.generateContent({
    model: TUTOR_MODEL,
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });
  
  return JSON.parse(response.text);
};

// Evaluate pronunciation attempt
englishTutorFlow.evaluateAttempt = async (targetSentence, studentAttempt, level = 'B1') => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
  
  const prompt = `Evaluate this pronunciation attempt from an Arabic-speaking English student (Level: ${level}):

Target sentence: "${targetSentence}"
Student's attempt (speech-to-text): "${studentAttempt}"

Consider common Arabic speaker challenges:
- p/b confusion
- v/f confusion
- th sounds
- vowel length
- word stress

Return JSON:
{
  "score": 0-100,
  "correctedSentence": "...",
  "mistakes": [{"original": "...", "corrected": "...", "explanation": "..."}],
  "pronunciationTips": ["tip 1", "tip 2"],
  "encouragement": "encouraging message"
}`;

  const response = await ai.models.generateContent({
    model: TUTOR_MODEL,
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });
  
  return JSON.parse(response.text);
};

export default englishTutorFlow;
