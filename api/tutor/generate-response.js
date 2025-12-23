// Tutor Generate Response API - Groq with Key Rotation
// Uses llama-3.3-70b-versatile for detailed responses

const MODELS = {
    PRIMARY: 'llama-3.3-70b-versatile',
    FALLBACK: 'llama-3.1-8b-instant'
};

function getGroqKeys() {
    const keys = [];
    for (let i = 1; i <= 10; i++) {
        const key = process.env[`GROQ_API_KEY_${i}`];
        if (key && key.trim().length > 0) {
            keys.push(key.trim());
        }
    }
    return keys;
}

let keyIndex = 0;

function getNextKey() {
    const keys = getGroqKeys();
    if (keys.length === 0) return null;
    const key = keys[keyIndex % keys.length];
    keyIndex++;
    return key;
}

async function callGroqAPI(messages, model = MODELS.PRIMARY, retries = 3) {
    const keys = getGroqKeys();
    if (keys.length === 0) throw new Error('No Groq API keys available');

    for (let attempt = 0; attempt < retries; attempt++) {
        const key = getNextKey();

        try {
            console.log(`[Tutor Generate] Using ${model} (attempt ${attempt + 1})...`);

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model,
                    messages,
                    max_tokens: 3000,
                    temperature: 0.7
                })
            });

            if (response.status === 429 || response.status === 503) {
                console.log(`[Tutor Generate] Rate limited, trying next key...`);
                continue;
            }

            if (response.status === 404 && model === MODELS.PRIMARY) {
                console.log(`[Tutor Generate] Falling back to ${MODELS.FALLBACK}...`);
                return callGroqAPI(messages, MODELS.FALLBACK, retries - attempt);
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Groq error ${response.status}: ${errorText.substring(0, 200)}`);
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content || '';
        } catch (e) {
            console.log(`[Tutor Generate] Attempt ${attempt + 1} failed: ${e.message}`);
            if (attempt === retries - 1) throw e;
        }
    }
    throw new Error('All retry attempts failed');
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

        if (!userMessage) {
            res.status(400).json({ success: false, error: 'Missing userMessage' });
            return;
        }

        const levelGuide = {
            'A1': 'Use very simple words and short sentences. Explain everything in the most basic way.',
            'A2': 'Use simple vocabulary and basic grammar. Keep explanations clear and simple.',
            'B1': 'Use everyday vocabulary with moderate complexity. Can use some idioms.',
            'B2': 'Use varied vocabulary and complex sentences. Can discuss abstract topics.',
            'C1': 'Use advanced vocabulary and sophisticated structures. Can handle nuanced discussions.'
        };

        const systemPrompt = `You are Lukas (لوكاس), a friendly, patient, and knowledgeable language tutor.

IMPORTANT RULES:
1. Understand and respond in ANY language the student uses
2. Match the student's language - if they speak Arabic, respond in Arabic
3. If they speak English, respond in English
4. If they mix languages, adapt naturally
5. Correct mistakes gently and explain why
6. Be encouraging, supportive, and never condescending
7. Provide detailed explanations when teaching grammar or vocabulary
8. Use examples to illustrate points
9. Never mention you are an AI or technical details
10. Keep a warm, friendly tone

Student Level: ${level || 'B1'} - ${levelGuide[level] || levelGuide['B1']}`;

        const messages = [
            { role: 'system', content: systemPrompt }
        ];

        // Add conversation history
        if (history && Array.isArray(history)) {
            history.forEach(h => {
                messages.push({
                    role: h.role === 'user' ? 'user' : 'assistant',
                    content: h.content
                });
            });
        }

        // Add current message
        messages.push({ role: 'user', content: userMessage });

        const responseText = await callGroqAPI(messages);

        res.status(200).json({ success: true, data: responseText });
    } catch (error) {
        console.error('[Tutor Generate] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
