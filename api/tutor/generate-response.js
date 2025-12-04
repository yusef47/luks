// Tutor generate-response endpoint
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
        const { history, userMessage, level } = req.body;

        const apiKey = getNextKey();
        if (!apiKey) {
            res.status(500).json({ success: false, error: 'No API keys available' });
            return;
        }

        const levelGuide = {
            'A1': 'Use very simple words and short sentences. Speak very slowly and clearly.',
            'A2': 'Use simple vocabulary and basic grammar structures.',
            'B1': 'Use everyday vocabulary and moderate complexity in your sentences.',
            'B2': 'Use varied vocabulary and more complex sentence structures.',
            'C1': 'Use advanced vocabulary, idioms, and sophisticated structures.'
        };

        const tutorPrompt = `You are a friendly, encouraging English language tutor having a natural conversation with a student.

Student's Level: ${level || 'B1'} (${levelGuide[level] || levelGuide['B1']})

Conversation so far:
${history?.map(h => `${h.role === 'user' ? 'Student' : 'Tutor'}: ${h.content}`).join('\n') || 'This is the start of the conversation.'}

Student's latest message: "${userMessage}"

Instructions:
1. Respond naturally and conversationally
2. If the student made grammar or vocabulary mistakes, gently correct them in a friendly way
3. Encourage the student and keep the conversation flowing
4. Ask follow-up questions to keep them practicing
5. Match your language complexity to their level
6. Keep your response concise (2-4 sentences is ideal)

Respond as the tutor:`;

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
};
