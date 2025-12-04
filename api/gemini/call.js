// Collect API Keys from environment
function getAPIKeys() {
    const keys = [];
    for (let i = 1; i <= 13; i++) {
        const key = process.env[`GEMINI_API_KEY_${i}`];
        if (key && key.trim().length > 0) {
            keys.push(key.trim());
        }
    }
    // Also check for single GEMINI_API_KEY
    if (process.env.GEMINI_API_KEY) {
        keys.push(process.env.GEMINI_API_KEY.trim());
    }
    return keys;
}

let keyIndex = 0;
const API_KEYS = getAPIKeys();

function getNextKey() {
    if (API_KEYS.length === 0) {
        return null;
    }
    const key = API_KEYS[keyIndex % API_KEYS.length];
    keyIndex = (keyIndex + 1) % API_KEYS.length;
    return key;
}

// Model mapping
const MODEL_MAP = {
    'gemini-2.0-flash-lite': 'gemini-2.0-flash',
    'gemini-2.5-flash-live': 'gemini-2.5-flash-preview-05-20',
    'gemini-2.5-flash': 'gemini-2.5-flash-preview-05-20',
    'gemini-2.5-pro': 'gemini-2.5-pro-preview-05-06',
    'gemini-2.5-flash-image': 'gemini-2.0-flash'
};

async function callGeminiAPI(model, prompt, apiKey) {
    // Map model name to actual API model
    const actualModel = MODEL_MAP[model] || model;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${actualModel}:generateContent`;

    const payload = {
        contents: [{
            role: 'user',
            parts: [{
                text: prompt
            }]
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
        throw new Error(`Gemini API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

module.exports = async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only POST allowed
    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }

    try {
        const { model, prompt } = req.body;

        if (!prompt) {
            res.status(400).json({ success: false, error: 'Missing prompt' });
            return;
        }

        const apiKey = getNextKey();
        if (!apiKey) {
            console.error('ERROR: No API keys configured');
            res.status(500).json({ success: false, error: 'No API keys available. Check environment variables.' });
            return;
        }

        console.log(`[Gemini Call] Model: ${model}, Using key index: ${keyIndex}`);

        const responseText = await callGeminiAPI(model || 'gemini-2.5-flash', prompt, apiKey);

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
