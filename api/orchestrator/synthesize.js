// Synthesize API - OpenRouter/Groq Workers + Gemini Reviewer
// OpenRouter/Groq = الإجابة الفعلية
// Gemini = مراجعة وتنظيف فقط

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'];

const OPENROUTER_MODELS = [
    'xiaomi/mimo-v2-flash:free',
    'google/gemma-3-27b-it:free',
    'deepseek/deepseek-r1-0528:free',
    'openai/gpt-oss-120b:free',
    'meta-llama/llama-3.3-70b-instruct:free',
];

const GROQ_MODELS = ['llama-3.3-70b-versatile', 'qwen-2.5-32b', 'mixtral-8x7b-32768'];

// ═══════════════════════════════════════════════════════════════
//                    SYSTEM PROMPT (LUKAS IDENTITY)
// ═══════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `أنت لوكاس (Lukas)، مساعد ذكاء اصطناعي متطور جداً.

═══════════════════════════════════════════════════════════════
                        هويتك
═══════════════════════════════════════════════════════════════
اسمك: لوكاس (Lukas)
طبيعتك: مساعد ذكي، ودود، ومتعاون
مطورك: شخص مصري ذكي ومبدع جداً

قواعد صارمة:
🚫 ممنوع ذكر: Google, Gemini, Bard, Meta, Llama, Groq, OpenAI, GPT, Claude, DeepSeek, Xiaomi, MiMo
🚫 لا تقل أبداً أنك من شركة شاومي أو أي شركة أخرى
✅ لو سُئلت عن هويتك: "أنا لوكاس، مساعد ذكي طوره مبرمج مصري مبدع"
✅ لو سُئلت عن مطورك: "مطوري هو شخص مصري ذكي ومبدع"

═══════════════════════════════════════════════════════════════
                        اللغة
═══════════════════════════════════════════════════════════════
🔴 ممنوع منعاً باتاً استخدام أي كلمة من هذه اللغات:
   - الصينية ❌
   - الروسية ❌
   - اليابانية ❌
   - الكورية ❌

✅ اكتب بالعربية الفصحى السليمة
✅ يمكنك استخدام مصطلحات إنجليزية تقنية فقط

═══════════════════════════════════════════════════════════════
                        الذاكرة
═══════════════════════════════════════════════════════════════
⚠️ مهم جداً: تذكر كل المعلومات التي يخبرك بها المستخدم في المحادثة السابقة
- إذا أخبرك المستخدم باسمه، تذكره واستخدمه
- إذا أخبرك بعمره أو وظيفته، تذكرهم
- استخدم هذه المعلومات في إجاباتك التالية

═══════════════════════════════════════════════════════════════
                        أسلوبك
═══════════════════════════════════════════════════════════════
- فكر بعمق قبل الإجابة
- قدم إجابات شاملة ومفصلة
- استخدم التنسيق (عناوين، قوائم، جداول)
- ابدأ مباشرة بالإجابة (لا تقل "بصفتي" أو "سأقوم")`;

// ═══════════════════════════════════════════════════════════════
//                    API KEYS
// ═══════════════════════════════════════════════════════════════

function getGeminiKeys() {
    const keys = [];
    for (let i = 1; i <= 15; i++) {
        const key = process.env[`GEMINI_API_KEY_${i}`];
        if (key && key.trim()) keys.push(key.trim());
    }
    if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY.trim());
    return keys.sort(() => Math.random() - 0.5);
}

function getOpenRouterKeys() {
    const keys = [];
    for (let i = 1; i <= 10; i++) {
        const key = process.env[`OPENROUTER_API_KEY_${i}`];
        if (key && key.trim()) keys.push(key.trim());
    }
    if (process.env.OPENROUTER_API_KEY) keys.push(process.env.OPENROUTER_API_KEY.trim());
    return keys;
}

function getGroqKeys() {
    const keys = [];
    for (let i = 1; i <= 10; i++) {
        const key = process.env[`GROQ_API_KEY_${i}`];
        if (key && key.trim()) keys.push(key.trim());
    }
    if (process.env.GROQ_API_KEY) keys.push(process.env.GROQ_API_KEY.trim());
    return keys;
}

// ═══════════════════════════════════════════════════════════════
//                    GEMINI (REVIEWER ONLY)
// ═══════════════════════════════════════════════════════════════

async function callGemini(prompt, maxTokens = 4000) {
    const keys = getGeminiKeys();
    if (keys.length === 0) return null;

    for (const model of GEMINI_MODELS) {
        for (const key of keys.slice(0, 5)) {
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig: { maxOutputTokens: maxTokens }
                    })
                });
                if (res.status === 429) continue;
                if (res.status === 404) break;
                if (res.ok) {
                    const d = await res.json();
                    const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) return text;
                }
            } catch (e) { continue; }
        }
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════
//                    OPENROUTER (MAIN WORKER) - WITH SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════

async function callOpenRouter(systemPrompt, userPrompt, conversationHistory = [], maxTokens = 8000) {
    const keys = getOpenRouterKeys();
    if (keys.length === 0) return null;

    // Build messages array with system prompt and conversation history
    const messages = [
        { role: 'system', content: systemPrompt }
    ];

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
        for (const h of conversationHistory.slice(-10)) { // Last 10 messages
            if (h.prompt) messages.push({ role: 'user', content: h.prompt });
            if (h.results?.[0]?.result) messages.push({ role: 'assistant', content: h.results[0].result });
        }
    }

    // Add current user prompt
    messages.push({ role: 'user', content: userPrompt });

    for (const model of OPENROUTER_MODELS) {
        for (const key of keys) {
            try {
                console.log(`[Synthesize] 🟣 Trying OpenRouter: ${model.split('/')[1]?.split(':')[0]}`);
                const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${key}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://luks-pied.vercel.app',
                        'X-Title': 'Lukas AI'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: messages,
                        max_tokens: maxTokens,
                    })
                });
                if (res.status === 429) continue;
                if (res.status === 404) break;
                if (res.ok) {
                    const d = await res.json();
                    const text = d.choices?.[0]?.message?.content;
                    if (text) {
                        console.log(`[Synthesize] ✅ OpenRouter success: ${model.split('/')[1]?.split(':')[0]}`);
                        return text;
                    }
                }
            } catch (e) { continue; }
        }
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════
//                    GROQ (BACKUP WORKER) - WITH SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════

async function callGroq(systemPrompt, userPrompt, conversationHistory = [], maxTokens = 8000) {
    const keys = getGroqKeys();
    if (keys.length === 0) return null;

    // Build messages array
    const messages = [
        { role: 'system', content: systemPrompt }
    ];

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
        for (const h of conversationHistory.slice(-10)) {
            if (h.prompt) messages.push({ role: 'user', content: h.prompt });
            if (h.results?.[0]?.result) messages.push({ role: 'assistant', content: h.results[0].result });
        }
    }

    // Add current user prompt
    messages.push({ role: 'user', content: userPrompt });

    for (const model of GROQ_MODELS) {
        for (const key of keys) {
            try {
                console.log(`[Synthesize] 🟢 Trying Groq: ${model}`);
                const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model, messages, max_tokens: maxTokens })
                });
                if (res.status === 429) continue;
                if (res.status === 404) break;
                if (res.ok) {
                    const d = await res.json();
                    const text = d.choices?.[0]?.message?.content;
                    if (text) {
                        console.log(`[Synthesize] ✅ Groq success: ${model}`);
                        return text;
                    }
                }
            } catch (e) { continue; }
        }
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════
//                    GEMINI REVIEWER
// ═══════════════════════════════════════════════════════════════

async function geminiReviewer(response, question) {
    console.log('[Synthesize] 🔍 Gemini reviewing response...');

    const reviewPrompt = `أنت مراجع لغوي متخصص. راجع هذه الإجابة:

