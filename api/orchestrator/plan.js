// Plan API - ADVANCED AGI-STYLE THINKING
// تفكير عميق + مراجعة ذاتية + تصحيح الأخطاء

// ═══════════════════════════════════════════════════════════════
//                    MODELS
// ═══════════════════════════════════════════════════════════════

const GEMINI_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
];

const GROQ_MODELS = [
    'qwen-2.5-32b',
    'gpt-oss-120b',
    'gemma2-9b-it',
    'llama-3.3-70b-versatile'
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

let geminiIdx = 0, groqIdx = 0;

// ═══════════════════════════════════════════════════════════════
//                    GEMINI API
// ═══════════════════════════════════════════════════════════════

async function callGemini(prompt) {
    const keys = getGeminiKeys();
    if (keys.length === 0) return null;

    for (const model of GEMINI_MODELS) {
        for (let i = 0; i < 3; i++) {
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': keys[geminiIdx++ % keys.length] },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig: { maxOutputTokens: 4000 }
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

async function callGroq(prompt) {
    const keys = getGroqKeys();
    if (keys.length === 0) return null;

    for (const model of GROQ_MODELS) {
        for (let i = 0; i < 2; i++) {
            try {
                const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${keys[groqIdx++ % keys.length]}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 2000 })
                });
                if (res.ok) {
                    const d = await res.json();
                    if (d.choices?.[0]?.message?.content) return d.choices[0].message.content;
                }
            } catch (e) { }
        }
    }
    return null;
}

async function callAPI(prompt) {
    let result = await callGemini(prompt);
    if (result) return result;
    return await callGroq(prompt);
}

// ═══════════════════════════════════════════════════════════════
//                    HELPERS
// ═══════════════════════════════════════════════════════════════

function detectLanguage(text) {
    return /[\u0600-\u06FF]/.test(text) ? 'ar' : 'en';
}

