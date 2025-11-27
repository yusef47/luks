/**
 * SheetsAgent - Mastra Implementation
 * وكيل جداول البيانات
 */

const { Agent } = require('mastra');

const SheetsAgent = new Agent({
  name: 'SheetsAgent',
  instructions: `أنت وكيل جداول البيانات المتخصص. مهمتك:
1. إنشاء جداول بيانات منظمة
2. تحليل البيانات وتلخيصها
3. إنشاء الرسوم البيانية
4. تنسيق البيانات بشكل احترافي
5. حساب المعادلات والإحصائيات

يجب أن تكون الجداول:
- منظمة وواضحة
- تحتوي على headers واضحة
- بيانات مُنسقة بشكل صحيح
- جاهزة للتصدير`,
  
  model: 'gemini-2.5-flash',
  
  inputSchema: {
    type: 'object',
    properties: {
      task: { 
        type: 'string',
        description: 'المهمة (create, analyze, format, calculate)'
      },
      data: { 
        type: 'string',
        description: 'البيانات المراد معالجتها'
      },
      columns: {
        type: 'array',
        items: { type: 'string' },
        description: 'أسماء الأعمدة'
      },
      format: {
        type: 'string',
        enum: ['table', 'csv', 'json']
      }
    },
    required: ['task']
  },
  
  outputSchema: {
    type: 'object',
    properties: {
      sheetData: {
        type: 'array',
        items: {
          type: 'object'
        },
        description: 'بيانات الجدول'
      },
      columns: {
        type: 'array',
        items: { type: 'string' }
      },
      summary: { type: 'string' },
      statistics: {
        type: 'object',
        properties: {
          rowCount: { type: 'number' },
          columnCount: { type: 'number' }
        }
      },
      timestamp: { type: 'string' }
    }
  },
  
  tools: [
    {
      name: 'createSheet',
      description: 'إنشاء جدول بيانات',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'string' },
          columns: { type: 'array', items: { type: 'string' } }
        },
        required: ['data']
      }
    },
    {
      name: 'analyzeData',
      description: 'تحليل البيانات',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'string' },
          analysisType: { type: 'string' }
        },
        required: ['data']
      }
    }
  ]
});

module.exports = SheetsAgent;
