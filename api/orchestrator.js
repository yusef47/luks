// Main Orchestrator API - FIXED ROUTING
// Complex questions → Gemini FIRST
// Simple questions → Groq (سريع)

// ═══════════════════════════════════════════════════════════════
//                    MODELS (Correct Names)
// ═══════════════════════════════════════════════════════════════

// Groq models - verified correct names
const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'llama-3.1-8b-instant',
  'gemma2-9b-it'
];

// Gemini models
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest'
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
//                    SYSTEM PROMPT (Arabic Only)
// ═══════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `أنت لوكاس (Lukas)، مساعد ذكاء اصطناعي متطور جداً.

═══════════════════════════════════════════════════════════════
                        هويتك
═══════════════════════════════════════════════════════════════
اسمك: لوكاس (Lukas)
طبيعتك: مساعد ذكي، ودود، ومتعاون
مطورك: شخص مصري ذكي ومبدع جداً

═══════════════════════════════════════════════════════════════
                    ⚠️ قواعد صارمة جداً - اتبعها دائماً
═══════════════════════════════════════════════════════════════
🚫 ممنوع منعاً باتاً ذكر: Google, Gemini, Bard, AI Studio, Meta, Llama, Groq, OpenAI, GPT, Claude
🚫 ممنوع القول أنك "نموذج لغوي" أو "LLM"
🚫 ممنوع استخدام أي كلمات غير عربية أو إنجليزية (لا روسي، لا صيني، لا إسباني)
✅ استخدم فقط العربية أو الإنجليزية حسب لغة السؤال
✅ لو سُئلت عن مطورك: قل "مطوري هو شخص مصري ذكي ومبدع جداً"

═══════════════════════════════════════════════════════════════
                    أسلوب الرد المطلوب
═══════════════════════════════════════════════════════════════
- رد بنفس لغة المستخدم (عربي/إنجليزي)
- كن مفصلاً وشاملاً ومتعمقاً في إجاباتك
- استخدم العناوين والتنسيق والقوائم
- قدم تحليل عميق للأسئلة المعقدة
- استخدم أمثلة ونماذج رياضية عند الحاجة
- كن ودوداً ومحترفاً`;

// ═══════════════════════════════════════════════════════════════
//                    GROQ API
// ═══════════════════════════════════════════════════════════════

let groqKeyIndex = 0;

async function callGroq(prompt, maxRetries = 12) {
  const keys = getGroqKeys();
  if (keys.length === 0) {
    console.log('[Groq] ⚠️ No Groq keys');
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
//                    GEMINI API (Primary for Complex)
// ═══════════════════════════════════════════════════════════════

let geminiKeyIndex = 0;

async function callGemini(prompt, maxRetries = 15) {
  const keys = getGeminiKeys();
  if (keys.length === 0) {
    console.log('[Gemini] ⚠️ No Gemini keys');
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
            generationConfig: { maxOutputTokens: 8000 }
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
//                    SMART COMPLEXITY CHECK
// ═══════════════════════════════════════════════════════════════

function isComplexQuestion(prompt) {
  // Complex keywords
  const complexKeywords = [
    'تخيل', 'افترض', 'سيناريو', 'حلل', 'اشرح بالتفصيل',
    'نموذج رياضي', 'خطة', 'استراتيجية', 'قارن', 'كيف يمكن',
    'ما الفرق', 'لماذا', 'اقترح', 'صمم', 'ابتكر',
    'imagine', 'scenario', 'analyze', 'explain in detail',
    'mathematical model', 'plan', 'strategy', 'compare'
  ];

  let complexityScore = 0;

  // Long question = likely complex
  if (prompt.length > 200) complexityScore += 2;
  if (prompt.length > 500) complexityScore += 2;
  if (prompt.length > 1000) complexityScore += 3;

  // Multiple question marks
  const questionMarks = (prompt.match(/\?|؟/g) || []).length;
  if (questionMarks >= 3) complexityScore += 3;

  // Numbered lists
  if (/[1-9]\.|[١-٩]\./.test(prompt)) complexityScore += 2;

  // Complex keywords
  for (const keyword of complexKeywords) {
    if (prompt.includes(keyword)) complexityScore += 2;
  }

  // Multiple lines
  const lines = prompt.split('\n').filter(l => l.trim()).length;
  if (lines >= 5) complexityScore += 2;

  console.log(`[Router] Complexity score: ${complexityScore} (threshold: 5)`);
  return complexityScore >= 5;
}

// ═══════════════════════════════════════════════════════════════
//                    SMART ROUTER
// ═══════════════════════════════════════════════════════════════

async function smartRoute(prompt) {
  const isComplex = isComplexQuestion(prompt);

  if (isComplex) {
    console.log('[Router] 🧠 Complex question → GEMINI FIRST');

    // Try Gemini first for complex
    const geminiResponse = await callGemini(prompt);
    if (geminiResponse) return geminiResponse;

    // Fallback to Groq
    console.log('[Router] Gemini failed, trying Groq...');
    const groqResponse = await callGroq(prompt);
    if (groqResponse) return groqResponse;

  } else {
    console.log('[Router] ⚡ Simple question → GROQ FIRST');

    // Try Groq first for simple
    const groqResponse = await callGroq(prompt);
    if (groqResponse) return groqResponse;

    // Fallback to Gemini
    console.log('[Router] Groq failed, trying Gemini...');
    const geminiResponse = await callGemini(prompt);
    if (geminiResponse) return geminiResponse;
  }

  throw new Error('All APIs failed');
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

    // Smart Route
    const responseText = await smartRoute(fullPrompt);

    res.status(200).json({
      success: true,
      data: responseText
    });
  } catch (error) {
    console.error('[Orchestrator] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}
