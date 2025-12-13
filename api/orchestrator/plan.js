// Plan API - GROQ ONLY (Testing Mode)
import { callGroqAPI } from '../lib/groq.js';

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
