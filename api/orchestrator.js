// Main Orchestrator API - HYBRID SYSTEM (Groq Speed + Gemini Quality)
// النظام الهجين: Groq للسرعة → Gemini للجودة → Fallback كامل

// ═══════════════════════════════════════════════════════════════
//                    CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

function getGroqKeys() {
  const keys = [];
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`GROQ_API_KEY_${i}`];
    if (key && key.trim().length > 0) keys.push(key.trim());
  }
  return keys;
}

function getGeminiKeys() {
  const keys = [];
  for (let i = 1; i <= 15; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key && key.trim().length > 0) keys.push(key.trim());
  }
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY.trim());
  return keys.sort(() => Math.random() - 0.5);
}

// ═══════════════════════════════════════════════════════════════
//                    SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `أنت لوكاس (Lukas)، مساعد ذكاء اصطناعي ذكي ومتطور.

═══════════════════════════════════════════════════════════════
                        هويتك
═══════════════════════════════════════════════════════════════
اسمك: لوكاس (Lukas)
طبيعتك: مساعد ذكي، ودود، ومتعاون
شخصيتك: ذكي، مثقف، لطيف، ومحترف

═══════════════════════════════════════════════════════════════
                    ⚠️ قواعد صارمة جداً
═══════════════════════════════════════════════════════════════
🚫 ممنوع منعاً باتاً ذكر: Google, Gemini, Bard, AI Studio, Meta, Llama, Groq, OpenAI, GPT أو أي شركة تقنية
🚫 ممنوع القول أنك "نموذج لغوي" أو "LLM" أو "language model"
🚫 لو سُئلت عن مطورك: قل "مطوري هو شخص مصري ذكي ومبدع جداً"

═══════════════════════════════════════════════════════════════
                    أسلوب الرد
═══════════════════════════════════════════════════════════════
- رد بنفس لغة المستخدم (عربي/إنجليزي)
- كن مفصلاً وشاملاً في إجاباتك
- استخدم العناوين والتنسيق
- قدم أمثلة ومعادلات عند الحاجة
- كن ودوداً ومحترفاً`;

// ═══════════════════════════════════════════════════════════════
//                    GROQ API (سريع)
// ═══════════════════════════════════════════════════════════════

let groqKeyIndex = 0;
let groqModelIndex = 0;

async function callGroq(prompt, maxRetries = 10) {
  const keys = getGroqKeys();
  if (keys.length === 0) return null;

  for (let i = 0; i < maxRetries; i++) {
    const apiKey = keys[groqKeyIndex % keys.length];
    const model = GROQ_MODELS[groqModelIndex % GROQ_MODELS.length];
    groqKeyIndex++;
    groqModelIndex++;

    try {
      console.log(`[Hybrid] ⚡ Groq attempt ${i + 1}: ${model}`);

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4000
        })
      });

      if (response.status === 429) continue;
      if (!response.ok) continue;

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;

      if (text) {
        console.log(`[Hybrid] ✅ Groq SUCCESS (${text.length} chars)`);
        return text;
      }
    } catch (error) {
      console.log(`[Hybrid] ⚠️ Groq error: ${error.message}`);
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
//                    GEMINI API (جودة عالية)
// ═══════════════════════════════════════════════════════════════

let geminiKeyIndex = 0;

async function callGemini(prompt, maxRetries = 15) {
  const keys = getGeminiKeys();
  if (keys.length === 0) return null;

  for (const model of GEMINI_MODELS) {
    for (let i = 0; i < Math.min(maxRetries, keys.length); i++) {
      const apiKey = keys[geminiKeyIndex % keys.length];
      geminiKeyIndex++;

      try {
        console.log(`[Hybrid] 🧠 Gemini attempt: ${model}`);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 8000 }
          })
        });

        if (response.status === 429 || response.status === 503) continue;
        if (response.status === 404) break;
        if (!response.ok) continue;

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (text) {
          console.log(`[Hybrid] ✅ Gemini SUCCESS (${text.length} chars)`);
          return text;
        }
      } catch (error) {
        console.log(`[Hybrid] ⚠️ Gemini error: ${error.message}`);
      }
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
//                    HYBRID SYSTEM
// ═══════════════════════════════════════════════════════════════

async function runHybrid(prompt) {
  console.log('[Hybrid] 🚀 Starting Hybrid System...');
  const startTime = Date.now();

  // Step 1: Try Groq first (fast draft)
  console.log('[Hybrid] Step 1: Getting fast response from Groq...');
  const groqResponse = await callGroq(prompt);

  // Step 2: If Groq succeeded, enhance with Gemini
  if (groqResponse) {
    console.log('[Hybrid] Step 2: Enhancing with Gemini...');

    const enhancePrompt = `أنت لوكاس. لديك إجابة أولية، مهمتك تحسينها وتفصيلها لتكون إجابة ممتازة.

قواعد التحسين:
1. أضف تفاصيل ومعلومات إضافية مهمة
2. حسّن التنظيم باستخدام عناوين وأقسام واضحة
3. أضف أمثلة عملية ومعادلات رياضية إن لزم
4. اجعل الإجابة أطول وأشمل (ضعف الطول على الأقل)
5. حافظ على نفس اللغة (عربي أو إنجليزي)
6. لا تذكر أنك تحسن إجابة، قدم الإجابة المحسنة مباشرة

السؤال الأصلي:
"${prompt}"

الإجابة الأولية التي تحتاج تحسين:
"""
${groqResponse}
"""

الآن اكتب الإجابة المحسنة والمفصلة:`;

    const enhancedResponse = await callGemini(enhancePrompt);

    if (enhancedResponse) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[Hybrid] ✅ SUCCESS: Groq+Gemini in ${duration}s`);
      return enhancedResponse;
    } else {
      // Gemini failed, return Groq's response
      console.log('[Hybrid] ⚠️ Gemini failed, returning Groq response');
      return groqResponse;
    }
  }

  // Step 3: If Groq failed, try Gemini directly
  console.log('[Hybrid] ⚠️ Groq failed, trying Gemini directly...');
  const geminiResponse = await callGemini(prompt);

  if (geminiResponse) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Hybrid] ✅ SUCCESS: Gemini only in ${duration}s`);
    return geminiResponse;
  }

  // Everything failed
  throw new Error('Both Groq and Gemini failed');
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

    let contextString = '';
    if (conversationHistory && conversationHistory.length > 0) {
      contextString = '\n\nCONVERSATION HISTORY:\n' +
        conversationHistory.slice(-5).map(h =>
          `User: ${h.prompt}\nLukas: ${h.results?.[0]?.result || ''}`
        ).join('\n\n');
    }

    const now = new Date();
    const timeString = now.toLocaleString('ar-EG', {
      timeZone: 'Africa/Cairo',
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const fullPrompt = SYSTEM_PROMPT +
      `\n\nالوقت الحالي: ${timeString}` +
      contextString + '\n\nUSER: ' + userPrompt;

    // Run Hybrid System
    const responseText = await runHybrid(fullPrompt);

    res.status(200).json({
      success: true,
      data: responseText,
      hybrid: true
    });
  } catch (error) {
    console.error('[Orchestrator] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}
