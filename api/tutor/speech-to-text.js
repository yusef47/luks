// Tutor Speech-to-Text API - Groq Whisper
// Uses whisper-large-v3-turbo for fast transcription

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

async function transcribeAudio(audioBuffer, model = 'whisper-large-v3-turbo', retries = 3) {
    const keys = getGroqKeys();
    if (keys.length === 0) throw new Error('No Groq API keys available');

    for (let attempt = 0; attempt < retries; attempt++) {
        const key = getNextKey();

        try {
            console.log(`[STT] Using ${model} (attempt ${attempt + 1})...`);

            // Create FormData with audio file
            const formData = new FormData();
            const blob = new Blob([audioBuffer], { type: 'audio/webm' });
            formData.append('file', blob, 'audio.webm');
            formData.append('model', model);
            formData.append('response_format', 'json');

            const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${key}`
                },
                body: formData
            });

            if (response.status === 429 || response.status === 503) {
                console.log(`[STT] Rate limited, trying next key...`);
                continue;
            }

            // Fallback to standard whisper if turbo not available
            if (response.status === 404 && model === 'whisper-large-v3-turbo') {
                console.log(`[STT] Falling back to whisper-large-v3...`);
                return transcribeAudio(audioBuffer, 'whisper-large-v3', retries - attempt);
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Groq STT error ${response.status}: ${errorText.substring(0, 200)}`);
            }

            const data = await response.json();
            return data.text || '';
        } catch (e) {
            console.log(`[STT] Attempt ${attempt + 1} failed: ${e.message}`);
            if (attempt === retries - 1) throw e;
        }
    }
    throw new Error('All retry attempts failed');
}

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb'
        }
    }
};

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
        const { audio } = req.body || {};

        if (!audio) {
            res.status(400).json({ success: false, error: 'Missing audio data' });
            return;
        }

        // Decode base64 audio
        const audioBuffer = Buffer.from(audio, 'base64');

        console.log(`[STT] Transcribing ${audioBuffer.length} bytes...`);

        const text = await transcribeAudio(audioBuffer);

        console.log(`[STT] Transcribed: "${text.substring(0, 50)}..."`);

        res.status(200).json({ success: true, data: { text } });
    } catch (error) {
        console.error('[STT] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
