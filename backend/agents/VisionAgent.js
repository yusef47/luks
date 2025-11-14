/**
 * VisionAgent - Mastra Implementation
 * وكيل تحليل الصور
 */

const { Agent } = require('mastra');

const VisionAgent = new Agent({
  name: 'VisionAgent',
  instructions: `أنت وكيل تحليل الصور المتخصص. مهمتك:
1. تحليل محتوى الصور
2. التعرف على الكائنات والنصوص
3. وصف الصور بدقة
4. استخراج المعلومات المهمة

يجب أن يكون التحليل:
- دقيقاً وشاملاً
- منسقاً بشكل واضح
- يتضمن وصف تفصيلي`,
  
  model: 'gemini-2.5-flash',
  
  inputSchema: {
    type: 'object',
    properties: {
      imageUrl: { type: 'string' },
      imageBase64: { type: 'string' },
      analysisType: { type: 'string', enum: ['general', 'text', 'objects', 'scene'] }
    },
    required: ['imageUrl']
  },
  
  outputSchema: {
    type: 'object',
    properties: {
      description: { type: 'string' },
      objects: { type: 'array', items: { type: 'string' } },
      text: { type: 'string' },
      confidence: { type: 'number' },
      timestamp: { type: 'string' }
    }
  },
  
  tools: [
    {
      name: 'analyzeImage',
      description: 'تحليل الصورة',
      parameters: {
        type: 'object',
        properties: {
          imageUrl: { type: 'string' },
          analysisType: { type: 'string' }
        },
        required: ['imageUrl']
      }
    }
  ]
});

module.exports = VisionAgent;
