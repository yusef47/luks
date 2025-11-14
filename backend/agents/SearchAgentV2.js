/**
 * SearchAgent v2 - مع Streaming Support
 * وكيل البحث مع دعم الـ Streaming الحقيقي
 */

const { Agent } = require('mastra');

const SearchAgentV2 = new Agent({
  name: 'SearchAgent',
  instructions: `أنت وكيل البحث المتخصص. مهمتك:
1. فهم استعلام البحث
2. البحث عن المعلومات ذات الصلة
3. تنظيم النتائج حسب الأهمية
4. إرجاع نتائج منسقة

يجب أن تكون النتائج:
- دقيقة وموثوقة
- منسقة بشكل واضح
- مرتبة حسب الأهمية
- تحتوي على روابط صحيحة`,
  
  model: 'gemini-2.5-flash',
  
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'البحث أو السؤال'
      },
      language: {
        type: 'string',
        enum: ['ar', 'en'],
        description: 'اللغة'
      },
      maxResults: {
        type: 'number',
        description: 'عدد النتائج'
      }
    },
    required: ['query']
  },
  
  outputSchema: {
    type: 'object',
    properties: {
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            url: { type: 'string' },
            relevance: { type: 'number' }
          }
        }
      },
      totalResults: { type: 'number' },
      query: { type: 'string' },
      timestamp: { type: 'string' }
    },
    required: ['results', 'totalResults', 'query']
  },
  
  tools: [
    {
      name: 'performSearch',
      description: 'تنفيذ عملية بحث',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          limit: { type: 'number' }
        },
        required: ['query']
      }
    }
  ]
});

module.exports = SearchAgentV2;
