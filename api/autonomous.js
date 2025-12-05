// Autonomous Mode - Enhanced with Sources & Better Structure
const MODELS = {
    PLANNER: 'gemini-2.5-pro',
    BRAIN: 'gemini-3-pro',
    SEARCH: 'gemini-2.5-flash',
    FALLBACK: 'gemini-2.0-flash'
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

async function callGeminiAPI(prompt, apiKey, model = MODELS.SEARCH, useSearch = false) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
    if (useSearch) body.tools = [{ googleSearch: {} }];

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body)
    });

    if (response.status === 429 || response.status === 404 || response.status === 503) {
        if (model !== MODELS.FALLBACK) {
            return callGeminiAPI(prompt, apiKey, MODELS.FALLBACK, useSearch);
        }
    }

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error ${response.status}: ${errorText.substring(0, 100)}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// Create a detailed plan
async function createPlan(prompt, language, apiKey) {
    const planPrompt = `You are a research planner. Create a plan for: "${prompt}"

Create 6-8 specific research steps. Each step should focus on a different aspect.

Return JSON ONLY:
{
    "taskTitle": "${language === 'ar' ? 'عنوان بالعربية' : 'Title in English'}",
    "steps": [
        {"id": 1, "task": "Research step description"},
        {"id": 2, "task": "..."}
    ]
}`;

    const result = await callGeminiAPI(planPrompt, apiKey, MODELS.PLANNER);

    try {
        return JSON.parse(result);
    } catch {
        const match = result.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        return {
            taskTitle: prompt.substring(0, 50),
            steps: [
                { id: 1, task: `Research main topic: ${prompt}` },
                { id: 2, task: 'Gather statistics and data' },
                { id: 3, task: 'Find examples and case studies' },
                { id: 4, task: 'Identify trends and predictions' }
            ]
        };
    }
}

// Execute all steps
async function executeTask(prompt, plan, language, apiKey) {
    const results = [];
    let context = `Original Request: ${prompt}\n\n`;
    const sources = [];

    for (const step of plan.steps) {
        try {
            console.log(`[Autonomous] Step ${step.id}: ${step.task}`);

            const result = await callGeminiAPI(
                `Research this topic thoroughly: ${step.task}

Provide:
1. Detailed information with specific facts and numbers
2. At least 2-3 credible sources (websites, reports, studies)
3. Current data from 2024-2025 if available

Format sources as: [Source: name - url or description]`,
                apiKey,
                MODELS.SEARCH,
                true
            );

            // Extract sources from result
            const sourceMatches = result.match(/\[Source:.*?\]/g) || [];
            sourceMatches.forEach(s => {
                if (!sources.includes(s)) sources.push(s);
            });

            results.push({
                stepId: step.id,
                task: step.task,
                result: result,
                success: true
            });

            context += `\n=== ${step.task} ===\n${result}\n`;
        } catch (error) {
            console.error(`[Autonomous] Step ${step.id} failed:`, error.message);
            results.push({
                stepId: step.id,
                task: step.task,
                result: 'Failed to get information',
                success: false
            });
        }
    }

    // Limit sources to 5-8
    const limitedSources = sources.slice(0, 8);

    // Generate Executive Summary
    const summaryPrompt = `Write a brief executive summary (2-3 paragraphs) in ${language === 'ar' ? 'Arabic' : 'English'}.

Topic: ${prompt}

Research Data:
${results.map(r => `${r.task}: ${r.result.substring(0, 400)}`).join('\n\n')}

Requirements:
- Be specific with numbers and facts
- Highlight the most important findings
- Write complete text, no placeholders`;

    const summary = await callGeminiAPI(summaryPrompt, apiKey, MODELS.BRAIN);

    // Generate Sections
    const sectionsPrompt = `Create a structured report in ${language === 'ar' ? 'Arabic' : 'English'} with these EXACT sections:

Topic: ${prompt}

Research Data:
${context.substring(0, 8000)}

Generate these sections (write COMPLETE content for each, no placeholders):

SECTION 1 - INTRODUCTION:
Write 2-3 paragraphs introducing the topic

SECTION 2 - KEY FINDINGS:
List 5-8 main findings with bullet points and specific data

SECTION 3 - DETAILED ANALYSIS:
Provide in-depth analysis with subsections, numbers, and examples

SECTION 4 - RECOMMENDATIONS:
List 4-6 actionable recommendations

SECTION 5 - CONCLUSION:
Write 2 paragraphs summarizing the key takeaways

Format with clear headers using ##`;

    const sections = await callGeminiAPI(sectionsPrompt, apiKey, MODELS.BRAIN);

    // Generate Key Statistics for potential charts
    const statsPrompt = `Extract 4-6 key statistics/numbers from this research that could be shown in a chart.

Research: ${context.substring(0, 3000)}

Return JSON array ONLY:
[
    {"label": "Statistic name", "value": 75, "unit": "%"},
    {"label": "Another stat", "value": 150000, "unit": "$"}
]`;

    let stats = [];
    try {
        const statsResult = await callGeminiAPI(statsPrompt, apiKey, MODELS.FALLBACK);
        const match = statsResult.match(/\[[\s\S]*\]/);
        if (match) stats = JSON.parse(match[0]);
    } catch (e) {
        console.log('[Autonomous] Could not extract stats');
    }

    return { results, summary, sections, sources: limitedSources, stats };
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
        const { action, prompt } = req.body || {};

        const apiKey = getNextKey();
        if (!apiKey) {
            return res.status(500).json({ success: false, error: 'No API keys available' });
        }

        if (action === 'run' && prompt) {
            const language = detectLanguage(prompt);

            console.log('[Autonomous] Creating plan...');
            const plan = await createPlan(prompt, language, apiKey);

            console.log(`[Autonomous] Executing ${plan.steps.length} steps...`);
            const { results, summary, sections, sources, stats } = await executeTask(prompt, plan, language, apiKey);

            console.log('[Autonomous] Task completed!');

            return res.status(200).json({
                success: true,
                data: {
                    title: plan.taskTitle,
                    steps: plan.steps,
                    stepsCompleted: results.length,
                    summary: summary,
                    sections: sections,
                    sources: sources,
                    stats: stats,
                    rawResults: results
                }
            });
        }

        if (action === 'plan' && prompt) {
            const language = detectLanguage(prompt);
            const plan = await createPlan(prompt, language, apiKey);

            return res.status(200).json({
                success: true,
                data: {
                    title: plan.taskTitle,
                    steps: plan.steps,
                    estimatedTime: `${plan.steps.length * 30} seconds`
                }
            });
        }

        return res.status(400).json({
            success: false,
            error: 'Invalid action. Use "run" or "plan" with a prompt.'
        });

    } catch (error) {
        console.error('[Autonomous] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
