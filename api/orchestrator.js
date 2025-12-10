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
  return keys;
}

function getNextKey() {
  const keys = getAPIKeys();
  if (keys.length === 0) return null;
  return keys[Math.floor(Math.random() * keys.length)];
}

async function callGeminiAPI(prompt, apiKey, model = MODELS.PRIMARY) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  console.log(`[Orchestrator] Using ${model}...`);

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

  // Fallback chain
  if (response.status === 429 || response.status === 404 || response.status === 503) {
    console.log(`[Orchestrator] ${model} failed, trying fallback...`);
    if (model === MODELS.PRIMARY) {
      return callGeminiAPI(prompt, apiKey, MODELS.FALLBACK_1);
    } else if (model === MODELS.FALLBACK_1) {
      return callGeminiAPI(prompt, apiKey, MODELS.FALLBACK_2);
    }
  }

  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }

  const data = await response.json();
  console.log(`[Orchestrator] SUCCESS with ${model}!`);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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

    const apiKey = getNextKey();
    if (!apiKey) {
      res.status(500).json({ success: false, error: 'No API keys available' });
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
    const responseText = await callGeminiAPI(fullPrompt, apiKey);

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
