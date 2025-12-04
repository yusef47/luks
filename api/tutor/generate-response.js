// Tutor Generate Response API - ES Modules version
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

async function callGeminiAPI(prompt, apiKey) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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
        const { history, userMessage, level } = req.body || {};

        const apiKey = getNextKey();
        if (!apiKey) {
            res.status(500).json({ success: false, error: 'No API keys available' });
            return;
        }

        const levelGuide = {
            'A1': 'Use very simple words and short sentences.',
            'A2': 'Use simple vocabulary and basic grammar.',
            'B1': 'Use everyday vocabulary with moderate complexity.',
            'B2': 'Use varied vocabulary and complex sentences.',
            'C1': 'Use advanced vocabulary and sophisticated structures.'
        };

        const tutorPrompt = `You are a friendly English tutor.

Level: ${level || 'B1'} - ${levelGuide[level] || levelGuide['B1']}

${history?.map(h => `${h.role === 'user' ? 'Student' : 'Tutor'}: ${h.content}`).join('\n') || ''}

Student: ${userMessage}

Respond naturally, correct mistakes gently, keep responses concise (2-4 sentences).`;

        const responseText = await callGeminiAPI(tutorPrompt, apiKey);

        res.status(200).json({
            success: true,
            data: responseText
        });
    } catch (error) {
        console.error('[Tutor Generate] Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
