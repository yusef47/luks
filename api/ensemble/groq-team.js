// Groq Team - Ensemble AI System
// فريق Groq للعمل بالتوازي

function getGroqKeys() {
    const keys = [];
    for (let i = 1; i <= 10; i++) {
        const key = process.env[`GROQ_API_KEY_${i}`];
        if (key) keys.push(key);
    }
    return keys;
}

const GROQ_MODELS = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
];

let currentKeyIndex = 0;
let currentModelIndex = 0;

function getNextKey() {
    const keys = getGroqKeys();
    if (keys.length === 0) return null;
    const key = keys[currentKeyIndex % keys.length];
    currentKeyIndex++;
    return key;
}

function getNextModel() {
    const model = GROQ_MODELS[currentModelIndex % GROQ_MODELS.length];
    currentModelIndex++;
    return model;
}

async function callGroqAPI(prompt, maxRetries = 15) {
    let lastError = null;

    for (let i = 0; i < maxRetries; i++) {
        const apiKey = getNextKey();
        const model = getNextModel();

        if (!apiKey) {
            console.log('[Groq Team] No API keys available');
            return null;
        }

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 4000
                })
            });

            if (response.status === 429) {
                console.log(`[Groq Team] Rate limited, trying next key/model...`);
                continue;
            }

            if (!response.ok) {
                console.log(`[Groq Team] Error ${response.status}, trying next...`);
                continue;
            }

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content;

            if (text) {
                console.log(`[Groq Team] Success with ${model}`);
                return {
                    text,
                    model,
                    source: 'groq',
                    tokens: data.usage?.total_tokens || 0
                };
            }
        } catch (error) {
            console.log(`[Groq Team] Error: ${error.message}`);
            lastError = error;
        }
    }

    console.log('[Groq Team] All retries exhausted');
    return null;
}

async function getGroqResponse(prompt) {
    console.log('[Groq Team] Starting...');
    const startTime = Date.now();

    const result = await callGroqAPI(prompt);

    const duration = Date.now() - startTime;
    console.log(`[Groq Team] Completed in ${duration}ms`);

    return result;
}

export {
    getGroqResponse,
    callGroqAPI,
    getGroqKeys,
    GROQ_MODELS
};
