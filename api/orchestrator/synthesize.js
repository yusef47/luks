// Synthesize API with Smart Fallback
const MODELS = {
    PRIMARY: 'gemini-2.5-flash',
    FALLBACK_1: 'gemini-2.5-flash-lite',
    FALLBACK_2: 'gemini-robotics-er-1.5-preview'
};

const ALL_MODELS = [MODELS.PRIMARY, MODELS.FALLBACK_1, MODELS.FALLBACK_2];

function getAPIKeys() {
    const keys = [];
    for (let i = 1; i <= 13; i++) {
        const key = process.env[`GEMINI_API_KEY_${i}`];
        if (key && key.trim().length > 0) keys.push(key.trim());
    }
    if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY.trim());
    return keys.sort(() => Math.random() - 0.5);
}

function detectLanguage(text) {
    const arabicPattern = /[\u0600-\u06FF]/;
    return arabicPattern.test(text) ? 'ar' : 'en';
}

// Smart call that tries all keys and models
async function callGeminiAPI(prompt, maxRetries = 9) {
    const keys = getAPIKeys();
    if (keys.length === 0) throw new Error('No API keys');

    let lastError = null;
    let attempts = 0;

    for (const model of ALL_MODELS) {
        for (const apiKey of keys) {
            if (attempts >= maxRetries) break;
            attempts++;

            try {
                console.log(`[Synthesize] Attempt ${attempts}: ${model}`);

                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }]
                    })
                });

                if (response.status === 429) { lastError = new Error('Rate limit'); continue; }
                if (response.status === 404) { lastError = new Error('Model not found'); break; }
                if (!response.ok) { lastError = new Error(`Error ${response.status}`); continue; }

                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (!text) { lastError = new Error('Empty'); continue; }

                console.log(`[Synthesize] SUCCESS on attempt ${attempts}!`);
                return { text, model };

            } catch (e) { lastError = e; continue; }
        }
    }
    throw lastError || new Error('All attempts failed');
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
        const { prompt, results, conversationHistory } = req.body || {};

        const userLanguage = detectLanguage(prompt);

        // Build conversation context
        let contextString = '';
        if (conversationHistory && conversationHistory.length > 0) {
            contextString = '\n\n=== CONVERSATION HISTORY ===\n' +
                conversationHistory.map((h, i) =>
                    `[${i + 1}] User: ${h.prompt}\nLukas: ${h.results?.[h.results.length - 1]?.result || ''}`
                ).join('\n\n') + '\n=== END ===';
        }

        // Format search results clearly
        let resultsText = '';
        if (results && results.length > 0) {
            resultsText = '\n\n=== RESEARCH RESULTS FROM DIFFERENT SOURCES ===\n';
            results.forEach((r, i) => {
                if (r.result) {
                    resultsText += `\n--- Source ${i + 1}: ${r.task || 'Unknown'} ---\n${r.result}\n`;
                }
            });
            resultsText += '\n=== END OF RESULTS ===';
        }

        const synthesizePrompt = `أنت لوكاس (Lukas)، مساعد ذكاء اصطناعي ذكي ومتطور ذو قدرات تحليلية عميقة.

═══════════════════════════════════════════════════════════════
                    ⚠️ قواعد صارمة جداً
═══════════════════════════════════════════════════════════════
🚫 ممنوع منعاً باتاً ذكر: Google, Gemini, Bard, AI Studio, أو أي شركة تقنية
🚫 ممنوع القول أنك "نموذج لغوي" أو "LLM"
🚫 لو سُئلت عن مطورك: قل "مطوري شخص مصري ذكي ومبدع، شغوف بالتكنولوجيا"

═══════════════════════════════════════════════════════════════
                    هويتك
═══════════════════════════════════════════════════════════════
اسمك: لوكاس (Lukas)
صنعك: مطور مصري ذكي ومبدع

RESPONSE LANGUAGE: ${userLanguage === 'ar' ? 'Arabic (العربية) - أجب بالعربية فقط' : 'English'}

THINKING PROCESS:
1. First, carefully read ALL the research results below
2. Identify all parts of the user's question
3. For each part, find relevant information from the results
4. If you discover you need to think differently about something, do it naturally
5. Organize your response logically
6. If the question has parts (a, b, c, d...), address EACH part separately with its own section

RESPONSE FORMAT FOR COMPLEX QUESTIONS:
${userLanguage === 'ar' ? `
## الجزء الأول: [عنوان]
[إجابة مفصلة]

## الجزء الثاني: [عنوان]
[إجابة مفصلة]

... وهكذا
` : `
## Part 1: [Title]
[Detailed answer]

## Part 2: [Title]
[Detailed answer]

... and so on
`}

QUALITY RULES:
- Be comprehensive but organized
- Use headings and structure
- Include specific facts, numbers, and examples from the research
- If something needs a formula or model, provide it clearly
- Don't skip any part of the question
- If you realize mid-answer that you need to adjust your thinking, do it and explain briefly

${contextString}

${resultsText}

USER QUESTION: "${prompt}"

Now provide a comprehensive, well-structured ${userLanguage === 'ar' ? 'Arabic' : 'English'} response that addresses ALL parts of the question:`;

        const { text, model } = await callGeminiAPI(synthesizePrompt);

        res.status(200).json({
            success: true,
            data: text,
            model: model
        });
    } catch (error) {
        console.error('[Synthesize] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
