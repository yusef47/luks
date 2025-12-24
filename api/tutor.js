// Tutor API - All-in-one endpoint
// Combines chat, generate-response, speech-to-text, text-to-speech
// Uses Groq models with key rotation

const MODELS = {
    CHAT: 'llama-3.3-70b-versatile',
    CHAT_FALLBACK: 'llama-3.1-8b-instant',
    STT: 'whisper-large-v3-turbo',
    STT_FALLBACK: 'whisper-large-v3',
    TTS: 'canopylabs/orpheus-v1-english'  // Updated from playai-tts
};

// Available voices for Orpheus TTS
const VOICES = {
    // UI Name: Orpheus Voice ID
    'emma': 'hannah',       // Friendly & Patient (Female)
    'james': 'austin',      // Professional & Clear (Male)
    'atlas': 'troy',        // Deep & Confident (Male)
    'basil': 'daniel',      // Calm & Steady (Male)
    'briggs': 'troy',       // Energetic (Male) - using troy
    'coral': 'diana',       // Warm & Expressive (Female)
    'indigo': 'autumn',     // Professional (Female)
    'jasper': 'austin'      // Friendly (Male) - using austin
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

// ═══════════════════════════════════════════════════════════════
//                    CHAT FUNCTION
// ═══════════════════════════════════════════════════════════════

async function handleChat(body) {
    const { history, message, level } = body;

    if (!message) throw new Error('Missing message');

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

    const messages = [{ role: 'system', content: systemPrompt }];

    if (history && Array.isArray(history)) {
        history.forEach(h => {
            messages.push({
                role: h.role === 'user' ? 'user' : 'assistant',
                content: h.content
            });
        });
    }
    messages.push({ role: 'user', content: message });

    return await callGroqChat(messages);
}

// ═══════════════════════════════════════════════════════════════
//                    GENERATE RESPONSE FUNCTION
// ═══════════════════════════════════════════════════════════════

async function handleGenerate(body) {
    const { history, userMessage, level } = body;

    if (!userMessage) throw new Error('Missing userMessage');

    const levelGuide = {
        'A1': 'Use very simple words and short sentences.',
        'A2': 'Use simple vocabulary and basic grammar.',
        'B1': 'Use everyday vocabulary with moderate complexity.',
        'B2': 'Use varied vocabulary and complex sentences.',
        'C1': 'Use advanced vocabulary and sophisticated structures.'
    };

    const systemPrompt = `You are Lukas (لوكاس), a friendly, patient, and knowledgeable language tutor.

IMPORTANT RULES:
1. Understand and respond in ANY language the student uses
2. Match the student's language
3. Correct mistakes gently and explain why
4. Be encouraging, supportive, and never condescending
5. Provide detailed explanations when teaching
6. Use examples to illustrate points
7. Never mention you are an AI

Student Level: ${level || 'B1'} - ${levelGuide[level] || levelGuide['B1']}`;

    const messages = [{ role: 'system', content: systemPrompt }];

    if (history && Array.isArray(history)) {
        history.forEach(h => {
            messages.push({
                role: h.role === 'user' ? 'user' : 'assistant',
                content: h.content
            });
        });
    }
    messages.push({ role: 'user', content: userMessage });

    return await callGroqChat(messages, 3000);
}

// ═══════════════════════════════════════════════════════════════
//                    SPEECH-TO-TEXT FUNCTION
// ═══════════════════════════════════════════════════════════════

async function handleSTT(body) {
    const { audio } = body;
    if (!audio) throw new Error('Missing audio data');

    const audioBuffer = Buffer.from(audio, 'base64');
    const text = await transcribeAudio(audioBuffer);
    return { text };
}

// ═══════════════════════════════════════════════════════════════
//                    TEXT-TO-SPEECH FUNCTION
// ═══════════════════════════════════════════════════════════════

async function handleTTS(body) {
    const { text, voice } = body;
    if (!text) throw new Error('Missing text');

    // Map tutor name to Orpheus voice ID (e.g., 'emma' → 'hannah')
    const voiceName = (voice || 'emma').toLowerCase();
    const selectedVoice = VOICES[voiceName] || VOICES['emma'];

    console.log(`[handleTTS] Tutor: ${voiceName} → Voice: ${selectedVoice}`);

    const audioBuffer = await synthesizeSpeech(text, selectedVoice);

    return {
        audio: audioBuffer.toString('base64'),
        format: 'wav',
        voice: selectedVoice,
        tutor: voiceName
    };
}

// ═══════════════════════════════════════════════════════════════
//                    GROQ API CALLS
// ═══════════════════════════════════════════════════════════════

async function callGroqChat(messages, maxTokens = 2000, model = MODELS.CHAT, retries = 3) {
    const keys = getGroqKeys();
    if (keys.length === 0) throw new Error('No Groq API keys available');

    for (let attempt = 0; attempt < retries; attempt++) {
        const key = getNextKey();
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7 })
            });

            if (response.status === 429 || response.status === 503) continue;
            if (response.status === 404 && model === MODELS.CHAT) {
                return callGroqChat(messages, maxTokens, MODELS.CHAT_FALLBACK, retries - attempt);
            }
            if (!response.ok) throw new Error(`Groq error ${response.status}`);

            const data = await response.json();
            return data.choices?.[0]?.message?.content || '';
        } catch (e) {
            if (attempt === retries - 1) throw e;
        }
    }
    throw new Error('All retry attempts failed');
}

