/**
 * Browser Agent - AI-Driven Web Research
 * This endpoint handles complex browser research tasks:
 * - Multi-step browsing
 * - Returns structured results + screenshots
 * - Designed to work with the chat interface
 */

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const WORKER_URL = process.env.WORKER_URL;
    const WORKER_SECRET = process.env.WORKER_SECRET;

    if (!WORKER_URL || !WORKER_SECRET) {
        return res.status(500).json({
            success: false,
            error: 'Worker not configured',
            needsBrowser: false
        });
    }

    try {
        const { query, action = 'research' } = req.body;

        if (!query) {
            return res.status(400).json({ success: false, error: 'Query is required' });
        }

        // Import socket.io-client dynamically (Vercel edge compatibility)
        const { io } = await import('socket.io-client');

        // Connect to worker
        const socket = io(WORKER_URL, {
            auth: { token: WORKER_SECRET },
            transports: ['websocket', 'polling'],
            timeout: 30000
        });

        // Wait for connection
        await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Connection timeout')), 15000);
            socket.on('connect', () => {
                clearTimeout(timer);
                resolve();
            });
            socket.on('connect_error', (err) => {
                clearTimeout(timer);
                reject(err);
            });
        });

        // Results container
        const results = {
            steps: [],
            screenshots: [],
            content: '',
            url: '',
            title: ''
        };

        // Step 1: Navigate to Google
        const step1 = await new Promise((resolve) => {
            socket.emit('browser:goto', {
                url: `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=ar`
            }, resolve);
        });

        results.steps.push({
            step: 1,
            action: 'بحث في Google',
            success: step1.success,
            description: `البحث عن: ${query}`
        });

        // Wait for page to load
        await new Promise(r => setTimeout(r, 2000));

        // Step 2: Take screenshot
        const screenshot1 = await new Promise((resolve) => {
            socket.emit('browser:screenshot', {}, resolve);
        });

        if (screenshot1.success) {
            results.screenshots.push({
                step: 1,
                image: screenshot1.image,
                label: 'نتائج البحث'
            });
        }

        // Step 3: Get page content
        const content = await new Promise((resolve) => {
            socket.emit('browser:getContent', {}, resolve);
        });

        if (content.success) {
            results.content = content.textContent?.substring(0, 5000) || '';
            results.url = content.url;
            results.title = content.title;
        }

        results.steps.push({
            step: 2,
            action: 'استخراج المحتوى',
            success: content.success,
            description: `تم استخراج المحتوى من: ${content.title || 'الصفحة'}`
        });

        // Disconnect
        socket.disconnect();

        // Return results
        return res.status(200).json({
            success: true,
            query,
            results: {
                title: results.title,
                url: results.url,
                content: results.content,
                screenshot: results.screenshots[0]?.image || null,
                steps: results.steps
            }
        });

    } catch (error) {
        console.error('[Browser Agent] Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
