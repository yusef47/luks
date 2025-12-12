// Ensemble AI System - Combined File
// نظام Ensemble الموحد - Gemini + Groq بالتوازي
// ملف واحد بدل 4 ملفات لتقليل عدد الـ Serverless Functions

// ============= GROQ TEAM =============
function getGroqKeys() {
    const keys = [];
    for (let i = 1; i <= 10; i++) {
        const key = process.env[`GROQ_API_KEY_${i}`];
        if (key) keys.push(key);
    }
    return keys;
}

const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
let groqKeyIndex = 0;
let groqModelIndex = 0;

async function getGroqResponse(prompt) {
    const keys = getGroqKeys();
    if (keys.length === 0) return null;

    for (let i = 0; i < 15; i++) {
        const apiKey = keys[groqKeyIndex % keys.length];
        const model = GROQ_MODELS[groqModelIndex % GROQ_MODELS.length];
        groqKeyIndex++;
        groqModelIndex++;

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 4000
                })
            });

            if (response.status === 429) continue;
            if (!response.ok) continue;

            const data = await response.json();
            if (data.choices?.[0]?.message?.content) {
                return { text: data.choices[0].message.content, model, source: 'groq' };
            }
        } catch (e) { continue; }
    }
    return null;
}

// ============= GEMINI TEAM =============
function getGeminiKeys() {
    const keys = [];
    for (let i = 1; i <= 15; i++) {
        const key = process.env[`GEMINI_API_KEY_${i}`];
        if (key) keys.push(key);
    }
    return keys;
}

const GEMINI_MODELS = ['gemini-2.5-flash-preview-05-20', 'gemini-2.0-flash', 'gemini-1.5-flash'];
let geminiKeyIndex = 0;
let geminiModelIndex = 0;

async function getGeminiResponse(prompt) {
    const keys = getGeminiKeys();
    if (keys.length === 0) return null;

    for (let i = 0; i < 30; i++) {
        const apiKey = keys[geminiKeyIndex % keys.length];
        const model = GEMINI_MODELS[geminiModelIndex % GEMINI_MODELS.length];
        geminiKeyIndex++;
        geminiModelIndex++;

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { maxOutputTokens: 8000 }
                })
            });

            if (response.status === 429 || response.status === 503) continue;
            if (!response.ok) continue;

            const data = await response.json();
            if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                return { text: data.candidates[0].content.parts[0].text, model, source: 'gemini' };
            }
        } catch (e) { continue; }
    }
    return null;
}

// ============= SYNTHESIZER =============
function synthesizeResponses(geminiResponse, groqResponse, originalPrompt) {
    if (!geminiResponse && !groqResponse) return null;
    if (!geminiResponse) return { ...groqResponse, source: 'groq-only' };
    if (!groqResponse) return { ...geminiResponse, source: 'gemini-only' };

    const geminiLen = geminiResponse.text.length;
    const groqLen = groqResponse.text.length;

    if (geminiLen > groqLen * 1.5) return { ...geminiResponse, source: 'gemini-selected' };
    if (groqLen > geminiLen * 1.5) return { ...groqResponse, source: 'groq-selected' };

    const isArabic = /[\u0600-\u06FF]/.test(originalPrompt);
    if (isArabic) return { ...geminiResponse, source: 'gemini-preferred-arabic' };

    return geminiLen >= groqLen
        ? { ...geminiResponse, source: 'gemini-selected' }
        : { ...groqResponse, source: 'groq-selected' };
}

// ============= MAIN ENSEMBLE =============
async function runEnsemble(prompt, options = {}) {
    const startTime = Date.now();

    const [geminiResult, groqResult] = await Promise.allSettled([
        getGeminiResponse(prompt),
        getGroqResponse(prompt)
    ]);

    const geminiResponse = geminiResult.status === 'fulfilled' ? geminiResult.value : null;
    const groqResponse = groqResult.status === 'fulfilled' ? groqResult.value : null;

    const finalResult = synthesizeResponses(geminiResponse, groqResponse, prompt);

    if (finalResult) {
        finalResult.ensembleTime = Date.now() - startTime;
        finalResult.geminiAvailable = !!geminiResponse;
        finalResult.groqAvailable = !!groqResponse;
    }

    return finalResult;
}

async function runEnsembleFast(prompt) {
    const result = await Promise.race([
        getGeminiResponse(prompt).then(r => r ? { ...r, winner: 'gemini' } : null),
        getGroqResponse(prompt).then(r => r ? { ...r, winner: 'groq' } : null)
    ]);

    if (result) return result;
    return runEnsemble(prompt);
}

export {
    runEnsemble,
    runEnsembleFast,
    getGeminiResponse,
    getGroqResponse,
    synthesizeResponses,
    getGeminiKeys,
    getGroqKeys
};
