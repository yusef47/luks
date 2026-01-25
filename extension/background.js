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

            // Get Page Info (no screenshot needed for HTML-based approach)
            let tab, pageInfo;
            try {
                console.log('[Agent-Debug] Getting page info...');
                tab = await chrome.tabs.get(browserTabId);
                pageInfo = await getPageInfo(browserTabId);
                console.log('[Agent-Debug] URL:', tab.url, '| Elements:', pageInfo?.clickableElements?.length || 0);
            } catch (e) {
                console.error('[Agent-Debug] Failed to get tab info:', e);
                broadcastUpdate({ type: 'error', error: 'تم إغلاق التبويب' });
                break;
            }

            // Capture screenshot for UI only (optional)
            const screenshot = await captureTab(browserTabId);

            // Send progress
            broadcastUpdate({
                type: 'step',
                step,
                maxSteps,
                action: '🤔 جاري التحليل...',
                screenshot,
                url: tab.url,
                phase: 'executing'
            });

            // Call Agent API (HTML-based with data extraction)
            console.log('[Agent-Debug] Calling Agent API...');
            const response = await callAgent({
                task,
                url: tab.url,
                title: tab.title,
                pageText: pageInfo?.text || '',
                htmlStructure: pageInfo?.clickableElements || [],
                extractedData: pageInfo?.extractedData || {},
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

            // Add extracted data
            if (response.extractedData) {
                agentMemory.extractedData = {
                    ...(agentMemory.extractedData || {}),
                    prices: [...(agentMemory.extractedData?.prices || []), ...(response.extractedData.prices || [])],
                    ratings: [...(agentMemory.extractedData?.ratings || []), ...(response.extractedData.ratings || [])],
                    names: [...(agentMemory.extractedData?.names || []), ...(response.extractedData.names || [])]
                };
            }

            // Check task complete
            if (response.taskComplete) {
                console.log('[Agent-Debug] Task complete - generating rich report');
                broadcastUpdate({
                    type: 'complete',
                    result: response.result || 'تمت المهمة بنجاح',
                    summary: response.summary || '',
                    recommendation: response.recommendation || '',
                    findings: agentMemory.findings || [],
                    extractedData: agentMemory.extractedData || {},
                    screenshot,
                    url: tab.url
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
            console.log(`[Agent-Debug] ===== STEP ${step} EXECUTION =====`);
            console.log(`[Agent-Debug] Action type: ${action.type}`);
            console.log(`[Agent-Debug] Action details:`, JSON.stringify(action));

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

            console.log('[Agent-Debug] Calling executeAction NOW...');
            await executeAction(browserTabId, action);
            console.log('[Agent-Debug] ===== EXECUTION COMPLETE =====');

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
    console.log('[Agent-Exec] Action:', action.type, action.selector || action.text || '');

    try {
        // Inject content script
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content.js']
        }).catch(() => { });

        if (action.type === 'goto') {
            await chrome.tabs.update(tabId, { url: action.url });
            await waitForTabLoad(tabId);
            return;
        }

        if (action.type === 'wait') {
            await sleep(action.duration || 1000);
            return;
        }

        // Activate tab before interaction
        await chrome.tabs.update(tabId, { active: true });
        await sleep(300);

        // Send action to content script
        try {
            await chrome.tabs.sendMessage(tabId, {
                action: 'executeAction',
                data: action
            });
            console.log('[Agent-Exec] ✅ Action sent');
        } catch (e) {
            console.error('[Agent-Exec] ❌ Send failed:', e.message);
        }

        // Wait for action to take effect
        if (action.type === 'click' || action.submit) {
            await sleep(3000); // Longer wait for navigation
            await waitForTabLoad(tabId);
        } else {
            await sleep(500);
        }

    } catch (error) {
        console.error('[Agent-Exec] Error:', error.message);
    }
}

// ... rest of file ...

// Sleep helper
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
