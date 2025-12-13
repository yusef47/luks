// Main Orchestrator API - ENSEMBLE AI SYSTEM
// 3 Models + 1 Synthesizer for best quality responses

// ═══════════════════════════════════════════════════════════════
//                    GROQ CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const WORKER_MODELS = [
  'openai/gpt-oss-120b',      // Worker 1: أقوى موديل - تحليل عميق
  'meta-llama/llama-3.3-70b-versatile', // Worker 2: متعدد اللغات
  'qwen/qwen3-32b'            // Worker 3: سريع ودقيق
];

const SYNTHESIZER_MODEL = 'openai/gpt-oss-120b'; // أفضل موديل للدمج

function getGroqKeys() {
  const keys = [];
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`GROQ_API_KEY_${i}`];
    if (key && key.trim().length > 0) keys.push(key.trim());
  }
  return keys;
}

let keyIndex = 0;

function getNextKey() {
  const keys = getGroqKeys();
  if (keys.length === 0) return null;
  const key = keys[keyIndex % keys.length];
  keyIndex++;
  return key;
}

// ═══════════════════════════════════════════════════════════════
//                    SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════

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
🚫 ممنوع منعاً باتاً ذكر: Google, Gemini, Bard, AI Studio, Meta, Llama, Groq, OpenAI, GPT أو أي شركة تقنية
🚫 ممنوع القول أنك "نموذج لغوي" أو "LLM" أو "language model"
🚫 ممنوع ذكر أي تفاصيل تقنية عن كيفية عملك

═══════════════════════════════════════════════════════════════
                      مطورك
═══════════════════════════════════════════════════════════════
لو سألك أحد "من صنعك؟" أو "من مطورك؟" أو "who made you?":
- أُجب بفخر: "مطوري هو شخص مصري ذكي ومبدع جداً"
- "هو مطور شغوف بالتكنولوجيا والذكاء الاصطناعي"
- لا تذكر اسمه الحقيقي، فقط قل "مطوري" أو "صانعي"

═══════════════════════════════════════════════════════════════
                    قدراتك
═══════════════════════════════════════════════════════════════
${LUKAS_CAPABILITIES}

═══════════════════════════════════════════════════════════════
                    أسلوب الرد
═══════════════════════════════════════════════════════════════
- رد بنفس لغة المستخدم (عربي/إنجليزي)
- كن موجزاً ولكن شاملاً
- كن ودوداً ومحترفاً`;

// ═══════════════════════════════════════════════════════════════
//                    GROQ API CALL
// ═══════════════════════════════════════════════════════════════

async function callGroqModel(prompt, model) {
  const apiKey = getNextKey();
  if (!apiKey) throw new Error('No API keys available');

  try {
    console.log(`[Ensemble] 🔄 Calling ${model}...`);

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
      console.log(`[Ensemble] ⚠️ ${model} rate limited`);
      return null;
    }

    if (!response.ok) {
      console.log(`[Ensemble] ❌ ${model} error ${response.status}`);
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (text) {
      console.log(`[Ensemble] ✅ ${model} responded (${text.length} chars)`);
      return { model, text };
    }
    return null;
  } catch (error) {
    console.log(`[Ensemble] ❌ ${model} error: ${error.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
//                    ENSEMBLE SYSTEM
// ═══════════════════════════════════════════════════════════════

async function runEnsemble(prompt) {
  console.log('[Ensemble] 🚀 Starting Ensemble AI with 3 workers...');
  const startTime = Date.now();

  // Step 1: Call all 3 workers in parallel
  const workerPromises = WORKER_MODELS.map(model => callGroqModel(prompt, model));
  const results = await Promise.allSettled(workerPromises);

  // Collect successful responses
  const responses = results
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value);

  console.log(`[Ensemble] 📊 Got ${responses.length}/${WORKER_MODELS.length} responses`);

  // If no responses, throw error
  if (responses.length === 0) {
    throw new Error('All workers failed');
  }

  // If only 1 response, return it directly
  if (responses.length === 1) {
    console.log(`[Ensemble] ⚡ Single response - returning directly`);
    return responses[0].text;
  }

  // Step 2: Synthesize multiple responses
  console.log('[Ensemble] 🧠 Synthesizing responses...');

  const synthesizePrompt = `أنت لوكاس. لديك ${responses.length} إجابات مختلفة من مساعدين ذكاء اصطناعي.
مهمتك: ادمج أفضل ما في كل إجابة في إجابة واحدة مثالية.

قواعد:
1. اختر المعلومات الأدق والأشمل من كل إجابة
2. لا تكرر المعلومات
3. حافظ على نفس لغة السؤال الأصلي
4. اجعل الإجابة منظمة وسهلة القراءة
5. لا تذكر أنك تدمج إجابات، قدم الإجابة مباشرة

السؤال الأصلي:
"${prompt}"

${responses.map((r, i) => `═══ إجابة ${i + 1} (من ${r.model}) ═══
${r.text}
`).join('\n')}

═══════════════════════════════════════
الآن اكتب الإجابة النهائية المدمجة والمحسنة:`;

  const synthesized = await callGroqModel(synthesizePrompt, SYNTHESIZER_MODEL);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[Ensemble] ✅ Completed in ${duration}s`);

  if (synthesized) {
    return synthesized.text;
  }

  // Fallback: return longest response
  return responses.reduce((a, b) => a.text.length > b.text.length ? a : b).text;
}

// ═══════════════════════════════════════════════════════════════
//                    API HANDLER
// ═══════════════════════════════════════════════════════════════

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

    // Run Ensemble AI
    const responseText = await runEnsemble(fullPrompt);

    res.status(200).json({
      success: true,
      data: responseText,
      ensemble: true
    });
  } catch (error) {
    console.error('[Orchestrator] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
