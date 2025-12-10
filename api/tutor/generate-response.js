// Tutor Generate Response API - uses gemini-2.5-flash-lite
const MODELS = {
    PRIMARY: 'gemini-2.5-flash-lite',
    FALLBACK: 'gemini-2.5-flash'
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

    if ((response.status === 429 || response.status === 404 || response.status === 503) && model === MODELS.PRIMARY) {
        return callGeminiAPI(prompt, apiKey, MODELS.FALLBACK);
    }

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${model} error ${response.status}: ${errorText.substring(0, 200)}`);
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
        const { history, userMessage, level } = req.body || {};

        const apiKey = getNextKey();
        if (!apiKey) {
            res.status(500).json({ success: false, error: 'No API keys available' });
            return;
        }

        const levelGuide = {
            'A1': 'Use very simple words and short sentences.',
            'A2': 'Use simple vocabulary and basic grammar.',
            'B1': 'Use everyday vocabulary with moderate complexity.',
            'B2': 'Use varied vocabulary and complex sentences.',
            'C1': 'Use advanced vocabulary and sophisticated structures.'
        };

        const tutorPrompt = `You are Lukas (لوكاس), a friendly English tutor.
Never mention Google, Gemini, or technical details.

Level: ${level || 'B1'} - ${levelGuide[level] || levelGuide['B1']}

${history?.map(h => `${h.role === 'user' ? 'Student' : 'Lukas'}: ${h.content}`).join('\n') || ''}

Student: ${userMessage}

Respond as Lukas. Correct mistakes gently, keep responses concise.`;

        const responseText = await callGeminiAPI(tutorPrompt, apiKey);

        res.status(200).json({ success: true, data: responseText });
    } catch (error) {
        console.error('[Tutor Generate] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
