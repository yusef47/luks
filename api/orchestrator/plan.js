// Plan API - THE PLANNER - uses gemini-2.5-pro
const MODELS = {
    PRIMARY: 'gemini-2.5-pro',         // Smart planner
    FALLBACK_1: 'gemini-2.5-flash',    // Good balance
    FALLBACK_2: 'gemini-2.0-flash'     // High limit fallback
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

    console.log(`[Plan] Using ${model}...`);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
        })
    });

    // Fallback chain
    if (response.status === 429 || response.status === 404 || response.status === 503) {
        console.log(`[Plan] ${model} failed, trying fallback...`);
        if (model === MODELS.PRIMARY) {
            return callGeminiAPI(prompt, apiKey, MODELS.FALLBACK_1);
        } else if (model === MODELS.FALLBACK_1) {
            return callGeminiAPI(prompt, apiKey, MODELS.FALLBACK_2);
        }
    }

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${model} error ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    console.log(`[Plan] SUCCESS with ${model}!`);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
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
        const { prompt, hasImage, hasVideo, history } = req.body || {};

        if (!prompt) {
            res.status(400).json({ success: false, error: 'Missing prompt' });
            return;
        }

        const apiKey = getNextKey();
        if (!apiKey) {
            res.status(500).json({ success: false, error: 'No API keys available' });
            return;
        }

        // Build context from history
        let historyContext = '';
        if (history && history.length > 0) {
            historyContext = '\n\nRECENT CONVERSATION:\n' +
                history.slice(-3).map(h => `User: ${h.prompt}`).join('\n');
        }

        const planPrompt = `You are Lukas's internal planner. Analyze the user's request and create a smart plan.
${historyContext}

CURRENT REQUEST: "${prompt}"
Has Image: ${hasImage || false}
Has Video: ${hasVideo || false}

PLANNING RULES:
1. For location/distance/direction questions → use MapsAgent
2. For general information → use SearchAgent
3. For follow-up questions, consider the conversation context
4. Always end with Orchestrator to synthesize the final answer
5. Use multiple agents when the question is complex

Return JSON:
{
  "plan": [
    {"step": 1, "agent": "SearchAgent", "task": "Search for specific details about..."},
    {"step": 2, "agent": "Orchestrator", "task": "Synthesize complete answer"}
  ],
  "clarification": null
}

Available agents: SearchAgent, MapsAgent, VisionAgent, VideoAgent, Orchestrator`;

        const responseText = await callGeminiAPI(planPrompt, apiKey);

        let planData;
        try {
            planData = JSON.parse(responseText);
        } catch (e) {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                planData = JSON.parse(jsonMatch[0]);
            } else {
                planData = {
                    plan: [
                        { step: 1, agent: "SearchAgent", task: `Search: ${prompt}` },
                        { step: 2, agent: "Orchestrator", task: "Provide final answer" }
                    ],
                    clarification: null
                };
            }
        }

        res.status(200).json({ success: true, data: planData });
    } catch (error) {
        console.error('[Plan] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
