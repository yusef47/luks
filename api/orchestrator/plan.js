// Plan API - GEMINI ROUTER + OPENROUTER/GROQ WORKERS
// Gemini = فهم السؤال + مراجعة الرد
// OpenRouter/Groq = الإجابة الفعلية

// ═══════════════════════════════════════════════════════════════
//                    MODELS
// ═══════════════════════════════════════════════════════════════

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
//                    GEMINI (ANALYZER + REVIEWER ONLY)
// ═══════════════════════════════════════════════════════════════

async function callGemini(prompt, maxTokens = 2000) {
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
//                    OPENROUTER (MAIN WORKER)
// ═══════════════════════════════════════════════════════════════

async function callOpenRouter(prompt, maxTokens = 4000) {
    const keys = getOpenRouterKeys();
    if (keys.length === 0) return null;

    for (const model of OPENROUTER_MODELS) {
        for (const key of keys) {
            try {
                console.log(`[Plan] 🟣 Trying OpenRouter: ${model.split('/')[1]?.split(':')[0]}`);
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
                        messages: [{ role: 'user', content: prompt }],
                        max_tokens: maxTokens,
                    })
                });
                if (res.status === 429) continue;
                if (res.status === 404) break;
                if (res.ok) {
                    const d = await res.json();
                    const text = d.choices?.[0]?.message?.content;
                    if (text) {
                        console.log(`[Plan] ✅ OpenRouter success: ${model.split('/')[1]?.split(':')[0]}`);
                        return text;
                    }
                }
            } catch (e) { continue; }
        }
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════
//                    GROQ (BACKUP WORKER)
// ═══════════════════════════════════════════════════════════════

