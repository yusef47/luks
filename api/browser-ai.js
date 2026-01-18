/**
 * Browser AI API Endpoint
 * Receives screenshots from extension and returns AI actions
 * Uses OpenRouter Vision Models with Text-Only Fallback
 */

const VISION_MODELS = [
    'google/gemma-3-27b-it:free',           // Confirmed working
    'google/gemma-3-12b-it:free',
];

// Text-only models as fallback (confirmed working from activity)
const TEXT_MODELS = [
    'deepseek/deepseek-r1-0528:free',       // Confirmed working!
    'xiaomi/mimo-v2-flash:free',            // Confirmed working!
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
        const { task, screenshot, url, title, pageText, previousSteps = [], clickableElements = [] } = req.body;

        if (!task) {
            return res.status(400).json({ error: 'Missing task' });
        }

        console.log(`[BrowserAI] Task: "${task.substring(0, 50)}..."`);
        console.log(`[BrowserAI] URL: ${url}`);

        const stepHistory = previousSteps.map((s, i) =>
            `Step ${i + 1}: ${s.action} - ${s.description || ''}`
        ).join('\n');

        // Try Vision AI first (with screenshot)
        if (screenshot) {
            const visionResult = await callVisionAI(task, screenshot, url, title, pageText, stepHistory);
            if (visionResult) {
                console.log(`[BrowserAI] ✅ Vision mode success`);
                return res.status(200).json(visionResult);
            }
        }

        // Fallback to Text-Only AI
        console.log(`[BrowserAI] Falling back to text-only mode...`);
        const textResult = await callTextAI(task, url, title, pageText, stepHistory, clickableElements);

        if (textResult) {
            console.log(`[BrowserAI] ✅ Text-only mode success`);
            return res.status(200).json(textResult);
        }

        // All failed
        return res.status(200).json({
            observation: 'فشل التحليل',
            thinking: 'جميع الموديلات مشغولة',
            action: { type: 'wait', duration: 5000, description: 'انتظار - جاري إعادة المحاولة' },
            taskComplete: false
        });

    } catch (error) {
        console.error('[BrowserAI] Error:', error);
        res.status(500).json({ error: error.message });
    }
}

// Vision AI (with screenshot)
async function callVisionAI(task, screenshot, url, title, pageText, stepHistory) {
    const keys = getOpenRouterKeys();
    if (keys.length === 0) return null;

    const prompt = buildPrompt(task, url, title, pageText, stepHistory, true);

    for (const model of VISION_MODELS) {
        const apiKey = keys[(keyIndex++) % keys.length];
        const modelName = model.split('/')[1]?.split(':')[0] || model;

        try {
            console.log(`[BrowserAI] Trying ${modelName} (vision)...`);

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://luks-pied.vercel.app',
                    'X-Title': 'Lukas Browser AI'
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
                    max_tokens: 1000
                })
            });

            if (response.status === 429) {
                console.log(`[BrowserAI] ${modelName} rate limited`);
                continue;
            }

            const data = await response.json();
            const result = parseAIResponse(data);
            if (result) return result;

        } catch (error) {
            console.log(`[BrowserAI] ${modelName} error: ${error.message}`);
        }
    }
    return null;
}

// Text-Only AI (no screenshot)
async function callTextAI(task, url, title, pageText, stepHistory, clickableElements) {
    const keys = getOpenRouterKeys();
    if (keys.length === 0) return null;

    const elementsText = clickableElements.slice(0, 20).map((el, i) =>
        `[${i}] ${el.tag}: "${el.text}" at (${el.x}, ${el.y})`
    ).join('\n');

    const prompt = buildPrompt(task, url, title, pageText, stepHistory, false, elementsText);

    for (const model of TEXT_MODELS) {
        const apiKey = keys[(keyIndex++) % keys.length];
        const modelName = model.split('/')[1]?.split(':')[0] || model;

        try {
            console.log(`[BrowserAI] Trying ${modelName} (text-only)...`);

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://luks-pied.vercel.app',
                    'X-Title': 'Lukas Browser AI'
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 1000
                })
            });

            if (response.status === 429) {
                console.log(`[BrowserAI] ${modelName} rate limited`);
                continue;
            }

            const data = await response.json();
            const result = parseAIResponse(data);
            if (result) return result;

        } catch (error) {
            console.log(`[BrowserAI] ${modelName} error: ${error.message}`);
        }
    }
    return null;
}

function buildPrompt(task, url, title, pageText, stepHistory, isVision, elementsText = '') {
    return `أنت وكيل متصفح ذكي. ${isVision ? 'انظر للصورة المرفقة.' : 'اقرأ محتوى الصفحة التالي.'}

المهمة: ${task}
الرابط: ${url || 'غير معروف'}
العنوان: ${title || 'غير معروف'}

الخطوات السابقة:
${stepHistory || 'لا توجد'}

${elementsText ? `العناصر القابلة للنقر:\n${elementsText}` : ''}

محتوى الصفحة:
${pageText?.substring(0, 2000) || 'غير متاح'}

أجب بـ JSON فقط:
{
    "observation": "ما تراه",
    "thinking": "تفكيرك",
    "action": {
        "type": "click|type|scroll|goto|wait|pressKey|done",
        "x": 500, "y": 300,
        "text": "للكتابة",
        "url": "للانتقال",
        "direction": "up|down",
        "key": "Enter|Tab",
        "description": "وصف بالعربية"
    },
    "taskComplete": false,
    "result": "النتيجة إذا اكتمل"
}`;
}

function parseAIResponse(data) {
    if (data.choices?.[0]?.message?.content) {
        const content = data.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (e) {
                console.log('[BrowserAI] JSON parse error');
            }
        }
    }
    if (data.error) {
        console.log(`[BrowserAI] API error: ${data.error.message?.substring(0, 80)}`);
    }
    return null;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
