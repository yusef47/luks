// Autonomous Task Creator - Creates a new long-running task
const MODELS = {
    PLANNER: 'gemini-2.5-pro',
    FALLBACK: 'gemini-2.0-flash'
};

// In-memory task storage (in production, use a database)
// Tasks are stored globally and persist during server runtime
if (!global.autonomousTasks) {
    global.autonomousTasks = new Map();
}

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

async function callGeminiAPI(prompt, apiKey, model = MODELS.PLANNER) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

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

    if (response.status === 429 || response.status === 404) {
        if (model === MODELS.PLANNER) {
            return callGeminiAPI(prompt, apiKey, MODELS.FALLBACK);
        }
    }

    if (!response.ok) {
        throw new Error(`API error ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
}

async function createDetailedPlan(prompt, language, apiKey) {
    const planPrompt = `You are an autonomous task planner. Create a DETAILED execution plan for a complex task.

USER REQUEST: "${prompt}"
LANGUAGE: ${language === 'ar' ? 'Arabic' : 'English'}

Create a comprehensive plan with 10-20 steps. Each step should be:
1. Specific and actionable
2. Independent enough to execute separately
3. Have clear success criteria

PHASES:
1. Research & Data Gathering (3-5 steps)
2. Analysis & Processing (3-5 steps)
3. Synthesis & Writing (2-4 steps)
4. Output Generation (2-4 steps)
5. Quality Check (1-2 steps)

Return JSON:
{
    "taskTitle": "${language === 'ar' ? 'عنوان المهمة بالعربية' : 'Task title in English'}",
    "estimatedTime": "2-4 hours",
    "phases": [
        {
            "name": "${language === 'ar' ? 'اسم المرحلة' : 'Phase name'}",
            "steps": [
                {
                    "id": 1,
                    "agent": "SearchAgent",
                    "task": "${language === 'ar' ? 'وصف المهمة بالعربية' : 'Task description'}",
                    "critical": true,
                    "estimatedMinutes": 5
                }
            ]
        }
    ],
    "outputs": ["PDF Report", "Presentation", "Summary"],
    "totalSteps": 15
}`;

    const result = await callGeminiAPI(planPrompt, apiKey);

    try {
        return JSON.parse(result);
    } catch (e) {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error('Failed to create plan');
    }
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
        const { prompt, userId } = req.body || {};

        if (!prompt) {
            res.status(400).json({ success: false, error: 'Missing prompt' });
            return;
        }

        const apiKey = getNextKey();
        if (!apiKey) {
            res.status(500).json({ success: false, error: 'No API keys available' });
            return;
        }

        const language = detectLanguage(prompt);

        // Create detailed plan
        console.log('[Autonomous] Creating detailed plan...');
        const plan = await createDetailedPlan(prompt, language, apiKey);

        // Generate unique task ID
        const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create task object
        const task = {
            id: taskId,
            userId: userId || 'anonymous',
            prompt: prompt,
            language: language,
            status: 'pending', // pending, running, paused, waiting_approval, completed, failed
            progress: 0,
            currentPhase: 0,
            currentStep: 0,
            plan: plan,
            results: [],
            notifications: [],
            outputs: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: null,
            error: null
        };

        // Store task
        global.autonomousTasks.set(taskId, task);

        console.log(`[Autonomous] Task ${taskId} created with ${plan.totalSteps} steps`);

        res.status(200).json({
            success: true,
            task: {
                id: taskId,
                title: plan.taskTitle,
                estimatedTime: plan.estimatedTime,
                totalSteps: plan.totalSteps,
                phases: plan.phases.length,
                outputs: plan.outputs,
                status: 'pending'
            }
        });

    } catch (error) {
        console.error('[Autonomous Create] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
