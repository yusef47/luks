// ═══════════════════════════════════════════════════════════════
//                    SMART ROUTER - LUKAS AI
//        Intelligent Multi-Provider AI Routing System
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
//                    ALL AVAILABLE MODELS
// ═══════════════════════════════════════════════════════════════

// Gemini Models (Primary + Reviewer)
const GEMINI_MODELS = {
    PRIMARY: 'gemini-2.5-flash',
    FAST: 'gemini-2.5-flash-lite',
    ADVANCED: 'gemini-3-flash',
    REVIEWER: 'gemini-2.5-flash-lite', // For cleaning responses
};

// OpenRouter Models (Fallback)
const OPENROUTER_MODELS = {
    FAST: 'xiaomi/mimo-v2-flash:free',
    BALANCED: 'google/gemma-3-27b-it:free',
    THINKING: 'deepseek/deepseek-r1-0528:free',
    HEAVY: 'openai/gpt-oss-120b:free',
    CODE: 'qwen/qwen3-coder:free',
    RESEARCH: 'nex-agi/deepseek-v3.1-nex-n1:free',
    MEGA: 'meta-llama/llama-3.1-405b-instruct:free',
};

// Groq Models (Fast Fallback)
const GROQ_MODELS = {
    PRIMARY: 'llama-3.3-70b-versatile',
    ARABIC: 'qwen-2.5-32b',
    FAST: 'mixtral-8x7b-32768',
    LIGHT: 'gemma2-9b-it',
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

    // Detect question type
    const types = {
        greeting: ['مرحبا', 'اهلا', 'السلام', 'hello', 'hi', 'hey', 'صباح', 'مساء'],
        code: ['كود', 'code', 'function', 'api', 'برمجة', 'javascript', 'python', 'react', 'node'],
        research: ['بحث', 'تحليل', 'دراسة', 'research', 'analyze', 'study', 'تقرير', 'report'],
        math: ['حساب', 'رياضيات', 'معادلة', 'math', 'calculate', 'equation', 'أرقام'],
        simple: ['ما هو', 'ما هي', 'what is', 'define', 'عرف', 'شرح بسيط'],
        complex: ['اشرح بالتفصيل', 'تحليل شامل', 'خطة', 'استراتيجية', 'مقارنة'],
    };

    for (const [type, keywords] of Object.entries(types)) {
        if (keywords.some(kw => lowerPrompt.includes(kw))) {
            return type;
        }
    }

    // Default based on length
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
            } catch (e) {
                continue;
            }
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
            } catch (e) {
                continue;
            }
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
                    headers: {
                        'Authorization': `Bearer ${key}`,
                        'Content-Type': 'application/json'
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
                if (text) return { text, provider: 'groq', model: currentModel };
            } catch (e) {
                continue;
            }
        }
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════
//                    GEMINI REVIEWER
// ═══════════════════════════════════════════════════════════════

async function geminiReviewer(text, originalPrompt) {
    console.log('[SmartRouter] 🔍 Reviewing response with Gemini...');

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

    if (result) {
        console.log('[SmartRouter] ✅ Review complete');
        return result.text;
    }

    console.log('[SmartRouter] ⚠️ Review failed, returning original');
    return text;
}

// ═══════════════════════════════════════════════════════════════
//                    MAIN SMART ROUTER
// ═══════════════════════════════════════════════════════════════

async function smartRoute(prompt, options = {}) {
    const { skipReview = false, forceProvider = null } = options;

    console.log('[SmartRouter] 🧠 Analyzing question...');
    const questionType = analyzeQuestion(prompt);
    const recommended = selectModel(questionType);

    console.log(`[SmartRouter] 📊 Type: ${questionType} → ${recommended.provider}/${recommended.model}`);

    let result = null;

    // Try recommended provider first (or forced provider)
    const provider = forceProvider || recommended.provider;

    if (provider === 'gemini' || !forceProvider) {
        console.log('[SmartRouter] 🔵 Trying Gemini...');
        result = await callGemini(prompt, recommended.model);
    }

    if (!result && (provider === 'openrouter' || !forceProvider)) {
        console.log('[SmartRouter] 🟣 Trying OpenRouter...');
        result = await callOpenRouter(prompt, recommended.model);
    }

    if (!result && (provider === 'groq' || !forceProvider)) {
        console.log('[SmartRouter] 🟢 Trying Groq...');
        result = await callGroq(prompt, GROQ_MODELS.PRIMARY);
    }

    if (!result) {
        console.log('[SmartRouter] ❌ All providers failed');
        throw new Error('All AI providers failed to respond');
    }

    // Review if not from Gemini (to ensure Arabic purity)
    if (!skipReview && result.provider !== 'gemini') {
        console.log('[SmartRouter] 📝 Sending to Gemini reviewer...');
        result.text = await geminiReviewer(result.text, prompt);
        result.reviewed = true;
    }

    console.log(`[SmartRouter] ✅ Success via ${result.provider}`);
    return result;
}

// ═══════════════════════════════════════════════════════════════
//                    EXPORTS
// ═══════════════════════════════════════════════════════════════

export {
    smartRoute,
    callGemini,
    callOpenRouter,
    callGroq,
    geminiReviewer,
    analyzeQuestion,
    selectModel,
    GEMINI_MODELS,
    OPENROUTER_MODELS,
    GROQ_MODELS,
};

export default smartRoute;
