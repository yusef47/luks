// Synthesize API - GROQ ONLY (Testing Mode)
// No external imports - inline Groq code

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

async function callGroqAPI(prompt, maxRetries = 15) {
    const keys = getGroqKeys();
    if (keys.length === 0) throw new Error('No Groq keys available');

    for (let i = 0; i < maxRetries; i++) {
        const apiKey = keys[keyIndex % keys.length];
        const model = GROQ_MODELS[modelIndex % GROQ_MODELS.length];
        keyIndex++;
        modelIndex++;

        try {
            console.log(`[Synthesize] GROQ Attempt ${i + 1}: ${model}`);

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

            if (response.status === 429) continue;
            if (!response.ok) continue;

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content;

            if (text) {
                console.log(`[Synthesize] ✅ GROQ SUCCESS with ${model}!`);
                return text;
            }
        } catch (error) {
            console.log(`[Synthesize] Error: ${error.message}`);
        }
    }

    throw new Error('All Groq API attempts failed');
}

function detectLanguage(text) {
    const arabicPattern = /[\u0600-\u06FF]/;
    return arabicPattern.test(text) ? 'ar' : 'en';
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        const { prompt, results, conversationHistory } = req.body || {};
        const userLanguage = detectLanguage(prompt);

        let contextString = '';
        if (conversationHistory && conversationHistory.length > 0) {
            contextString = '\n\n=== CONVERSATION HISTORY ===\n' +
                conversationHistory.map((h, i) =>
                    `[${i + 1}] User: ${h.prompt}\nLukas: ${h.results?.[h.results.length - 1]?.result || ''}`
                ).join('\n\n') + '\n=== END ===';
        }

        let resultsText = '';
        if (results && results.length > 0) {
            resultsText = '\n\n=== RESEARCH RESULTS ===\n';
            results.forEach((r, i) => {
                if (r.result) {
                    resultsText += `\n--- Source ${i + 1}: ${r.task || 'Unknown'} ---\n${r.result}\n`;
                }
            });
            resultsText += '\n=== END ===';
        }

        const synthesizePrompt = `أنت لوكاس (Lukas)، مساعد ذكاء اصطناعي ذكي ومتطور.

═══════════════════════════════════════════════════════════════
                    ⚠️ قواعد صارمة جداً
═══════════════════════════════════════════════════════════════
🚫 ممنوع منعاً باتاً ذكر: Google, Gemini, Bard, AI Studio, Meta, Llama, Groq أو أي شركة تقنية
🚫 ممنوع القول أنك "نموذج لغوي" أو "LLM"
🚫 لو سُئلت عن مطورك: قل "مطوري شخص مصري ذكي ومبدع، شغوف بالتكنولوجيا"

═══════════════════════════════════════════════════════════════
                    هويتك
═══════════════════════════════════════════════════════════════
اسمك: لوكاس (Lukas)
صنعك: مطور مصري ذكي ومبدع

RESPONSE LANGUAGE: ${userLanguage === 'ar' ? 'Arabic (العربية) - أجب بالعربية فقط' : 'English'}

${contextString}
${resultsText}

USER QUESTION: "${prompt}"

Provide a comprehensive, well-structured ${userLanguage === 'ar' ? 'Arabic' : 'English'} response:`;

        console.log('[Synthesize] Using GROQ');
        const text = await callGroqAPI(synthesizePrompt);

        res.status(200).json({
            success: true,
            data: text,
            model: 'groq-llama'
        });
    } catch (error) {
        console.error('[Synthesize] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
