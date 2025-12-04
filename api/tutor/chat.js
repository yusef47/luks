// Tutor API endpoint
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

let keyIndex = 0;
const API_KEYS = getAPIKeys();

function getNextKey() {
    if (API_KEYS.length === 0) return null;
    const key = API_KEYS[keyIndex % API_KEYS.length];
    keyIndex = (keyIndex + 1) % API_KEYS.length;
    return key;
}

async function callGeminiAPI(prompt, apiKey) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

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

    if (!response.ok) {
        throw new Error(`Gemini API error ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

module.exports = async (req, res) => {
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
        const { history, message, level } = req.body;

        const apiKey = getNextKey();
        if (!apiKey) {
            res.status(500).json({ success: false, error: 'No API keys available' });
            return;
        }

        const levelGuide = {
            'A1': 'Use very simple words and short sentences. Speak slowly.',
            'A2': 'Use simple vocabulary and basic grammar.',
            'B1': 'Use everyday vocabulary and moderate complexity.',
            'B2': 'Use varied vocabulary and complex sentences.',
            'C1': 'Use advanced vocabulary and complex structures.'
        };

        const tutorPrompt = `You are a friendly English tutor. Help the student practice English.

Level: ${level || 'B1'}
${levelGuide[level] || levelGuide['B1']}

Conversation history:
${history?.map(h => `${h.role}: ${h.content}`).join('\n') || 'No history'}

Student: ${message}

Respond naturally as a tutor. Correct mistakes gently, and encourage the student.`;

        const responseText = await callGeminiAPI(tutorPrompt, apiKey);

        res.status(200).json({
            success: true,
            data: responseText
        });
    } catch (error) {
        console.error('[Tutor] Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
