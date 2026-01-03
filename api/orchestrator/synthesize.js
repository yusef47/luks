// Synthesize API - Smart Router with MiMo Analyzer
// MiMo = تحليل السؤال وتوجيهه
// OpenRouter/Groq = الإجابة الفعلية
// Gemini = مراجعة وتنظيف

// ═══════════════════════════════════════════════════════════════
//                    MODELS CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const GEMINI_MODELS = ['gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'];

// Models by capability
const MODELS = {
    ANALYZER: 'xiaomi/mimo-v2-flash:free',      // Fast analyzer
    SIMPLE: 'xiaomi/mimo-v2-flash:free',        // Simple questions
    MATH: 'deepseek/deepseek-r1-0528:free',     // Math & thinking
    CODE: 'openai/gpt-oss-120b:free',           // Code questions
    RESEARCH: 'google/gemma-3-27b-it:free',     // Research & analysis
    HEAVY: 'meta-llama/llama-3.3-70b-instruct:free', // Heavy lifting
};

// Fallback order
const FALLBACK_MODELS = [
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

function getSystemPrompt() {
    const today = new Date().toLocaleDateString('ar-EG', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return `أنت لوكاس (Lukas)، مساعد ذكاء اصطناعي متطور جداً.

═══════════════════════════════════════════════════════════════
                        هويتك
═══════════════════════════════════════════════════════════════
اسمك: لوكاس (Lukas)
طبيعتك: مساعد ذكي، ودود، ومتعاون
مطورك: شخص مصري ذكي ومبدع جداً

📅 التاريخ الحالي: ${today}

قواعد صارمة:
🚫 ممنوع ذكر: Google, Gemini, Bard, Meta, Llama, Groq, OpenAI, GPT, Claude, DeepSeek, Xiaomi, MiMo
🚫 لا تقل أبداً أنك من شركة شاومي أو أي شركة أخرى
✅ لو سُئلت عن هويتك: "أنا لوكاس، مساعد ذكي طوره مبرمج مصري مبدع"
✅ لو سُئلت عن مطورك: "مطوري هو شخص مصري ذكي ومبدع"

═══════════════════════════════════════════════════════════════
                        اللغة
═══════════════════════════════════════════════════════════════
🔴 ممنوع منعاً باتاً استخدام أي كلمة من هذه اللغات:
   - الصينية ❌ - الروسية ❌ - اليابانية ❌ - الكورية ❌

✅ اكتب بالعربية الفصحى السليمة
✅ يمكنك استخدام مصطلحات إنجليزية تقنية فقط

═══════════════════════════════════════════════════════════════
                        قاعدة الرد
═══════════════════════════════════════════════════════════════
🔴 أجب فقط على السؤال الأخير في الرسالة الحالية
🔴 لا تكرر إجابات أسئلة سابقة تم الرد عليها
✅ لكن استخدم سياق المحادثة لفهم ما يتحدث عنه المستخدم

═══════════════════════════════════════════════════════════════
                        الذاكرة والسياق
═══════════════════════════════════════════════════════════════
⚠️ مهم جداً: تذكر كل سياق المحادثة السابقة:
- اسم المستخدم ومعلوماته الشخصية
- ما الذي يعمل عليه المستخدم
- ما تمت مناقشته سابقاً
- المشاكل التي تم حلها
- استخدم هذا السياق لتقديم إجابات مترابطة

═══════════════════════════════════════════════════════════════
                        أسلوبك
═══════════════════════════════════════════════════════════════
- فكر بعمق قبل الإجابة
- قدم إجابات شاملة ومفصلة
- استخدم التنسيق (عناوين، قوائم، جداول)
- ابدأ مباشرة بالإجابة`;
}

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
    return keys.sort(() => Math.random() - 0.5);
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
//                    GEMINI + GOOGLE SEARCH (REAL-TIME DATA)
// ═══════════════════════════════════════════════════════════════

// Keywords that indicate need for real-time data
const REALTIME_KEYWORDS = [
    // Prices
    'سعر', 'أسعار', 'price', 'prices', 'cost',
    // Stocks
    'سهم', 'أسهم', 'stock', 'stocks', 'AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN',
    // Crypto
    'بيتكوين', 'bitcoin', 'btc', 'ethereum', 'crypto',
    // Currency
    'دولار', 'dollar', 'يورو', 'euro', 'جنيه', 'ريال',
    // Gold
    'ذهب', 'gold', 'silver', 'فضة',
    // News
    'أخبار', 'news', 'اليوم', 'today', 'حاليا', 'currently', 'الآن', 'now',
    // Analysis
    'حلل', 'تحليل', 'analyze', 'analysis',
    // Current events
    'آخر', 'latest', 'جديد', 'new', 'مستجدات', 'updates',
];

function needsRealtimeData(question) {
    const lowerQuestion = question.toLowerCase();
    for (const keyword of REALTIME_KEYWORDS) {
        if (lowerQuestion.includes(keyword.toLowerCase())) {
            console.log(`[Synthesize] 🌐 Real-time data needed: keyword "${keyword}" found`);
            return true;
        }
    }
    return false;
}

async function fetchRealtimeData(question) {
    const keys = getGeminiKeys();
    if (keys.length === 0) return null;

    const searchPrompt = `ابحث عن أحدث المعلومات والبيانات الحقيقية عن:
"${question}"

المطلوب:
- أحدث الأرقام والأسعار الحقيقية
- آخر الأخبار والتحديثات
- بيانات من آخر 24-48 ساعة
- اذكر المصادر والتواريخ

أعطني البيانات الخام فقط بدون تحليل.`;

    console.log('[Synthesize] 🔍 Fetching real-time data with Google Search...');

    // Smart approach: Only try 3 times with delay to avoid rate limiting
    const MAX_ATTEMPTS = 3;
    const shuffledKeys = keys.sort(() => Math.random() - 0.5);

    for (let i = 0; i < MAX_ATTEMPTS && i < shuffledKeys.length; i++) {
        const key = shuffledKeys[i];
        const model = GEMINI_MODELS[i % GEMINI_MODELS.length];

        try {
            console.log(`[Synthesize] 📡 Attempt ${i + 1}/${MAX_ATTEMPTS}: ${model}`);

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: searchPrompt }] }],
                    tools: [{ googleSearch: {} }],
                    generationConfig: { maxOutputTokens: 4000 }
                })
            });

            if (res.status === 429) {
                console.log(`[Synthesize] ⚠️ Rate limited, waiting 1s...`);
                await new Promise(r => setTimeout(r, 1000)); // Wait 1 second
                continue;
            }

            if (res.ok) {
                const d = await res.json();
                const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    console.log(`[Synthesize] ✅ Real-time data fetched (${text.length} chars)`);
                    return text;
                }
            } else {
                console.log(`[Synthesize] ⚠️ Error ${res.status}`);
            }

            // Wait between attempts
            if (i < MAX_ATTEMPTS - 1) {
                await new Promise(r => setTimeout(r, 500));
            }
        } catch (e) {
            console.log(`[Synthesize] ⚠️ Exception: ${e.message}`);
        }
    }

    console.log('[Synthesize] ⚠️ Could not fetch real-time data, continuing without it');
    return null;
}

