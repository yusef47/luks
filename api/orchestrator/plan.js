// Plan API endpoint - ES Modules version
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
    console.log(`[Plan] Found ${keys.length} API keys`);
    return keys;
}

function getNextKey() {
    const keys = getAPIKeys();
    if (keys.length === 0) {
        return null;
    }
    const idx = Math.floor(Math.random() * keys.length);
    return keys[idx];
}

async function callGeminiAPI(prompt, apiKey) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

    const payload = {
        contents: [{
            role: 'user',
            parts: [{ text: prompt }]
        }],
        generationConfig: {
            responseMimeType: 'application/json'
        }
    };

    console.log(`[Plan] Calling Gemini API...`);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Plan] Gemini API error: ${response.status} - ${errorText}`);
        throw new Error(`Gemini API error ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    console.log(`[Plan] Got response: ${text.substring(0, 100)}...`);
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

    console.log('[Plan] Received request');

    try {
        const { prompt, hasImage, hasVideo, history, cycleCount } = req.body || {};

        if (!prompt) {
            console.log('[Plan] Missing prompt');
            res.status(400).json({ success: false, error: 'Missing prompt' });
            return;
        }

        console.log(`[Plan] Processing prompt: ${prompt.substring(0, 50)}...`);

        const apiKey = getNextKey();
        if (!apiKey) {
            console.error('[Plan] ERROR: No API keys configured');
            res.status(500).json({
                success: false,
                error: 'No API keys available. Add GEMINI_API_KEY to Vercel environment.'
            });
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
            console.log('[Plan] JSON parse failed, trying regex');
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                planData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Failed to parse plan response');
            }
        }

        console.log('[Plan] Success!');
        res.status(200).json({
            success: true,
            data: planData
        });
    } catch (error) {
        console.error('[Plan] Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
}
