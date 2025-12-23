// Tutor Chat API - Groq with Key Rotation
// Uses llama-3.3-70b-versatile for multilingual support

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
            console.log(`[Tutor] Using ${model} (attempt ${attempt + 1})...`);

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model,
                    messages,
                    max_tokens: 2000,
                    temperature: 0.7
                })
            });

            if (response.status === 429 || response.status === 503) {
                console.log(`[Tutor] Rate limited, trying next key...`);
                continue;
            }

            if (response.status === 404 && model === MODELS.PRIMARY) {
                console.log(`[Tutor] Falling back to ${MODELS.FALLBACK}...`);
                return callGroqAPI(messages, MODELS.FALLBACK, retries - attempt);
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Groq error ${response.status}: ${errorText.substring(0, 200)}`);
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content || '';
        } catch (e) {
            console.log(`[Tutor] Attempt ${attempt + 1} failed: ${e.message}`);
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
        const { history, message, level } = req.body || {};

        if (!message) {
            res.status(400).json({ success: false, error: 'Missing message' });
            return;
        }

        const systemPrompt = `You are Lukas (لوكاس), a friendly and patient language tutor.

IMPORTANT RULES:
1. Understand and respond in ANY language the student uses
2. If student speaks Arabic, respond in Arabic  
3. If student speaks English, respond in English
4. If student mixes languages, adapt naturally
5. Correct mistakes gently in the same language
6. Be encouraging, patient, and supportive
7. Keep responses concise but helpful
8. Never mention you are an AI or technical details

Student Level: ${level || 'B1'}`;

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
        messages.push({ role: 'user', content: message });

        const responseText = await callGroqAPI(messages);

        res.status(200).json({ success: true, data: responseText });
    } catch (error) {
        console.error('[Tutor Chat] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
