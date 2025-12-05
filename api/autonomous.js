// Autonomous Mode - All-in-One Execution
// Executes everything in a single request (stateless compatible)

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
    const planPrompt = `You are a task planner. Create an execution plan for: "${prompt}"

Create 5-10 specific search/research steps.

Return JSON ONLY:
{
    "taskTitle": "${language === 'ar' ? 'عنوان بالعربية' : 'Title in English'}",
    "steps": [
        {"id": 1, "task": "${language === 'ar' ? 'وصف المهمة' : 'Task description'}"},
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
            steps: [{ id: 1, task: prompt }]
        };
    }
}

// Execute all steps and generate final report
async function executeTask(prompt, plan, language, apiKey) {
    const results = [];
    let context = `Original Request: ${prompt}\n\n`;

    // Execute each step
    for (const step of plan.steps) {
        try {
            console.log(`[Autonomous] Executing step ${step.id}: ${step.task}`);

            const result = await callGeminiAPI(
                `Research and provide detailed information about: ${step.task}\n\nContext: ${context.substring(0, 2000)}`,
                apiKey,
                MODELS.SEARCH,
                true
            );

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

    // Generate summary
    const summaryPrompt = `Create a brief executive summary in ${language === 'ar' ? 'Arabic' : 'English'}:

Topic: ${prompt}

Research Results:
${results.map(r => `- ${r.task}: ${r.result.substring(0, 300)}...`).join('\n')}

Write a concise 1-paragraph summary of the key findings.`;

    const summary = await callGeminiAPI(summaryPrompt, apiKey, MODELS.BRAIN);

    // Generate full report
    const reportPrompt = `Create a comprehensive report in ${language === 'ar' ? 'Arabic' : 'English'}:

Topic: ${prompt}

All Research:
${context}

Create a well-structured report with:
1. Introduction
2. Key Findings (organized by topic)
3. Analysis
4. Recommendations
5. Conclusion

Use proper headings and bullet points.`;

    const report = await callGeminiAPI(reportPrompt, apiKey, MODELS.BRAIN);

    return { results, summary, report };
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

        // For 'run' action: Create plan + Execute + Return results (all in one)
        if (action === 'run' && prompt) {
            const language = detectLanguage(prompt);

            console.log('[Autonomous] Creating plan...');
            const plan = await createPlan(prompt, language, apiKey);

            console.log(`[Autonomous] Executing ${plan.steps.length} steps...`);
            const { results, summary, report } = await executeTask(prompt, plan, language, apiKey);

            console.log('[Autonomous] Task completed!');

            return res.status(200).json({
                success: true,
                data: {
                    title: plan.taskTitle,
                    steps: plan.steps,
                    stepsCompleted: results.length,
                    summary: summary,
                    report: report,
                    rawResults: results
                }
            });
        }

        // For 'plan' action: Just create and return the plan (preview)
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
