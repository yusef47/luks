/**
 * Lukas Browser AI - Content Script
 * Injected into every page to execute actions and get page info
 */

console.log('[Lukas Content] 🟢 Script loaded on:', window.location.href);

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Lukas Content] 📨 Message received:', message.action, message);

    if (message.action === 'getPageInfo') {
        sendResponse(getPageInfo());
    }

    if (message.action === 'executeAction') {
        console.log('[Lukas Content] ⚡ Executing action:', message.data?.type);
        executeAction(message.data).then(result => {
            console.log('[Lukas Content] ✅ Action result:', result);
            sendResponse(result);
        });
        return true; // Keep channel open for async response
    }
});

// Get page information with data extraction
function getPageInfo() {
    return {
        url: window.location.href,
        title: document.title,
        text: document.body?.innerText?.substring(0, 5000) || '',
        clickableElements: getClickableElements(),
        extractedData: extractPageData()
    };
}

// Extract useful data from page (prices, ratings, names)
function extractPageData() {
    const text = document.body?.innerText || '';
    const data = {
        prices: [],
        ratings: [],
        names: [],
        hotels: [],
        products: []
    };

    // Extract prices (multiple currencies)
    const pricePatterns = [
        /(\$[\d,]+(?:\.\d{2})?)/g,                    // $500, $1,200.00
        /([\d,]+)\s*(ريال|SAR|دولار|USD|جنيه|EGP)/g, // 500 ريال
        /(EUR|€)\s*([\d,]+)/g,                        // EUR 500
        /AED\s*([\d,]+)/g,                            // AED 500
    ];

    pricePatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) data.prices.push(...matches.slice(0, 5));
    });

    // Extract ratings
    const ratingPatterns = [
        /(\d+\.?\d*)\s*\/\s*5/g,           // 4.5/5
        /(\d+\.?\d*)\s*(?:نجوم|stars?)/gi, // 4 نجوم, 4 stars
        /تقييم[:\s]*(\d+\.?\d*)/g,         // تقييم: 4.5
    ];

    ratingPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) data.ratings.push(...matches.slice(0, 5));
    });

    // Extract hotel/product names from headings
    const headings = document.querySelectorAll('h1, h2, h3');
    headings.forEach((h, i) => {
        if (i < 10 && h.innerText?.trim()) {
            const name = h.innerText.trim().substring(0, 50);
            if (name.length > 3) data.names.push(name);
        }
    });

    // Try to find hotel cards or product listings
    const cards = document.querySelectorAll('[class*="hotel"], [class*="card"], [class*="product"], [class*="listing"]');
    cards.forEach((card, i) => {
        if (i < 5) {
            const cardText = card.innerText?.substring(0, 100);
            if (cardText) data.products.push(cardText.replace(/\n/g, ' | '));
        }
    });

    return data;
}

// Get clickable elements with detailed info for AI
function getClickableElements() {
    const elements = [];
    const clickables = document.querySelectorAll('a, button, input, select, textarea, [onclick], [role="button"], h3');

    clickables.forEach((el, index) => {
        if (index > 40) return;

        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        if (rect.top < 0 || rect.top > window.innerHeight) return; // Only visible elements

        elements.push({
            tag: el.tagName.toLowerCase(),
            type: el.type || null,
            name: el.name || null,
            id: el.id || null,
            text: (el.innerText?.substring(0, 50) || el.value || el.placeholder || '').trim(),
            href: el.href || null,
            selector: getSelector(el)
        });
    });

    return elements;
}

// Generate a unique CSS selector for an element
function getSelector(el) {
    if (el.id) return `#${el.id}`;
    if (el.name) return `${el.tagName.toLowerCase()}[name="${el.name}"]`;
    if (el.type === 'search') return 'input[type="search"]';
    if (el.tagName === 'H3') return 'h3';
    if (el.className) {
        const cls = el.className.split(' ')[0];
        if (cls) return `${el.tagName.toLowerCase()}.${cls}`;
    }
    return el.tagName.toLowerCase();
}

