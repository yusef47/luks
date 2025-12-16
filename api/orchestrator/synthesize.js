// Synthesize API - With Gemini Reviewer
// Groq draft → Gemini review

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

async function geminiReviewer(response, question) {
    const reviewPrompt = `راجع وحسّن هذه الإجابة:
- احذف الكلمات الغريبة
- صحح الأخطاء
- حسّن الصياغة

السؤال: ${question.substring(0, 200)}
الإجابة: ${response}

قدم الإجابة المحسّنة فقط:`;

    const reviewed = await callGemini(reviewPrompt);
    return reviewed || response;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        const { results, originalPrompt } = req.body || {};
        if (!results || !originalPrompt) return res.status(400).json({ success: false, error: 'Missing data' });

        const lang = /[\u0600-\u06FF]/.test(originalPrompt) ? 'ar' : 'en';
        const resultsText = results.map((r, i) => `[${i + 1}] ${r.result || ''}`).join('\n\n');

        const synthesizePrompt = lang === 'ar' ?
            `أنت خبير في دمج المعلومات. اجمع هذه النتائج في إجابة شاملة ومتكاملة.

السؤال: ${originalPrompt}

النتائج:
${resultsText}

قدم إجابة نهائية شاملة ومنظمة:` :
            `Combine these results into a comprehensive answer.

Question: ${originalPrompt}
Results: ${resultsText}

Provide a final comprehensive answer:`;

        console.log('[Synthesize] 🧠 Trying Gemini...');
        let response = await callGemini(synthesizePrompt);

        if (!response) {
            console.log('[Synthesize] ⚡ Trying Groq...');
            response = await callGroq(synthesizePrompt);
            if (response) {
                console.log('[Synthesize] 🔍 Reviewing with Gemini...');
                response = await geminiReviewer(response, originalPrompt);
            }
        }

        if (!response) {
            response = lang === 'ar' ? 'عذراً، حدث خطأ في معالجة الطلب.' : 'Sorry, an error occurred.';
        }

        res.status(200).json({ success: true, data: response });
    } catch (error) {
        console.error('[Synthesize] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
