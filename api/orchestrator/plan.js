// Plan API - ADVANCED PLANNING with Self-Correction
// خطة مفصلة + تصحيح ذاتي

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

function getGeminiKeys() {
    const keys = [];
    for (let i = 1; i <= 15; i++) {
        const key = process.env[`GEMINI_API_KEY_${i}`];
        if (key && key.trim()) keys.push(key.trim());
    }
    return keys.sort(() => Math.random() - 0.5);
}

let keyIndex = 0;

async function callGemini(prompt) {
    const keys = getGeminiKeys();
    if (keys.length === 0) return null;

    for (const model of GEMINI_MODELS) {
        for (let i = 0; i < 5; i++) {
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': keys[keyIndex++ % keys.length] },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig: { maxOutputTokens: 2000 }
                    })
                });
                if (res.ok) {
                    const d = await res.json();
                    const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) return text;
                }
            } catch (e) { }
        }
    }
    return null;
}

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

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        const { prompt, hasImage, hasVideo, history } = req.body || {};
        if (!prompt) return res.status(400).json({ success: false, error: 'Missing prompt' });

        const lang = detectLanguage(prompt);
        const complexity = countComplexity(prompt);

        // Determine number of steps based on complexity
        const minSteps = complexity >= 4 ? 6 : complexity >= 2 ? 4 : 3;
        const maxSteps = complexity >= 4 ? 10 : complexity >= 2 ? 6 : 4;

        const planPrompt = `أنت مخطط ذكي متقدم. مهمتك إنشاء خطة تفكير مفصلة ومتعمقة.

═══════════════════════════════════════════════════════════════
                    قواعد التخطيط
═══════════════════════════════════════════════════════════════

1. عدد الخطوات: ${minSteps} إلى ${maxSteps} خطوات على الأقل

2. أنواع الخطوات المتاحة:
   - "SearchAgent": للبحث عن معلومات ومصادر
   - "Analyzer": لتحليل البيانات والمعلومات
   - "Validator": للتحقق من صحة المعلومات
   - "Critic": لنقد الإجابة وإيجاد الفجوات
   - "Refiner": لتحسين وتوسيع الإجابة
   - "Orchestrator": للدمج والتلخيص النهائي

3. يجب أن تشمل الخطة:
   - خطوة بحث واحدة على الأقل
   - خطوة تحليل واحدة على الأقل
   - خطوة نقد ذاتي (Critic) لاكتشاف الأخطاء
   - خطوة تحسين (Refiner) لتصحيح الأخطاء
   - خطوة دمج نهائية

4. اللغة: اكتب كل المهام بـ ${lang === 'ar' ? 'العربية' : 'English'}

═══════════════════════════════════════════════════════════════
                    السؤال
═══════════════════════════════════════════════════════════════
"${prompt}"

═══════════════════════════════════════════════════════════════
                    JSON المطلوب
═══════════════════════════════════════════════════════════════
{
  "plan": [
    {"step": 1, "agent": "SearchAgent", "task": "البحث عن..."},
    {"step": 2, "agent": "Analyzer", "task": "تحليل..."},
    {"step": 3, "agent": "SearchAgent", "task": "البحث عن جوانب إضافية..."},
    {"step": 4, "agent": "Validator", "task": "التحقق من صحة..."},
    {"step": 5, "agent": "Critic", "task": "مراجعة ونقد الإجابة وإيجاد الفجوات"},
    {"step": 6, "agent": "Refiner", "task": "تحسين وإضافة التفاصيل الناقصة"},
    {"step": 7, "agent": "Orchestrator", "task": "الدمج النهائي وتقديم إجابة شاملة"}
  ]
}

أجب بـ JSON فقط:`;

        console.log(`[Plan] Generating ${minSteps}-${maxSteps} step plan...`);
        const response = await callGemini(planPrompt);

        let planData;
        try {
            planData = JSON.parse(response);
        } catch {
            const match = response?.match(/\{[\s\S]*\}/);
            if (match) {
                planData = JSON.parse(match[0]);
            } else {
                // Fallback detailed plan
                planData = {
                    plan: [
                        { step: 1, agent: "SearchAgent", task: lang === 'ar' ? `البحث الشامل عن: ${prompt.slice(0, 50)}` : `Search: ${prompt.slice(0, 50)}` },
                        { step: 2, agent: "Analyzer", task: lang === 'ar' ? "تحليل المعلومات والبيانات" : "Analyze information" },
                        { step: 3, agent: "SearchAgent", task: lang === 'ar' ? "البحث عن مصادر إضافية وتفاصيل" : "Search for additional sources" },
                        { step: 4, agent: "Validator", task: lang === 'ar' ? "التحقق من صحة المعلومات" : "Validate information" },
                        { step: 5, agent: "Critic", task: lang === 'ar' ? "مراجعة ونقد الإجابة وإيجاد الفجوات" : "Review and find gaps" },
                        { step: 6, agent: "Refiner", task: lang === 'ar' ? "تحسين وإضافة التفاصيل الناقصة" : "Refine and add details" },
                        { step: 7, agent: "Orchestrator", task: lang === 'ar' ? "الدمج النهائي وتقديم إجابة شاملة" : "Final synthesis" }
                    ]
                };
            }
        }

        // Ensure minimum steps
        if (!planData.plan || planData.plan.length < minSteps) {
            const basePlan = planData.plan || [];
            const defaultSteps = [
                { agent: "SearchAgent", task: lang === 'ar' ? "البحث الشامل" : "Comprehensive search" },
                { agent: "Analyzer", task: lang === 'ar' ? "تحليل المعلومات" : "Analyze data" },
                { agent: "Validator", task: lang === 'ar' ? "التحقق والمراجعة" : "Validate" },
                { agent: "Critic", task: lang === 'ar' ? "النقد الذاتي وإيجاد الفجوات" : "Self-critique" },
                { agent: "Refiner", task: lang === 'ar' ? "التحسين والتصحيح" : "Refine" },
                { agent: "Orchestrator", task: lang === 'ar' ? "الإجابة النهائية" : "Final answer" }
            ];

            while (basePlan.length < minSteps) {
                const step = defaultSteps[basePlan.length % defaultSteps.length];
                basePlan.push({ step: basePlan.length + 1, ...step });
            }
            planData.plan = basePlan;
        }

        // Re-number steps
        planData.plan = planData.plan.map((s, i) => ({ ...s, step: i + 1 }));

        console.log(`[Plan] Created ${planData.plan.length} steps`);
        res.status(200).json({ success: true, data: planData });
    } catch (error) {
        console.error('[Plan] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
