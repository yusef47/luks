/**
 * Orchestrator Workflow
 * سير العمل الرئيسي للمنسق
 */

import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Simple Workflow Runner
 */
class SimpleWorkflow {
  constructor(config) {
    this.name = config.name;
    this.description = config.description;
    this.steps = config.steps;
    this.onComplete = config.onComplete;
    this.onError = config.onError;
  }

  async run(context) {
    let currentContext = { ...context };
    
    try {
      for (const step of this.steps) {
        console.log(`Running step: ${step.id}`);
        
        const input = step.input ? step.input(currentContext) : currentContext;
        const result = await step.process(input);
        
        currentContext = { ...currentContext, ...result };
        
        if (step.onSuccess) {
          const successResult = step.onSuccess(result, currentContext);
          currentContext = { ...currentContext, ...successResult };
        }
      }
      
      if (this.onComplete) {
        return this.onComplete(currentContext);
      }
      
      return currentContext;
    } catch (error) {
      if (this.onError) {
        return this.onError(error);
      }
      throw error;
    }
  }
}

const orchestratorFlow = new SimpleWorkflow({
  name: 'orchestratorFlow',
  description: 'سير العمل الرئيسي - من الطلب إلى الرد النهائي',
  
  steps: [
    // Step 1: Planning - إنشاء الخطة
    {
      id: 'planning',
      process: async (context) => {
        console.log('📋 Step 1: Planning...');
        
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
        
        const planPrompt = `أنت المنسق الرئيسي "لوكاس". 
        
طلب المستخدم: "${context.userMessage}"
${context.hasImage ? '⚠️ المستخدم أرفق صورة' : ''}
${context.hasVideo ? '⚠️ المستخدم أرفق فيديو' : ''}

الوكلاء المتاحين:
- SearchAgent: البحث على الإنترنت
- MapsAgent: البحث عن الأماكن
- VisionAgent: تحليل الصور
- VideoAgent: تحليل الفيديو
- ImageGenerationAgent: إنشاء صور
- EmailAgent: كتابة البريد
- SheetsAgent: جداول البيانات
- DriveAgent: إدارة الملفات

أرجع خطة بصيغة JSON فقط:
{
  "plan": [
    { "step": 1, "agent": "AgentName", "task": "المهمة" }
  ],
  "reasoning": "سبب اختيار هذه الخطة"
}

ملاحظات:
- الخطوة الأخيرة دائماً agent: "Orchestrator" task: "تجميع النتائج"
- إذا الطلب بسيط ولا يحتاج وكلاء، أرجع plan فارغ`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: planPrompt,
          config: { responseMimeType: 'application/json' }
        });

        const planData = JSON.parse(response.text);
        console.log('📋 Plan created:', planData.plan?.length || 0, 'steps');
        
        return { 
          plan: planData.plan || [], 
          reasoning: planData.reasoning,
          userMessage: context.userMessage,
          hasImage: context.hasImage,
          hasVideo: context.hasVideo,
          imageFile: context.imageFile,
          videoFile: context.videoFile,
          location: context.location
        };
      },
      onError: (error) => {
        console.error('❌ Planning failed:', error);
        return { plan: [], error: error.message };
      }
    },
    
    // Step 2: Execution - تنفيذ الخطة
    {
      id: 'execution',
      input: (context) => context,
      process: async (context) => {
        console.log('⚡ Step 2: Executing plan...');
        
        const results = [];
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
        
        for (const step of context.plan) {
          if (step.agent === 'Orchestrator') {
            // Skip orchestrator step, will handle in synthesis
            continue;
          }
          
          console.log(`  → Executing step ${step.step}: ${step.agent}`);
          
          try {
            let result = '';
            
            // Execute based on agent type
            switch (step.agent) {
              case 'SearchAgent':
                const searchResponse = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: step.task,
                  config: { tools: [{ googleSearch: {} }] }
                });
                result = searchResponse.text;
                break;
                
              case 'MapsAgent':
                const mapsPrompt = context.location 
                  ? `الموقع الحالي: ${context.location.latitude}, ${context.location.longitude}\n${step.task}`
                  : step.task;
                const mapsResponse = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: mapsPrompt
                });
                result = mapsResponse.text;
                break;
                
              case 'VisionAgent':
                if (context.imageFile) {
                  // Handle image analysis
                  result = 'Image analysis would be performed here';
                } else {
                  result = 'No image provided for analysis';
                }
                break;
                
              case 'VideoAgent':
                if (context.videoFile) {
                  result = 'Video analysis would be performed here';
                } else {
                  result = 'No video provided for analysis';
                }
                break;
                
              case 'ImageGenerationAgent':
                // Image generation
                const imgResponse = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: `Generate a detailed image description for: ${step.task}`
                });
                result = imgResponse.text;
                break;
                
              case 'EmailAgent':
                const emailResponse = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: `اكتب بريد إلكتروني: ${step.task}`
                });
                result = emailResponse.text;
                break;
                
              case 'SheetsAgent':
                const sheetsResponse = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: `أنشئ جدول بيانات: ${step.task}\nأرجع البيانات بصيغة JSON`
                });
                result = sheetsResponse.text;
                break;
                
              case 'DriveAgent':
                const driveResponse = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: `نظم الملفات: ${step.task}`
                });
                result = driveResponse.text;
                break;
                
              default:
                const defaultResponse = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: step.task
                });
                result = defaultResponse.text;
            }
            
            results.push({
              step: step.step,
              agent: step.agent,
              task: step.task,
              result,
              status: 'completed'
            });
            
          } catch (error) {
            console.error(`  ❌ Step ${step.step} failed:`, error.message);
            results.push({
              step: step.step,
              agent: step.agent,
              task: step.task,
              result: '',
              error: error.message,
              status: 'error'
            });
          }
        }
        
        console.log('⚡ Execution complete:', results.length, 'results');
        return { ...context, results };
      },
      onError: (error) => {
        console.error('❌ Execution failed:', error);
        return { results: [], error: error.message };
      }
    },
    
    // Step 3: Synthesis - تجميع النتائج
    {
      id: 'synthesis',
      input: (context) => context,
      process: async (context) => {
        console.log('🎯 Step 3: Synthesizing results...');
        
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
        
        const synthesisPrompt = `أنت المنسق الرئيسي "لوكاس".

الطلب الأصلي: "${context.userMessage}"

نتائج الوكلاء:
${context.results.map(r => `[${r.agent}]: ${r.result}`).join('\n\n')}

اكتب رداً شاملاً ومفيداً يجمع كل النتائج بطريقة واضحة ومنظمة.
- استخدم تنسيق Markdown
- كن مختصراً ومفيداً
- أجب باللغة العربية إذا كان السؤال بالعربية`;

        const synthesisResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: synthesisPrompt
        });
        
        console.log('🎯 Synthesis complete');
        
        return {
          finalResponse: synthesisResponse.text,
          plan: context.plan,
          results: context.results,
          reasoning: context.reasoning
        };
      },
      onError: (error) => {
        console.error('❌ Synthesis failed:', error);
        return { 
          finalResponse: 'حدث خطأ في تجميع النتائج',
          error: error.message 
        };
      }
    }
  ],
  
  onComplete: (result) => {
    console.log('✅ Orchestrator workflow completed');
    return result;
  },
  
  onError: (error) => {
    console.error('❌ Orchestrator workflow failed:', error);
    return {
      error: error.message,
      fallback: 'حدث خطأ. يرجى المحاولة مرة أخرى.'
    };
  }
});

export default orchestratorFlow;
