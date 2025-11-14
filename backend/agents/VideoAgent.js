/**
 * VideoAgent - Mastra Implementation
 * وكيل تحليل الفيديو
 */

const { Agent } = require('mastra');

const VideoAgent = new Agent({
  name: 'VideoAgent',
  instructions: `أنت وكيل تحليل الفيديو. مهمتك:
1. تحليل محتوى الفيديو
2. استخراج المشاهد المهمة
3. توليد ملخصات
4. التعرف على الأشخاص والأماكن

يجب أن يكون التحليل:
- شاملاً ودقيقاً
- يتضمن ملخص زمني
- يتضمن نقاط مهمة`,
  
  model: 'gemini-2.5-flash',
  
  inputSchema: {
    type: 'object',
    properties: {
      videoUrl: { type: 'string' },
      duration: { type: 'number' },
      analysisType: { type: 'string', enum: ['summary', 'scenes', 'transcript', 'full'] }
    },
    required: ['videoUrl']
  },
  
  outputSchema: {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      scenes: { type: 'array', items: { type: 'object' } },
      keyPoints: { type: 'array', items: { type: 'string' } },
      duration: { type: 'number' },
      timestamp: { type: 'string' }
    }
  },
  
  tools: [
    {
      name: 'analyzeVideo',
      description: 'تحليل الفيديو',
      parameters: {
        type: 'object',
        properties: {
          videoUrl: { type: 'string' },
          analysisType: { type: 'string' }
        },
        required: ['videoUrl']
      }
    }
  ]
});

module.exports = VideoAgent;
