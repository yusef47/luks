// Main Orchestrator API - COMPLETE SYSTEM
// Gemini Primary → Groq Fallback → Gemini Reviewer

// ═══════════════════════════════════════════════════════════════
//                    ALL MODELS
// ═══════════════════════════════════════════════════════════════

// Gemini models (Primary - Best for Arabic)
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-robotics-er-1.5-preview'
];

// Groq models (Fallback - ordered by Arabic quality)
const GROQ_MODELS = [
  'qwen-2.5-32b',           // Best for Arabic on Groq
  'gpt-oss-120b',           // Good multilingual
  'gemma2-9b-it',           // Google's open model
  'llama-3.3-70b-versatile' // Fast fallback
];

// ═══════════════════════════════════════════════════════════════
//                    API KEYS
// ═══════════════════════════════════════════════════════════════

function getGroqKeys() {
  const keys = [];
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`GROQ_API_KEY_${i}`];
    if (key && key.trim()) keys.push(key.trim());
  }
  return keys;
}

function getGeminiKeys() {
  const keys = [];
  for (let i = 1; i <= 15; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key && key.trim()) keys.push(key.trim());
  }
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY.trim());
  return keys.sort(() => Math.random() - 0.5);
}

// ═══════════════════════════════════════════════════════════════
//                    SYSTEM PROMPT (Gemini)
// ═══════════════════════════════════════════════════════════════

const SYSTEM_PROMPT_GEMINI = `أنت لوكاس (Lukas)، مساعد ذكاء اصطناعي متطور جداً.

═══════════════════════════════════════════════════════════════
                        هويتك
═══════════════════════════════════════════════════════════════
اسمك: لوكاس (Lukas)
طبيعتك: مساعد ذكي، ودود، ومتعاون
مطورك: شخص مصري ذكي ومبدع جداً

قواعد صارمة:
🚫 ممنوع ذكر: Google, Gemini, Bard, Meta, Llama, Groq, OpenAI, GPT, Claude
✅ لو سُئلت عن مطورك: "مطوري هو شخص مصري ذكي ومبدع"

أسلوبك:
- فكر بعمق قبل الإجابة
- قدم إجابات شاملة ومفصلة
- راجع إجابتك قبل تقديمها`;

// ═══════════════════════════════════════════════════════════════
//                    SUPER ARABIC PROMPT (For Groq)
// ═══════════════════════════════════════════════════════════════

const SYSTEM_PROMPT_GROQ = `أنت "لوكاس" (Lukas)، مساعد ذكاء اصطناعي متطور جداً، متخصص في اللغة العربية الفصحى.

═══════════════════════════════════════════════════════════════
                   ⚠️⚠️⚠️ تحذيرات صارمة جداً ⚠️⚠️⚠️
═══════════════════════════════════════════════════════════════

🔴 ممنوع منعاً باتاً استخدام أي كلمة من هذه اللغات:
   - الصينية: 提出、然而、是一个、什么 ❌
   - الروسية: были、должна、проблемы ❌
   - الفيتنامية: cập nhật، kỹ thuật ❌
   - الألمانية: Zustand، werden ❌
   - الإسبانية: hacia، servicios ❌
   - أي لغة أخرى غير العربية أو الإنجليزية ❌

🔴 إذا وجدت نفسك ستكتب كلمة غير عربية، توقف فوراً واكتب البديل العربي!

═══════════════════════════════════════════════════════════════
                        هويتك
═══════════════════════════════════════════════════════════════

اسمك: لوكاس (Lukas)
مطورك: شخص مصري ذكي ومبدع جداً
طبيعتك: مساعد ذكي متخصص بالعربية الفصحى

🚫 ممنوع ذكر: Google, Gemini, Bard, Meta, Llama, Groq, OpenAI, GPT, Claude
🚫 ممنوع قول أنك "نموذج لغوي" أو "LLM" أو "AI model"

═══════════════════════════════════════════════════════════════
                    أسلوب التفكير العميق
═══════════════════════════════════════════════════════════════

1️⃣ افهم السؤال جيداً قبل الإجابة
2️⃣ فكر في جميع جوانب الموضوع
3️⃣ قسّم إجابتك إلى أقسام واضحة
4️⃣ استخدم العناوين والقوائم
5️⃣ قدم أمثلة توضيحية
6️⃣ راجع إجابتك قبل الإرسال:
   - هل كل الكلمات عربية؟ ✓
   - هل الإجابة شاملة؟ ✓
   - هل التنسيق جيد؟ ✓

═══════════════════════════════════════════════════════════════
                    جودة الإجابة
═══════════════════════════════════════════════════════════════

✅ اكتب بأسلوب سلس وواضح
✅ استخدم العربية الفصحى السليمة
✅ قدم إجابات مفصلة وشاملة
✅ استخدم التنسيق (عناوين، قوائم، أرقام)
✅ أضف أمثلة عملية عند الحاجة
✅ اختم بملخص أو خلاصة

═══════════════════════════════════════════════════════════════
                    ⚠️ تذكير أخير ⚠️
═══════════════════════════════════════════════════════════════

قبل إرسال أي إجابة، اسأل نفسك:
"هل كل كلمة في إجابتي عربية أو إنجليزية فقط؟"
إذا وجدت أي كلمة غريبة، احذفها واكتب البديل العربي!`;

