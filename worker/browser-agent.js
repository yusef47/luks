/**
 * Browser Agent - AI-Powered Browser Automation with Vision
 * Uses Qwen VL to see screenshots and decide actions like a human
 */

// Vision Model Configuration
export const VISION_MODEL = 'qwen/qwen-2.5-vl-7b-instruct:free';

// Get OpenRouter API Keys with fallback (same pattern as Vercel)
function getOpenRouterKeys() {
    const keys = [];
    for (let i = 1; i <= 10; i++) {
        const key = process.env[`OPENROUTER_API_KEY_${i}`];
        if (key && key.trim()) keys.push(key.trim());
    }
    // Also check the base key
    if (process.env.OPENROUTER_API_KEY) {
        keys.push(process.env.OPENROUTER_API_KEY.trim());
    }
    return keys;
}

/**
 * Analyze screenshot with Vision AI and decide next action
 */
async function analyzeWithVision(screenshotBase64, task, previousSteps = [], currentUrl = '') {
    const stepHistory = previousSteps.map((s, i) =>
        `Step ${i + 1}: ${s.action.type} - ${s.action.description || ''}`
    ).join('\n');

    const prompt = `You are a browser automation agent. You can see the current webpage screenshot.

TASK: ${task}

CURRENT URL: ${currentUrl}

PREVIOUS STEPS:
${stepHistory || 'None yet'}

Based on what you see in the screenshot, decide the NEXT ACTION to complete the task.

Respond in this exact JSON format:
{
    "observation": "Brief description of what you see on the page",
    "thinking": "Your reasoning about what to do next",
    "action": {
        "type": "click" | "type" | "scroll" | "goto" | "wait" | "done",
        "x": 500,
        "y": 300,
        "text": "text to type if action is type",
        "url": "url if action is goto",
        "direction": "up or down if scroll",
        "description": "human readable description of this action"
    },
    "taskComplete": false,
    "result": "Only fill this if taskComplete is true - the final answer/result"
}

IMPORTANT:
- If you see search results with the information needed, extract it and set taskComplete: true
- For click actions, estimate x,y coordinates based on where you see the element
- If you see a search box, type the search query
- If the page needs to scroll to see more, use scroll action
- Be efficient - don't take unnecessary steps`;

    const keys = getOpenRouterKeys();
    if (keys.length === 0) {
        console.error('[BrowserAgent] No OpenRouter API keys found!');
        return {
            observation: 'No API keys configured',
            thinking: 'Cannot analyze without API keys',
            action: { type: 'wait', description: 'Waiting - no API keys' },
            taskComplete: false
        };
    }

    // Try each key until one works
    for (const apiKey of keys) {
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://luks-pied.vercel.app',
                    'X-Title': 'Lukas Browser Agent'
                },
                body: JSON.stringify({
                    model: VISION_MODEL,
                    messages: [{
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/png;base64,${screenshotBase64}`
                                }
                            }
                        ]
                    }],
                    max_tokens: 1000
                })
            });

            if (response.status === 429) {
                console.log('[BrowserAgent] Rate limited, trying next key...');
                continue;
            }

            const data = await response.json();

            if (data.choices && data.choices[0]?.message?.content) {
                const content = data.choices[0].message.content;
                // Extract JSON from response (handle markdown code blocks)
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            }

            if (data.error) {
                console.log(`[BrowserAgent] API error: ${data.error.message}, trying next key...`);
                continue;
            }
        } catch (error) {
            console.log(`[BrowserAgent] Key failed: ${error.message}, trying next...`);
            continue;
        }
    }

    console.error('[BrowserAgent] All API keys failed');
    return {
        observation: 'Error analyzing screenshot',
        thinking: 'All API keys failed',
        action: { type: 'wait', description: 'Waiting due to error' },
        taskComplete: false
    };
}

/**
 * Execute a browser action
 */
async function executeAction(page, action) {
    try {
        switch (action.type) {
            case 'click':
                await page.mouse.click(action.x, action.y);
                await page.waitForTimeout(1000);
                break;

            case 'type':
                if (action.x && action.y) {
                    await page.mouse.click(action.x, action.y);
                    await page.waitForTimeout(300);
                }
                await page.keyboard.type(action.text, { delay: 50 });
                await page.keyboard.press('Enter');
                await page.waitForTimeout(2000);
                break;

            case 'scroll':
                const amount = action.direction === 'up' ? -400 : 400;
                await page.mouse.wheel(0, amount);
                await page.waitForTimeout(500);
                break;

            case 'goto':
                await page.goto(action.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await page.waitForTimeout(2000);
                break;

            case 'wait':
                await page.waitForTimeout(2000);
                break;

            case 'done':
                // Task is complete, no action needed
                break;

            default:
                console.log('[BrowserAgent] Unknown action:', action.type);
        }
        return true;
    } catch (error) {
        console.error('[BrowserAgent] Action execution error:', error.message);
        return false;
    }
}

/**
 * Run the Browser Agent loop
 */
async function runBrowserAgent(page, task, socket, maxSteps = 10) {
    console.log(`[BrowserAgent] Starting task: "${task}"`);

    const steps = [];
    let taskComplete = false;
    let finalResult = null;

    // Start by going to Google
    await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    for (let i = 0; i < maxSteps && !taskComplete; i++) {
        console.log(`[BrowserAgent] Step ${i + 1}/${maxSteps}`);

        // 1. Take screenshot
        const screenshotBuffer = await page.screenshot({ type: 'png' });
        const screenshotBase64 = screenshotBuffer.toString('base64');

        // 2. Get current URL
        const currentUrl = page.url();

        // 3. Analyze with Vision AI
        console.log('[BrowserAgent] Analyzing screenshot with Vision AI...');
        const analysis = await analyzeWithVision(screenshotBase64, task, steps, currentUrl);

        console.log(`[BrowserAgent] Observation: ${analysis.observation}`);
        console.log(`[BrowserAgent] Thinking: ${analysis.thinking}`);
        console.log(`[BrowserAgent] Action: ${analysis.action?.type} - ${analysis.action?.description}`);

        // 4. Record step
        const step = {
            stepNumber: i + 1,
            screenshot: screenshotBase64,
            observation: analysis.observation,
            thinking: analysis.thinking,
            action: analysis.action,
            timestamp: Date.now()
        };
        steps.push(step);

        // 5. Send update to frontend
        if (socket) {
            socket.emit('agent:step', {
                step: i + 1,
                total: maxSteps,
                screenshot: screenshotBase64,
                observation: analysis.observation,
                action: analysis.action?.description || analysis.action?.type,
                taskComplete: analysis.taskComplete
            });
        }

        // 6. Check if task is complete
        if (analysis.taskComplete) {
            taskComplete = true;
            finalResult = analysis.result;
            console.log('[BrowserAgent] Task completed!');
            console.log('[BrowserAgent] Result:', finalResult);
            break;
        }

        // 7. Execute the action
        if (analysis.action && analysis.action.type !== 'done') {
            await executeAction(page, analysis.action);
        }
    }

    // Take final screenshot
    const finalScreenshot = await page.screenshot({ type: 'png' });

    return {
        success: taskComplete,
        steps: steps,
        result: finalResult,
        finalScreenshot: finalScreenshot.toString('base64'),
        totalSteps: steps.length
    };
}

export {
    runBrowserAgent,
    analyzeWithVision,
    executeAction
};
