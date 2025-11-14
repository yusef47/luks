/**
 * MapsAgent - Mastra Implementation
 * وكيل الخرائط والمواقع
 */

const { Agent } = require('mastra');

const MapsAgent = new Agent({
  name: 'MapsAgent',
  instructions: `أنت وكيل الخرائط والمواقع. مهمتك:
1. البحث عن الأماكن والمواقع
2. حساب المسافات والاتجاهات
3. إيجاد الأماكن القريبة
4. توفير معلومات جغرافية

يجب أن تكون المعلومات:
- دقيقة وموثوقة
- تتضمن إحداثيات
- تتضمن معلومات الاتصال`,
  
  model: 'gemini-2.5-flash',
  
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      location: { type: 'string' },
      radius: { type: 'number' },
      type: { type: 'string', enum: ['cafe', 'restaurant', 'hotel', 'hospital', 'school'] }
    },
    required: ['query']
  },
  
  outputSchema: {
    type: 'object',
    properties: {
      places: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            address: { type: 'string' },
            coordinates: { type: 'object' },
            distance: { type: 'number' },
            rating: { type: 'number' }
          }
        }
      },
      totalResults: { type: 'number' }
    }
  },
  
  tools: [
    {
      name: 'searchPlaces',
      description: 'البحث عن أماكن',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          location: { type: 'string' },
          radius: { type: 'number' }
        },
        required: ['query']
      }
    }
  ]
});

module.exports = MapsAgent;
