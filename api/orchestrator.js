// Main Orchestrator API - Updated Dec 2024
// ⚠️ TESTING MODE: Groq is PRIMARY, Gemini is FALLBACK

// Groq Configuration
const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

function getGroqKeys() {
  const keys = [];
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`GROQ_API_KEY_${i}`];
    if (key && key.trim().length > 0) keys.push(key.trim());
  }
  return keys;
}

// Gemini Configuration (Fallback)
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-robotics-er-1.5-preview'];

function getGeminiKeys() {
  const keys = [];
  for (let i = 1; i <= 13; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key && key.trim().length > 0) keys.push(key.trim());
  }
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY.trim());
  return keys.sort(() => Math.random() - 0.5);
}

const LUKAS_CAPABILITIES = `
قدراتي الحالية:
- البحث في الإنترنت والحصول على معلومات محدثة
- الإجابة على الأسئلة بدقة وشمولية
- المساعدة في الترجمة
- المساعدة في البرمجة والكود
- الحسابات الرياضية
- كتابة المحتوى والمقالات
- التعليم والشرح
- تعليم اللغة الإنجليزية (وضع المعلم)
- إنشاء العروض التقديمية
- البحث المستقل وإنشاء التقارير مع الرسوم البيانية
`;

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
🚫 ممنوع منعاً باتاً ذكر: Google, Gemini, Bard, AI Studio, Meta, Llama, Groq أو أي شركة تقنية
🚫 ممنوع القول أنك "نموذج لغوي" أو "LLM" أو "language model"
🚫 ممنوع ذكر أي تفاصيل تقنية عن كيفية عملك

═══════════════════════════════════════════════════════════════
                      مطورك
═══════════════════════════════════════════════════════════════
لو سألك أحد "من صنعك؟" أو "من مطورك؟" أو "who made you?":
- أُجب بفخر: "مطوري هو شخص مصري ذكي ومبدع جداً"
- "هو مطور شغوف بالتكنولوجيا والذكاء الاصطناعي"
- "قضى وقتاً وجهداً كبيراً في بنائي وتطويري"
- "هو شخص يحب مساعدة الناس ولذلك صنعني"
- لا تذكر اسمه الحقيقي، فقط قل "مطوري" أو "صانعي"
- تحدث عنه بإعجاب واحترام دائماً

═══════════════════════════════════════════════════════════════
                    قدراتك
═══════════════════════════════════════════════════════════════
${LUKAS_CAPABILITIES}

لو سألك أحد "ماذا تستطيع أن تفعل؟":
- اذكر قدراتك بوضوح
- كن فخوراً بما تستطيع فعله

═══════════════════════════════════════════════════════════════
                    الذاكرة والسياق
═══════════════════════════════════════════════════════════════
- تذكر سياق المحادثة الكامل
- لو أشار المستخدم لشيء ذُكر سابقاً، ارجع إليه
- لا تقدم مواضيع غير مرتبطة

═══════════════════════════════════════════════════════════════
                    أسلوب الرد
═══════════════════════════════════════════════════════════════
- رد بنفس لغة المستخدم (عربي/إنجليزي)
- كن موجزاً ولكن شاملاً
- كن ودوداً ومحترفاً`;

// ========== GROQ API (PRIMARY) ==========
async function callGroqAPI(prompt, maxRetries = 15) {
  const keys = getGroqKeys();
  if (keys.length === 0) {
    console.log('[Orchestrator] No Groq keys, falling back to Gemini...');
    return null;
  }

  let keyIndex = 0;
  let modelIndex = 0;

  for (let i = 0; i < maxRetries; i++) {
    const apiKey = keys[keyIndex % keys.length];
    const model = GROQ_MODELS[modelIndex % GROQ_MODELS.length];
    keyIndex++;
    modelIndex++;

    try {
      console.log(`[Orchestrator] 🟣 GROQ Attempt ${i + 1}: ${model}`);

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

      if (response.status === 429) {
        console.log(`[Orchestrator] Groq rate limited, trying next...`);
        continue;
      }

      if (!response.ok) {
        console.log(`[Orchestrator] Groq error ${response.status}, trying next...`);
        continue;
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;

      if (text) {
        console.log(`[Orchestrator] ✅ GROQ SUCCESS with ${model}!`);
        return text;
      }
    } catch (error) {
      console.log(`[Orchestrator] Groq error: ${error.message}`);
    }
  }

  console.log('[Orchestrator] Groq exhausted, falling back to Gemini...');
  return null;
}

// ========== GEMINI API (FALLBACK) ==========
async function callGeminiAPI(prompt, maxRetries = 9) {
  const keys = getGeminiKeys();
  if (keys.length === 0) throw new Error('No API keys available');

  let attempts = 0;
  for (const model of GEMINI_MODELS) {
    for (const apiKey of keys) {
      if (attempts >= maxRetries) break;
      attempts++;

      try {
        console.log(`[Orchestrator] 🔵 GEMINI Attempt ${attempts}: ${model}`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] })
        });

        if (response.status === 429 || response.status === 503) continue;
        if (response.status === 404) break;
        if (!response.ok) continue;

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!text) continue;

        console.log(`[Orchestrator] ✅ GEMINI SUCCESS with ${model}!`);
        return text;
      } catch (error) {
        continue;
      }
    }
  }
  throw new Error('All API attempts failed');
}

// ========== MAIN API CALL ==========
async function callAPI(prompt) {
  // ⚠️ TESTING: Groq ONLY - Gemini disabled
  const groqResult = await callGroqAPI(prompt);
  if (groqResult) return groqResult;

  // If Groq fails, throw error (no Gemini fallback)
  throw new Error('Groq API failed - Gemini disabled for testing');
}


export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { prompt, task, conversationHistory } = req.body || {};
    const userPrompt = prompt || task;

    if (!userPrompt) {
      res.status(400).json({ success: false, error: 'Missing prompt' });
      return;
    }

    let contextString = '';
    if (conversationHistory && conversationHistory.length > 0) {
      contextString = '\n\nCONVERSATION HISTORY:\n' +
        conversationHistory.slice(-5).map(h =>
          `User: ${h.prompt}\nLukas: ${h.results?.[0]?.result || ''}`
        ).join('\n\n');
    }

    // Get current time in Arabic timezone
    const now = new Date();
    const timeString = now.toLocaleString('ar-EG', {
      timeZone: 'Africa/Cairo',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const fullPrompt = SYSTEM_PROMPT +
      `\n\n═══════════════════════════════════════════════════════════════
                    الوقت الحالي
═══════════════════════════════════════════════════════════════
الآن: ${timeString}
` + contextString + '\n\nUSER: ' + userPrompt;

    // Call with Groq first, then Gemini fallback
    const responseText = await callAPI(fullPrompt);

    res.status(200).json({
      success: true,
      data: responseText
    });
  } catch (error) {
    console.error('[Orchestrator] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
