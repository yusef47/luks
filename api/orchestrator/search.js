// Search API - uses gemini-2.5-flash with Google Search
const MODELS = {
    PRIMARY: 'gemini-2.5-flash',
    FALLBACK: 'gemini-2.5-flash-lite'
};

function getAPIKeys() {
    const keys = [];
    for (let i = 1; i <= 13; i++) {
        const key = process.env[`GEMINI_API_KEY_${i}`];
        if (key && key.trim().length > 0) {
            keys.push(key.trim());
        }
    }
    if (process.env.GEMINI_API_KEY) {
        keys.push(process.env.GEMINI_API_KEY.trim());
    }
    return keys;
}

function getNextKey() {
    const keys = getAPIKeys();
    if (keys.length === 0) return null;
    return keys[Math.floor(Math.random() * keys.length)];
}

async function callGeminiWithSearch(task, apiKey, model = MODELS.PRIMARY) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    console.log(`[Search] Using ${model} with Google Search...`);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
            contents: [{
                role: 'user',
                parts: [{ text: `Search and provide accurate, detailed information about: ${task}. Include specific facts, current prices, distances, coordinates, and sources when available.` }]
            }],
            tools: [{ googleSearch: {} }]
        })
    });

    // Fallback if primary fails
    if ((response.status === 429 || response.status === 404 || response.status === 503) && model === MODELS.PRIMARY) {
        console.log(`[Search] ${model} failed, trying ${MODELS.FALLBACK}...`);
        return callGeminiWithSearch(task, apiKey, MODELS.FALLBACK);
    }

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${model} error ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    console.log(`[Search] SUCCESS with ${model}!`);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }

    try {
        const { task } = req.body || {};

        if (!task) {
            res.status(400).json({ success: false, error: 'Missing task' });
            return;
        }

        const apiKey = getNextKey();
        if (!apiKey) {
            res.status(500).json({ success: false, error: 'No API keys available' });
            return;
        }

        const result = await callGeminiWithSearch(task, apiKey);

        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('[Search] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
