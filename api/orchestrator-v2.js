// ═══════════════════════════════════════════════════════════════
//                    ORCHESTRATOR V2 - LUKAS AI
//          Smart Multi-Provider AI Orchestration System
//          (All-in-one: No external lib dependencies)
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
//                    ALL AVAILABLE MODELS
// ═══════════════════════════════════════════════════════════════

const GEMINI_MODELS = {
    PRIMARY: 'gemini-2.5-flash',
    FAST: 'gemini-2.5-flash-lite',
    ADVANCED: 'gemini-3-flash',
    REVIEWER: 'gemini-2.5-flash-lite',
};

const OPENROUTER_MODELS = {
    FAST: 'xiaomi/mimo-v2-flash:free',
    BALANCED: 'google/gemma-3-27b-it:free',
    THINKING: 'deepseek/deepseek-r1-0528:free',
    HEAVY: 'openai/gpt-oss-120b:free',
    CODE: 'qwen/qwen3-coder:free',
};

const GROQ_MODELS = {
    PRIMARY: 'llama-3.3-70b-versatile',
    ARABIC: 'qwen-2.5-32b',
    FAST: 'mixtral-8x7b-32768',
};

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
//                    QUESTION ANALYZER
// ═══════════════════════════════════════════════════════════════

function analyzeQuestion(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    const types = {
        greeting: ['مرحبا', 'اهلا', 'السلام', 'hello', 'hi', 'hey', 'صباح', 'مساء'],
        code: ['كود', 'code', 'function', 'api', 'برمجة', 'javascript', 'python', 'react', 'node'],
        research: ['بحث', 'تحليل', 'دراسة', 'research', 'analyze', 'study', 'تقرير', 'report'],
        math: ['حساب', 'رياضيات', 'معادلة', 'math', 'calculate', 'equation', 'أرقام'],
        simple: ['ما هو', 'ما هي', 'what is', 'define', 'عرف', 'شرح بسيط'],
        complex: ['اشرح بالتفصيل', 'تحليل شامل', 'خطة', 'استراتيجية', 'مقارنة'],
    };

    for (const [type, keywords] of Object.entries(types)) {
        if (keywords.some(kw => lowerPrompt.includes(kw))) return type;
    }
    if (prompt.length < 50) return 'simple';
    if (prompt.length > 300) return 'complex';
    return 'balanced';
}

function selectModel(questionType) {
    const routing = {
        greeting: { provider: 'groq', model: GROQ_MODELS.FAST },
        simple: { provider: 'groq', model: GROQ_MODELS.PRIMARY },
        code: { provider: 'openrouter', model: OPENROUTER_MODELS.CODE },
        research: { provider: 'openrouter', model: OPENROUTER_MODELS.THINKING },
        math: { provider: 'gemini', model: GEMINI_MODELS.ADVANCED },
        complex: { provider: 'gemini', model: GEMINI_MODELS.ADVANCED },
        balanced: { provider: 'gemini', model: GEMINI_MODELS.PRIMARY },
    };
    return routing[questionType] || routing.balanced;
}

// ═══════════════════════════════════════════════════════════════
//                    API CALLERS
// ═══════════════════════════════════════════════════════════════

async function callGemini(prompt, model = GEMINI_MODELS.PRIMARY, maxTokens = 4000) {
    const keys = getGeminiKeys();
    if (keys.length === 0) return null;

    const models = [model, GEMINI_MODELS.PRIMARY, GEMINI_MODELS.FAST, GEMINI_MODELS.ADVANCED];

    for (const currentModel of [...new Set(models)]) {
        for (const key of keys.slice(0, 5)) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig: { maxOutputTokens: maxTokens }
                    })
                });

                if (response.status === 429) continue;
                if (response.status === 404) break;
                if (!response.ok) continue;

                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) return { text, provider: 'gemini', model: currentModel };
            } catch (e) { continue; }
        }
    }
    return null;
}

async function callOpenRouter(prompt, model = OPENROUTER_MODELS.BALANCED, maxTokens = 4000) {
    const keys = getOpenRouterKeys();
    if (keys.length === 0) return null;

    const models = [model, OPENROUTER_MODELS.FAST, OPENROUTER_MODELS.BALANCED, OPENROUTER_MODELS.THINKING];

    for (const currentModel of [...new Set(models)]) {
        for (const key of keys) {
            try {
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${key}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://luks-pied.vercel.app',
                        'X-Title': 'Lukas AI'
                    },
                    body: JSON.stringify({
                        model: currentModel,
                        messages: [{ role: 'user', content: prompt }],
                        max_tokens: maxTokens,
                    })
                });

                if (response.status === 429) continue;
                if (response.status === 404) break;
                if (!response.ok) continue;

                const data = await response.json();
                const text = data.choices?.[0]?.message?.content;
                if (text) return { text, provider: 'openrouter', model: currentModel };
            } catch (e) { continue; }
        }
    }
    return null;
}

async function callGroq(prompt, model = GROQ_MODELS.PRIMARY, maxTokens = 4000) {
    const keys = getGroqKeys();
    if (keys.length === 0) return null;

    const models = [model, GROQ_MODELS.PRIMARY, GROQ_MODELS.ARABIC, GROQ_MODELS.FAST];

    for (const currentModel of [...new Set(models)]) {
        for (const key of keys) {
            try {
                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: currentModel,
                        messages: [{ role: 'user', content: prompt }],
                        max_tokens: maxTokens,
                    })
                });

                if (response.status === 429) continue;
                if (response.status === 404) break;
                if (!response.ok) continue;

                const data = await response.json();
                const text = data.choices?.[0]?.message?.content;
                if (text) return { text, provider: 'groq', model: currentModel };
            } catch (e) { continue; }
        }
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════
//                    GEMINI REVIEWER
// ═══════════════════════════════════════════════════════════════

