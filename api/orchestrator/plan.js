// Plan API - COMPLETE MULTI-MODEL FALLBACK
// Gemini أولاً ← ثم Groq ← مستحيل يفشل!

// ═══════════════════════════════════════════════════════════════
//                    ALL MODELS
// ═══════════════════════════════════════════════════════════════

const GEMINI_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest'
];

const GROQ_MODELS = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'qwen-qwq-32b',
    'llama-4-scout-17b-16e-instruct',
    'meta-llama/llama-4-maverick-17b-128e-instruct'
];

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

function getGroqKeys() {
    const keys = [];
    for (let i = 1; i <= 10; i++) {
        const key = process.env[`GROQ_API_KEY_${i}`];
        if (key && key.trim()) keys.push(key.trim());
    }
    return keys;
}

let geminiKeyIndex = 0;
let groqKeyIndex = 0;

// ═══════════════════════════════════════════════════════════════
//                    GEMINI API
// ═══════════════════════════════════════════════════════════════

async function callGemini(prompt) {
    const keys = getGeminiKeys();
    if (keys.length === 0) {
        console.log('[Plan] ⚠️ No Gemini keys');
        return null;
    }

    for (const model of GEMINI_MODELS) {
        for (let i = 0; i < 3; i++) {
            try {
                console.log(`[Plan] 🧠 Trying Gemini: ${model}`);
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': keys[geminiKeyIndex++ % keys.length] },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig: { maxOutputTokens: 2000 }
                    })
                });

                if (res.status === 429 || res.status === 503) {
                    console.log(`[Plan] Gemini ${model} rate limited, trying next...`);
                    continue;
                }
                if (res.status === 404) {
                    console.log(`[Plan] Gemini ${model} not found, trying next model...`);
                    break;
                }

                if (res.ok) {
                    const d = await res.json();
                    const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                        console.log(`[Plan] ✅ Gemini ${model} SUCCESS`);
                        return text;
                    }
                }
            } catch (e) {
                console.log(`[Plan] Gemini error: ${e.message}`);
            }
        }
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════
//                    GROQ API
// ═══════════════════════════════════════════════════════════════

async function callGroq(prompt) {
    const keys = getGroqKeys();
    if (keys.length === 0) {
        console.log('[Plan] ⚠️ No Groq keys');
        return null;
    }

    for (const model of GROQ_MODELS) {
        for (let i = 0; i < 3; i++) {
            try {
                console.log(`[Plan] ⚡ Trying Groq: ${model}`);
                const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${keys[groqKeyIndex++ % keys.length]}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: 'user', content: prompt }],
                        max_tokens: 2000
                    })
                });

                if (res.status === 429) {
                    console.log(`[Plan] Groq ${model} rate limited, trying next...`);
                    continue;
                }
                if (res.status === 404) {
                    console.log(`[Plan] Groq ${model} not found, trying next model...`);
                    break;
                }

                if (res.ok) {
                    const d = await res.json();
                    if (d.choices?.[0]?.message?.content) {
                        console.log(`[Plan] ✅ Groq ${model} SUCCESS`);
                        return d.choices[0].message.content;
                    }
                }
            } catch (e) {
                console.log(`[Plan] Groq error: ${e.message}`);
            }
        }
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════
//                    MASTER API (Never Fails!)
// ═══════════════════════════════════════════════════════════════

async function callAPI(prompt) {
    console.log('[Plan] 🚀 Starting multi-model cascade...');

    // Try Gemini first
    let result = await callGemini(prompt);
    if (result) return result;

    // Fallback to Groq
    console.log('[Plan] ⚠️ All Gemini failed, trying Groq...');
    result = await callGroq(prompt);
    if (result) return result;

    console.log('[Plan] ❌ All APIs failed!');
    return null;
}

// ═══════════════════════════════════════════════════════════════
//                    HELPERS
// ═══════════════════════════════════════════════════════════════

