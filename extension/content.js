/**
 * Lukas Browser AI - Content Script
 * Injected into every page to execute actions and get page info
 */

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getPageInfo') {
        sendResponse(getPageInfo());
    }

    if (message.action === 'executeAction') {
        executeAction(message.data).then(result => {
            sendResponse(result);
        });
        return true; // Keep channel open for async response
    }
});

// Get page information
function getPageInfo() {
    return {
        url: window.location.href,
        title: document.title,
        text: document.body?.innerText?.substring(0, 5000) || '',
        clickableElements: getClickableElements()
    };
}

// Get clickable elements for AI context
function getClickableElements() {
    const elements = [];
    const clickables = document.querySelectorAll('a, button, input, select, [onclick], [role="button"]');

    clickables.forEach((el, index) => {
        if (index > 30) return; // Limit to 30 elements

        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        elements.push({
            tag: el.tagName.toLowerCase(),
            text: el.innerText?.substring(0, 50) || el.value || el.placeholder || '',
            x: Math.round(rect.left + rect.width / 2),
            y: Math.round(rect.top + rect.height / 2)
        });
    });

    return elements;
}

// Execute an action
async function executeAction(action) {
    console.log('[Lukas Content] Executing:', action.type);

    try {
        switch (action.type) {
            case 'click':
                await clickAt(action.x, action.y);
                break;

            case 'type':
                await typeText(action.text, action.x, action.y);
                break;

            case 'scroll':
                await scroll(action.direction, action.amount);
                break;

            case 'goto':
                window.location.href = action.url;
                break;

            case 'wait':
                await sleep(action.duration || 2000);
                break;

            case 'pressKey':
                await pressKey(action.key);
                break;

            default:
                console.log('[Lukas Content] Unknown action:', action.type);
        }

        return { success: true };
    } catch (error) {
        console.error('[Lukas Content] Action error:', error);
        return { success: false, error: error.message };
    }
}

// Click at coordinates
async function clickAt(x, y) {
    const element = document.elementFromPoint(x, y);
    if (element) {
        // Highlight element briefly
        highlightElement(element);

        // Simulate click
        element.click();

        // Also dispatch mouse events for better compatibility
        const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y
        });
        element.dispatchEvent(clickEvent);
    }
}

// Type text (improved for Google and other sites)
async function typeText(text, x, y) {
    console.log('[Lukas Content] Typing:', text, 'at', x, y);

    // Click first if coordinates provided
    if (x !== undefined && y !== undefined) {
        await clickAt(x, y);
        await sleep(500);
    }

    // Try to find the search input on Google specifically
    let target = document.querySelector('input[name="q"], input[type="search"], textarea[name="q"]');

    // If not found, try focused element
    if (!target) {
        target = document.activeElement;
    }

    // If still not found, try common selectors
    if (!target || target === document.body) {
        target = document.querySelector('input:not([type="hidden"]), textarea, [contenteditable="true"]');
    }

    console.log('[Lukas Content] Target element:', target?.tagName, target?.name);

    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        // Focus the element
        target.focus();
        await sleep(100);

        // Clear existing value
        if (target.value !== undefined) {
            target.value = '';
        }

        // Set value directly (faster and more reliable)
        if (target.value !== undefined) {
            target.value = text;
        } else if (target.isContentEditable) {
            target.innerText = text;
        }

        // Dispatch events to trigger any listeners
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));

        console.log('[Lukas Content] Text typed successfully');

        // Auto-press Enter for search
        await sleep(500);
        await pressEnter(target);
    } else {
        console.log('[Lukas Content] No suitable input found!');
    }
}

// Press Enter on element
async function pressEnter(target) {
    console.log('[Lukas Content] Pressing Enter...');

    const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
    });
    target.dispatchEvent(enterEvent);

    // Also submit form if exists
    const form = target.closest('form');
    if (form) {
        form.submit();
    }
}

// Scroll
async function scroll(direction, amount = 500) {
    const delta = direction === 'up' ? -amount : amount;
    window.scrollBy({ top: delta, behavior: 'smooth' });
}

// Press key
async function pressKey(key) {
    const keyEvent = new KeyboardEvent('keydown', {
        key: key,
        code: key,
        bubbles: true
    });
    document.activeElement?.dispatchEvent(keyEvent);

    // Also press Enter if it's Enter key
    if (key === 'Enter') {
        const enterEvent = new KeyboardEvent('keypress', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            bubbles: true
        });
        document.activeElement?.dispatchEvent(enterEvent);
    }
}

// Highlight element (visual feedback)
function highlightElement(element) {
    const originalOutline = element.style.outline;
    element.style.outline = '3px solid #6366f1';
    element.style.outlineOffset = '2px';

    setTimeout(() => {
        element.style.outline = originalOutline;
        element.style.outlineOffset = '';
    }, 500);
}

// Utility
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==========================================
// Web Page Communication (for Lukas frontend)
// ==========================================

// Listen for messages from Lukas web page
window.addEventListener('lukas-browser-ai-message', async (event) => {
    const message = event.detail;
    console.log('[Lukas Content] Received from page:', message);

    if (message.action === 'ping') {
        // Respond that extension is installed
        window.dispatchEvent(new CustomEvent('lukas-browser-ai-response', {
            detail: { type: 'pong', status: 'ok', version: '1.0.0' }
        }));
    }

    if (message.action === 'startTask') {
        // Forward to background script
        chrome.runtime.sendMessage({
            action: 'startTask',
            task: message.task,
            maxSteps: message.maxSteps || 15
        });
    }

    if (message.action === 'stopTask') {
        chrome.runtime.sendMessage({ action: 'stopTask' });
    }
});

// Listen for updates from background script and forward to page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Existing handlers
    if (message.action === 'getPageInfo') {
        sendResponse(getPageInfo());
    }

    if (message.action === 'executeAction') {
        executeAction(message.data).then(result => {
            sendResponse(result);
        });
        return true;
    }

    // Forward progress updates to the page
    if (message.type === 'step' || message.type === 'complete' || message.type === 'error') {
        window.dispatchEvent(new CustomEvent('lukas-browser-ai-response', {
            detail: message
        }));
    }
});

// Announce presence when on Lukas pages
if (window.location.hostname.includes('luks-pied.vercel.app') || window.location.hostname === 'localhost') {
    // Wait a bit then announce
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('lukas-browser-ai-response', {
            detail: { type: 'ready', status: 'ok', version: '1.0.0' }
        }));
        console.log('[Lukas Content] Announced presence to Lukas page');
    }, 500);
}

console.log('[Lukas Content] Browser AI content script loaded');
