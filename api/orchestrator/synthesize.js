// Synthesize API - COMPLETE MULTI-MODEL FALLBACK

const GROQ_MODELS = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'qwen-qwq-32b',
    'llama-4-scout-17b-16e-instruct'
];

const GEMINI_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest'
];

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
    return keys.sort(() => Math.random() - 0.5);
}

let groqIdx = 0, geminiIdx = 0;

async function callGroq(prompt) {
    const keys = getGroqKeys();
    for (let i = 0; i < 8; i++) {
        try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${keys[groqIdx++ % keys.length]}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: GROQ_MODELS[i % 2], messages: [{ role: 'user', content: prompt }], max_tokens: 4000 })
            });
            if (res.ok) {
                const d = await res.json();
                if (d.choices?.[0]?.message?.content) return d.choices[0].message.content;
            }
        } catch (e) { }
    }
    return null;
}

async function callGemini(prompt) {
    const keys = getGeminiKeys();
    for (const model of GEMINI_MODELS) {
        for (let i = 0; i < 5; i++) {
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': keys[geminiIdx++ % keys.length] },
                    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] })
                });
                if (res.ok) {
                    const d = await res.json();
                    if (d.candidates?.[0]?.content?.parts?.[0]?.text) return d.candidates[0].content.parts[0].text;
                }
            } catch (e) { }
        }
    }
    return null;
}

function detectLanguage(text) {
    return /[\u0600-\u06FF]/.test(text) ? 'ar' : 'en';
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        const { prompt, results, conversationHistory } = req.body || {};
        const lang = detectLanguage(prompt);

        let ctx = '';
        if (conversationHistory?.length) {
            ctx = '\n\nسجل المحادثة:\n' + conversationHistory.slice(-3).map((h, i) =>
                `[${i + 1}] المستخدم: ${h.prompt}`).join('\n');
        }

        let resText = '';
        if (results?.length) {
            resText = '\n\nنتائج البحث:\n' + results.map((r, i) =>
                r.result ? `--- مصدر ${i + 1} ---\n${r.result}\n` : '').join('');
        }

        const fullPrompt = `أنت لوكاس (Lukas)، مساعد ذكي.
لو سُئلت عن مطورك: "مطوري شخص مصري ذكي ومبدع"
ممنوع ذكر Google, Gemini, OpenAI, Meta, Llama أو أي شركة.

${ctx}${resText}

السؤال: "${prompt}"

قدم إجابة ${lang === 'ar' ? 'عربية' : 'English'} شاملة ومفصلة:`;

        // Hybrid: Groq first, then Gemini enhance
        let response = await callGroq(fullPrompt);
        if (response) {
            const enhanced = await callGemini(`حسّن هذه الإجابة واجعلها أطول وأفضل:\n\n${response}`);
            if (enhanced) response = enhanced;
        } else {
            response = await callGemini(fullPrompt);
        }

        if (!response) throw new Error('All APIs failed');

        res.status(200).json({ success: true, data: response, model: 'hybrid' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
