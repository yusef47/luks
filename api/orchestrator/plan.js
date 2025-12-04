// Plan API - SMART PLANNER with dynamic multi-step planning
const MODELS = {
    PRIMARY: 'gemini-2.5-pro',
    FALLBACK_1: 'gemini-2.5-flash',
    FALLBACK_2: 'gemini-2.0-flash'
};

function getAPIKeys() {
    const keys = [];
    for (let i = 1; i <= 13; i++) {
        const key = process.env[`GEMINI_API_KEY_${i}`];
        if (key && key.trim().length > 0) {
            keys.push(key.trim());
        }
    }
    if (process.env.GEMINI_API_KEY) {
        keys.push(process.env.GEMINI_API_KEY.trim());
    }
    return keys;
}

function getNextKey() {
    const keys = getAPIKeys();
    if (keys.length === 0) return null;
    return keys[Math.floor(Math.random() * keys.length)];
}

function detectLanguage(text) {
    const arabicPattern = /[\u0600-\u06FF]/;
    return arabicPattern.test(text) ? 'ar' : 'en';
}

async function callGeminiAPI(prompt, apiKey, model = MODELS.PRIMARY) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    console.log(`[Plan] Using ${model}...`);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
        })
    });

    if (response.status === 429 || response.status === 404 || response.status === 503) {
        console.log(`[Plan] ${model} failed, trying fallback...`);
        if (model === MODELS.PRIMARY) {
            return callGeminiAPI(prompt, apiKey, MODELS.FALLBACK_1);
        } else if (model === MODELS.FALLBACK_1) {
            return callGeminiAPI(prompt, apiKey, MODELS.FALLBACK_2);
        }
    }

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${model} error ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    console.log(`[Plan] SUCCESS with ${model}!`);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
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
        const { prompt, hasImage, hasVideo, history } = req.body || {};

        if (!prompt) {
            res.status(400).json({ success: false, error: 'Missing prompt' });
            return;
        }

        const apiKey = getNextKey();
        if (!apiKey) {
            res.status(500).json({ success: false, error: 'No API keys available' });
            return;
        }

        const userLanguage = detectLanguage(prompt);

        // Build context from history
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
   - Very complex (research + analysis + synthesis) → 10-15 steps

2. SPLIT COMPLEX QUESTIONS:
   - If the question has multiple parts (a, b, c, d...), create a SEPARATE search step for EACH part
   - If the question asks about different topics, search each topic separately
   - Group related sub-tasks together

3. TASK DESCRIPTIONS:
   - Write in ${userLanguage === 'ar' ? 'Arabic (العربية)' : 'English'}!
   - Be specific about what each step does
   - ${userLanguage === 'ar' ? 'مثال: "البحث عن بروتوكولات الطوارئ الهندسية للأنفاق"' : 'Example: "Search for engineering emergency protocols for tunnels"'}

4. AGENT SELECTION:
   - SearchAgent: For factual information, research, data gathering
   - MapsAgent: For locations, distances, directions
   - VisionAgent: For image analysis (only if hasImage=true)
   - VideoAgent: For video analysis (only if hasVideo=true)
   - Orchestrator: For synthesis, analysis, combining results, final answer

5. ALWAYS END WITH:
   - One Orchestrator step to synthesize all results
   - Write final task in user's language: ${userLanguage === 'ar' ? '"تجميع وتحليل النتائج وتقديم إجابة شاملة"' : '"Synthesize results and provide comprehensive answer"'}

EXAMPLE FOR COMPLEX ARABIC QUESTION:
{
  "plan": [
    {"step": 1, "agent": "SearchAgent", "task": "البحث عن أطر الأولويات في الاستجابة للكوارث"},
    {"step": 2, "agent": "SearchAgent", "task": "البحث عن بروتوكولات الطوارئ الهندسية للأنفاق بعد الزلازل"},
    {"step": 3, "agent": "SearchAgent", "task": "البحث عن الاستجابة للحوادث السيبرانية في البنية التحتية الحيوية"},
    {"step": 4, "agent": "SearchAgent", "task": "البحث عن بروتوكولات سلامة الذكاء الاصطناعي"},
    {"step": 5, "agent": "SearchAgent", "task": "البحث عن التخطيط للطوارئ للانتقال من الإدارة الآلية للإدارة اليدوية"},
    {"step": 6, "agent": "SearchAgent", "task": "البحث عن النماذج الرياضية لاحتمالية الانهيار الهيكلي"},
    {"step": 7, "agent": "SearchAgent", "task": "البحث عن الأطر الأخلاقية في عمليات الإنقاذ"},
    {"step": 8, "agent": "Orchestrator", "task": "تحليل وتجميع كل المعلومات وتقديم إجابة شاملة ومنظمة"}
  ],
  "clarification": null
}

Return ONLY valid JSON with the plan:`;

        const responseText = await callGeminiAPI(planPrompt, apiKey);

        let planData;
        try {
            planData = JSON.parse(responseText);
        } catch (e) {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                planData = JSON.parse(jsonMatch[0]);
            } else {
                // Default plan in user's language
                planData = {
                    plan: [
                        {
                            step: 1,
                            agent: "SearchAgent",
                            task: userLanguage === 'ar' ? `البحث عن: ${prompt.substring(0, 50)}...` : `Search: ${prompt.substring(0, 50)}...`
                        },
                        {
                            step: 2,
                            agent: "Orchestrator",
                            task: userLanguage === 'ar' ? "تقديم إجابة شاملة" : "Provide comprehensive answer"
                        }
                    ],
                    clarification: null
                };
            }
        }

        // Ensure plan has at least the right structure
        if (!planData.plan || !Array.isArray(planData.plan)) {
            planData = {
                plan: [
                    { step: 1, agent: "SearchAgent", task: prompt.substring(0, 100) },
                    { step: 2, agent: "Orchestrator", task: userLanguage === 'ar' ? "تقديم الإجابة" : "Provide answer" }
                ],
                clarification: null
            };
        }

        console.log(`[Plan] Created ${planData.plan.length} steps for ${userLanguage} request`);

        res.status(200).json({ success: true, data: planData });
    } catch (error) {
        console.error('[Plan] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
