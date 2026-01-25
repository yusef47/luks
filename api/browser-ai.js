/**
 * Lukas Browser AI - Full Agent System
 * With Planning, Memory, and Smart Actions
 */

const VISION_MODELS = [
    'google/gemini-2.0-flash-exp:free',           // Best & newest
    'qwen/qwen-2.5-vl-7b-instruct:free',          // Good at instructions
    'mistralai/mistral-small-3.1-24b-instruct:free',
    'google/gemma-3-27b-it:free',                 // Backup
    'nvidia/nemotron-nano-12b-v2-vl:free',
];

const TEXT_MODELS = [
    'deepseek/deepseek-r1-0528:free',
    'xiaomi/mimo-v2-flash:free',
    'meta-llama/llama-3.3-70b-instruct:free',
];

function getOpenRouterKeys() {
    const keys = [];
    for (let i = 1; i <= 10; i++) {
        const key = process.env[`OPENROUTER_API_KEY_${i}`];
        if (key && key.trim()) keys.push(key.trim());
    }
    if (process.env.OPENROUTER_API_KEY) keys.push(process.env.OPENROUTER_API_KEY.trim());
    return keys;
}

let keyIndex = 0;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const {
            task,
            screenshot,
            url,
            title,
            pageText,
            previousSteps = [],
            memory = {},           // Agent memory
            isFirstStep = false    // Is this the first step?
        } = req.body;

        if (!task) {
            return res.status(400).json({ error: 'Missing task' });
        }

        console.log(`[Agent] Task: "${task.substring(0, 50)}..."`);
        console.log(`[Agent] URL: ${url}`);
        console.log(`[Agent] Step: ${previousSteps.length + 1}`);

        // PHASE 1: Planning (first step only)
        let plan = memory.plan;
        if (isFirstStep || !plan) {
            console.log(`[Agent] 📋 Creating plan...`);
            plan = await createPlan(task);
            console.log(`[Agent] Plan created with ${plan.steps?.length || 0} steps`);
        }

        // PHASE 2: Build memory context
        const agentMemory = buildMemory(memory, previousSteps, url, pageText);

        // PHASE 3: Decide action with full context
        const result = await decideAction({
            task,
            plan,
            memory: agentMemory,
            screenshot,
            url,
            title,
            pageText,
            previousSteps
        });

        // Add plan to response for persistence
        result.memory = {
            ...agentMemory,
            plan
        };

        console.log(`[Agent] ✅ Action: ${result.action?.type} - ${result.action?.description}`);

        res.status(200).json(result);

    } catch (error) {
        console.error('[Agent] Error:', error);
        res.status(500).json({ error: error.message });
    }
}

// ============================================
// PHASE 1: PLANNING ENGINE
// ============================================
async function createPlan(task) {
    const prompt = `أنت مخطط ذكي. حلل المهمة التالية وأنشئ خطة تنفيذ.

المهمة: ${task}

أنشئ خطة واضحة ومنطقية. أجب بـ JSON فقط:
{
    "goal": "الهدف النهائي بوضوح",
    "steps": [
        "1. الخطوة الأولى",
        "2. الخطوة الثانية",
        "..."
    ],
    "successCriteria": "كيف نعرف أن المهمة نجحت",
    "possibleChallenges": ["تحدي محتمل 1", "تحدي محتمل 2"]
}`;

    const result = await callTextAI(prompt);
    if (result) {
        try {
            return JSON.parse(result);
        } catch (e) {
            return { goal: task, steps: ["تنفيذ المهمة"], successCriteria: "إتمام المهمة" };
        }
    }
    return { goal: task, steps: ["تنفيذ المهمة"], successCriteria: "إتمام المهمة" };
}

// ============================================
// PHASE 2: MEMORY SYSTEM
// ============================================
function buildMemory(existingMemory, previousSteps, currentUrl, pageText) {
    return {
        // What we've learned
        visitedUrls: [...(existingMemory.visitedUrls || []), currentUrl].filter(Boolean).slice(-10),

        // Actions taken
        actionHistory: previousSteps.map(s => `${s.action}: ${s.description}`).slice(-10),

        // Findings/data collected
        findings: existingMemory.findings || [],

        // Current progress
        currentPhase: determinePhase(previousSteps.length, existingMemory.plan),

        // Errors encountered
        errors: existingMemory.errors || [],

        // Key information from pages
        keyInfo: extractKeyInfo(pageText),

        // Plan reference
        plan: existingMemory.plan
    };
}

function determinePhase(stepCount, plan) {
    if (!plan?.steps) return "exploring";
    const totalSteps = plan.steps.length;
    const progress = stepCount / (totalSteps || 1);

    if (progress < 0.3) return "starting";
    if (progress < 0.7) return "executing";
    return "completing";
}

function extractKeyInfo(pageText) {
    if (!pageText) return [];

    // Extract potential useful info (prices, ratings, names, etc.)
    const info = [];

    // Prices
    const prices = pageText.match(/\$[\d,]+|\d+\s*(دولار|ريال|جنيه)/g);
    if (prices) info.push(...prices.slice(0, 5));

    // Ratings
    const ratings = pageText.match(/\d+\.?\d*\s*\/\s*\d+|\d+\.?\d*\s*نجوم?/g);
    if (ratings) info.push(...ratings.slice(0, 3));

    return info.slice(0, 10);
}

