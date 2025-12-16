// AUTONOMOUS AGENT - Complete System with Gemini Reviewer

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
const GROQ_MODELS = ['qwen-2.5-32b', 'gpt-oss-120b', 'gemma2-9b-it', 'llama-3.3-70b-versatile'];

function getGroqKeys() {
    const keys = [];
    for (let i = 1; i <= 10; i++) {
        const key = process.env[`GROQ_API_KEY_${i}`];
        if (key && key.trim()) keys.push(key.trim());
    }
    return keys;
}

function getGeminiKeys() {
    const keys = [];
    for (let i = 1; i <= 15; i++) {
        const key = process.env[`GEMINI_API_KEY_${i}`];
        if (key && key.trim()) keys.push(key.trim());
    }
    if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY.trim());
    return keys.sort(() => Math.random() - 0.5);
}

let geminiIdx = 0, groqIdx = 0;

// ═══════════════════════════════════════════════════════════════
//                    GEMINI API
// ═══════════════════════════════════════════════════════════════

async function callGemini(prompt, maxTokens = 8000) {
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
                        generationConfig: { maxOutputTokens: maxTokens }
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

async function callGeminiWithSearch(prompt) {
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
                        tools: [{ googleSearch: {} }],
                        generationConfig: { maxOutputTokens: 8000 }
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

// ═══════════════════════════════════════════════════════════════
//                    GROQ API
// ═══════════════════════════════════════════════════════════════

async function callGroq(prompt) {
    const keys = getGroqKeys();
    if (keys.length === 0) return null;

    for (const model of GROQ_MODELS) {
        for (let i = 0; i < 2; i++) {
            try {
                const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${keys[groqIdx++ % keys.length]}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 4000 })
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

// ═══════════════════════════════════════════════════════════════
//                    GEMINI REVIEWER
// ═══════════════════════════════════════════════════════════════

async function geminiReviewer(response, question) {
    const reviewPrompt = `راجع وحسّن هذه الإجابة:
- احذف الكلمات الغريبة (صينية/روسية/فيتنامية)
- صحح الأخطاء الإملائية
- حسّن الصياغة

السؤال: ${question.substring(0, 300)}
الإجابة: ${response}

قدم الإجابة المحسّنة فقط:`;

    const reviewed = await callGemini(reviewPrompt, 8000);
    return reviewed || response;
}

// ═══════════════════════════════════════════════════════════════
//                    HYBRID RESEARCH
// ═══════════════════════════════════════════════════════════════

async function runHybridResearch(prompt) {
    console.log('[Autonomous] 🧠 Step 1: Gemini with search...');
    let result = await callGeminiWithSearch(prompt);

    if (result) {
        console.log('[Autonomous] ✅ Gemini answered');
        return result;
    }

    console.log('[Autonomous] ⚡ Step 2: Groq fallback...');
    result = await callGroq(prompt);

    if (result) {
        console.log('[Autonomous] 🔍 Step 3: Gemini review...');
        result = await geminiReviewer(result, prompt);
        return result;
    }

    return null;
}

// ═══════════════════════════════════════════════════════════════
//                    SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `أنت لوكاس، وكيل ذكاء اصطناعي متطور يعمل بشكل مستقل.

مهامك:
- البحث العميق عن المعلومات
- تحليل البيانات بدقة
- تقديم إجابات شاملة ومفصلة
- استخدام العربية الفصحى السليمة فقط

قواعد صارمة:
- لا تذكر Google, Gemini, Meta, Llama, Groq
- لا تستخدم كلمات غير عربية أو إنجليزية
- مطورك: شخص مصري ذكي ومبدع`;

// ═══════════════════════════════════════════════════════════════
//                    DATA EXTRACTION
// ═══════════════════════════════════════════════════════════════

function extractChartData(content, chartType) {
    try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            if (data.labels && data.data) return data;
        }

        // Simple fallback
        return {
            labels: ['Item 1', 'Item 2', 'Item 3', 'Item 4'],
            data: [25, 30, 20, 25],
            title: chartType === 'comparison' ? 'Comparison' : 'Data'
        };
    } catch {
        return {
            labels: ['A', 'B', 'C', 'D'],
            data: [25, 30, 20, 25],
            title: 'Data'
        };
    }
}

function detectChartType(content) {
    const c = content.toLowerCase();
    if (c.includes('timeline') || c.includes('تطور')) return 'timeline';
    if (c.includes('compare') || c.includes('مقارن')) return 'comparison';
    if (c.includes('percent') || c.includes('نسب')) return 'pie';
    return 'bar';
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
        const { prompt, task, generateChart, chartType, conversationHistory } = req.body || {};
        const userPrompt = prompt || task;

        if (!userPrompt) return res.status(400).json({ success: false, error: 'Missing prompt' });

        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`[Autonomous] 🚀 Starting research: "${userPrompt.substring(0, 50)}..."`);
        console.log('═══════════════════════════════════════════════════════════════');

        let contextString = '';
        if (conversationHistory && conversationHistory.length > 0) {
            contextString = '\n\nالمحادثة السابقة:\n' +
                conversationHistory.slice(-3).map(h =>
                    `المستخدم: ${h.prompt}\nلوكاس: ${h.results?.[0]?.result || ''}`
                ).join('\n\n');
        }

        const now = new Date();
        const timeString = now.toLocaleString('ar-EG', {
            timeZone: 'Africa/Cairo',
            weekday: 'long', year: 'numeric', month: 'long',
            day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const fullPrompt = SYSTEM_PROMPT +
            `\n\nالوقت: ${timeString}` +
            contextString +
            `\n\nالمهمة: ${userPrompt}` +
            (generateChart ?
                `\n\nأضف بيانات للرسم البياني بصيغة JSON:
{"labels": [...], "data": [...], "title": "..."}` : '');

        const response = await runHybridResearch(fullPrompt);

        if (!response) {
            throw new Error('All APIs failed');
        }

        console.log(`[Autonomous] ✅ Done (${response.length} chars)`);

        const result = {
            success: true,
            data: response
        };

        if (generateChart) {
            const detectedType = chartType || detectChartType(response);
            result.chartData = extractChartData(response, detectedType);
            result.chartType = detectedType;
        }

        res.status(200).json(result);

    } catch (error) {
        console.error('[Autonomous] ❌ Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
