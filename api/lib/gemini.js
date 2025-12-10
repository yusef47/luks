// Shared Gemini API utility with smart fallback
// This handles key rotation and model fallback automatically

const ALL_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-robotics-er-1.5-preview'
];

// Get all available API keys
function getAllAPIKeys() {
    const keys = [];
    // Try numbered keys first
    for (let i = 1; i <= 13; i++) {
        const key = process.env[`GEMINI_API_KEY_${i}`];
        if (key && key.trim().length > 0) {
            keys.push(key.trim());
        }
    }
    // Add main key
    if (process.env.GEMINI_API_KEY) {
        keys.push(process.env.GEMINI_API_KEY.trim());
    }
    return keys;
}

// Shuffle array for random distribution
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Smart API call with automatic fallback
async function callGeminiWithFallback(prompt, options = {}) {
    const {
        preferredModel = 'gemini-2.5-flash',
        useSearch = false,
        maxRetries = 6  // Try multiple keys and models
    } = options;

    const keys = shuffleArray(getAllAPIKeys());
    const models = [preferredModel, ...ALL_MODELS.filter(m => m !== preferredModel)];

    if (keys.length === 0) {
        throw new Error('No API keys available');
    }

    let lastError = null;
    let attempts = 0;

    // Try each combination of key and model
    for (const model of models) {
        for (const apiKey of keys) {
            if (attempts >= maxRetries) break;
            attempts++;

            try {
                console.log(`[GeminiAPI] Attempt ${attempts}: ${model} with key ${apiKey.substring(0, 8)}...`);

                const result = await makeAPICall(prompt, apiKey, model, useSearch);
                console.log(`[GeminiAPI] SUCCESS on attempt ${attempts}!`);
                return { text: result, model, attempts };

            } catch (error) {
                lastError = error;
                console.log(`[GeminiAPI] Attempt ${attempts} failed: ${error.message}`);

                // If it's a rate limit error, try next key immediately
                if (error.message.includes('429') || error.message.includes('quota')) {
                    continue;
                }

                // For other errors, try next model
                break;
            }
        }
    }

    throw new Error(lastError?.message || 'All API attempts failed');
}

// Make the actual API call
async function makeAPICall(prompt, apiKey, model, useSearch = false) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const requestBody = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
    };

    // Add Google Search if requested
    if (useSearch) {
        requestBody.tools = [{ googleSearch: {} }];
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${model} error ${response.status}: ${errorText.substring(0, 100)}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) {
        throw new Error('Empty response from API');
    }

    return text;
}

// Export for use in other files
export { callGeminiWithFallback, getAllAPIKeys, ALL_MODELS };
