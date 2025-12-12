// Gemini Team - Ensemble AI System
// فريق Gemini للعمل بالتوازي (10 مفاتيح)

function getGeminiKeys() {
    const keys = [];
    for (let i = 1; i <= 15; i++) {
        const key = process.env[`GEMINI_API_KEY_${i}`];
        if (key) keys.push(key);
    }
    return keys;
}

const GEMINI_MODELS = [
    'gemini-2.5-flash-preview-05-20',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
];

let currentKeyIndex = 0;
let currentModelIndex = 0;

function getNextKey() {
    const keys = getGeminiKeys();
    if (keys.length === 0) return null;
    const key = keys[currentKeyIndex % keys.length];
    currentKeyIndex++;
    return key;
}

function getNextModel() {
    const model = GEMINI_MODELS[currentModelIndex % GEMINI_MODELS.length];
    currentModelIndex++;
    return model;
}

async function callGeminiAPI(prompt, maxRetries = 30) {
    let lastError = null;

    for (let i = 0; i < maxRetries; i++) {
        const apiKey = getNextKey();
        const model = getNextModel();

        if (!apiKey) {
            console.log('[Gemini Team] No API keys available');
            return null;
        }

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: {
                        maxOutputTokens: 8000
                    }
                })
            });

            if (response.status === 429 || response.status === 503) {
                console.log(`[Gemini Team] Rate limited (${response.status}), trying next key/model...`);
                continue;
            }

            if (!response.ok) {
                console.log(`[Gemini Team] Error ${response.status}, trying next...`);
                continue;
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) {
                console.log(`[Gemini Team] Success with ${model}`);
                return {
                    text,
                    model,
                    source: 'gemini'
                };
            }
        } catch (error) {
            console.log(`[Gemini Team] Error: ${error.message}`);
            lastError = error;
        }
    }

    console.log('[Gemini Team] All retries exhausted');
    return null;
}

async function getGeminiResponse(prompt) {
    console.log('[Gemini Team] Starting...');
    const startTime = Date.now();

    const result = await callGeminiAPI(prompt);

    const duration = Date.now() - startTime;
    console.log(`[Gemini Team] Completed in ${duration}ms`);

    return result;
}

export {
    getGeminiResponse,
    callGeminiAPI,
    getGeminiKeys,
    GEMINI_MODELS
};
