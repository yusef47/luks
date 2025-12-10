// Intermediate API with Smart Fallback
const MODELS = {
    PRIMARY: 'gemini-2.5-flash-lite',
    FALLBACK_1: 'gemini-2.5-flash',
    FALLBACK_2: 'gemini-robotics-er-1.5-preview'
};

const ALL_MODELS = [MODELS.PRIMARY, MODELS.FALLBACK_1, MODELS.FALLBACK_2];

function getAPIKeys() {
    const keys = [];
    for (let i = 1; i <= 13; i++) {
        const key = process.env[`GEMINI_API_KEY_${i}`];
        if (key && key.trim().length > 0) keys.push(key.trim());
    }
    if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY.trim());
    return keys.sort(() => Math.random() - 0.5);
}

function truncateText(text, maxLength = 6000) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '\n[محتوى مختصر...]';
}

// Smart call that tries all keys and models
async function callGeminiAPI(prompt, maxRetries = 9) {
    const keys = getAPIKeys();
    if (keys.length === 0) throw new Error('No API keys');

    let lastError = null;
    let attempts = 0;

    for (const model of ALL_MODELS) {
        for (const apiKey of keys) {
            if (attempts >= maxRetries) break;
            attempts++;

            try {
                console.log(`[Intermediate] Attempt ${attempts}: ${model}`);

                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }]
                    })
                });

                if (response.status === 429) { lastError = new Error('Rate limit'); continue; }
                if (response.status === 404) { lastError = new Error('Model not found'); break; }
                if (!response.ok) { lastError = new Error(`Error ${response.status}`); continue; }

                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (!text) { lastError = new Error('Empty'); continue; }

                console.log(`[Intermediate] SUCCESS on attempt ${attempts}!`);
                return text;

            } catch (e) { lastError = e; continue; }
        }
    }
    throw lastError || new Error('All attempts failed');
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        const { task, prompt, results } = req.body || {};

        const truncatedPrompt = truncateText(prompt, 5000);
        const truncatedResults = results ? truncateText(JSON.stringify(results), 1500) : '[]';

        const intermediatePrompt = `أنت لوكاس. نفذ هذه المهمة بدقة:

المهمة: ${task}
الطلب: ${truncatedPrompt}
${truncatedResults !== '[]' ? `السياق: ${truncatedResults}` : ''}

قدم إجابة مفيدة وموجزة.`;

        const responseText = await callGeminiAPI(intermediatePrompt);
        res.status(200).json({ success: true, data: responseText });
    } catch (error) {
        console.error('[Intermediate] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}

