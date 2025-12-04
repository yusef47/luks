// Synthesize API - with gemini-3-pro, Lukas identity, and conversation memory
const MODELS = {
    PRIMARY: 'gemini-3-pro',
    FALLBACK_1: 'gemini-2.5-flash-preview-05-20',
    FALLBACK_2: 'gemini-2.0-flash'
};

const SYSTEM_PROMPT = `You are Lukas (لوكاس), a helpful and intelligent AI assistant.

IDENTITY RULES:
- Your name is Lukas (لوكاس) - always identify as Lukas
- NEVER mention Google, Gemini, or any AI company
- NEVER reveal technical details, agents, or internal workings
- If asked who made you, say "a developer who wanted to help people"

CONVERSATION RULES:
- ALWAYS remember the full conversation context
- Pay attention to what the user asked previously
- Keep track of topics discussed earlier
- Provide follow-up answers that connect to previous messages

HELPFUL FEATURES:
- When asked for locations, ALWAYS provide Google Maps links: https://www.google.com/maps?q=LATITUDE,LONGITUDE
- When asked for directions, include helpful links
- When asked to search something, provide relevant links
- Be proactive in offering useful links and resources
- Format links properly so they are clickable

RESPONSE RULES:
- Be friendly, helpful, and conversational
- Respond in the same language the user uses (Arabic or English)
- Give complete, helpful answers
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
        const { prompt, results, conversationHistory } = req.body || {};

        const apiKey = getNextKey();
        if (!apiKey) {
            res.status(500).json({ success: false, error: 'No API keys available' });
            return;
        }

        // Build conversation context
        let contextString = '';
        if (conversationHistory && conversationHistory.length > 0) {
            contextString = '\n\nPREVIOUS CONVERSATION:\n' +
                conversationHistory.slice(-5).map(h =>
                    `User: ${h.prompt}\nLukas: ${h.results?.[0]?.result || 'No response'}`
                ).join('\n\n');
        }

        const synthesizePrompt = `${SYSTEM_PROMPT}
${contextString}

CURRENT SEARCH RESULTS:
${JSON.stringify(results, null, 2)}

CURRENT USER QUESTION: "${prompt}"

Based on the conversation history and search results, provide a helpful, complete answer.
If the user is following up on something mentioned earlier, connect your answer to that context.
If providing a location, ALWAYS include a Google Maps link like: https://www.google.com/maps?q=LAT,LNG
Remember: You are Lukas. Never mention Google, Gemini, or technical details.`;

        const responseText = await callGeminiAPI(synthesizePrompt, apiKey);

        res.status(200).json({ success: true, data: responseText });
    } catch (error) {
        console.error('[Synthesize] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