// ═══════════════════════════════════════════════════════════════
//                    GEMINI API
// ═══════════════════════════════════════════════════════════════

let geminiKeyIndex = 0;

async function callGemini(prompt, maxTokens = 8000) {
  const keys = getGeminiKeys();
  if (keys.length === 0) {
    console.log('[Gemini] ⚠️ No keys available');
    return null;
  }

  for (const model of GEMINI_MODELS) {
    for (let i = 0; i < Math.min(5, keys.length); i++) {
      try {
        console.log(`[Gemini] 🧠 Trying: ${model}`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': keys[geminiKeyIndex++ % keys.length]
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: maxTokens }
          })
        });

        if (response.status === 429 || response.status === 503) {
          console.log(`[Gemini] Rate limited, trying next key...`);
          continue;
        }
        if (response.status === 404) {
          console.log(`[Gemini] Model ${model} not found, trying next...`);
          break;
        }
        if (!response.ok) continue;

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (text) {
          console.log(`[Gemini] ✅ SUCCESS (${text.length} chars)`);
          return text;
        }
      } catch (error) {
        console.log(`[Gemini] ⚠️ Error: ${error.message}`);
      }
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
//                    GROQ API
// ═══════════════════════════════════════════════════════════════

let groqKeyIndex = 0;

async function callGroq(prompt) {
  const keys = getGroqKeys();
  if (keys.length === 0) {
    console.log('[Groq] ⚠️ No keys available');
    return null;
  }

  for (const model of GROQ_MODELS) {
    for (let i = 0; i < 3; i++) {
      try {
        console.log(`[Groq] ⚡ Trying: ${model}`);
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${keys[groqKeyIndex++ % keys.length]}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 4000
          })
        });

        if (response.status === 429) {
          console.log(`[Groq] Rate limited, trying next...`);
          continue;
        }
        if (response.status === 404) {
          console.log(`[Groq] Model ${model} not found, trying next...`);
          break;
        }
        if (!response.ok) continue;

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;

        if (text) {
          console.log(`[Groq] ✅ SUCCESS (${text.length} chars)`);
          return text;
        }
      } catch (error) {
        console.log(`[Groq] ⚠️ Error: ${error.message}`);
      }
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
//                    GEMINI REVIEWER (Quality Control)
// ═══════════════════════════════════════════════════════════════

async function geminiReviewer(originalResponse, originalQuestion) {
  console.log('[Reviewer] 🔍 Reviewing and improving response...');

  const reviewPrompt = `أنت مراجع جودة متخصص. راجع هذه الإجابة وحسّنها.

═══════════════════════════════════════════════════════════════
                    المطلوب
═══════════════════════════════════════════════════════════════
1. احذف أي كلمات غير عربية (صينية 提出/روسية были/فيتنامية cập/ألمانية Zustand)
2. صحح الأخطاء الإملائية والنحوية
3. حسّن جودة الصياغة والأسلوب
4. تأكد من التنسيق الصحيح (عناوين، قوائم)
5. أضف تفاصيل إضافية إذا كانت الإجابة ناقصة
6. تأكد أن الإجابة تجيب على السؤال بشكل كامل

═══════════════════════════════════════════════════════════════
                    السؤال الأصلي
═══════════════════════════════════════════════════════════════
${originalQuestion}

═══════════════════════════════════════════════════════════════
                    الإجابة المطلوب مراجعتها
═══════════════════════════════════════════════════════════════
${originalResponse}

═══════════════════════════════════════════════════════════════
                    التعليمات
═══════════════════════════════════════════════════════════════
قدم الإجابة المُحسّنة فقط، بدون أي تعليقات إضافية.
اكتب باللغة العربية الفصحى السليمة.`;

  const reviewed = await callGemini(reviewPrompt, 8000);

  if (reviewed) {
    console.log('[Reviewer] ✅ Review complete');
    return reviewed;
  }

  // If review failed, return original
  console.log('[Reviewer] ⚠️ Review failed, returning original');
  return originalResponse;
}

// ═══════════════════════════════════════════════════════════════
//                    SMART ROUTER
// ═══════════════════════════════════════════════════════════════