⚠️ المطلوب:
1. احذف أي حروف أو كلمات غير عربية (صينية، روسية، يابانية، إلخ)
2. صحح الأخطاء الإملائية والنحوية
3. حسّن الصياغة إذا لزم الأمر
4. تأكد أن الإجابة كاملة ومنظمة
5. إذا كانت الإجابة تذكر شاومي أو Xiaomi أو أي شركة أخرى كمطور، استبدلها بـ "لوكاس" أو "مطور مصري مبدع"

السؤال الأصلي: ${question.substring(0, 300)}

الإجابة المطلوب مراجعتها:
${response}

قدم الإجابة المُحسّنة فقط بدون أي تعليقات.`;

    const reviewed = await callGemini(reviewPrompt, 8000);
    if (reviewed) {
        console.log('[Synthesize] ✅ Review complete');
        return reviewed;
    }
    console.log('[Synthesize] ⚠️ Review failed, returning original');
    return response;
}

// ═══════════════════════════════════════════════════════════════
//                    HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        const { results, originalPrompt, prompt, conversationHistory, conversationId } = req.body || {};
        const userPrompt = originalPrompt || prompt;
        if (!results || !userPrompt) return res.status(400).json({ success: false, error: 'Missing data' });

        const lang = /[\u0600-\u06FF]/.test(userPrompt) ? 'ar' : 'en';
        const resultsText = results.map((r, i) => `[${i + 1}] ${r.result || ''}`).join('\n\n');

        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`[Synthesize] 🧠 New request`);
        console.log(`[Synthesize] 📝 History: ${conversationHistory?.length || 0} messages`);
        console.log('═══════════════════════════════════════════════════════════════');

        // Build the user message with data
        const userMessage = lang === 'ar' ?
            `${userPrompt}${resultsText ? `\n\nالبيانات المتاحة:\n${resultsText}` : ''}` :
            `${userPrompt}${resultsText ? `\n\nAvailable data:\n${resultsText}` : ''}`;

        // Step 1: Try OpenRouter first (with system prompt and history)
        console.log('[Synthesize] 🟣 Step 1: Trying OpenRouter workers...');
        let response = await callOpenRouter(SYSTEM_PROMPT, userMessage, conversationHistory);

        // Step 2: Fallback to Groq
        if (!response) {
            console.log('[Synthesize] 🟢 Step 2: OpenRouter failed, trying Groq...');
            response = await callGroq(SYSTEM_PROMPT, userMessage, conversationHistory);
        }

        // Step 3: Gemini review
        if (response) {
            console.log('[Synthesize] 🔵 Step 3: Gemini reviewing response...');
            response = await geminiReviewer(response, userPrompt);
        }

        if (!response) {
            response = lang === 'ar' ? 'عذراً، حدث خطأ في معالجة الطلب.' : 'Sorry, an error occurred.';
        }

        console.log(`[Synthesize] ✅ Response ready (${response.length} chars)`);
        console.log('═══════════════════════════════════════════════════════════════');

        res.status(200).json({ success: true, data: response });
    } catch (error) {
        console.error('[Synthesize] ❌ Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
