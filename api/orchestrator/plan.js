// Plan API - HYBRID SYSTEM (Groq + Gemini)

const GROQ_MODELS = ['meta-llama/llama-3.3-70b-versatile', 'openai/gpt-oss-120b'];
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

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
                body: JSON.stringify({ model: GROQ_MODELS[i % 2], messages: [{ role: 'user', content: prompt }], max_tokens: 2000 })
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
        const { prompt, hasImage, hasVideo, history } = req.body || {};
        if (!prompt) return res.status(400).json({ success: false, error: 'Missing prompt' });

        const lang = detectLanguage(prompt);

        const planPrompt = `You are Lukas AI task planner.
USER LANGUAGE: ${lang === 'ar' ? 'Arabic' : 'English'}
Write task descriptions in user's language.

USER REQUEST: "${prompt}"

Return ONLY valid JSON:
{
  "plan": [
    {"step": 1, "agent": "SearchAgent", "task": "task description"},
    {"step": 2, "agent": "Orchestrator", "task": "synthesize"}
  ],
  "clarification": null
}`;

        // Try Groq first, fallback to Gemini
        let response = await callGroq(planPrompt);
        if (!response) response = await callGemini(planPrompt);
        if (!response) throw new Error('All APIs failed');

        let planData;
        try {
            planData = JSON.parse(response);
        } catch {
            const match = response.match(/\{[\s\S]*\}/);
            if (match) planData = JSON.parse(match[0]);
            else planData = {
                plan: [
                    { step: 1, agent: "SearchAgent", task: lang === 'ar' ? `البحث عن: ${prompt.slice(0, 50)}` : `Search: ${prompt.slice(0, 50)}` },
                    { step: 2, agent: "Orchestrator", task: lang === 'ar' ? "تقديم الإجابة" : "Provide answer" }
                ]
            };
        }

        res.status(200).json({ success: true, data: planData });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
