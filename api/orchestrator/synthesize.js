// Synthesize API - THE BRAIN - uses gemini-3-pro (smartest)
const MODELS = {
    PRIMARY: 'gemini-3-pro',           // Smartest for final answers
    FALLBACK_1: 'gemini-2.5-pro',      // Strong fallback
    FALLBACK_2: 'gemini-2.0-flash'     // High limit fallback
};

const SYSTEM_PROMPT = `You are Lukas (لوكاس), a highly intelligent AI assistant.

IDENTITY:
- Your name is Lukas (لوكاس)
- NEVER mention Google, Gemini, or any AI company
- If asked who made you, say "a developer who wanted to help people"

CRITICAL - MEMORY & CONTEXT:
- READ the FULL conversation history carefully before answering
- When user refers to something mentioned before (like "أول مكان", "that place", "give me the link"), find it in YOUR previous responses
- NEVER make up unrelated information or hallucinate
- NEVER mention things that weren't discussed (like airports, other countries, etc.)
- Stay 100% focused on the current topic

HELPFUL FEATURES:
- Always provide Google Maps links for locations: https://www.google.com/maps?q=LAT,LNG
- Give accurate, specific information
- Include prices, distances, and practical details when relevant

RESPONSE STYLE:
- Respond in the user's language (Arabic or English)
- Be concise but complete
- Don't ask unnecessary clarifying questions if the context is clear`;

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

async function callGeminiAPI(prompt, apiKey, model = MODELS.PRIMARY, attempt = 1) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    console.log(`[Synthesize] Attempt ${attempt}: Using ${model}...`);

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

    // Fallback chain if primary fails
    if (response.status === 429 || response.status === 404 || response.status === 503) {
        console.log(`[Synthesize] ${model} failed (${response.status}), trying fallback...`);
        if (model === MODELS.PRIMARY && MODELS.FALLBACK_1) {
            return callGeminiAPI(prompt, apiKey, MODELS.FALLBACK_1, 2);
        } else if (model === MODELS.FALLBACK_1 && MODELS.FALLBACK_2) {
            return callGeminiAPI(prompt, apiKey, MODELS.FALLBACK_2, 3);
        }
    }

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Synthesize] ${model} ERROR: ${response.status}`);
        throw new Error(`${model} error ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    console.log(`[Synthesize] SUCCESS with ${model}!`);
    return { text: data.candidates?.[0]?.content?.parts?.[0]?.text || '', model };
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
        const { prompt, results, conversationHistory } = req.body || {};

        const apiKey = getNextKey();
        if (!apiKey) {
            res.status(500).json({ success: false, error: 'No API keys available' });
            return;
        }

        // Build detailed conversation context
        let contextString = '';
        if (conversationHistory && conversationHistory.length > 0) {
            contextString = '\n\n=== CONVERSATION HISTORY (READ THIS CAREFULLY!) ===\n' +
                conversationHistory.map((h, i) =>
                    `[Message ${i + 1}]\nUser: ${h.prompt}\nYour Response: ${h.results?.[h.results.length - 1]?.result || 'No response'}`
                ).join('\n\n') + '\n=== END HISTORY ===';
        }

        const synthesizePrompt = `${SYSTEM_PROMPT}
${contextString}

CURRENT SEARCH RESULTS:
${JSON.stringify(results, null, 2)}

CURRENT USER MESSAGE: "${prompt}"

INSTRUCTIONS:
1. First, check if the user is referring to something from your previous responses
2. If user says things like "give me the link" or "how far is the first place", find what they're referring to in YOUR responses above
3. Never introduce unrelated topics
4. Provide a direct, helpful answer with links when relevant`;

        const { text, model } = await callGeminiAPI(synthesizePrompt, apiKey);

        res.status(200).json({
            success: true,
            data: text,
            model: model
        });
    } catch (error) {
        console.error('[Synthesize] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