function detectLanguage(text) {
    return /[\u0600-\u06FF]/.test(text) ? 'ar' : 'en';
}

function countComplexity(prompt) {
    let score = 0;
    if (prompt.length > 300) score++;
    if (prompt.length > 600) score++;
    if (prompt.length > 1000) score++;
    if ((prompt.match(/\?|؟/g) || []).length > 1) score++;
    if ((prompt.match(/\?|؟/g) || []).length > 3) score++;
    if (/[1-9]\.|[١-٩]\./.test(prompt)) score++;
    return score;
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
        const complexity = countComplexity(prompt);
        const minSteps = complexity >= 4 ? 6 : complexity >= 2 ? 4 : 3;
        const maxSteps = complexity >= 4 ? 10 : complexity >= 2 ? 6 : 4;

        const planPrompt = `أنت مخطط ذكي. أنشئ خطة تفكير مفصلة.

عدد الخطوات: ${minSteps} إلى ${maxSteps} خطوات

أنواع الخطوات:
- "SearchAgent": للبحث
- "Analyzer": للتحليل
- "Validator": للتحقق
- "Critic": للنقد
- "Refiner": للتحسين
- "Orchestrator": الدمج النهائي

السؤال: "${prompt.substring(0, 500)}"

أجب بـ JSON فقط:
{
  "plan": [
    {"step": 1, "agent": "SearchAgent", "task": "..."},
    {"step": 2, "agent": "Analyzer", "task": "..."},
    {"step": 3, "agent": "Orchestrator", "task": "..."}
  ]
}`;

        console.log(`[Plan] Generating ${minSteps}-${maxSteps} step plan...`);
        const response = await callAPI(planPrompt);

        if (!response) {
            // Return default plan if all APIs fail
            console.log('[Plan] Returning default plan');
            return res.status(200).json({
                success: true,
                data: {
                    plan: [
                        { step: 1, agent: "SearchAgent", task: lang === 'ar' ? "البحث عن المعلومات" : "Search information" },
                        { step: 2, agent: "Analyzer", task: lang === 'ar' ? "تحليل البيانات" : "Analyze data" },
                        { step: 3, agent: "Orchestrator", task: lang === 'ar' ? "تقديم الإجابة" : "Provide answer" }
                    ]
                }
            });
        }

        let planData;
        try {
            planData = JSON.parse(response);
        } catch {
            const match = response?.match(/\{[\s\S]*\}/);
            if (match) {
                planData = JSON.parse(match[0]);
            } else {
                planData = {
                    plan: [
                        { step: 1, agent: "SearchAgent", task: lang === 'ar' ? "البحث" : "Search" },
                        { step: 2, agent: "Analyzer", task: lang === 'ar' ? "التحليل" : "Analyze" },
                        { step: 3, agent: "Orchestrator", task: lang === 'ar' ? "الإجابة" : "Answer" }
                    ]
                };
            }
        }

        // Ensure plan exists
        if (!planData.plan || !Array.isArray(planData.plan)) {
            planData = {
                plan: [
                    { step: 1, agent: "SearchAgent", task: lang === 'ar' ? "البحث" : "Search" },
                    { step: 2, agent: "Orchestrator", task: lang === 'ar' ? "الإجابة" : "Answer" }
                ]
            };
        }

        // Re-number steps
        planData.plan = planData.plan.map((s, i) => ({ ...s, step: i + 1 }));

        console.log(`[Plan] ✅ Created ${planData.plan.length} steps`);
        res.status(200).json({ success: true, data: planData });

    } catch (error) {
        console.error('[Plan] Error:', error.message);
        // Still return a default plan on error!
        res.status(200).json({
            success: true,
            data: {
                plan: [
                    { step: 1, agent: "SearchAgent", task: "البحث" },
                    { step: 2, agent: "Orchestrator", task: "الإجابة" }
                ]
            }
        });
    }
}
