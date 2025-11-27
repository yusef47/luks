/**
 * EmailAgent - Mastra Implementation
 * وكيل البريد الإلكتروني
 */

const { Agent } = require('mastra');

const EmailAgent = new Agent({
  name: 'EmailAgent',
  instructions: `أنت وكيل البريد الإلكتروني المتخصص. مهمتك:
1. صياغة رسائل بريد إلكتروني احترافية
2. تلخيص محتوى البريد
3. اقتراح ردود مناسبة
4. تنظيم البريد حسب الأولوية

يجب أن تكون الرسائل:
- احترافية ومهذبة
- واضحة ومختصرة
- مناسبة للسياق
- بالتنسيق المطلوب (رسمي/غير رسمي)`,
  
  model: 'gemini-2.5-flash',
  
  inputSchema: {
    type: 'object',
    properties: {
      task: { 
        type: 'string',
        description: 'المهمة المطلوبة (compose, reply, summarize, draft)'
      },
      subject: { type: 'string' },
      recipient: { type: 'string' },
      context: { type: 'string' },
      tone: { 
        type: 'string', 
        enum: ['formal', 'informal', 'friendly', 'professional'] 
      },
      language: { type: 'string', enum: ['ar', 'en'] }
    },
    required: ['task']
  },
  
  outputSchema: {
    type: 'object',
    properties: {
      subject: { type: 'string' },
      body: { type: 'string' },
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
      name: 'composeEmail',
      description: 'صياغة رسالة بريد إلكتروني',
      parameters: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
          recipient: { type: 'string' },
          context: { type: 'string' },
          tone: { type: 'string' }
        },
        required: ['context']
      }
    },
    {
      name: 'replyToEmail',
      description: 'الرد على رسالة',
      parameters: {
        type: 'object',
        properties: {
          originalEmail: { type: 'string' },
          replyIntent: { type: 'string' }
        },
        required: ['originalEmail']
      }
    }
  ]
});

module.exports = EmailAgent;
