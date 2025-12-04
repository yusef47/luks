// Collect API Keys from environment
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
    console.log(`[Gemini Call] Found ${keys.length} API keys`);
    return keys;
}

function getNextKey() {
    const keys = getAPIKeys();
    if (keys.length === 0) {
        return null;
    }
    const idx = Math.floor(Math.random() * keys.length);
    return keys[idx];
}

// Model mapping - use stable model names
const MODEL_MAP = {
    'gemini-2.0-flash-lite': 'gemini-2.0-flash',
    'gemini-2.5-flash-live': 'gemini-2.0-flash',
    'gemini-2.5-flash': 'gemini-2.0-flash',
    'gemini-2.5-pro': 'gemini-2.0-flash',
    'gemini-2.5-flash-image': 'gemini-2.0-flash'
};

async function callGeminiAPI(model, prompt, apiKey) {
    const actualModel = MODEL_MAP[model] || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${actualModel}:generateContent`;

    console.log(`[Gemini Call] Using model: ${actualModel}`);

    const payload = {
        contents: [{
            role: 'user',
            parts: [{ text: prompt }]
        }]
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Gemini Call] API error: ${response.status}`);
        throw new Error(`Gemini API error ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

module.exports = async (req, res) => {
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

    console.log('[Gemini Call] Received request');

    try {
        const { model, prompt } = req.body || {};

        if (!prompt) {
            res.status(400).json({ success: false, error: 'Missing prompt' });
            return;
        }

        const apiKey = getNextKey();
        if (!apiKey) {
            console.error('[Gemini Call] No API keys configured');
            res.status(500).json({
                success: false,
                error: 'No API keys available. Add GEMINI_API_KEY to Vercel environment.'
            });
            return;
        }

        const responseText = await callGeminiAPI(model || 'gemini-2.0-flash', prompt, apiKey);

        res.status(200).json({
            success: true,
            data: responseText
        });
    } catch (error) {
        console.error('[Gemini Call] Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
};
