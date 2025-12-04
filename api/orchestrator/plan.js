// Collect API Keys from environment
function getAPIKeys() {
    const keys = [];
    for (let i = 1; i <= 13; i++) {
        const key = process.env[`GEMINI_API_KEY_${i}`];
        if (key && key.trim().length > 0) {
            keys.push(key.trim());
        }
    }
    // Also check for single GEMINI_API_KEY
    if (process.env.GEMINI_API_KEY) {
        keys.push(process.env.GEMINI_API_KEY.trim());
    }
    return keys;
}

let keyIndex = 0;
const API_KEYS = getAPIKeys();

function getNextKey() {
    if (API_KEYS.length === 0) {
        return null;
    }
    const key = API_KEYS[keyIndex % API_KEYS.length];
    keyIndex = (keyIndex + 1) % API_KEYS.length;
    return key;
}

async function callGeminiAPI(prompt, apiKey) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

    const payload = {
        contents: [{
            role: 'user',
            parts: [{
                text: prompt
            }]
        }],
        generationConfig: {
            responseMimeType: 'application/json'
        }
    };

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
        throw new Error(`Gemini API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
}

module.exports = async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only POST allowed
    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }

    try {
        const { prompt, hasImage, hasVideo, history, cycleCount } = req.body;

        if (!prompt) {
            res.status(400).json({ success: false, error: 'Missing prompt' });
            return;
        }

        const apiKey = getNextKey();
        if (!apiKey) {
            console.error('ERROR: No API keys configured');
            res.status(500).json({ success: false, error: 'No API keys available. Check environment variables.' });
            return;
        }

        console.log(`[Plan] Using key index: ${keyIndex}, Total keys: ${API_KEYS.length}`);

        const planPrompt = `You are an AI orchestrator. Analyze the user's request and create a plan.

User Request: "${prompt}"
Has Image: ${hasImage || false}
Has Video: ${hasVideo || false}
Cycle Count: ${cycleCount || 1}

Previous Context: ${history ? JSON.stringify(history.slice(-3)) : 'None'}

Create a plan with steps. Each step should have:
- step: number
- agent: one of "SearchAgent", "MapsAgent", "VisionAgent", "VideoAgent", "EmailAgent", "DriveAgent", "SheetsAgent", "ImageGenerationAgent", "Orchestrator"
- task: description of what to do

If the request is unclear, return a clarification object instead.

Return JSON in this format:
{
  "plan": [
    {"step": 1, "agent": "SearchAgent", "task": "Search for..."},
    {"step": 2, "agent": "Orchestrator", "task": "Synthesize final answer"}
  ],
  "clarification": null
}

OR if clarification needed:
{
  "plan": null,
  "clarification": {
    "question": "What do you mean by...",
    "options": [{"key": "1", "value": "Option 1"}, {"key": "2", "value": "Option 2"}]
  }
}`;

        const responseText = await callGeminiAPI(planPrompt, apiKey);

        let planData;
        try {
            planData = JSON.parse(responseText);
        } catch (e) {
            // Try to extract JSON from response
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
            error: error.message || 'Internal server error'
        });
    }
};
