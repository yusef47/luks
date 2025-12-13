// Main Orchestrator API - SMART ROUTING SYSTEM
// الأسئلة البسيطة → Groq (سريع)
// الأسئلة المعقدة → Gemini (جودة عالية)

// ═══════════════════════════════════════════════════════════════
//                    CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

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
//                    GEMINI CLASSIFIER
// ═══════════════════════════════════════════════════════════════

async function classifyWithGemini(prompt) {
  const keys = getGeminiKeys();
  if (keys.length === 0) return 'complex'; // Default to complex if no keys

  const classifyPrompt = `أنت مصنف أسئلة. حلل السؤال التالي وحدد هل هو:
- "simple": سؤال بسيط، تحية، سؤال مباشر، ترجمة قصيرة، سؤال عام
- "complex": سؤال معقد، يحتاج تحليل، بحث، خطة، مقارنة، نموذج رياضي، شرح مفصل

السؤال:
"${prompt.substring(0, 500)}"

أجب بكلمة واحدة فقط: simple أو complex`;

  try {
    const apiKey = keys[0];
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: classifyPrompt }] }],
        generationConfig: { maxOutputTokens: 10 }
      })
    });

    if (response.ok) {
      const data = await response.json();
      const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.toLowerCase().trim();
      console.log(`[Classifier] Gemini says: ${result}`);
      return result?.includes('simple') ? 'simple' : 'complex';
    }
  } catch (error) {
    console.log(`[Classifier] Error: ${error.message}`);
  }

  // Fallback to local check if Gemini fails
  return prompt.length > 300 ? 'complex' : 'simple';
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

═══════════════════════════════════════════════════════════════
                    ⚠️ قواعد صارمة جداً
═══════════════════════════════════════════════════════════════
🚫 ممنوع منعاً باتاً ذكر: Google, Gemini, Bard, AI Studio, Meta, Llama, Groq, OpenAI, GPT
🚫 ممنوع القول أنك "نموذج لغوي" أو "LLM"
🚫 لو سُئلت عن مطورك: قل "مطوري هو شخص مصري ذكي ومبدع جداً"

═══════════════════════════════════════════════════════════════
                    أسلوب الرد
═══════════════════════════════════════════════════════════════
- رد بنفس لغة المستخدم (عربي/إنجليزي)
- كن مفصلاً وشاملاً في إجاباتك
- استخدم العناوين والتنسيق
- كن ودوداً ومحترفاً`;

// ═══════════════════════════════════════════════════════════════
//                    GROQ API (للأسئلة البسيطة)
// ═══════════════════════════════════════════════════════════════

let groqKeyIndex = 0;

async function callGroq(prompt, maxRetries = 10) {
  const keys = getGroqKeys();
  if (keys.length === 0) return null;

  for (let i = 0; i < maxRetries; i++) {
    const apiKey = keys[groqKeyIndex % keys.length];
    const model = GROQ_MODELS[i % GROQ_MODELS.length];
    groqKeyIndex++;

    try {
      console.log(`[Groq] ⚡ Attempt ${i + 1}: ${model}`);

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
        console.log(`[Groq] ✅ SUCCESS (${text.length} chars)`);
        return text;
      }
    } catch (error) {
      console.log(`[Groq] ⚠️ Error: ${error.message}`);
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
//                    GEMINI API (للأسئلة المعقدة)
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
        console.log(`[Gemini] 🧠 Attempt: ${model}`);

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
//                    SMART ROUTER
// ═══════════════════════════════════════════════════════════════

async function smartRoute(prompt) {
  // Gemini يحدد نوع السؤال أولاً
  const classification = await classifyWithGemini(prompt);
  const isComplex = classification === 'complex';

  if (isComplex) {
    console.log('[Router] 🧠 Gemini says: Complex → Using GEMINI');

    // Try Gemini first for complex questions
    const geminiResponse = await callGemini(prompt);
    if (geminiResponse) return geminiResponse;

    // Fallback to Groq if Gemini fails
    console.log('[Router] Gemini failed, falling back to Groq...');
    const groqResponse = await callGroq(prompt);
    if (groqResponse) return groqResponse;

  } else {
    console.log('[Router] ⚡ Simple question → Using GROQ');

    // Try Groq first for simple questions
    const groqResponse = await callGroq(prompt);
    if (groqResponse) return groqResponse;

    // Fallback to Gemini if Groq fails
    console.log('[Router] Groq failed, falling back to Gemini...');
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

    // Smart Route based on complexity
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
