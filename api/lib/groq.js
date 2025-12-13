// Groq API - Shared Module
// استخدم هذا الملف بدلاً من Gemini للتيست

const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

function getGroqKeys() {
    const keys = [];
    for (let i = 1; i <= 10; i++) {
        const key = process.env[`GROQ_API_KEY_${i}`];
        if (key && key.trim().length > 0) keys.push(key.trim());
    }
    return keys;
}

let keyIndex = 0;
let modelIndex = 0;

export async function callGroqAPI(prompt, maxRetries = 15) {
    const keys = getGroqKeys();
    if (keys.length === 0) {
        throw new Error('No Groq API keys available');
    }

    for (let i = 0; i < maxRetries; i++) {
        const apiKey = keys[keyIndex % keys.length];
        const model = GROQ_MODELS[modelIndex % GROQ_MODELS.length];
        keyIndex++;
        modelIndex++;

        try {
            console.log(`[Groq] Attempt ${i + 1}: ${model}`);

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 4000
                })
            });

            if (response.status === 429) {
                console.log(`[Groq] Rate limited, trying next...`);
                continue;
            }

            if (!response.ok) {
                console.log(`[Groq] Error ${response.status}, trying next...`);
                continue;
            }

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content;

            if (text) {
                console.log(`[Groq] ✅ SUCCESS with ${model}!`);
                return text;
            }
        } catch (error) {
            console.log(`[Groq] Error: ${error.message}`);
        }
    }

    throw new Error('All Groq API attempts failed');
}

export async function callGroqAPIWithJSON(prompt, maxRetries = 15) {
    const result = await callGroqAPI(prompt + '\n\nRespond with valid JSON only.', maxRetries);
    try {
        return JSON.parse(result);
    } catch {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        throw new Error('Invalid JSON response');
    }
}

export default callGroqAPI;
