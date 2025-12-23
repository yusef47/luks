// Tutor Text-to-Speech API - Groq PlayAI TTS
// Uses playai-tts for natural voice synthesis

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

async function synthesizeSpeech(text, voice = 'Fritz-PlayAI', retries = 3) {
    const keys = getGroqKeys();
    if (keys.length === 0) throw new Error('No Groq API keys available');

    for (let attempt = 0; attempt < retries; attempt++) {
        const key = getNextKey();

        try {
            console.log(`[TTS] Synthesizing with ${voice} (attempt ${attempt + 1})...`);

            const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'playai-tts',
                    input: text,
                    voice: voice,
                    response_format: 'mp3'
                })
            });

            if (response.status === 429 || response.status === 503) {
                console.log(`[TTS] Rate limited, trying next key...`);
                continue;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Groq TTS error ${response.status}: ${errorText.substring(0, 200)}`);
            }

            // Get audio as buffer
            const audioBuffer = await response.arrayBuffer();
            return Buffer.from(audioBuffer);
        } catch (e) {
            console.log(`[TTS] Attempt ${attempt + 1} failed: ${e.message}`);
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
        const { text, voice } = req.body || {};

        if (!text) {
            res.status(400).json({ success: false, error: 'Missing text' });
            return;
        }

        // Available voices: Fritz-PlayAI, Arista-PlayAI, Atlas-PlayAI, Basil-PlayAI, etc.
        const selectedVoice = voice || 'Fritz-PlayAI';

        console.log(`[TTS] Converting ${text.length} chars to speech...`);

        const audioBuffer = await synthesizeSpeech(text, selectedVoice);

        console.log(`[TTS] Generated ${audioBuffer.length} bytes of audio`);

        // Return as base64
        const audioBase64 = audioBuffer.toString('base64');

        res.status(200).json({
            success: true,
            data: {
                audio: audioBase64,
                format: 'mp3',
                voice: selectedVoice
            }
        });
    } catch (error) {
        console.error('[TTS] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