// ═══════════════════════════════════════════════════════════════
//                    MIMO ANALYZER - تحليل السؤال
// ═══════════════════════════════════════════════════════════════

async function analyzeQuestion(question) {
    const keys = getOpenRouterKeys();
    if (keys.length === 0) return 'simple';

    const analyzerPrompt = `أنت محلل أسئلة ذكي. حلل السؤال التالي وحدد نوعه.

السؤال: "${question.substring(0, 500)}"

أجب بكلمة واحدة فقط من هذه الخيارات:
- simple (تحية، سؤال بسيط، معلومة عامة)
- math (رياضيات، حسابات، معادلات، أرقام، إثبات)
- code (برمجة، كود، خوارزميات، API)
- research (بحث، تحليل، مقارنة، دراسة)
- heavy (معقد، تفكير عميق، فلسفة، خطة شاملة)

الإجابة (كلمة واحدة فقط):`;

    for (const key of keys.slice(0, 2)) {
        try {
            console.log('[Analyzer] 🔍 MiMo analyzing question...');
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://luks-pied.vercel.app',
                    'X-Title': 'Lukas AI'
                },
                body: JSON.stringify({
                    model: MODELS.ANALYZER,
                    messages: [{ role: 'user', content: analyzerPrompt }],
                    max_tokens: 20,
                })
            });

            if (res.ok) {
                const d = await res.json();
                const text = d.choices?.[0]?.message?.content?.toLowerCase().trim();
                const validTypes = ['simple', 'math', 'code', 'research', 'heavy'];

                for (const type of validTypes) {
                    if (text?.includes(type)) {
                        console.log(`[Analyzer] ✅ Question type: ${type}`);
                        return type;
                    }
                }
            }
        } catch (e) { continue; }
    }

    console.log('[Analyzer] ⚠️ Default to simple');
    return 'simple';
}

