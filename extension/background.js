/**
 * Lukas Browser Agent - Background Service Worker
 * Full Agent with Planning & Memory
 */

const API_URL = 'https://luks-pied.vercel.app/api/browser-ai';
let isRunning = false;
let shouldStop = false;
let browserTabId = null;
let agentMemory = {};  // Persistent memory across steps

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startTask') {
        startAgent(message.task, message.maxSteps || 15);
    }
    if (message.action === 'stopTask') {
        stopAgent();
    }
});

function stopAgent() {
    shouldStop = true;
    isRunning = false;
    agentMemory = {};
    if (browserTabId) {
        chrome.tabs.remove(browserTabId).catch(() => { });
        browserTabId = null;
    }
}

// Main Agent Loop
async function startAgent(task, maxSteps) {
    if (isRunning) return;

    isRunning = true;
    shouldStop = false;
    agentMemory = { task, startTime: Date.now() };

    console.log('[Agent] 🚀 Starting:', task);

    try {
        // Step 1: Open browser tab
        const newTab = await chrome.tabs.create({
            url: 'https://www.google.com',
            active: false
        });
        browserTabId = newTab.id;

        console.log('[Agent] 📱 Browser tab created:', browserTabId);

        await waitForTabLoad(browserTabId);
        await sleep(1000);

        broadcastUpdate({
            type: 'step',
            step: 0,
            maxSteps,
            action: '🧠 جاري إنشاء الخطة...',
            phase: 'planning'
        });

        let previousSteps = [];
        let consecutiveScrolls = 0;

        // Main loop
        for (let step = 1; step <= maxSteps && !shouldStop; step++) {
            console.log(`[Agent-Debug] 📍 Starting Step ${step}`);

            // Check tab exists
            try {
                await chrome.tabs.get(browserTabId);
            } catch (e) {
                console.error('[Agent-Debug] Tab check failed:', e);
                broadcastUpdate({ type: 'error', error: 'تم إغلاق التبويب' });
                break;
            }

            // Capture screenshot & Page Info safely
            let screenshot, tab, pageInfo;
            try {
                console.log('[Agent-Debug] Capturing screenshot...');
                screenshot = await captureTab(browserTabId);
                if (!screenshot) console.warn('[Agent-Debug] Screenshot capture failed or returned null');

                console.log('[Agent-Debug] Getting page info...');
                tab = await chrome.tabs.get(browserTabId);
                pageInfo = await getPageInfo(browserTabId);
                console.log('[Agent-Debug] Current URL:', tab.url);
            } catch (e) {
                console.error('[Agent-Debug] Failed to get tab info (Tab might be closed):', e);
                broadcastUpdate({ type: 'error', error: 'تم إغلاق التبويب أثناء العمل' });
                break;
            }

            // Send progress
            broadcastUpdate({
                type: 'step',
                step,
                maxSteps,
                action: '🤔 جاري التحليل...',
                screenshot,
                url: tab.url,
                phase: agentMemory.plan ? 'executing' : 'planning'
            });

            // Call Agent API
            console.log('[Agent-Debug] Calling Agent API...');
            const response = await callAgent({
                task,
                screenshot,
                url: tab.url,
                title: tab.title,
                pageText: pageInfo?.text || '',
                htmlStructure: pageInfo?.clickableElements || [], // Send interactive elements
                previousSteps,
                memory: agentMemory,
                isFirstStep: step === 1
            });

            console.log('[Agent-Debug] API Response received:', response ? 'Yes' : 'No');

            if (!response || response.error) {
                console.error('[Agent-Debug] API Error:', response?.error);
                broadcastUpdate({
                    type: 'step',
                    step,
                    maxSteps,
                    action: `⏳ خطأ في الاتصال: ${response?.error || 'غير معروف'}`,
                    screenshot,
                    url: tab.url
                });
                await sleep(2000);
                continue;
            }

            // Update memory
            if (response.memory) {
                agentMemory = { ...agentMemory, ...response.memory };
            }

            // Add new findings
            if (response.newFindings?.length) {
                agentMemory.findings = [...(agentMemory.findings || []), ...response.newFindings];
            }

            // Check task complete
            if (response.taskComplete) {
                console.log('[Agent-Debug] Task complete triggered');
                broadcastUpdate({
                    type: 'complete',
                    result: response.result,
                    screenshot,
                    url: tab.url,
                    findings: agentMemory.findings
                });
                break;
            }

            // Execute action
            const action = response.action;
            console.log('[Agent-Debug] Action to execute:', action);

            if (!action) {
                console.error('[Agent-Debug] No action in response object!');
                broadcastUpdate({
                    type: 'step',
                    step,
                    maxSteps,
                    action: '⚠️ استجابة غير مكتملة من الذكاء الاصطناعي',
                    screenshot,
                    url: tab.url
                });
                await sleep(2000);
                continue;
            }

            // Track consecutive scrolls
            if (action.type === 'scroll') {
                consecutiveScrolls++;
                if (consecutiveScrolls >= 3) {
                    console.log('[Agent] ⚠️ Too many scrolls, forcing click');
                    action.type = 'click';
                    action.x = 400;
                    action.y = 280;
                    action.description = 'النقر على أول نتيجة (تصحيح تلقائي)';
                    consecutiveScrolls = 0;
                }
            } else {
                consecutiveScrolls = 0;
            }

            // Log before execute
            console.log(`[Agent-Debug] Executing specific action: ${action.type}`);

            broadcastUpdate({
                type: 'step',
                step,
                maxSteps,
                action: `${getActionEmoji(action.type)} ${action.description || action.type}`,
                screenshot,
                url: tab.url,
                thinking: response.thinking,
                phase: 'executing'
            });

            await executeAction(browserTabId, action);
            console.log('[Agent-Debug] Action execution finished');

            // Record step
            previousSteps.push({
                step,
                action: action.type,
                description: action.description,
                url: tab.url
            });

            // Wait for page changes
            console.log('[Agent-Debug] Waiting for stable state...');
            await sleep(2500);
        }

        if (shouldStop) {
            broadcastUpdate({ type: 'error', error: '⏹ تم الإيقاف' });
        }

    } catch (error) {
        console.error('[Agent-Debug] CRITICAL ERROR in loop:', error);
        broadcastUpdate({ type: 'error', error: `Critical: ${error.message}` });
    } finally {
        console.log('[Agent-Debug] Agent loop finished. IsRunning set to false.');
        isRunning = false;
    }
}

