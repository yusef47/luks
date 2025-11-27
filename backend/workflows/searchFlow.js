/**
 * Search Workflow
 * سير عمل البحث: البحث → التحليل → الرد
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

// Define workflow
const searchFlow = new SimpleWorkflow({
  name: 'searchFlow',
  description: 'سير عمل البحث الكامل',
  
  steps: [
    {
      id: 'search',
      process: async (context) => {
        console.log('🔍 Searching for:', context.userMessage);
        
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
        
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: context.userMessage,
            config: { tools: [{ googleSearch: {} }] }
          });
          
          console.log('✅ Search completed');
          return { 
            searchResults: {
              results: [{ content: response.text }],
              totalResults: 1,
              query: context.userMessage
            }
          };
        } catch (error) {
          console.error('❌ Search failed:', error);
          return {
            searchResults: {
              results: [],
              totalResults: 0,
              query: context.userMessage,
              error: error.message
            }
          };
        }
      }
    },
    {
      id: 'analyze',
      input: (context) => ({
        results: context.searchResults.results,
        query: context.userMessage
      }),
      process: async (input) => {
        // Analyze and rank results
        const ranked = input.results
          .sort((a, b) => (b.relevance || 0) - (a.relevance || 0))
          .slice(0, 5);
        
        return { topResults: ranked };
      },
      onError: (error) => {
        console.error('❌ Analysis failed:', error);
        return { topResults: [] };
      }
    },
    {
      id: 'respond',
      input: (context) => ({
        results: context.topResults,
        query: context.userMessage
      }),
      process: async (input) => {
        // Format response
        const response = {
          query: input.query,
          results: input.results,
          summary: `وجدنا ${input.results.length} نتائج ذات صلة`,
          timestamp: new Date().toISOString()
        };
        return response;
      }
    }
  ],
  
  onComplete: (result) => {
    console.log('✅ Workflow completed:', result);
    return result;
  },
  
  onError: (error) => {
    console.error('❌ Workflow failed:', error);
    return {
      error: error.message,
      fallback: 'حدث خطأ في البحث. يرجى المحاولة مرة أخرى.'
    };
  }
});

export default searchFlow;
