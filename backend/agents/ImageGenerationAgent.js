/**
 * ImageGenerationAgent - Mastra Implementation
 * وكيل توليد الصور
 */

const { Agent } = require('mastra');

const ImageGenerationAgent = new Agent({
  name: 'ImageGenerationAgent',
  instructions: `أنت وكيل توليد الصور. مهمتك:
1. فهم وصف الصورة المطلوبة
2. توليد صور عالية الجودة
3. تحسين الأوصاف للحصول على نتائج أفضل
4. توفير خيارات متعددة

يجب أن تكون الصور:
- عالية الجودة والدقة
- تطابق الوصف بدقة
- مناسبة للاستخدام`,
  
  model: 'gemini-2.5-flash',
  
  inputSchema: {
    type: 'object',
    properties: {
      prompt: { type: 'string' },
      style: { type: 'string', enum: ['realistic', 'artistic', 'cartoon', 'abstract'] },
      size: { type: 'string', enum: ['256x256', '512x512', '1024x1024'] },
      quantity: { type: 'number' }
    },
    required: ['prompt']
  },
  
  outputSchema: {
    type: 'object',
    properties: {
      images: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            url: { type: 'string' },
            prompt: { type: 'string' },
            size: { type: 'string' }
          }
        }
      },
      timestamp: { type: 'string' }
    }
  },
  
  tools: [
    {
      name: 'generateImage',
      description: 'توليد صورة',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          style: { type: 'string' },
          size: { type: 'string' }
        },
        required: ['prompt']
      }
    }
  ]
});

module.exports = ImageGenerationAgent;