function getActionEmoji(type) {
    const emojis = {
        'click': '👆',
        'type': '⌨️',
        'scroll': '📜',
        'goto': '🔗',
        'pressKey': '⏎',
        'wait': '⏳',
        'done': '✅'
    };
    return emojis[type] || '▶️';
}

// Broadcast to Lukas panel
async function broadcastUpdate(message) {
    chrome.runtime.sendMessage(message).catch(() => { });

    try {
        const tabs = await chrome.tabs.query({});
        console.log(`[Agent-Debug] Broadcasting to ${tabs.length} tabs...`);
        let sentCount = 0;
        for (const tab of tabs) {
            if (tab.url?.includes('luks-pied.vercel.app') || tab.url?.includes('localhost')) {
                console.log(`[Agent-Debug] Found target tab: ${tab.id} (${tab.url})`);
                chrome.tabs.sendMessage(tab.id, message)
                    .then(() => console.log(`[Agent-Debug] Message sent to tab ${tab.id}`))
                    .catch((e) => console.error(`[Agent-Debug] Failed to send to tab ${tab.id}:`, e));
                sentCount++;
            }
        }
        if (sentCount === 0) console.warn('[Agent-Debug] No target (Lukas) tabs found!');
    } catch (e) {
        console.error('[Agent-Debug] Broadcast error:', e);
    }
}

// Wait for tab load
function waitForTabLoad(tabId) {
    return new Promise((resolve) => {
        const checkTab = async () => {
            try {
                const tab = await chrome.tabs.get(tabId);
                if (tab.status === 'complete') {
                    resolve();
                } else {
                    setTimeout(checkTab, 200);
                }
            } catch (e) {
                resolve();
            }
        };
        checkTab();
        setTimeout(resolve, 10000);
    });
}

// Capture screenshot
async function captureTab(tabId) {
    try {
        const [currentActive] = await chrome.tabs.query({ active: true, currentWindow: true });

        await chrome.tabs.update(tabId, { active: true });
        await sleep(150);

        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 75 });

        if (currentActive) {
            await chrome.tabs.update(currentActive.id, { active: true });
        }

        return dataUrl.split(',')[1];
    } catch (error) {
        console.error('[Agent] Screenshot error:', error);
        return null;
    }
}

// Get page info
async function getPageInfo(tabId) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content.js']
        }).catch(() => { });

        return await chrome.tabs.sendMessage(tabId, { action: 'getPageInfo' });
    } catch (error) {
        return null;
    }
}

// Call Agent API
async function callAgent(data) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('API failed');
        }

        return await response.json();
    } catch (error) {
        console.error('[Agent] API error:', error);
        return { error: error.message };
    }
}

// Execute action
async function executeAction(tabId, action) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content.js']
        }).catch(() => { });

        if (action.type === 'goto') {
            await chrome.tabs.update(tabId, { url: action.url });
            await waitForTabLoad(tabId);
            await sleep(1000);
        } else if (action.type === 'wait') {
            await sleep(action.duration || 2000);
        } else {
            // General action
            // CRITICAL: Activate tab before interaction, otherwise focus/typing fails!
            if (['click', 'type', 'pressKey'].includes(action.type)) {
                await chrome.tabs.update(tabId, { active: true });
                await sleep(500); // Wait for switch
            }

            await chrome.tabs.sendMessage(tabId, {
                action: 'executeAction',
                data: action
            }).catch(e => console.log('[Agent] Action send error (might be navigating):', e));

            // If action might cause navigation (click, type+enter), wait appropriately
            if (action.type === 'click' || (action.type === 'type' && action.submit)) {
                console.log('[Agent] Action might cause navigation, waiting...');
                await sleep(2000); // Wait for potential navigation to start
                await waitForTabLoad(tabId); // Wait for it to finish

                // Switch back to Lukas after navigation to show progress
                // Find Lukas tab
                const tabs = await chrome.tabs.query({});
                const lukasTab = tabs.find(t => t.url?.includes('luks-pied.vercel.app') || t.url?.includes('localhost'));
                if (lukasTab) {
                    await chrome.tabs.update(lukasTab.id, { active: true });
                }
            } else {
                await sleep(500);
                // For simple typing/n-navigating actions, we might want to switch back or stay to show user?
                // staying is better for "visual" feel, but let's switch back to show panel updates if needed.
                // For now, let's keep it active so user sees the typing!
            }
        }
    } catch (error) {
        console.error('[Agent] Execute error:', error);
    }
}

// ... rest of file ...

// Sleep helper
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
