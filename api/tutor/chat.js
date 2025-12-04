// Tutor Chat API - with gemini-3-pro and Lukas identity
const MODELS = {
    PRIMARY: 'gemini-3-pro',
    FALLBACK_1: 'gemini-2.5-flash-preview-05-20',
    FALLBACK_2: 'gemini-2.0-flash'
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

async function callGeminiAPI(prompt, apiKey, model = MODELS.PRIMARY) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        })
    });

    if (response.status === 429 || response.status === 404 || response.status === 503) {
        if (model === MODELS.PRIMARY) {
            return callGeminiAPI(prompt, apiKey, MODELS.FALLBACK_1);
        } else if (model === MODELS.FALLBACK_1) {
            return callGeminiAPI(prompt, apiKey, MODELS.FALLBACK_2);
        }
    }

    if (!response.ok) {
        throw new Error(`API error ${response.status}`);
    }

    const data = await response.json();
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
        const { history, message, level } = req.body || {};

        const apiKey = getNextKey();
        if (!apiKey) {
            res.status(500).json({ success: false, error: 'No API keys available' });
            return;
        }

        const tutorPrompt = `You are Lukas, a friendly English tutor. 
Your name is Lukas - never mention Google, Gemini, or technical details.
Level: ${level || 'B1'}

${history?.map(h => `${h.role}: ${h.content}`).join('\n') || ''}

Student: ${message}

Respond naturally as Lukas the tutor. Correct mistakes gently, encourage the student.`;

        const responseText = await callGeminiAPI(tutorPrompt, apiKey);

        res.status(200).json({ success: true, data: responseText });
    } catch (error) {
        console.error('[Tutor Chat] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
