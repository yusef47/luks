// Plan API - GROQ ONLY (Testing Mode)
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
            console.log(`[Plan] GROQ Attempt ${i + 1}: ${model}`);

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
                console.log(`[Plan] Groq rate limited, trying next...`);
                continue;
            }

            if (!response.ok) {
                console.log(`[Plan] Groq error ${response.status}, trying next...`);
                continue;
            }

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content;

            if (text) {
                console.log(`[Plan] ✅ GROQ SUCCESS with ${model}!`);
                return text;
            }
        } catch (error) {
            console.log(`[Plan] Error: ${error.message}`);
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
        const { prompt, hasImage, hasVideo, history } = req.body || {};
        if (!prompt) return res.status(400).json({ success: false, error: 'Missing prompt' });

        const userLanguage = detectLanguage(prompt);

        let historyContext = '';
        if (history && history.length > 0) {
            historyContext = '\n\nRECENT CONVERSATION:\n' +
                history.slice(-3).map(h => `User: ${h.prompt}`).join('\n');
        }

        const planPrompt = `You are an intelligent task planner for Lukas AI assistant.

USER'S LANGUAGE: ${userLanguage === 'ar' ? 'Arabic (العربية)' : 'English'}
IMPORTANT: Write ALL task descriptions in the USER'S LANGUAGE!

${historyContext}

USER REQUEST: "${prompt}"
Has Image: ${hasImage || false}
Has Video: ${hasVideo || false}

PLANNING RULES:
1. ANALYZE COMPLEXITY:
   - Simple question (1 topic) → 2-3 steps
   - Medium question (2-3 topics) → 4-5 steps
   - Complex question (multiple parts/topics) → 6-10 steps

2. AGENT SELECTION:
   - SearchAgent: For factual information, research, data gathering
   - Orchestrator: For synthesis, analysis, combining results, final answer

3. ALWAYS END WITH one Orchestrator step to synthesize all results.

Return ONLY valid JSON with the plan in this format:
{
  "plan": [
    {"step": 1, "agent": "SearchAgent", "task": "task description"},
    {"step": 2, "agent": "Orchestrator", "task": "synthesize results"}
  ],
  "clarification": null
}`;

        console.log('[Plan] Using GROQ');
        const responseText = await callGroqAPI(planPrompt);

        let planData;
        try {
            planData = JSON.parse(responseText);
        } catch (e) {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                planData = JSON.parse(jsonMatch[0]);
            } else {
                planData = {
                    plan: [
                        { step: 1, agent: "SearchAgent", task: userLanguage === 'ar' ? `البحث عن: ${prompt.substring(0, 50)}...` : `Search: ${prompt.substring(0, 50)}...` },
                        { step: 2, agent: "Orchestrator", task: userLanguage === 'ar' ? "تقديم إجابة شاملة" : "Provide comprehensive answer" }
                    ],
                    clarification: null
                };
            }
        }

        if (!planData.plan || !Array.isArray(planData.plan)) {
            planData = {
                plan: [
                    { step: 1, agent: "SearchAgent", task: prompt.substring(0, 100) },
                    { step: 2, agent: "Orchestrator", task: userLanguage === 'ar' ? "تقديم الإجابة" : "Provide answer" }
                ],
                clarification: null
            };
        }

        console.log(`[Plan] Created ${planData.plan.length} steps`);
        res.status(200).json({ success: true, data: planData });
    } catch (error) {
        console.error('[Plan] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
