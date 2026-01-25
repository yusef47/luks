/**
 * Lukas Browser AI - HTML Analysis Agent
 * Uses DOM structure analysis instead of vision for reliable execution
 */

const TEXT_MODELS = [
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

        // Detect page context
        const isGoogleHome = url?.includes('google.com') && !url?.includes('/search');
        const isGoogleSearch = url?.includes('google.com/search');

        // Build action decision prompt
        const prompt = buildPrompt({
            task,
            url,
            title,
            pageText,
            htmlStructure,
            previousSteps,
            isGoogleHome,
            isGoogleSearch
        });

        // Call AI
        const result = await callAI(prompt);

        if (result) {
            console.log(`[Agent] ✅ Action: ${result.action?.type} - ${result.action?.description}`);
            res.status(200).json(result);
        } else {
            console.log(`[Agent] ⚠️ No response, using fallback`);
            res.status(200).json(createFallback("AI unavailable"));
        }

    } catch (error) {
        console.error('[Agent] Error:', error);
        res.status(500).json({ error: error.message });
    }
}

function buildPrompt({ task, url, title, pageText, htmlStructure, previousSteps, isGoogleHome, isGoogleSearch }) {
    // Format interactive elements
    const elements = (htmlStructure || []).slice(0, 20).map((el, i) =>
        `[${i}] <${el.tag}> "${el.text?.substring(0, 30) || ''}" ${el.tag === 'input' ? `type="${el.type || 'text'}"` : ''}`
    ).join('\n');

    return `أنت Lukas Agent - وكيل متصفح يتحكم في المتصفح عبر تحليل HTML.

═════════════════════════════════════
🎯 المهمة: ${task}
═════════════════════════════════════

🌐 الصفحة الحالية:
- URL: ${url}
- العنوان: ${title || 'غير معروف'}

📋 العناصر التفاعلية المتاحة:
${elements || 'لا توجد عناصر'}

📜 آخر الإجراءات:
${previousSteps.slice(-5).map(s => `• ${s.action}: ${s.description}`).join('\n') || 'لا توجد'}

${isGoogleHome ? `
⚠️ أنت على صفحة Google الرئيسية!
- استخدم selector: input[name="q"] للكتابة في البحث
- بعد الكتابة، اضبط submit: true للبحث
` : ''}

${isGoogleSearch ? `
⚠️ أنت على صفحة نتائج Google!
- اختر أفضل نتيجة واضغط عليها
- استخدم selector للرابط: h3 أو a[href]
` : ''}

📄 محتوى الصفحة (جزء):
${pageText?.substring(0, 800) || 'غير متاح'}

═════════════════════════════════════
📌 قواعد:
1. استخدم CSS selectors دائماً (أفضل من الإحداثيات)
2. للبحث في Google: selector = "input[name='q']", submit = true
3. للضغط على نتيجة: selector = "h3" أو رقم العنصر
4. لا تكرر نفس الإجراء
═════════════════════════════════════

أجب بـ JSON فقط:
{
    "thinking": "تحليلي للموقف",
    "action": {
        "type": "type",
        "selector": "input[name='q']",
        "text": "نص البحث",
        "submit": true,
        "description": "وصف الإجراء"
    },
    "taskComplete": false
}

أنواع الإجراءات:
- type: للكتابة (يحتاج selector, text, submit)
- click: للضغط (يحتاج selector)
- scroll: للتمرير (direction: up/down)
- goto: للانتقال (url)
- done: المهمة اكتملت (result)`;
}

async function callAI(prompt) {
    const keys = getOpenRouterKeys();
    if (keys.length === 0) {
        console.log('[Agent] No API keys!');
        return null;
    }

    for (const model of TEXT_MODELS) {
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
                    max_tokens: 1000,
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
            type: 'type',
            selector: "input[name='q']",
            text: 'افضل فنادق في دبي',
            submit: true,
            description: 'محاولة بحث افتراضية'
        },
        taskComplete: false
    };
}