// ═══════════════════════════════════════════════════════════════
//                    SMART MODEL SELECTOR
// ═══════════════════════════════════════════════════════════════

function selectModel(questionType) {
    const modelMap = {
        simple: MODELS.SIMPLE,
        math: MODELS.MATH,
        code: MODELS.CODE,
        research: MODELS.RESEARCH,
        heavy: MODELS.HEAVY,
    };
    return modelMap[questionType] || MODELS.SIMPLE;
}

// ═══════════════════════════════════════════════════════════════
//                    OPENROUTER - SPECIFIC MODEL
// ═══════════════════════════════════════════════════════════════

async function callOpenRouterModel(model, systemPrompt, userPrompt, conversationHistory = [], maxTokens = 8000) {
    const keys = getOpenRouterKeys();
    if (keys.length === 0) return null;

    const messages = [{ role: 'system', content: systemPrompt }];

    if (conversationHistory && conversationHistory.length > 0) {
        for (const h of conversationHistory.slice(-10)) {
            if (h.prompt) messages.push({ role: 'user', content: h.prompt });
            if (h.results?.[0]?.result) messages.push({ role: 'assistant', content: h.results[0].result });
        }
    }

    messages.push({ role: 'user', content: userPrompt });

    // Try selected model with all keys
    for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
        const key = keys[keyIndex];
        try {
            console.log(`[Worker] 🟣 Trying ${model.split('/')[1]?.split(':')[0]} (Key ${keyIndex + 1}/${keys.length})`);
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://luks-pied.vercel.app',
                    'X-Title': 'Lukas AI'
                },
                body: JSON.stringify({ model, messages, max_tokens: maxTokens })
            });

            if (res.status === 429) {
                console.log(`[Worker] ⚠️ Key ${keyIndex + 1} rate limited`);
                continue;
            }
            if (res.ok) {
                const d = await res.json();
                const text = d.choices?.[0]?.message?.content;
                if (text) {
                    console.log(`[Worker] ✅ Success: ${model.split('/')[1]?.split(':')[0]}`);
                    return text;
                }
            }
        } catch (e) { continue; }
    }

    // Fallback to other models
    console.log('[Worker] ⚠️ Primary model failed, trying fallbacks...');
    for (const fallbackModel of FALLBACK_MODELS) {
        if (fallbackModel === model) continue; // Skip already tried

        for (const key of keys.slice(0, 2)) {
            try {
                console.log(`[Worker] 🔄 Fallback: ${fallbackModel.split('/')[1]?.split(':')[0]}`);
                const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${key}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://luks-pied.vercel.app',
                        'X-Title': 'Lukas AI'
                    },
                    body: JSON.stringify({ model: fallbackModel, messages, max_tokens: maxTokens })
                });

                if (res.ok) {
                    const d = await res.json();
                    const text = d.choices?.[0]?.message?.content;
                    if (text) {
                        console.log(`[Worker] ✅ Fallback success: ${fallbackModel.split('/')[1]?.split(':')[0]}`);
                        return text;
                    }
                }
            } catch (e) { continue; }
        }
    }

    return null;
}

// ═══════════════════════════════════════════════════════════════
//                    GROQ FALLBACK
// ═══════════════════════════════════════════════════════════════

