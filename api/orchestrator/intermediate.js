// Intermediate API - GROQ ONLY (Testing Mode)
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
            console.log(`[Intermediate] GROQ Attempt ${i + 1}: ${model}`);

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
                console.log(`[Intermediate] ✅ GROQ SUCCESS with ${model}!`);
                return text;
            }
        } catch (error) {
            console.log(`[Intermediate] Error: ${error.message}`);
        }
    }

    throw new Error('All Groq API attempts failed');
}

function truncateText(text, maxLength = 6000) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '\n[محتوى مختصر...]';
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        const { task, prompt, results } = req.body || {};

        const truncatedPrompt = truncateText(prompt, 5000);
        const truncatedResults = results ? truncateText(JSON.stringify(results), 1500) : '[]';

        const intermediatePrompt = `أنت لوكاس. نفذ هذه المهمة بدقة:

المهمة: ${task}
الطلب: ${truncatedPrompt}
${truncatedResults !== '[]' ? `السياق: ${truncatedResults}` : ''}

قدم إجابة مفيدة وموجزة.`;

        console.log('[Intermediate] Using GROQ');
        const responseText = await callGroqAPI(intermediatePrompt);
        res.status(200).json({ success: true, data: responseText });
    } catch (error) {
        console.error('[Intermediate] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