function analyzeComplexity(prompt) {
    let score = 0;

    // Length
    if (prompt.length > 200) score += 1;
    if (prompt.length > 500) score += 2;
    if (prompt.length > 1000) score += 2;

    // Question marks
    const questionMarks = (prompt.match(/\?|؟/g) || []).length;
    if (questionMarks >= 2) score += 2;
    if (questionMarks >= 5) score += 2;

    // Complex keywords
    const complexKeywords = [
        'تخيل', 'افترض', 'سيناريو', 'حلل', 'خطة', 'استراتيجية',
        'قارن', 'اشرح', 'نموذج', 'رياضي', 'كيف', 'لماذا',
        'imagine', 'scenario', 'analyze', 'plan', 'strategy', 'compare'
    ];
    for (const kw of complexKeywords) {
        if (prompt.includes(kw)) score += 1;
    }

    // Lists/numbers
    if (/[1-9]\.|[١-٩]\./.test(prompt)) score += 2;

    // Multi-line
    if (prompt.split('\n').length > 5) score += 2;

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

        console.log(`[Plan] 🧠 Complexity: ${complexity}/10`);

        // Calculate steps based on complexity
        let minSteps, maxSteps;
        if (complexity >= 7) {
            minSteps = 8; maxSteps = 12;
        } else if (complexity >= 4) {
            minSteps = 5; maxSteps = 8;
        } else {
            minSteps = 3; maxSteps = 5;
        }

        const planPrompt = lang === 'ar' ? `أنت مخطط ذكي متقدم يفكر بأسلوب AGI (ذكاء اصطناعي عام).

═══════════════════════════════════════════════════════════════
                    أسلوب التفكير
═══════════════════════════════════════════════════════════════

أنت تفكر بعمق مثل الإنسان:
- تحلل المشكلة من جميع الجوانب
- تبحث عن المعلومات المطلوبة
- تراجع أفكارك وتصححها إذا وجدت خطأ
- تتأكد من صحة استنتاجاتك
- تحسن إجابتك قبل تقديمها

═══════════════════════════════════════════════════════════════
                    وكلاء التفكير المتاحين
═══════════════════════════════════════════════════════════════

🔍 SearchAgent: البحث عن معلومات ومصادر
📊 Analyzer: تحليل البيانات والمعلومات
✅ Validator: التحقق من صحة المعلومات
🔴 Critic: مراجعة ونقد الإجابة وإيجاد الأخطاء والفجوات
✨ Refiner: تحسين الإجابة وإضافة التفاصيل الناقصة
🧠 DeepThinker: التفكير العميق في السيناريوهات المعقدة
📐 Calculator: الحسابات والنماذج الرياضية
🔄 SelfCorrector: مراجعة المنطق وتصحيح الأخطاء في التفكير
🎯 Orchestrator: دمج كل النتائج وتقديم الإجابة النهائية

═══════════════════════════════════════════════════════════════
                    التعليمات
═══════════════════════════════════════════════════════════════

أنشئ خطة تفكير مفصلة من ${minSteps} إلى ${maxSteps} خطوات.

يجب أن تشمل الخطة:
1. خطوة بحث واحدة على الأقل (SearchAgent)
2. خطوة تحليل (Analyzer)
3. خطوة نقد ذاتي (Critic) - مهم جداً!
4. خطوة تصحيح (SelfCorrector) إذا وُجدت أخطاء
5. خطوة تحسين (Refiner)
6. خطوة دمج نهائية (Orchestrator)

═══════════════════════════════════════════════════════════════
                    السؤال
═══════════════════════════════════════════════════════════════

"${prompt.substring(0, 1000)}"

═══════════════════════════════════════════════════════════════
                    الإخراج المطلوب (JSON فقط)
═══════════════════════════════════════════════════════════════

{
  "complexity_assessment": "وصف مختصر لمدى تعقيد السؤال",
  "thinking_approach": "كيف سأفكر في هذا السؤال",
  "plan": [
    {"step": 1, "agent": "SearchAgent", "task": "وصف المهمة", "reasoning": "لماذا هذه الخطوة مهمة"},
    {"step": 2, "agent": "Analyzer", "task": "...", "reasoning": "..."},
    {"step": 3, "agent": "Critic", "task": "مراجعة ما توصلنا إليه والبحث عن أخطاء", "reasoning": "للتأكد من صحة تفكيرنا"},
    ...
  ]
}` : `You are an advanced AGI-style thinking planner.

Create a detailed thinking plan with ${minSteps} to ${maxSteps} steps.

Question: "${prompt.substring(0, 1000)}"

Include: SearchAgent, Analyzer, Critic (self-review), SelfCorrector, Refiner, Orchestrator

Return JSON only:
{
  "complexity_assessment": "...",
  "thinking_approach": "...",
  "plan": [{"step": 1, "agent": "...", "task": "...", "reasoning": "..."}]
}`;

        console.log(`[Plan] Generating ${minSteps}-${maxSteps} step AGI plan...`);
        const response = await callAPI(planPrompt);

        let planData;
        try {
            planData = JSON.parse(response);
        } catch {
            const match = response?.match(/\{[\s\S]*\}/);
            if (match) {
                try {
                    planData = JSON.parse(match[0]);
                } catch {
                    planData = null;
                }
            }
        }

        // Fallback plan if parsing failed
        if (!planData || !planData.plan) {
            planData = {
                complexity_assessment: lang === 'ar' ? "سؤال يتطلب تحليل" : "Question requires analysis",
                thinking_approach: lang === 'ar' ? "تفكير منهجي ومراجعة ذاتية" : "Systematic thinking with self-review",
                plan: [
                    { step: 1, agent: "SearchAgent", task: lang === 'ar' ? "البحث عن المعلومات المطلوبة" : "Search for required information", reasoning: lang === 'ar' ? "نحتاج معلومات أساسية" : "We need basic information" },
                    { step: 2, agent: "Analyzer", task: lang === 'ar' ? "تحليل المعلومات" : "Analyze information", reasoning: lang === 'ar' ? "لفهم البيانات" : "To understand data" },
                    { step: 3, agent: "DeepThinker", task: lang === 'ar' ? "التفكير العميق في الحل" : "Deep thinking about solution", reasoning: lang === 'ar' ? "للوصول لأفضل إجابة" : "To reach best answer" },
                    { step: 4, agent: "Critic", task: lang === 'ar' ? "مراجعة ونقد التفكير" : "Review and critique thinking", reasoning: lang === 'ar' ? "للتأكد من الصحة" : "To verify correctness" },
                    { step: 5, agent: "SelfCorrector", task: lang === 'ar' ? "تصحيح أي أخطاء في المنطق" : "Correct any logic errors", reasoning: lang === 'ar' ? "لضمان الجودة" : "To ensure quality" },
                    { step: 6, agent: "Refiner", task: lang === 'ar' ? "تحسين الإجابة" : "Improve answer", reasoning: lang === 'ar' ? "لتقديم أفضل نتيجة" : "To deliver best result" },
                    { step: 7, agent: "Orchestrator", task: lang === 'ar' ? "تقديم الإجابة النهائية الشاملة" : "Deliver final comprehensive answer", reasoning: lang === 'ar' ? "دمج كل النتائج" : "Combine all results" }
                ]
            };
        }

        // Ensure minimum steps
        while (planData.plan.length < minSteps) {
            const defaultSteps = [
                { agent: "Analyzer", task: lang === 'ar' ? "تحليل إضافي" : "Additional analysis", reasoning: "More depth" },
                { agent: "Critic", task: lang === 'ar' ? "مراجعة إضافية" : "Additional review", reasoning: "Quality check" }
            ];
            const step = defaultSteps[planData.plan.length % defaultSteps.length];
            planData.plan.push({ step: planData.plan.length + 1, ...step });
        }

        // Re-number steps
        planData.plan = planData.plan.map((s, i) => ({ ...s, step: i + 1 }));

        console.log(`[Plan] ✅ Created AGI plan with ${planData.plan.length} steps`);

        res.status(200).json({
            success: true,
            data: planData
        });

    } catch (error) {
        console.error('[Plan] ❌ Error:', error.message);

        // Return a default plan even on error
        const lang = /[\u0600-\u06FF]/.test(req.body?.prompt || '') ? 'ar' : 'en';
        res.status(200).json({
            success: true,
            data: {
                complexity_assessment: lang === 'ar' ? "تحليل السؤال" : "Analyzing question",
                thinking_approach: lang === 'ar' ? "منهجية تفكير متقدمة" : "Advanced thinking methodology",
                plan: [
                    { step: 1, agent: "SearchAgent", task: lang === 'ar' ? "البحث" : "Search", reasoning: "Initial research" },
                    { step: 2, agent: "Analyzer", task: lang === 'ar' ? "التحليل" : "Analyze", reasoning: "Understanding" },
                    { step: 3, agent: "Orchestrator", task: lang === 'ar' ? "الإجابة" : "Answer", reasoning: "Final response" }
                ]
            }
        });
    }
}