async function callGroq(prompt, maxTokens = 4000) {
    const keys = getGroqKeys();
    if (keys.length === 0) return null;

    for (const model of GROQ_MODELS) {
        for (const key of keys) {
            try {
                console.log(`[Plan] 🟢 Trying Groq: ${model}`);
                const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens })
                });
                if (res.status === 429) continue;
                if (res.status === 404) break;
                if (res.ok) {
                    const d = await res.json();
                    const text = d.choices?.[0]?.message?.content;
                    if (text) {
                        console.log(`[Plan] ✅ Groq success: ${model}`);
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

async function geminiReviewer(text, originalPrompt) {
    console.log('[Plan] 🔍 Gemini reviewing response...');

    const reviewPrompt = `أنت مراجع لغوي متخصص. راجع هذه الإجابة:

⚠️ المطلوب:
1. احذف أي حروف أو كلمات غير عربية (صينية، روسية، يابانية، إلخ)
2. صحح الأخطاء الإملائية والنحوية
3. حسّن الصياغة إذا لزم الأمر
4. تأكد أن الإجابة كاملة ومنظمة

السؤال الأصلي: ${originalPrompt.substring(0, 500)}

الإجابة المطلوب مراجعتها:
${text}

قدم الإجابة المُحسّنة فقط بدون أي تعليقات.`;

    const result = await callGemini(reviewPrompt, 4000);
    if (result) {
        console.log('[Plan] ✅ Review complete');
        return result;
    }
    console.log('[Plan] ⚠️ Review failed, returning original');
    return text;
}

// ═══════════════════════════════════════════════════════════════
//                    MAIN WORKER (OpenRouter → Groq)
// ═══════════════════════════════════════════════════════════════

async function callWorker(prompt) {
    // Try OpenRouter first
    console.log('[Plan] 🟣 Trying OpenRouter workers...');
    let result = await callOpenRouter(prompt);

    // Fallback to Groq
    if (!result) {
        console.log('[Plan] 🟢 OpenRouter failed, trying Groq...');
        result = await callGroq(prompt);
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
//                    HELPERS
// ═══════════════════════════════════════════════════════════════

function detectLanguage(text) {
    return /[\u0600-\u06FF]/.test(text) ? 'ar' : 'en';
}

function analyzeComplexity(prompt) {
    let score = 0;
    if (prompt.length > 200) score += 1;
    if (prompt.length > 500) score += 2;
    const questionMarks = (prompt.match(/\?|؟/g) || []).length;
    if (questionMarks >= 2) score += 2;
    const complexKeywords = ['تخيل', 'افترض', 'حلل', 'خطة', 'استراتيجية', 'قارن', 'اشرح', 'كيف', 'لماذا'];
    for (const kw of complexKeywords) if (prompt.includes(kw)) score += 1;
    return Math.min(score, 10);
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
        const { prompt } = req.body || {};
        if (!prompt) return res.status(400).json({ success: false, error: 'Missing prompt' });

        const lang = detectLanguage(prompt);
        const complexity = analyzeComplexity(prompt);

        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`[Plan] 🧠 New request | Complexity: ${complexity}/10`);
        console.log('═══════════════════════════════════════════════════════════════');

        // Step 1: Gemini analyzes the question (light usage)
        console.log('[Plan] 🔵 Step 1: Gemini analyzing question...');

        // SIMPLIFIED: Max 3 steps to prevent repetition
        let minSteps = 1;
        let maxSteps = 3;

        const analyzePrompt = lang === 'ar'
            ? `حلل هذا السؤال بإيجاز وحدد نوعه (بحث/تحليل/كود/شرح/رياضيات):
"${prompt.substring(0, 300)}"
أجب بجملة واحدة فقط.`
            : `Briefly analyze this question and identify its type (research/analysis/code/explanation/math):
"${prompt.substring(0, 300)}"
Answer in one sentence only.`;

        const analysis = await callGemini(analyzePrompt, 200);
        console.log(`[Plan] 📊 Analysis: ${analysis?.substring(0, 100) || 'default'}`);

        // Step 2: OpenRouter/Groq creates the plan
        console.log('[Plan] 🟣 Step 2: OpenRouter/Groq creating plan...');

        const planPrompt = lang === 'ar' ? `أنت مخطط ذكي متقدم.

أنشئ خطة تفكير مفصلة من ${minSteps} إلى ${maxSteps} خطوات للسؤال التالي.

الوكلاء المتاحون:
🔍 SearchAgent: البحث عن معلومات
📊 Analyzer: تحليل البيانات
🧠 DeepThinker: التفكير العميق
✅ Validator: التحقق من الصحة
✨ Refiner: تحسين الإجابة
🎯 Orchestrator: الإجابة النهائية

السؤال: "${prompt.substring(0, 1000)}"

أجب بـ JSON فقط:
{
  "complexity_assessment": "وصف مختصر",
  "thinking_approach": "طريقة التفكير",
  "plan": [
    {"step": 1, "agent": "SearchAgent", "task": "المهمة", "reasoning": "السبب"}
  ]
}` : `You are an advanced planner.

Create a thinking plan with ${minSteps} to ${maxSteps} steps.

Question: "${prompt.substring(0, 1000)}"

Return JSON only:
{
  "complexity_assessment": "...",
  "thinking_approach": "...",
  "plan": [{"step": 1, "agent": "...", "task": "...", "reasoning": "..."}]
}`;

        let response = await callWorker(planPrompt);

        // Step 3: Gemini reviews the response
        if (response) {
            console.log('[Plan] 🔵 Step 3: Gemini reviewing response...');
            response = await geminiReviewer(response, prompt);
        }

        // Parse response
        let planData;
        try {
            planData = JSON.parse(response);
        } catch {
            const match = response?.match(/\{[\s\S]*\}/);
            if (match) {
                try { planData = JSON.parse(match[0]); } catch { planData = null; }
            }
        }

        // Fallback plan - SIMPLIFIED to 2 steps
        if (!planData || !planData.plan) {
            planData = {
                complexity_assessment: lang === 'ar' ? "سؤال" : "Question",
                thinking_approach: lang === 'ar' ? "تفكير مباشر" : "Direct thinking",
                plan: [
                    { step: 1, agent: "SearchAgent", task: lang === 'ar' ? "البحث عن المعلومات" : "Search for information", reasoning: "Research" },
                    { step: 2, agent: "Orchestrator", task: lang === 'ar' ? "الإجابة النهائية" : "Final answer", reasoning: "Final response" }
                ]
            };
        }

        // Renumber steps
        planData.plan = planData.plan.slice(0, 3).map((s, i) => ({ ...s, step: i + 1 }));

        console.log(`[Plan] ✅ Created plan with ${planData.plan.length} steps`);
        console.log('═══════════════════════════════════════════════════════════════');

        res.status(200).json({ success: true, data: planData });

    } catch (error) {
        console.error('[Plan] ❌ Error:', error.message);
        const lang = /[\u0600-\u06FF]/.test(req.body?.prompt || '') ? 'ar' : 'en';
        res.status(200).json({
            success: true,
            data: {
                complexity_assessment: lang === 'ar' ? "سؤال" : "Question",
                thinking_approach: lang === 'ar' ? "تفكير مباشر" : "Direct thinking",
                plan: [
                    { step: 1, agent: "SearchAgent", task: lang === 'ar' ? "البحث" : "Search", reasoning: "Research" },
                    { step: 2, agent: "Orchestrator", task: lang === 'ar' ? "الإجابة" : "Answer", reasoning: "Final response" }
                ]
            }
        });
    }
}
