// Autonomous Task Executor - Executes task steps in background
const MODELS = {
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

async function callGeminiAPI(prompt, apiKey, model, useSearch = false) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const body = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
    };

    if (useSearch) {
        body.tools = [{ googleSearch: {} }];
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
        },
        body: JSON.stringify(body)
    });

    if (response.status === 429 || response.status === 404 || response.status === 503) {
        if (model !== MODELS.FALLBACK) {
            return callGeminiAPI(prompt, apiKey, MODELS.FALLBACK, useSearch);
        }
    }

    if (!response.ok) {
        throw new Error(`API error ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function executeStep(step, context, apiKey) {
    const { agent, task } = step;
    let result = '';
    let model = MODELS.SEARCH;
    let useSearch = false;

    switch (agent) {
        case 'SearchAgent':
            useSearch = true;
            result = await callGeminiAPI(
                `Search and gather detailed information about: ${task}\n\nProvide comprehensive, factual information with sources when available.`,
                apiKey,
                model,
                true
            );
            break;

        case 'AnalysisAgent':
            model = MODELS.BRAIN;
            result = await callGeminiAPI(
                `Analyze the following data and provide insights:\n\nTask: ${task}\n\nContext from previous steps:\n${context}\n\nProvide detailed analysis with conclusions.`,
                apiKey,
                model
            );
            break;

        case 'WriterAgent':
            model = MODELS.BRAIN;
            result = await callGeminiAPI(
                `Write professional content based on the following:\n\nTask: ${task}\n\nResearch and analysis:\n${context}\n\nWrite clear, professional, and comprehensive content.`,
                apiKey,
                model
            );
            break;

        case 'SynthesisAgent':
            model = MODELS.BRAIN;
            result = await callGeminiAPI(
                `Synthesize all the information into a cohesive output:\n\nTask: ${task}\n\nAll gathered information:\n${context}\n\nCreate a well-structured synthesis.`,
                apiKey,
                model
            );
            break;

        default:
            // Generic execution
            result = await callGeminiAPI(
                `Execute the following task:\n${task}\n\nContext:\n${context}`,
                apiKey,
                MODELS.SEARCH,
                true
            );
    }

    return result;
}

function addNotification(task, type, message) {
    task.notifications.push({
        id: Date.now(),
        type: type, // 'progress', 'warning', 'question', 'success', 'error'
        message: message,
        timestamp: new Date().toISOString(),
        read: false
    });
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
        const { taskId, executeAll } = req.body || {};

        if (!taskId) {
            res.status(400).json({ success: false, error: 'Missing taskId' });
            return;
        }

        if (!global.autonomousTasks) {
            res.status(404).json({ success: false, error: 'No tasks found' });
            return;
        }

        const task = global.autonomousTasks.get(taskId);
        if (!task) {
            res.status(404).json({ success: false, error: 'Task not found' });
            return;
        }

        const apiKey = getNextKey();
        if (!apiKey) {
            res.status(500).json({ success: false, error: 'No API keys available' });
            return;
        }

        // Start execution
        task.status = 'running';
        task.updatedAt = new Date().toISOString();
        addNotification(task, 'progress', task.language === 'ar' ? '🚀 بدأ تنفيذ المهمة' : '🚀 Task execution started');

        // Get all steps flattened
        const allSteps = [];
        task.plan.phases.forEach((phase, phaseIndex) => {
            phase.steps.forEach((step, stepIndex) => {
                allSteps.push({
                    ...step,
                    phaseIndex,
                    phaseName: phase.name,
                    globalIndex: allSteps.length
                });
            });
        });

        // Context accumulator
        let context = `Original Request: ${task.prompt}\n\n`;

        // Execute steps
        const stepsToExecute = executeAll ? allSteps : [allSteps[task.currentStep]];

        for (const step of stepsToExecute) {
            if (task.status === 'cancelled') break;

            try {
                task.currentStep = step.globalIndex;
                task.currentPhase = step.phaseIndex;
                task.progress = Math.round((step.globalIndex / allSteps.length) * 100);
                task.updatedAt = new Date().toISOString();

                const progressMsg = task.language === 'ar'
                    ? `📌 جاري تنفيذ: ${step.task}`
                    : `📌 Executing: ${step.task}`;
                addNotification(task, 'progress', progressMsg);

                console.log(`[Autonomous] Executing step ${step.globalIndex + 1}/${allSteps.length}: ${step.task}`);

                // Execute the step
                const result = await executeStep(step, context, apiKey);

                // Store result
                task.results.push({
                    stepId: step.id,
                    agent: step.agent,
                    task: step.task,
                    result: result,
                    completedAt: new Date().toISOString()
                });

                // Add to context for next steps
                context += `\n\n=== ${step.task} ===\n${result}`;

                // Update progress
                task.progress = Math.round(((step.globalIndex + 1) / allSteps.length) * 100);

                // Add success notification for phase completion
                if (step.globalIndex === allSteps.length - 1 ||
                    (stepsToExecute[stepsToExecute.indexOf(step) + 1]?.phaseIndex !== step.phaseIndex)) {
                    const phaseMsg = task.language === 'ar'
                        ? `✅ اكتملت المرحلة: ${step.phaseName}`
                        : `✅ Phase completed: ${step.phaseName}`;
                    addNotification(task, 'success', phaseMsg);
                }

            } catch (stepError) {
                console.error(`[Autonomous] Step error:`, stepError.message);

                // Try recovery
                const errorMsg = task.language === 'ar'
                    ? `⚠️ مشكلة في الخطوة: ${step.task}. جاري المحاولة مرة أخرى...`
                    : `⚠️ Issue with step: ${step.task}. Retrying...`;
                addNotification(task, 'warning', errorMsg);

                // Simple retry with fallback
                try {
                    const retryResult = await callGeminiAPI(
                        `Execute: ${step.task}\nContext: ${context.substring(0, 2000)}`,
                        apiKey,
                        MODELS.FALLBACK,
                        true
                    );

                    task.results.push({
                        stepId: step.id,
                        agent: step.agent,
                        task: step.task,
                        result: retryResult,
                        completedAt: new Date().toISOString(),
                        recovered: true
                    });

                    context += `\n\n=== ${step.task} ===\n${retryResult}`;
                } catch (retryError) {
                    // Mark as failed but continue
                    task.results.push({
                        stepId: step.id,
                        agent: step.agent,
                        task: step.task,
                        result: 'Step failed after retry',
                        failed: true,
                        error: retryError.message
                    });
                }
            }

            // Small delay between steps
            await new Promise(r => setTimeout(r, 500));
        }

        // Check if completed
        if (task.results.length >= allSteps.length) {
            task.status = 'completed';
            task.progress = 100;
            task.completedAt = new Date().toISOString();

            const completeMsg = task.language === 'ar'
                ? '🎉 تم إكمال المهمة بنجاح! النتائج جاهزة.'
                : '🎉 Task completed successfully! Results are ready.';
            addNotification(task, 'success', completeMsg);
        }

        task.updatedAt = new Date().toISOString();
        global.autonomousTasks.set(taskId, task);

        res.status(200).json({
            success: true,
            task: {
                id: task.id,
                status: task.status,
                progress: task.progress,
                currentStep: task.currentStep,
                totalSteps: allSteps.length,
                notifications: task.notifications.slice(-5),
                resultsCount: task.results.length
            }
        });

    } catch (error) {
        console.error('[Autonomous Execute] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