// ============================================
// PHASE 3: ACTION DECISION ENGINE
// ============================================
async function decideAction({ task, plan, memory, screenshot, url, title, pageText, previousSteps }) {
    const isGoogleSearch = url?.includes('google.com/search');
    const isGoogleHome = url === 'https://www.google.com/' || url?.includes('google.com/?');

    const prompt = `أنت Lukas Agent - وكيل متصفح ذكي يتحكم في المتصفح لإنجاز المهام.

═══════════════════════════════════════════
🎯 المهمة الأصلية: ${task}
═══════════════════════════════════════════

📋 خطة العمل:
${plan?.steps?.map((s, i) => `  ${s}`).join('\n') || 'لا توجد خطة'}

📊 التقدم الحالي:
- المرحلة: ${memory.currentPhase}
- عدد الخطوات المنفذة: ${previousSteps.length}
- المعلومات المستخرجة: ${memory.findings?.length || 0}

🌐 الصفحة الحالية:
- الرابط: ${url}
- العنوان: ${title || 'غير معروف'}

📜 آخر الإجراءات:
${memory.actionHistory?.slice(-5).map(a => `  • ${a}`).join('\n') || 'لا توجد إجراءات سابقة'}

${isGoogleSearch ? `
⚠️ أنت على صفحة نتائج Google!
- لا تستمر في التمرير!
- اختر أفضل نتيجة واضغط عليها
- تجنب الإعلانات (تكون في الأعلى مع علامة "Ad")
- أول نتيجة عادية غالباً عند y=280 تقريباً
` : ''}

${isGoogleHome ? `
⚠️ أنت على صفحة Google الرئيسية!
- اكتب في مربع البحث
- مربع البحث غالباً في منتصف الصفحة عند x=640, y=340
` : ''}

📄 محتوى الصفحة (جزء):
${pageText?.substring(0, 1000) || 'غير متاح'}

═══════════════════════════════════════════
📌 قواعد مهمة:
1. لا تكرر نفس الإجراء مرتين متتاليتين
2. إذا عملت scroll 3 مرات، جرب شيء آخر
3. إذا وجدت المعلومات المطلوبة، استخرجها وأنهي المهمة
4. كن دقيقاً في تحديد إحداثيات النقر
5. إذا واجهت مشكلة، جرب حل بديل
═══════════════════════════════════════════

أجب بـ JSON فقط:
{
    "observation": "وصف دقيق لما أراه على الشاشة",
    "thinking": "تحليلي للموقف وقراري",
    "action": {
        "type": "click|type|scroll|goto|pressKey|done",
        "selector": "input[name='q']",  // CSS selector للعنصر (الأفضل)
        "x": 400,                         // إحداثيات بديلة لو الـ selector فشل
        "y": 300,
        "text": "نص للكتابة",
        "submit": true,  // للضغط على Enter بعد الكتابة
        "description": "وصف الإجراء بالعربية"
    },
    "taskComplete": false,
    "result": "النتيجة النهائية"
}`;

    // Try vision first if screenshot available
    if (screenshot) {
        const visionResult = await callVisionAI(prompt, screenshot);
        if (visionResult) {
            return visionResult;
        }
    }

    // Fallback to text
    const textResult = await callTextAI(prompt);
    if (textResult) {
        try {
            return JSON.parse(textResult);
        } catch (e) {
            return createFallbackAction("تحليل النص");
        }
    }

    return createFallbackAction("جميع النماذج مشغولة");
}

function createFallbackAction(reason) {
    return {
        observation: reason,
        thinking: "حدثت مشكلة، سأحاول مرة أخرى",
        action: { type: 'wait', duration: 3000, description: `انتظار - ${reason}` },
        taskComplete: false
    };
}

// ============================================
// AI CALLING FUNCTIONS
// ============================================
async function callVisionAI(prompt, screenshot) {
    const keys = getOpenRouterKeys();
    if (keys.length === 0) return null;

    for (const model of VISION_MODELS) {
        const apiKey = keys[(keyIndex++) % keys.length];
        const modelName = model.split('/')[1]?.split(':')[0] || model;

        try {
            console.log(`[Agent] Trying ${modelName} (vision)...`);

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://luks-pied.vercel.app',
                    'X-Title': 'Lukas Agent'
                },
                body: JSON.stringify({
                    model,
                    messages: [{
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${screenshot}` } }
                        ]
                    }],
                    max_tokens: 1500
                })
            });

            if (response.status === 429) {
                console.log(`[Agent] ${modelName} rate limited`);
                continue;
            }

            const data = await response.json();
            return parseAIResponse(data);

        } catch (error) {
            console.log(`[Agent] ${modelName} error: ${error.message}`);
        }
    }
    return null;
}

async function callTextAI(prompt) {
    const keys = getOpenRouterKeys();
    if (keys.length === 0) return null;

    for (const model of TEXT_MODELS) {
        const apiKey = keys[(keyIndex++) % keys.length];
        const modelName = model.split('/')[1]?.split(':')[0] || model;

        try {
            console.log(`[Agent] Trying ${modelName} (text)...`);

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://luks-pied.vercel.app',
                    'X-Title': 'Lukas Agent'
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 1500
                })
            });

            if (response.status === 429) {
                console.log(`[Agent] ${modelName} rate limited`);
                continue;
            }

            const data = await response.json();
            if (data.choices?.[0]?.message?.content) {
                return data.choices[0].message.content;
            }

        } catch (error) {
            console.log(`[Agent] ${modelName} error: ${error.message}`);
        }
    }
    return null;
}

function parseAIResponse(data) {
    if (data.choices?.[0]?.message?.content) {
        const content = data.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (e) {
                console.log('[Agent] JSON parse error');
            }
        }
    }
    return null;
}
