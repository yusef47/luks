/**
 * Lukas Browser AI - Background Service Worker
 * Opens a NEW tab and controls it (user watches from Lukas)
 */

const API_URL = 'https://luks-pied.vercel.app/api/browser-ai';
let isRunning = false;
let shouldStop = false;
let browserTabId = null;  // The tab we control

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startTask') {
        startBrowserTask(message.task, message.maxSteps || 10);
    }
    if (message.action === 'stopTask') {
        stopTask();
    }
});

// Listen for messages from Lukas web page (via content script)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startTask' && message.fromPage) {
        startBrowserTask(message.task, message.maxSteps || 10);
    }
    if (message.action === 'stopTask') {
        stopTask();
    }
});

function stopTask() {
    shouldStop = true;
    isRunning = false;
    // Close the browser tab we created
    if (browserTabId) {
        chrome.tabs.remove(browserTabId).catch(() => { });
        browserTabId = null;
    }
}

// Main task execution - opens NEW tab
async function startBrowserTask(task, maxSteps) {
    if (isRunning) return;

    isRunning = true;
    shouldStop = false;

    console.log('[Lukas] Starting browser task:', task);

    try {
        // 1. Open a new tab for browsing (start with Google)
        const newTab = await chrome.tabs.create({
            url: 'https://www.google.com/search?q=' + encodeURIComponent(task),
            active: false  // Don't switch to it, user stays on Lukas
        });
        browserTabId = newTab.id;

        console.log('[Lukas] Created browser tab:', browserTabId);

        // Wait for tab to load
        await waitForTabLoad(browserTabId);

        // Send initial update
        broadcastUpdate({
            type: 'step',
            step: 1,
            maxSteps,
            action: 'تم فتح Google وبدء البحث...',
            url: newTab.url
        });

        // Wait a moment for page to fully render
        await sleep(2000);

        let previousSteps = [];

        // 2. Main task loop
        for (let step = 1; step <= maxSteps && !shouldStop; step++) {
            console.log(`[Lukas] Step ${step}/${maxSteps}`);

            // Check if tab still exists
            try {
                await chrome.tabs.get(browserTabId);
            } catch (e) {
                broadcastUpdate({ type: 'error', error: 'تم إغلاق التبويب' });
                break;
            }

            // Capture screenshot from OUR tab (not active tab)
            const screenshot = await captureTab(browserTabId);
            if (!screenshot) {
                broadcastUpdate({ type: 'error', error: 'فشل التقاط الصورة' });
                break;
            }

            // Get current tab info
            const tab = await chrome.tabs.get(browserTabId);

            // Get page info
            const pageInfo = await getPageInfo(browserTabId);

            // Send screenshot to panel for display
            broadcastUpdate({
                type: 'step',
                step,
                maxSteps,
                action: 'جاري التحليل...',
                screenshot,
                url: tab.url
            });

            // Call AI API
            const aiResponse = await callAI({
                task,
                screenshot,
                url: tab.url,
                title: tab.title,
                pageText: pageInfo?.text || '',
                clickableElements: pageInfo?.clickableElements || [],
                previousSteps
            });

            if (!aiResponse || aiResponse.error) {
                broadcastUpdate({
                    type: 'step',
                    step,
                    maxSteps,
                    action: 'خطأ في التحليل، جاري المحاولة...',
                    screenshot,
                    url: tab.url
                });
                await sleep(3000);
                continue;
            }

            // Check if task complete
            if (aiResponse.taskComplete) {
                broadcastUpdate({
                    type: 'complete',
                    result: aiResponse.result,
                    screenshot,
                    url: tab.url
                });
                break;
            }

            // Execute action
            const action = aiResponse.action;
            broadcastUpdate({
                type: 'step',
                step,
                maxSteps,
                action: action.description || action.type,
                screenshot,
                url: tab.url
            });

            await executeAction(browserTabId, action);

            // Record step
            previousSteps.push({
                step,
                action: action.type,
                description: action.description
            });

            // Wait for page changes
            await sleep(2000);
        }

        if (shouldStop) {
            broadcastUpdate({ type: 'error', error: 'تم الإيقاف' });
        }

    } catch (error) {
        console.error('[Lukas] Error:', error);
        broadcastUpdate({ type: 'error', error: error.message });
    } finally {
        isRunning = false;
        // Keep tab open for user to see results
    }
}

// Wait for tab to finish loading
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
                resolve(); // Tab closed
            }
        };
        checkTab();
        // Timeout after 10 seconds
        setTimeout(resolve, 10000);
    });
}

// Capture screenshot from specific tab
async function captureTab(tabId) {
    try {
        // We need to make the tab temporarily visible to capture it
        // First, get current active tab
        const [currentActive] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Activate our tab briefly
        await chrome.tabs.update(tabId, { active: true });
        await sleep(100);

        // Capture
        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 70 });

        // Switch back to original tab
        if (currentActive) {
            await chrome.tabs.update(currentActive.id, { active: true });
        }

        return dataUrl.split(',')[1];
    } catch (error) {
        console.error('[Lukas] Screenshot error:', error);
        return null;
    }
}

// Get page info from content script
async function getPageInfo(tabId) {
    try {
        // Inject content script if needed
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content.js']
        }).catch(() => { }); // Ignore if already injected

        const response = await chrome.tabs.sendMessage(tabId, { action: 'getPageInfo' });
        return response;
    } catch (error) {
        console.error('[Lukas] Page info error:', error);
        return null;
    }
}

// Call AI API
async function callAI(data) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        return await response.json();
    } catch (error) {
        console.error('[Lukas] API error:', error);
        return { error: error.message };
    }
}

// Execute action on the browser tab
async function executeAction(tabId, action) {
    try {
        // Inject content script if needed
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content.js']
        }).catch(() => { });

        if (action.type === 'goto') {
            // Navigate to new URL
            await chrome.tabs.update(tabId, { url: action.url });
            await waitForTabLoad(tabId);
        } else {
            // Send action to content script
            await chrome.tabs.sendMessage(tabId, {
                action: 'executeAction',
                data: action
            });
        }
    } catch (error) {
        console.error('[Lukas] Execute error:', error);
    }
}

// Broadcast update to popup AND to active tab (Lukas page)
async function broadcastUpdate(message) {
    // Send to popup
    chrome.runtime.sendMessage(message).catch(() => { });

    // Send to Lukas tab (the one showing the panel)
    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab && activeTab.url?.includes('luks-pied.vercel.app')) {
            chrome.tabs.sendMessage(activeTab.id, message).catch(() => { });
        }
    } catch (e) { }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('[Lukas] Browser AI background script loaded');
