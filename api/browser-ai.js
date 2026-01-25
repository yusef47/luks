/**
 * Lukas Advanced Browser Agent API
 * Features: Rich Reports, Data Extraction, Complex Tasks, Memory
 */

const MODELS = [
    'google/gemini-2.0-flash-exp:free',
    'deepseek/deepseek-r1-0528:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'qwen/qwen-2.5-vl-7b-instruct:free',
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
            url,
            title,
            pageText,
            htmlStructure = [],
            extractedData = {},
            previousSteps = [],
            memory = {},
            isFirstStep = false
        } = req.body;

        if (!task) {
            return res.status(400).json({ error: 'Missing task' });
        }

        console.log(`[Agent] Task: "${task.substring(0, 50)}..."`);
        console.log(`[Agent] URL: ${url}`);
        console.log(`[Agent] Step: ${previousSteps.length + 1}`);
        console.log(`[Agent] Elements: ${htmlStructure?.length || 0}`);
        console.log(`[Agent] Extracted: ${JSON.stringify(extractedData).substring(0, 100)}`);

        // Build comprehensive prompt
        const prompt = buildAdvancedPrompt({
            task,
            url,
            title,
            pageText,
            htmlStructure,
            extractedData,
            previousSteps,
            memory
        });

        // Call AI
        const result = await callAI(prompt);

        if (result) {
            console.log(`[Agent] ✅ Action: ${result.action?.type} - ${result.action?.description}`);

            // Ensure proper response structure
            res.status(200).json({
                ...result,
                memory: {
                    ...memory,
                    findings: [...(memory.findings || []), ...(result.newFindings || [])],
                    extractedData: { ...(memory.extractedData || {}), ...(result.extractedData || {}) }
                }
            });
        } else {
            res.status(200).json(createFallback("AI unavailable"));
        }

    } catch (error) {
        console.error('[Agent] Error:', error);
        res.status(500).json({ error: error.message });
    }
}

function buildAdvancedPrompt({ task, url, title, pageText, htmlStructure, extractedData, previousSteps, memory }) {
    const isGoogleHome = url?.includes('google.com') && !url?.includes('/search');
    const isGoogleSearch = url?.includes('google.com/search');
    const isProductPage = pageText?.includes('price') || pageText?.includes('سعر') || pageText?.includes('ريال');

    // Format elements
    const elements = (htmlStructure || []).slice(0, 25).map((el, i) =>
        `[${i}] <${el.tag}> "${el.text?.substring(0, 40) || ''}" ${el.selector ? `selector="${el.selector}"` : ''}`
    ).join('\n');

    // Format previous findings
    const findings = memory.findings?.slice(-5).join('\n') || 'لا توجد';

    return `أنت Lukas Agent - وكيل متصفح ذكي متقدم يمكنه:
- إجراء بحث معقد متعدد الخطوات
- استخراج البيانات (أسعار، تقييمات، أسماء)
- المقارنة بين الخيارات
- تقديم تقارير غنية

═════════════════════════════════════
🎯 المهمة: ${task}
═════════════════════════════════════

🌐 الصفحة الحالية:
- URL: ${url}
- العنوان: ${title || 'غير معروف'}

📊 البيانات المستخرجة حتى الآن:
${JSON.stringify(extractedData, null, 2) || 'لا توجد'}

💡 المعلومات المكتشفة:
${findings}

📋 العناصر التفاعلية:
${elements || 'لا توجد'}

📜 الخطوات السابقة (${previousSteps.length}):
${previousSteps.slice(-5).map(s => `• ${s.action}: ${s.description}`).join('\n') || 'لا توجد'}

📄 محتوى الصفحة:
${pageText?.substring(0, 1500) || 'غير متاح'}

═════════════════════════════════════
📌 تعليمات مهمة:

${isGoogleHome ? `🔍 أنت على Google الرئيسية - اكتب البحث في input[name="q"] مع submit: true` : ''}
${isGoogleSearch ? `📋 أنت على نتائج البحث - اختر أفضل نتيجة واضغط عليها (تجنب الإعلانات)` : ''}
${isProductPage ? `💰 صفحة منتج/فندق - استخرج الأسعار والتقييمات والأسماء` : ''}

1. استخرج أي بيانات مفيدة من الصفحة (أسعار، أسماء، تقييمات)
2. إذا وجدت معلومات كافية، أنهِ المهمة بتقرير شامل
3. إذا كنت تحتاج مزيد من المعلومات، تنقل لصفحة أخرى
4. استخدم CSS selectors دائماً
═════════════════════════════════════

أجب بـ JSON فقط:
{
    "thinking": "تحليلي للموقف والخطة",
    "action": {
        "type": "type|click|scroll|goto|done",
        "selector": "CSS selector",
        "text": "نص للكتابة",
        "submit": true,
        "description": "وصف الإجراء"
    },
    "newFindings": ["معلومة جديدة 1", "معلومة 2"],
    "extractedData": {
        "prices": ["سعر 1", "سعر 2"],
        "names": ["اسم 1", "اسم 2"],
        "ratings": ["تقييم 1"]
    },
    "progress": "نسبة التقدم ووصف",
    "taskComplete": false,
    "result": "النتيجة النهائية (عند الانتهاء)",
    "summary": "ملخص شامل (عند الانتهاء)",
    "recommendation": "التوصية (عند الانتهاء)"
}`;
}

async function callAI(prompt) {
    const keys = getOpenRouterKeys();
    if (keys.length === 0) {
        console.log('[Agent] No API keys!');
        return null;
    }

    for (const model of MODELS) {
        const apiKey = keys[(keyIndex++) % keys.length];
        const modelName = model.split('/')[1]?.split(':')[0] || model;

        try {
            console.log(`[Agent] Trying ${modelName}...`);

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
                    max_tokens: 1500,
                    temperature: 0.3
                })
            });

            if (response.status === 429) {
                console.log(`[Agent] ${modelName} rate limited`);
                continue;
            }

            const data = await response.json();

            if (data.choices?.[0]?.message?.content) {
                const content = data.choices[0].message.content;
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        const parsed = JSON.parse(jsonMatch[0]);
                        console.log(`[Agent] ${modelName} success!`);
                        return parsed;
                    } catch (e) {
                        console.log(`[Agent] ${modelName} JSON parse error`);
                    }
                }
            }

        } catch (error) {
            console.log(`[Agent] ${modelName} error:`, error.message);
        }
    }

    return null;
}

function createFallback(reason) {
    return {
        thinking: reason,
        action: {
            type: 'wait',
            duration: 2000,
            description: 'انتظار - ' + reason
        },
        taskComplete: false
    };
}