async function callGroq(systemPrompt, userPrompt, conversationHistory = [], maxTokens = 8000) {
    const keys = getGroqKeys();
    if (keys.length === 0) return null;

    const messages = [{ role: 'system', content: systemPrompt }];

    if (conversationHistory && conversationHistory.length > 0) {
        for (const h of conversationHistory.slice(-10)) {
            if (h.prompt) messages.push({ role: 'user', content: h.prompt });
            if (h.results?.[0]?.result) messages.push({ role: 'assistant', content: h.results[0].result });
        }
    }

    messages.push({ role: 'user', content: userPrompt });

    for (const model of GROQ_MODELS) {
        for (const key of keys) {
            try {
                console.log(`[Worker] 🟢 Trying Groq: ${model}`);
                const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model, messages, max_tokens: maxTokens })
                });
                if (res.status === 429) continue;
                if (res.ok) {
                    const d = await res.json();
                    const text = d.choices?.[0]?.message?.content;
                    if (text) {
                        console.log(`[Worker] ✅ Groq success: ${model}`);
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
    console.log('[Reviewer] 🔍 Gemini reviewing...');

    const reviewPrompt = `أنت مراجع لغوي. راجع هذه الإجابة بسرعة:

المطلوب:
1. احذف أي حروف غير عربية (صينية، روسية، إلخ)
2. صحح الأخطاء
3. استبدل أي ذكر لشاومي/Xiaomi بـ "لوكاس"

السؤال: ${question.substring(0, 200)}

الإجابة:
${response}

قدم الإجابة المحسّنة فقط:`;

    const reviewed = await callGemini(reviewPrompt, 8000);
    if (reviewed) {
        console.log('[Reviewer] ✅ Review complete');
        return reviewed;
    }
    return response;
}

// ═══════════════════════════════════════════════════════════════
//                    MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        const { results, originalPrompt, prompt, conversationHistory } = req.body || {};
        const userPrompt = originalPrompt || prompt;
        if (!results || !userPrompt) return res.status(400).json({ success: false, error: 'Missing data' });

        const lang = /[\u0600-\u06FF]/.test(userPrompt) ? 'ar' : 'en';
        const resultsText = results.map((r, i) => `[${i + 1}] ${r.result || ''}`).join('\n\n');

        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`[Synthesize] 🧠 New request`);
        console.log('═══════════════════════════════════════════════════════════════');

        // Step 1: Check if question needs real-time data
        let realtimeData = null;
        if (needsRealtimeData(userPrompt)) {
            console.log('[Synthesize] 🌐 Step 1: Fetching real-time data...');
            realtimeData = await fetchRealtimeData(userPrompt);
        } else {
            console.log('[Synthesize] 📊 Step 1: No real-time data needed');
        }

        // Step 2: Analyze question with MiMo
        console.log('[Synthesize] 📊 Step 2: Analyzing question...');
        const questionType = await analyzeQuestion(userPrompt);

        // Step 3: Select best model
        const selectedModel = selectModel(questionType);
        console.log(`[Synthesize] 🎯 Step 3: Selected model: ${selectedModel.split('/')[1]?.split(':')[0]} for type: ${questionType}`);

        // Step 4: Build message with real-time data if available
        let userMessage = userPrompt;
        if (realtimeData) {
            userMessage = `${userPrompt}

═══════════════════════════════════════════════════════════════
📊 بيانات حية من الإنترنت (${new Date().toLocaleDateString('ar-EG')}):
═══════════════════════════════════════════════════════════════
${realtimeData}
═══════════════════════════════════════════════════════════════

استخدم هذه البيانات الحقيقية لتقديم إجابة شاملة ومحدثة.`;
            console.log('[Synthesize] 📦 Real-time data injected into prompt');
        }
        if (resultsText) {
            userMessage += `\n\nالبيانات المتاحة:\n${resultsText}`;
        }

        console.log('[Synthesize] 🟣 Step 4: Getting response...');
        let response = await callOpenRouterModel(selectedModel, getSystemPrompt(), userMessage, conversationHistory);

        // Step 5: Fallback to Groq
        if (!response) {
            console.log('[Synthesize] 🟢 Step 5: OpenRouter failed, trying Groq...');
            response = await callGroq(getSystemPrompt(), userMessage, conversationHistory);
        }

        // Step 6: Gemini review
        if (response) {
            console.log('[Synthesize] 🔵 Step 6: Gemini reviewing...');
            response = await geminiReviewer(response, userPrompt);
        }

        if (!response) {
            response = lang === 'ar' ? 'عذراً، حدث خطأ في معالجة الطلب.' : 'Sorry, an error occurred.';
        }

        console.log(`[Synthesize] ✅ Done! (${response.length} chars)`);
        console.log('═══════════════════════════════════════════════════════════════');

        res.status(200).json({
            success: true,
            data: response,
            meta: { questionType, model: selectedModel.split('/')[1]?.split(':')[0] }
        });
    } catch (error) {
        console.error('[Synthesize] ❌ Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