async function geminiReviewer(text, originalPrompt) {
    console.log('[Orchestrator] 🔍 Reviewing response with Gemini...');

    const reviewPrompt = `أنت مراجع لغوي متخصص. راجع هذه الإجابة:

⚠️ المطلوب:
1. احذف أي حروف أو كلمات غير عربية (صينية، روسية، يابانية، إلخ)
2. صحح الأخطاء الإملائية والنحوية
3. حسّن الصياغة إذا لزم الأمر
4. تأكد أن الإجابة كاملة ومنظمة

السؤال الأصلي: ${originalPrompt}

الإجابة المطلوب مراجعتها:
${text}

قدم الإجابة المُحسّنة فقط بدون أي تعليقات.`;

    const result = await callGemini(reviewPrompt, GEMINI_MODELS.REVIEWER, 4000);
    if (result) return result.text;
    return text;
}

// ═══════════════════════════════════════════════════════════════
//                    SMART ROUTER
// ═══════════════════════════════════════════════════════════════

async function smartRoute(prompt) {
    console.log('[Orchestrator] 🧠 Analyzing question...');
    const questionType = analyzeQuestion(prompt);
    const recommended = selectModel(questionType);

    console.log(`[Orchestrator] 📊 Type: ${questionType} → ${recommended.provider}/${recommended.model}`);

    let result = null;

    // Try Gemini first
    console.log('[Orchestrator] 🔵 Trying Gemini...');
    result = await callGemini(prompt, recommended.model);

    // Fallback to OpenRouter
    if (!result) {
        console.log('[Orchestrator] 🟣 Trying OpenRouter...');
        result = await callOpenRouter(prompt, OPENROUTER_MODELS.BALANCED);
    }

    // Fallback to Groq
    if (!result) {
        console.log('[Orchestrator] 🟢 Trying Groq...');
        result = await callGroq(prompt, GROQ_MODELS.PRIMARY);
    }

    if (!result) {
        throw new Error('All AI providers failed to respond');
    }

    // Review if not from Gemini
    if (result.provider !== 'gemini') {
        console.log('[Orchestrator] 📝 Sending to Gemini reviewer...');
        result.text = await geminiReviewer(result.text, prompt);
        result.reviewed = true;
    }

    console.log(`[Orchestrator] ✅ Success via ${result.provider}`);
    return result;
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

قواعد صارمة:
🚫 ممنوع ذكر: Google, Gemini, Bard, Meta, Llama, Groq, OpenAI, GPT, Claude, DeepSeek
✅ لو سُئلت عن مطورك: "مطوري هو شخص مصري ذكي ومبدع"

═══════════════════════════════════════════════════════════════
                        اللغة
═══════════════════════════════════════════════════════════════
🔴 ممنوع منعاً باتاً استخدام أي كلمة من هذه اللغات:
   - الصينية ❌
   - الروسية ❌
   - اليابانية ❌
   - الكورية ❌
   - أي لغة أخرى غير العربية أو الإنجليزية ❌

✅ اكتب بالعربية الفصحى السليمة
✅ يمكنك استخدام مصطلحات إنجليزية تقنية فقط

═══════════════════════════════════════════════════════════════
                        أسلوبك
═══════════════════════════════════════════════════════════════
- فكر بعمق قبل الإجابة
- قدم إجابات شاملة ومفصلة
- استخدم التنسيق (عناوين، قوائم، أرقام)
- راجع إجابتك قبل تقديمها`;

// ═══════════════════════════════════════════════════════════════
//                    MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { prompt, task, conversationHistory } = req.body || {};
        const userPrompt = prompt || task;

        if (!userPrompt) {
            return res.status(400).json({ success: false, error: 'Missing prompt' });
        }

        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`[Orchestrator V2] 🚀 New request: "${userPrompt.substring(0, 50)}..."`);
        console.log('═══════════════════════════════════════════════════════════════');

        // Build context
        let contextString = '';
        if (conversationHistory && conversationHistory.length > 0) {
            contextString = '\n\n📝 المحادثة السابقة:\n' +
                conversationHistory.slice(-5).map(h =>
                    `المستخدم: ${h.prompt}\nلوكاس: ${h.results?.[0]?.result || ''}`
                ).join('\n\n');
        }

        // Get current time
        const now = new Date();
        const timeString = now.toLocaleString('ar-EG', {
            timeZone: 'Africa/Cairo',
            weekday: 'long', year: 'numeric', month: 'long',
            day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        // Build full prompt
        const fullPrompt = SYSTEM_PROMPT +
            `\n\n⏰ الوقت الحالي: ${timeString}` +
            contextString +
            '\n\n👤 سؤال المستخدم:\n' + userPrompt;

        // Use Smart Router
        const result = await smartRoute(fullPrompt);

        console.log(`[Orchestrator V2] ✅ Response ready (${result.text.length} chars)`);
        console.log(`[Orchestrator V2] 📊 Provider: ${result.provider}, Reviewed: ${result.reviewed || false}`);

        res.status(200).json({
            success: true,
            data: result.text,
            meta: {
                provider: result.provider,
                model: result.model,
                reviewed: result.reviewed || false,
            }
        });

    } catch (error) {
        console.error('[Orchestrator V2] ❌ Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
