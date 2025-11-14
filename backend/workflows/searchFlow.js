/**
 * Search Workflow - Mastra Workflow
 * سير عمل البحث: البحث → التحليل → الرد
 */

const { Workflow } = require('mastra');
const SearchAgent = require('../agents/SearchAgent');

// Define workflow
const searchFlow = new Workflow({
  name: 'searchFlow',
  description: 'سير عمل البحث الكامل',
  
  steps: [
    {
      id: 'search',
      agent: SearchAgent,
      input: (context) => ({
        query: context.userMessage,
        language: context.language || 'ar',
        maxResults: context.maxResults || 10
      }),
      onSuccess: (result, context) => {
        console.log('✅ Search completed:', result.results.length, 'results');
        return { searchResults: result };
      },
      onError: (error, context) => {
        console.error('❌ Search failed:', error);
        // Fallback: return empty results
        return {
          searchResults: {
            results: [],
            totalResults: 0,
            query: context.userMessage,
            error: error.message
          }
        };
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

module.exports = searchFlow;
