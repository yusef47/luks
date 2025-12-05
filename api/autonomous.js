// Autonomous Mode - All-in-One API
// Combines: create, execute, status, list, results, cancel

const MODELS = {
    PLANNER: 'gemini-2.5-pro',
    BRAIN: 'gemini-3-pro',
    SEARCH: 'gemini-2.5-flash',
    FALLBACK: 'gemini-2.0-flash'
};

// In-memory task storage
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

    if (!response.ok) throw new Error(`API error ${response.status}`);
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ========== CREATE ==========
async function handleCreate(prompt, userId, apiKey) {
    const language = detectLanguage(prompt);

    const planPrompt = `Create a detailed execution plan for: "${prompt}"
Return JSON with 10-20 steps:
{
    "taskTitle": "Title in ${language === 'ar' ? 'Arabic' : 'English'}",
    "estimatedTime": "2-4 hours",
    "phases": [
        {"name": "Phase name", "steps": [{"id": 1, "agent": "SearchAgent", "task": "Task description", "estimatedMinutes": 5}]}
    ],
    "outputs": ["Report", "Summary"],
    "totalSteps": 15
}`;

    const result = await callGeminiAPI(planPrompt, apiKey, MODELS.PLANNER);
    let plan;
    try {
        plan = JSON.parse(result);
    } catch {
        const match = result.match(/\{[\s\S]*\}/);
        plan = match ? JSON.parse(match[0]) : { taskTitle: prompt.substring(0, 50), phases: [{ name: "Main", steps: [{ id: 1, agent: "SearchAgent", task: prompt }] }], totalSteps: 1, outputs: ["Report"] };
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const task = {
        id: taskId, userId: userId || 'anonymous', prompt, language,
        status: 'pending', progress: 0, currentPhase: 0, currentStep: 0,
        plan, results: [], notifications: [], outputs: [],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };

    global.autonomousTasks.set(taskId, task);
    return { id: taskId, title: plan.taskTitle, totalSteps: plan.totalSteps, status: 'pending' };
}

// ========== EXECUTE ==========
async function handleExecute(taskId, apiKey) {
    const task = global.autonomousTasks.get(taskId);
    if (!task) throw new Error('Task not found');

    task.status = 'running';
    task.notifications.push({ id: Date.now(), type: 'progress', message: '🚀 Started', timestamp: new Date().toISOString() });

    const allSteps = [];
    task.plan.phases.forEach((phase, pi) => {
        phase.steps.forEach((step, si) => {
            allSteps.push({ ...step, phaseIndex: pi, phaseName: phase.name, globalIndex: allSteps.length });
        });
    });

    let context = `Request: ${task.prompt}\n\n`;

    for (const step of allSteps) {
        if (task.status === 'cancelled') break;

        task.currentStep = step.globalIndex;
        task.progress = Math.round((step.globalIndex / allSteps.length) * 100);
        task.notifications.push({ id: Date.now(), type: 'progress', message: `📌 ${step.task}`, timestamp: new Date().toISOString() });

        try {
            const result = await callGeminiAPI(`${step.task}\n\nContext: ${context.substring(0, 3000)}`, apiKey, MODELS.SEARCH, true);
            task.results.push({ stepId: step.id, task: step.task, result, completedAt: new Date().toISOString() });
            context += `\n=== ${step.task} ===\n${result}`;
        } catch (e) {
            task.results.push({ stepId: step.id, task: step.task, result: 'Step failed', failed: true });
        }

        await new Promise(r => setTimeout(r, 300));
    }

    task.status = 'completed';
    task.progress = 100;
    task.completedAt = new Date().toISOString();
    task.notifications.push({ id: Date.now(), type: 'success', message: '🎉 Completed!', timestamp: new Date().toISOString() });

    global.autonomousTasks.set(taskId, task);
    return { status: task.status, progress: task.progress };
}

// ========== STATUS ==========
function handleStatus(taskId) {
    const task = global.autonomousTasks.get(taskId);
    if (!task) throw new Error('Task not found');

    let totalSteps = 0;
    task.plan.phases.forEach(p => totalSteps += p.steps.length);

    return {
        id: task.id, title: task.plan.taskTitle, status: task.status, progress: task.progress,
        currentStep: task.currentStep + 1, totalSteps, notifications: task.notifications,
        createdAt: task.createdAt, completedAt: task.completedAt
    };
}

// ========== LIST ==========
function handleList() {
    const tasks = [];
    global.autonomousTasks.forEach(task => {
        let totalSteps = 0;
        task.plan.phases.forEach(p => totalSteps += p.steps.length);
        tasks.push({
            id: task.id, title: task.plan.taskTitle, status: task.status, progress: task.progress,
            currentStep: task.currentStep + 1, totalSteps, outputs: task.plan.outputs,
            createdAt: task.createdAt, completedAt: task.completedAt
        });
    });
    return tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ========== RESULTS ==========
async function handleResults(taskId, apiKey) {
    const task = global.autonomousTasks.get(taskId);
    if (!task) throw new Error('Task not found');
    if (task.status !== 'completed') throw new Error('Task not completed');

    let allResults = '';
    task.results.forEach(r => allResults += `\n=== ${r.task} ===\n${r.result}`);

    const summary = await callGeminiAPI(`Create executive summary in ${task.language === 'ar' ? 'Arabic' : 'English'}:\n${allResults.substring(0, 5000)}`, apiKey, MODELS.BRAIN);
    const report = await callGeminiAPI(`Create full report with sections in ${task.language === 'ar' ? 'Arabic' : 'English'}:\n${allResults}`, apiKey, MODELS.BRAIN);

    return { summary, report, rawResults: task.results };
}

// ========== CANCEL ==========
function handleCancel(taskId) {
    const task = global.autonomousTasks.get(taskId);
    if (!task) throw new Error('Task not found');
    task.status = 'cancelled';
    task.notifications.push({ id: Date.now(), type: 'warning', message: '⛔ Cancelled', timestamp: new Date().toISOString() });
    global.autonomousTasks.set(taskId, task);
    return { success: true };
}

// ========== MAIN HANDLER ==========
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { action, taskId, prompt, userId } = req.body || {};
        const apiKey = getNextKey();

        if (!apiKey) {
            return res.status(500).json({ success: false, error: 'No API keys' });
        }

        let result;

        switch (action) {
            case 'create':
                result = await handleCreate(prompt, userId, apiKey);
                break;
            case 'execute':
                result = await handleExecute(taskId, apiKey);
                break;
            case 'status':
                result = handleStatus(taskId);
                break;
            case 'list':
                result = handleList();
                break;
            case 'results':
                result = await handleResults(taskId, apiKey);
                break;
            case 'cancel':
                result = handleCancel(taskId);
                break;
            default:
                return res.status(400).json({ success: false, error: 'Invalid action' });
        }

        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('[Autonomous] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
