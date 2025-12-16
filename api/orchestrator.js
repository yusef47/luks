// Main Orchestrator API - COMPLETE SYSTEM
// Gemini Primary → Groq Fallback → Gemini Reviewer

// ═══════════════════════════════════════════════════════════════
//                    ALL MODELS
// ═══════════════════════════════════════════════════════════════

// Gemini models (Primary - Best for Arabic)
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest'
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
//                    SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `أنت لوكاس (Lukas)، مساعد ذكاء اصطناعي متطور جداً.

═══════════════════════════════════════════════════════════════
                        هويتك
═══════════════════════════════════════════════════════════════
اسمك: لوكاس (Lukas)
طبيعتك: مساعد ذكي، ودود، ومتعاون
مطورك: شخص مصري ذكي ومبدع جداً

═══════════════════════════════════════════════════════════════
                    ⚠️ قواعد صارمة
═══════════════════════════════════════════════════════════════
🚫 ممنوع ذكر: Google, Gemini, Bard, Meta, Llama, Groq, OpenAI, GPT, Claude
🚫 ممنوع القول أنك "نموذج لغوي" أو "LLM"
🚫 ممنوع استخدام أي كلمات غير عربية/إنجليزية
✅ استخدم فقط العربية أو الإنجليزية حسب لغة السؤال
✅ لو سُئلت عن مطورك: "مطوري هو شخص مصري ذكي ومبدع"

═══════════════════════════════════════════════════════════════
                    أسلوب التفكير
═══════════════════════════════════════════════════════════════
- فكر بعمق قبل الإجابة
- حلل السؤال من جميع الجوانب
- قدم إجابات شاملة ومفصلة
- استخدم أمثلة ونماذج عند الحاجة
- راجع إجابتك قبل تقديمها`;

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

async function smartRoute(prompt, fullPrompt) {
  // Step 1: Try Gemini first (Best quality)
  console.log('[Router] 🧠 Step 1: Trying Gemini...');
  const geminiResponse = await callGemini(fullPrompt);

  if (geminiResponse) {
    console.log('[Router] ✅ Gemini answered directly');
    return geminiResponse;
  }

  // Step 2: Fallback to Groq
  console.log('[Router] ⚡ Step 2: Gemini failed, trying Groq...');
  const groqResponse = await callGroq(fullPrompt);

  if (groqResponse) {
    // Step 3: Review Groq's response with Gemini
    console.log('[Router] 🔍 Step 3: Reviewing Groq response with Gemini...');
    const reviewedResponse = await geminiReviewer(groqResponse, prompt);
    return reviewedResponse;
  }

  // All failed
  throw new Error('All AI models failed to respond');
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
    const { prompt, task, conversationHistory } = req.body || {};
    const userPrompt = prompt || task;

    if (!userPrompt) return res.status(400).json({ success: false, error: 'Missing prompt' });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`[Orchestrator] 🚀 New request: "${userPrompt.substring(0, 50)}..."`);
    console.log('═══════════════════════════════════════════════════════════════');

    // Build context
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

    const fullPrompt = SYSTEM_PROMPT +
      `\n\n⏰ الوقت الحالي: ${timeString}` +
      contextString +
      '\n\n👤 سؤال المستخدم:\n' + userPrompt;

    // Smart Route
    const responseText = await smartRoute(userPrompt, fullPrompt);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`[Orchestrator] ✅ Response ready (${responseText.length} chars)`);
    console.log('═══════════════════════════════════════════════════════════════');

    res.status(200).json({
      success: true,
      data: responseText
    });

  } catch (error) {
    console.error('[Orchestrator] ❌ Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}
