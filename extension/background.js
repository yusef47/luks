/**
 * Lukas Browser AI - Background Service Worker
 * Coordinates between popup, content script, and API
 */

const API_URL = 'https://luks-pied.vercel.app/api/browser-ai';
let isRunning = false;
let shouldStop = false;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startTask') {
        startTask(message.task, message.maxSteps || 10);
    }
    if (message.action === 'stopTask') {
        shouldStop = true;
        isRunning = false;
    }
});

// Main task execution loop
async function startTask(task, maxSteps) {
    if (isRunning) return;

    isRunning = true;
    shouldStop = false;

    console.log('[Lukas] Starting task:', task);

    try {
        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            sendToPopup({ type: 'error', error: 'لا توجد صفحة نشطة' });
            return;
        }

        let previousSteps = [];

        for (let step = 1; step <= maxSteps && !shouldStop; step++) {
            console.log(`[Lukas] Step ${step}/${maxSteps}`);

            // 1. Capture screenshot
            const screenshot = await captureTab(tab.id);
            if (!screenshot) {
                sendToPopup({ type: 'error', error: 'فشل التقاط الصورة' });
                break;
            }

            // 2. Get page info
            const pageInfo = await getPageInfo(tab.id);

            // 3. Send to AI API
            sendToPopup({ type: 'step', step, action: 'جاري التحليل...' });

            const aiResponse = await callAI({
                task,
                screenshot,
                url: tab.url,
                title: tab.title,
                pageText: pageInfo?.text || '',
                previousSteps
            });

            if (!aiResponse || aiResponse.error) {
                sendToPopup({ type: 'error', error: aiResponse?.error || 'فشل الاتصال بالـ AI' });
                break;
            }

            // 4. Check if task complete
            if (aiResponse.taskComplete) {
                sendToPopup({ type: 'complete', result: aiResponse.result });
                break;
            }

            // 5. Execute action
            const action = aiResponse.action;
            sendToPopup({ type: 'step', step, action: action.description || action.type });

            await executeAction(tab.id, action);

            // 6. Record step
            previousSteps.push({
                step,
                action: action.type,
                description: action.description
            });

            // 7. Wait before next step
            await sleep(1500);
        }

        if (shouldStop) {
            sendToPopup({ type: 'error', error: 'تم الإيقاف بواسطة المستخدم' });
        }

    } catch (error) {
        console.error('[Lukas] Error:', error);
        sendToPopup({ type: 'error', error: error.message });
    } finally {
        isRunning = false;
    }
}

// Capture tab screenshot
async function captureTab(tabId) {
    try {
        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 70 });
        // Remove data:image/jpeg;base64, prefix
        return dataUrl.split(',')[1];
    } catch (error) {
        console.error('[Lukas] Screenshot error:', error);
        return null;
    }
}

// Get page info from content script
async function getPageInfo(tabId) {
    try {
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

// Execute action via content script
async function executeAction(tabId, action) {
    try {
        await chrome.tabs.sendMessage(tabId, {
            action: 'executeAction',
            data: action
        });
    } catch (error) {
        console.error('[Lukas] Execute error:', error);
    }
}

// Send message to popup
function sendToPopup(message) {
    chrome.runtime.sendMessage(message).catch(() => {
        // Popup might be closed, ignore
    });
}

// Utility
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
