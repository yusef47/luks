// Autonomous Task Results - Get final results and generate outputs
const MODELS = {
    BRAIN: 'gemini-3-pro',
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

async function callGeminiAPI(prompt, apiKey, model = MODELS.BRAIN) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        })
    });

    if (response.status === 429 || response.status === 404) {
        if (model === MODELS.BRAIN) {
            return callGeminiAPI(prompt, apiKey, MODELS.FALLBACK);
        }
    }

    if (!response.ok) {
        throw new Error(`API error ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function generateFinalReport(task, apiKey) {
    // Combine all results
    let allResults = '';
    task.results.forEach((r, i) => {
        allResults += `\n\n=== ${r.task} ===\n${r.result}`;
    });

    const reportPrompt = `Based on all the research and analysis below, create a COMPREHENSIVE FINAL REPORT.

ORIGINAL REQUEST: ${task.prompt}

ALL GATHERED INFORMATION:
${allResults}

Create a professional report with:
1. Executive Summary (1 page)
2. Key Findings (organized by topic)
3. Detailed Analysis
4. Data and Statistics
5. Recommendations
6. Conclusion

Write in ${task.language === 'ar' ? 'Arabic' : 'English'}.
Use proper headings, bullet points, and formatting.`;

    return await callGeminiAPI(reportPrompt, apiKey);
}

async function generateExecutiveSummary(task, apiKey) {
    let allResults = '';
    task.results.forEach((r, i) => {
        allResults += `\n${r.task}: ${r.result.substring(0, 500)}...`;
    });

    const summaryPrompt = `Create a 1-page EXECUTIVE SUMMARY of this research:

TOPIC: ${task.prompt}

KEY FINDINGS:
${allResults}

Write a concise, professional executive summary in ${task.language === 'ar' ? 'Arabic' : 'English'}.
Include: Key points, Main conclusions, Top recommendations.`;

    return await callGeminiAPI(summaryPrompt, apiKey);
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { taskId, format } = req.method === 'GET' ? req.query : req.body;

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

        if (task.status !== 'completed') {
            res.status(400).json({
                success: false,
                error: 'Task not completed yet',
                status: task.status,
                progress: task.progress
            });
            return;
        }

        const apiKey = getNextKey();
        if (!apiKey) {
            res.status(500).json({ success: false, error: 'No API keys available' });
            return;
        }

        let output = {};

        switch (format) {
            case 'summary':
                output = {
                    type: 'summary',
                    content: await generateExecutiveSummary(task, apiKey)
                };
                break;

            case 'report':
                output = {
                    type: 'report',
                    content: await generateFinalReport(task, apiKey)
                };
                break;

            case 'raw':
                output = {
                    type: 'raw',
                    results: task.results
                };
                break;

            default:
                // Return all formats
                const summary = await generateExecutiveSummary(task, apiKey);
                const report = await generateFinalReport(task, apiKey);

                output = {
                    summary: summary,
                    report: report,
                    rawResults: task.results,
                    sources: task.results.map(r => ({ task: r.task, agent: r.agent })),
                    metadata: {
                        completedAt: task.completedAt,
                        totalSteps: task.results.length,
                        prompt: task.prompt
                    }
                };
        }

        res.status(200).json({
            success: true,
            taskId: taskId,
            title: task.plan.taskTitle,
            output: output
        });

    } catch (error) {
        console.error('[Autonomous Results] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
