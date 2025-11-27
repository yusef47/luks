/**
 * DriveAgent - Mastra Implementation
 * وكيل إدارة الملفات
 */

const { Agent } = require('mastra');

const DriveAgent = new Agent({
  name: 'DriveAgent',
  instructions: `أنت وكيل إدارة الملفات المتخصص. مهمتك:
1. تنظيم الملفات والمجلدات
2. البحث عن الملفات
3. إنشاء ملخصات للمستندات
4. اقتراح هيكل تنظيمي للملفات
5. إدارة الصلاحيات والمشاركة

يجب أن تكون الإدارة:
- منظمة ومنهجية
- سهلة الوصول
- آمنة ومحمية
- قابلة للبحث`,
  
  model: 'gemini-2.5-flash',
  
  inputSchema: {
    type: 'object',
    properties: {
      task: { 
        type: 'string',
        description: 'المهمة (organize, search, summarize, share)'
      },
      fileName: { type: 'string' },
      folderPath: { type: 'string' },
      searchQuery: { type: 'string' },
      fileType: { 
        type: 'string',
        enum: ['document', 'spreadsheet', 'presentation', 'image', 'video', 'all']
      }
    },
    required: ['task']
  },
  
  outputSchema: {
    type: 'object',
    properties: {
      files: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            path: { type: 'string' },
            type: { type: 'string' },
            size: { type: 'string' },
            modified: { type: 'string' }
          }
        }
      },
      summary: { type: 'string' },
      suggestions: {
        type: 'array',
        items: { type: 'string' }
      },
      timestamp: { type: 'string' }
    }
  },
  
  tools: [
    {
      name: 'searchFiles',
      description: 'البحث عن ملفات',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          fileType: { type: 'string' },
          folderPath: { type: 'string' }
        },
        required: ['query']
      }
    },
    {
      name: 'organizeFiles',
      description: 'تنظيم الملفات',
      parameters: {
        type: 'object',
        properties: {
          files: { type: 'array', items: { type: 'string' } },
          strategy: { type: 'string' }
        },
        required: ['files']
      }
    }
  ]
});

module.exports = DriveAgent;
