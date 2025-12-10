// Intermediate API - uses gemini-2.5-flash-lite for fast processing
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

// Truncate text to avoid token limits
function truncateText(text, maxLength = 8000) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '\n\n[... محتوى مختصر ...]';
}

async function callGeminiAPI(prompt, apiKey, model = MODELS.PRIMARY) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    console.log(`[Intermediate] Using ${model}...`);

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
        console.log(`[Intermediate] Fallback to ${MODELS.FALLBACK}...`);
        return callGeminiAPI(prompt, apiKey, MODELS.FALLBACK);
    }

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Intermediate] API Error: ${response.status} - ${errorText.substring(0, 300)}`);
        throw new Error(`${model} error ${response.status}`);
    }

    const data = await response.json();
    console.log(`[Intermediate] SUCCESS with ${model}!`);
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
        const { task, prompt, results } = req.body || {};

        const apiKey = getNextKey();
        if (!apiKey) {
            res.status(500).json({ success: false, error: 'No API keys available' });
            return;
        }

        // Truncate prompt and results to avoid token limits
        const truncatedPrompt = truncateText(prompt, 6000);
        const truncatedResults = results ? truncateText(JSON.stringify(results), 2000) : '[]';

        const intermediatePrompt = `أنت لوكاس (Lukas). نفذ هذه الخطوة بدقة.

المهمة: ${task}
طلب المستخدم: ${truncatedPrompt}
النتائج السابقة: ${truncatedResults}

قدم إجابة دقيقة ومفيدة. لا تذكر Google أو Gemini أبداً.`;

        console.log(`[Intermediate] Prompt length: ${intermediatePrompt.length} chars`);

        const responseText = await callGeminiAPI(intermediatePrompt, apiKey);

        res.status(200).json({ success: true, data: responseText });
    } catch (error) {
        console.error('[Intermediate] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