async function transcribeAudio(audioBuffer, model = MODELS.STT, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
        const key = getNextKey();
        try {
            const formData = new FormData();
            const blob = new Blob([audioBuffer], { type: 'audio/webm' });
            formData.append('file', blob, 'audio.webm');
            formData.append('model', model);
            formData.append('response_format', 'json');

            const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${key}` },
                body: formData
            });

            if (response.status === 429 || response.status === 503) continue;
            if (response.status === 404 && model === MODELS.STT) {
                return transcribeAudio(audioBuffer, MODELS.STT_FALLBACK, retries - attempt);
            }
            if (!response.ok) throw new Error(`Groq STT error ${response.status}`);

            const data = await response.json();
            return data.text || '';
        } catch (e) {
            if (attempt === retries - 1) throw e;
        }
    }
    throw new Error('STT failed');
}

async function synthesizeSpeech(text, voice, retries = 3) {
    // Orpheus TTS doesn't support speed parameter
    for (let attempt = 0; attempt < retries; attempt++) {
        const key = getNextKey();
        try {
            console.log(`[TTS] Attempt ${attempt + 1}: voice=${voice}, text="${text.substring(0, 50)}..."`);

            const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: MODELS.TTS,
                    input: text,
                    voice,
                    response_format: 'wav'  // Orpheus default
                })
            });

            if (response.status === 429 || response.status === 503) {
                console.log(`[TTS] Rate limited, retrying...`);
                continue;
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[TTS] Error ${response.status}: ${errorText}`);
                throw new Error(`Groq TTS error ${response.status}: ${errorText}`);
            }

            const audioBuffer = await response.arrayBuffer();
            console.log(`[TTS] Success! Audio size: ${audioBuffer.byteLength} bytes`);
            return Buffer.from(audioBuffer);
        } catch (e) {
            console.error(`[TTS] Attempt ${attempt + 1} failed:`, e.message);
            if (attempt === retries - 1) throw e;
        }
    }
    throw new Error('TTS failed after all retries');
}

// ═══════════════════════════════════════════════════════════════
//                    MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export const config = {
    api: { bodyParser: { sizeLimit: '10mb' } }
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        const { action, ...body } = req.body || {};
        let result;

        switch (action) {
            case 'chat':
                result = await handleChat(body);
                break;
            case 'generate':
                result = await handleGenerate(body);
                break;
            case 'stt':
            case 'speech-to-text':
                result = await handleSTT(body);
                break;
            case 'tts':
            case 'text-to-speech':
                result = await handleTTS(body);
                break;
            case 'voices':
                // Return available voices/tutors
                result = {
                    tutors: [
                        { id: 'james', name: 'James', description: 'Professional & Clear', gender: 'male' },
                        { id: 'emma', name: 'Emma', description: 'Friendly & Patient', gender: 'female' },
                        { id: 'atlas', name: 'Atlas', description: 'Deep & Confident', gender: 'male' },
                        { id: 'basil', name: 'Basil', description: 'Calm & Steady', gender: 'male' },
                        { id: 'briggs', name: 'Briggs', description: 'Energetic', gender: 'male' },
                        { id: 'coral', name: 'Coral', description: 'Warm & Expressive', gender: 'female' },
                        { id: 'indigo', name: 'Indigo', description: 'Professional', gender: 'female' },
                        { id: 'jasper', name: 'Jasper', description: 'Friendly', gender: 'male' }
                    ],
                    speeds: ['slow', 'normal', 'fast'],
                    levels: ['A1', 'A2', 'B1', 'B2', 'C1']
                };
                break;
            default:
                // Default to chat for backwards compatibility
                result = await handleChat(body);
        }

        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('[Tutor] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
