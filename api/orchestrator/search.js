// Search API - Gemini with Google Search + Groq fallback

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
const GROQ_MODELS = ['qwen-2.5-32b', 'gpt-oss-120b', 'llama-3.3-70b-versatile'];

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

async function searchWithGemini(query) {
    const keys = getGeminiKeys();
    if (keys.length === 0) return null;

    for (const model of GEMINI_MODELS) {
        for (let i = 0; i < 3; i++) {
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': keys[geminiIdx++ % keys.length] },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: query }] }],
                        tools: [{ googleSearch: {} }],
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

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        const { query, task } = req.body || {};
        const searchQuery = query || task;
        if (!searchQuery) return res.status(400).json({ success: false, error: 'Missing query' });

        console.log('[Search] 🔍 Searching with Gemini...');
        let result = await searchWithGemini(searchQuery);

        if (!result) {
            console.log('[Search] ⚡ Trying Groq...');
            result = await callGroq(searchQuery);
        }

        if (!result) {
            result = /[\u0600-\u06FF]/.test(searchQuery) ? 'لم يتم العثور على نتائج' : 'No results found';
        }

        res.status(200).json({ success: true, result });
    } catch (error) {
        console.error('[Search] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
