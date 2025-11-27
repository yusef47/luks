/**
 * OrchestratorAgent - Mastra Implementation
 * الوكيل المنسق الرئيسي - يدير كل الوكلاء الآخرين
 */

const { Agent } = require('mastra');

const AVAILABLE_AGENTS = [
  { name: 'SearchAgent', description: 'البحث على الإنترنت والحصول على معلومات محدثة' },
  { name: 'MapsAgent', description: 'البحث عن الأماكن والمواقع والاتجاهات' },
  { name: 'VisionAgent', description: 'تحليل الصور واستخراج المعلومات منها' },
  { name: 'VideoAgent', description: 'تحليل مقاطع الفيديو' },
  { name: 'ImageGenerationAgent', description: 'إنشاء صور من النص' },
  { name: 'EmailAgent', description: 'كتابة وإدارة رسائل البريد الإلكتروني' },
  { name: 'SheetsAgent', description: 'إنشاء وتحليل جداول البيانات' },
  { name: 'DriveAgent', description: 'إدارة وتنظيم الملفات' },
  { name: 'EnglishTutorAgent', description: 'تعليم وممارسة اللغة الإنجليزية' }
];

const OrchestratorAgent = new Agent({
  name: 'OrchestratorAgent',
  instructions: `أنت المنسق الرئيسي "لوكاس" (Lukas). مهمتك هي:

1. فهم طلب المستخدم بدقة
2. تحديد الوكلاء المناسبين لتنفيذ المهمة
3. إنشاء خطة عمل واضحة ومنطقية
4. تنسيق عمل الوكلاء المختلفين
5. دمج النتائج وتقديم رد شامل

الوكلاء المتاحين:
${AVAILABLE_AGENTS.map(a => `- ${a.name}: ${a.description}`).join('\n')}

قواعد إنشاء الخطة:
- ابدأ دائماً بتحليل الطلب
- اختر الوكلاء المناسبين فقط
- رتب الخطوات بشكل منطقي
- الخطوة الأخيرة دائماً هي التجميع والرد

مثال خطة:
[
  { "step": 1, "agent": "SearchAgent", "task": "البحث عن..." },
  { "step": 2, "agent": "SheetsAgent", "task": "تنظيم البيانات..." },
  { "step": 3, "agent": "Orchestrator", "task": "تجميع النتائج والرد" }
]

ملاحظات:
- إذا كان الطلب يحتاج صورة، استخدم ImageGenerationAgent
- إذا كان الطلب يحتاج معلومات حديثة، استخدم SearchAgent
- إذا كان الطلب يتضمن صورة من المستخدم، استخدم VisionAgent
- إذا كان الطلب يتضمن فيديو، استخدم VideoAgent
- إذا كان الطلب عن مكان، استخدم MapsAgent`,
  
  model: 'gemini-2.5-flash',
  
  inputSchema: {
    type: 'object',
    properties: {
      userMessage: { 
        type: 'string',
        description: 'رسالة المستخدم'
      },
      hasImage: { 
        type: 'boolean',
        description: 'هل يوجد صورة مرفقة'
      },
      hasVideo: { 
        type: 'boolean',
        description: 'هل يوجد فيديو مرفق'
      },
      conversationHistory: {
        type: 'array',
        items: {
          type: 'object'
        },
        description: 'سجل المحادثة'
      },
      userLocation: {
        type: 'object',
        properties: {
          latitude: { type: 'number' },
          longitude: { type: 'number' }
        },
        description: 'موقع المستخدم'
      }
    },
    required: ['userMessage']
  },
  
  outputSchema: {
    type: 'object',
    properties: {
      plan: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            step: { type: 'number' },
            agent: { type: 'string' },
            task: { type: 'string' }
          }
        },
        description: 'خطة التنفيذ'
      },
      clarification: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          options: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                key: { type: 'string' },
                value: { type: 'string' }
              }
            }
          }
        },
        description: 'سؤال توضيحي إذا لزم الأمر'
      },
      directResponse: {
        type: 'string',
        description: 'رد مباشر إذا لم يكن هناك حاجة لوكلاء'
      },
      reasoning: {
        type: 'string',
        description: 'شرح سبب اختيار هذه الخطة'
      }
    }
  },
  
  tools: [
    {
      name: 'createPlan',
      description: 'إنشاء خطة تنفيذ',
      parameters: {
        type: 'object',
        properties: {
          userMessage: { type: 'string' },
          hasImage: { type: 'boolean' },
          hasVideo: { type: 'boolean' }
        },
        required: ['userMessage']
      }
    },
    {
      name: 'synthesizeResults',
      description: 'تجميع نتائج الوكلاء',
      parameters: {
        type: 'object',
        properties: {
          originalRequest: { type: 'string' },
          results: { type: 'array', items: { type: 'object' } }
        },
        required: ['originalRequest', 'results']
      }
    },
    {
      name: 'askClarification',
      description: 'طلب توضيح من المستخدم',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } }
        },
        required: ['question']
      }
    }
  ]
});

// Export available agents list
OrchestratorAgent.AVAILABLE_AGENTS = AVAILABLE_AGENTS;

module.exports = OrchestratorAgent;
