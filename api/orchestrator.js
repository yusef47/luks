// Main Orchestrator API - Updated Dec 2024
const MODELS = {
  PRIMARY: 'gemini-2.5-flash',
  FALLBACK_1: 'gemini-2.5-flash-lite',
  FALLBACK_2: 'gemini-robotics-er-1.5-preview'
};

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
🚫 ممنوع منعاً باتاً ذكر: Google, Gemini, Bard, AI Studio, أو أي شركة تقنية
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

function getAPIKeys() {
  const keys = [];
  for (let i = 1; i <= 13; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key && key.trim().length > 0) {
      keys.push(key.trim());
    }
  }
  if (process.env.GEMINI_API_KEY) {
    keys.push(process.env.GEMINI_API_KEY.trim());
  }
  // Shuffle keys for random distribution
  return keys.sort(() => Math.random() - 0.5);
}

const ALL_MODELS = [
  MODELS.PRIMARY,
  MODELS.FALLBACK_1,
  MODELS.FALLBACK_2
];

// Smart call that tries ALL keys and ALL models before failing
async function callGeminiAPI(prompt, maxRetries = 9) {
  const keys = getAPIKeys();

  if (keys.length === 0) {
    throw new Error('No API keys available');
  }

  let lastError = null;
  let attempts = 0;

  // Try each model
  for (const model of ALL_MODELS) {
    // Try each key for this model
    for (const apiKey of keys) {
      if (attempts >= maxRetries) break;
      attempts++;

      try {
        console.log(`[Orchestrator] Attempt ${attempts}: ${model} with key ...${apiKey.slice(-6)}`);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
          })
        });

        // Rate limit - try next key immediately
        if (response.status === 429) {
          console.log(`[Orchestrator] Key rate limited, trying next...`);
          lastError = new Error('Rate limit');
          continue;
        }

        // Model not found - try next model
        if (response.status === 404) {
          console.log(`[Orchestrator] Model not available, trying next...`);
          lastError = new Error('Model not available');
          break; // Move to next model
        }

        // Other error
        if (!response.ok) {
          const errorText = await response.text();
          console.log(`[Orchestrator] Error ${response.status}, trying next...`);
          lastError = new Error(`API error ${response.status}`);
          continue;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (!text) {
          console.log(`[Orchestrator] Empty response, trying next...`);
          lastError = new Error('Empty response');
          continue;
        }

        console.log(`[Orchestrator] SUCCESS on attempt ${attempts} with ${model}!`);
        return text;

      } catch (error) {
        console.log(`[Orchestrator] Attempt ${attempts} error: ${error.message}`);
        lastError = error;
        continue;
      }
    }
  }

  // All attempts failed
  throw lastError || new Error('All API attempts failed');
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

    // Call with smart fallback
    const responseText = await callGeminiAPI(fullPrompt);

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