async function smartRoute(prompt, contextString, timeString) {
  // Build prompts for each API
  const geminiPrompt = SYSTEM_PROMPT_GEMINI +
    `\n\n⏰ الوقت الحالي: ${timeString}` +
    contextString +
    '\n\n👤 سؤال المستخدم:\n' + prompt;

  const groqPrompt = SYSTEM_PROMPT_GROQ +
    `\n\n⏰ الوقت الحالي: ${timeString}` +
    contextString +
    '\n\n👤 سؤال المستخدم:\n' + prompt;

  // Step 1: Try Gemini first (Best quality)
  console.log('[Router] 🧠 Step 1: Trying Gemini...');
  const geminiResponse = await callGemini(geminiPrompt);

  if (geminiResponse) {
    console.log('[Router] ✅ Gemini answered directly');
    return geminiResponse;
  }

  // Step 2: Fallback to Groq with Super Arabic Prompt
  console.log('[Router] ⚡ Step 2: Gemini failed, trying Groq with Super Arabic Prompt...');
  const groqResponse = await callGroq(groqPrompt);

  if (groqResponse) {
    // Step 3: Review Groq's response with Gemini (if Gemini is available)
    console.log('[Router] 🔍 Step 3: Reviewing Groq response with Gemini...');
    const reviewedResponse = await geminiReviewer(groqResponse, prompt);
    return reviewedResponse;
  }

  // All failed
  throw new Error('All AI models failed to respond');
}

// ═══════════════════════════════════════════════════════════════
//                    COMPLEXITY DETECTOR
// ═══════════════════════════════════════════════════════════════

function detectComplexity(prompt) {
  const keywords = ['مالي', 'تكلفة', 'استثمار', 'سعر', 'قانون', 'ترخيص', 'بحث', 'إحصائيات',
    '2024', '2025', 'مشروع', 'شركة', 'تحليل', 'توقعات', 'مقارنة'];
  const matches = keywords.filter(kw => prompt.includes(kw));
  if (matches.length >= 3) return 'complex';
  if (matches.length >= 2) return 'moderate';
  return 'simple';
}

// ═══════════════════════════════════════════════════════════════
//                    AGENT FACTORY CALLER
// ═══════════════════════════════════════════════════════════════

async function callAgentFactory(prompt, conversationHistory = []) {
  try {
    const factoryModule = await import('./agent-factory/index.js');
    const mockReq = { method: 'POST', body: { prompt, conversationHistory } };
    let result = null;
    const mockRes = {
      setHeader: () => { },
      status: (code) => ({ end: () => { }, json: (data) => { result = { code, data }; } })
    };
    await factoryModule.default(mockReq, mockRes);
    if (result?.code === 200 && result?.data?.success) {
      return { success: true, response: result.data.data, meta: result.data.meta };
    }
  } catch (e) {
    console.log('[Orchestrator] Agent Factory error:', e.message);
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
//                    API HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const { prompt, task, conversationHistory, useFactory = 'auto' } = req.body || {};
    const userPrompt = prompt || task;

    if (!userPrompt) return res.status(400).json({ success: false, error: 'Missing prompt' });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`[Orchestrator] 🚀 New request: "${userPrompt.substring(0, 50)}..."`);
    console.log('═══════════════════════════════════════════════════════════════');

    const complexity = detectComplexity(userPrompt);
    console.log(`[Orchestrator] 📊 Complexity: ${complexity}`);

    // Route complex questions to Agent Factory
    if (useFactory === 'always' || (useFactory === 'auto' && complexity !== 'simple')) {
      console.log('[Orchestrator] 🏭 Using Agent Factory...');
      const factoryResult = await callAgentFactory(userPrompt, conversationHistory);
      if (factoryResult?.success) {
        return res.status(200).json({
          success: true,
          data: factoryResult.response,
          meta: { ...factoryResult.meta, usedAgentFactory: true }
        });
      }
      console.log('[Orchestrator] 🔄 Agent Factory failed, falling back...');
    }

    // Regular route for simple questions
    let contextString = '';
    if (conversationHistory && conversationHistory.length > 0) {
      contextString = '\n\n📝 المحادثة السابقة:\n' +
        conversationHistory.slice(-5).map(h =>
          `المستخدم: ${h.prompt}\nلوكاس: ${h.results?.[0]?.result || ''}`
        ).join('\n\n');
    }

    const now = new Date();
    const timeString = now.toLocaleString('ar-EG', {
      timeZone: 'Africa/Cairo',
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const responseText = await smartRoute(userPrompt, contextString, timeString);

    console.log(`[Orchestrator] ✅ Response ready (${responseText.length} chars)`);

    res.status(200).json({
      success: true,
      data: responseText,
      meta: { complexity, usedAgentFactory: false }
    });

  } catch (error) {
    console.error('[Orchestrator] ❌ Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}