// Execute an action - Dual Mode (Selector + Coordinates)
async function executeAction(action) {
    console.log('[Lukas Content] Executing:', action.type, action);

    try {
        switch (action.type) {
            case 'click':
                await dualClick(action);
                break;

            case 'type':
                await dualType(action);
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

// ==========================================
// DUAL MODE EXECUTION FUNCTIONS
// ==========================================

// Click: Try selector first, then coordinates
async function dualClick(action) {
    let element = null;

    // Method 1: Try CSS selector
    if (action.selector) {
        element = document.querySelector(action.selector);
        console.log('[Lukas Content] Selector click:', action.selector, element ? '✓' : '✗');
    }

    // Method 2: Fallback to coordinates
    if (!element && action.x !== undefined && action.y !== undefined) {
        element = document.elementFromPoint(action.x, action.y);
        console.log('[Lukas Content] Coordinate click:', action.x, action.y, element ? '✓' : '✗');
    }

    if (element) {
        highlightElement(element);
        element.click();

        // Dispatch full mouse event for better compatibility
        const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: action.x || 0,
            clientY: action.y || 0
        });
        element.dispatchEvent(clickEvent);
        console.log('[Lukas Content] Click successful on:', element.tagName);
    } else {
        console.error('[Lukas Content] No element found to click!');
    }
}

// Type: Try selector first, then coordinates, then common selectors
async function dualType(action) {
    const { text, selector, x, y, submit } = action;
    let target = null;

    console.log('[Lukas Content] Typing:', text, '| Selector:', selector, '| Coords:', x, y);

    // Method 1: Use provided selector
    if (selector) {
        target = document.querySelector(selector);
        console.log('[Lukas Content] Selector found:', target ? '✓' : '✗');
    }

    // Method 2: Click coordinates first
    if (!target && x !== undefined && y !== undefined) {
        await clickAt(x, y);
        await sleep(300);
        target = document.activeElement;
        console.log('[Lukas Content] After click, active:', target?.tagName);
    }

    // Method 3: Try common search selectors
    if (!target || target === document.body) {
        target = document.querySelector('input[name="q"], input[type="search"], textarea[name="q"], input[type="text"]');
        console.log('[Lukas Content] Common selector:', target ? '✓' : '✗');
    }

    // Method 4: Try any visible input
    if (!target || target === document.body) {
        target = document.querySelector('input:not([type="hidden"]), textarea');
        console.log('[Lukas Content] Any input:', target ? '✓' : '✗');
    }

    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        // Visual feedback
        highlightElement(target);

        // Focus
        target.focus();
        await sleep(100);

        // Clear and set value
        if (target.value !== undefined) {
            target.value = '';
            target.value = text;
        } else if (target.isContentEditable) {
            target.innerText = text;
        }

        // Trigger events
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));

        console.log('[Lukas Content] ✅ Text typed successfully');

        // Submit if requested
        if (submit) {
            await sleep(500);
            await pressEnter(target);
        }
    } else {
        console.error('[Lukas Content] ❌ No suitable input element found!');
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
async function typeText(text, x, y, submit = false) {
    console.log('[Lukas Content] Typing:', text, 'at', x, y, 'submit:', submit);

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
        // VISUAL DEBUG: Highlight element
        const originalBorder = target.style.border;
        const originalBg = target.style.backgroundColor;
        target.style.border = '3px solid red';
        target.style.backgroundColor = '#fff0f0';
        await sleep(300);

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

        // Remove highlight
        await sleep(200);
        target.style.border = originalBorder;
        target.style.backgroundColor = originalBg;

        // Dispatch events to trigger any listeners
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));

        console.log('[Lukas Content] Text typed successfully');

        // Auto-press Enter properly if requested
        if (submit) {
            await sleep(500);
            await pressEnter(target);
        }
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
