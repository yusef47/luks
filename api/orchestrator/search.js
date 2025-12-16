// Search API - COMPLETE MULTI-MODEL FALLBACK

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
                body: JSON.stringify({ model: GROQ_MODELS[0], messages: [{ role: 'user', content: prompt }], max_tokens: 3000 })
            });
            if (res.ok) {
                const d = await res.json();
                if (d.choices?.[0]?.message?.content) return d.choices[0].message.content;
            }
        } catch (e) { }
    }
    return null;
}

async function callGeminiWithSearch(task) {
    const keys = getGeminiKeys();
    for (const model of GEMINI_MODELS) {
        for (let i = 0; i < 5; i++) {
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': keys[geminiIdx++ % keys.length] },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: `ابحث وقدم معلومات دقيقة ومفصلة عن: ${task}` }] }],
                        tools: [{ googleSearch: {} }]
                    })
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

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        const { task } = req.body || {};
        if (!task) return res.status(400).json({ success: false, error: 'Missing task' });

        // Try Gemini with search first (has real search), fallback to Groq
        let result = await callGeminiWithSearch(task);
        if (!result) result = await callGroq(`ابحث وقدم معلومات دقيقة ومفصلة عن: ${task}`);
        if (!result) throw new Error('All APIs failed');

        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
