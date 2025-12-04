// Plan API endpoint - with model fallback
const MODELS = {
    PRIMARY: 'gemini-2.5-flash-preview-05-20',  // Best for thinking
    FALLBACK: 'gemini-2.0-flash'                 // Fallback if quota exceeded
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

    const payload = {
        contents: [{
            role: 'user',
            parts: [{ text: prompt }]
        }],
        generationConfig: {
            responseMimeType: 'application/json'
        }
    };

    console.log(`[Plan] Calling ${model}...`);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
        },
        body: JSON.stringify(payload)
    });

    // If quota exceeded (429) or model not available (404), try fallback
    if ((response.status === 429 || response.status === 404) && model === MODELS.PRIMARY) {
        console.log(`[Plan] ${model} quota exceeded, trying fallback...`);
        return callGeminiAPI(prompt, apiKey, MODELS.FALLBACK);
    }

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Plan] API error: ${response.status}`);
        throw new Error(`Gemini API error ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    console.log(`[Plan] Success with ${model}`);
    return text;
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
        const { prompt, hasImage, hasVideo, history, cycleCount } = req.body || {};

        if (!prompt) {
            res.status(400).json({ success: false, error: 'Missing prompt' });
            return;
        }

        const apiKey = getNextKey();
        if (!apiKey) {
            res.status(500).json({ success: false, error: 'No API keys available' });
            return;
        }

        const planPrompt = `You are an AI orchestrator. Analyze the user's request and create a plan.

User Request: "${prompt}"
Has Image: ${hasImage || false}
Has Video: ${hasVideo || false}

Create a plan with steps. Each step should have:
- step: number
- agent: one of "SearchAgent", "MapsAgent", "VisionAgent", "VideoAgent", "Orchestrator"
- task: description of what to do

Return JSON:
{
  "plan": [
    {"step": 1, "agent": "SearchAgent", "task": "Search for..."},
    {"step": 2, "agent": "Orchestrator", "task": "Synthesize final answer"}
  ],
  "clarification": null
}`;

        const responseText = await callGeminiAPI(planPrompt, apiKey);

        let planData;
        try {
            planData = JSON.parse(responseText);
        } catch (e) {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                planData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Failed to parse plan response');
            }
        }

        res.status(200).json({
            success: true,
            data: planData
        });
    } catch (error) {
        console.error('[Plan] Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
