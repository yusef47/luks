/**
 * Lukas Worker - The Muscles
 * Browser automation server with Socket.io for real-time control and streaming
 * Deploy this to Hugging Face Spaces as a Docker container
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { chromium } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 7860;
const WORKER_SECRET = process.env.WORKER_SECRET || 'lukas-dev-secret';

const app = express();
const httpServer = createServer(app);

// Socket.io server with CORS for Vercel
const io = new Server(httpServer, {
    cors: {
        origin: ['https://luks-pied.vercel.app', 'http://localhost:5173', 'http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

// Health check endpoint (Required for Hugging Face)
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Lukas Worker (The Muscles)',
        version: '1.0.0',
        ready: true
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// =============================================================================
//                          BROWSER MANAGEMENT
// =============================================================================

let browser = null;
let browserContext = null;
let activePage = null;
let streamInterval = null;
let connectedClient = null;

async function initBrowser() {
    if (browser) return;

    console.log('🚀 Launching browser...');
    browser = await chromium.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    });

    browserContext = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    activePage = await browserContext.newPage();
    console.log('✅ Browser ready');
}

async function closeBrowser() {
    if (browser) {
        await browser.close();
        browser = null;
        browserContext = null;
        activePage = null;
        console.log('🔴 Browser closed');
    }
}

// =============================================================================
//                          STREAMING
// =============================================================================

async function startStreaming(socket) {
    if (streamInterval) clearInterval(streamInterval);
    if (!activePage) return;

    console.log('📺 Starting live stream...');

    streamInterval = setInterval(async () => {
        try {
            if (!activePage) return;

            const screenshot = await activePage.screenshot({
                type: 'jpeg',
                quality: 60,
                fullPage: false
            });

            const base64 = screenshot.toString('base64');
            socket.emit('stream:frame', { image: base64 });
        } catch (error) {
            // Page might be navigating, ignore errors
        }
    }, 200); // ~5 FPS for smooth streaming
}

function stopStreaming() {
    if (streamInterval) {
        clearInterval(streamInterval);
        streamInterval = null;
        console.log('📺 Stream stopped');
    }
}

// =============================================================================
//                          SOCKET HANDLERS
// =============================================================================

io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (token === WORKER_SECRET) {
        console.log('✅ Client authenticated');
        next();
    } else {
        console.log('❌ Authentication failed');
        next(new Error('Authentication failed'));
    }
});

io.on('connection', async (socket) => {
    console.log('🔗 Client connected:', socket.id);

    // Only allow one client at a time
    if (connectedClient && connectedClient !== socket.id) {
        socket.emit('error', { message: 'Another client is already connected' });
        socket.disconnect();
        return;
    }

    connectedClient = socket.id;

    // Initialize browser on first connection
    await initBrowser();

    // Start streaming automatically
    startStreaming(socket);

    // =========================================================================
    //                      COMMAND HANDLERS
    // =========================================================================

    socket.on('browser:goto', async (data, callback) => {
        try {
            const { url } = data;
            console.log(`🌐 Navigating to: ${url}`);

            await activePage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

            const title = await activePage.title();
            callback({ success: true, title });
        } catch (error) {
            console.error('❌ Navigation error:', error.message);
            callback({ success: false, error: error.message });
        }
    });

    socket.on('browser:click', async (data, callback) => {
        try {
            const { selector } = data;
            console.log(`🖱️ Clicking: ${selector}`);

            await activePage.click(selector, { timeout: 10000 });
            callback({ success: true });
        } catch (error) {
            console.error('❌ Click error:', error.message);
            callback({ success: false, error: error.message });
        }
    });

    socket.on('browser:type', async (data, callback) => {
        try {
            const { selector, text, delay = 50 } = data;
            console.log(`⌨️ Typing in: ${selector}`);

            await activePage.fill(selector, text);
            callback({ success: true });
        } catch (error) {
            console.error('❌ Type error:', error.message);
            callback({ success: false, error: error.message });
        }
    });

    socket.on('browser:scroll', async (data, callback) => {
        try {
            const { direction = 'down', amount = 500 } = data;
            console.log(`📜 Scrolling ${direction}`);

            await activePage.evaluate((dir, amt) => {
                window.scrollBy(0, dir === 'down' ? amt : -amt);
            }, direction, amount);

            callback({ success: true });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    socket.on('browser:screenshot', async (data, callback) => {
        try {
            console.log('📸 Taking screenshot...');

            const screenshot = await activePage.screenshot({
                type: 'png',
                fullPage: data?.fullPage || false
            });

            callback({ success: true, image: screenshot.toString('base64') });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    socket.on('browser:getContent', async (data, callback) => {
        try {
            console.log('📄 Getting page content...');

            const content = await activePage.content();
            const title = await activePage.title();
            const url = activePage.url();

            // Get text content for AI analysis
            const textContent = await activePage.evaluate(() => {
                return document.body.innerText.substring(0, 10000);
            });

            callback({ success: true, content, title, url, textContent });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    socket.on('browser:getAccessibility', async (data, callback) => {
        try {
            console.log('🌳 Getting accessibility tree...');

            const tree = await activePage.accessibility.snapshot();
            callback({ success: true, tree });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    socket.on('browser:execute', async (data, callback) => {
        try {
            const { action, params } = data;
            console.log(`⚡ Executing action: ${action}`);

            let result = null;

            switch (action) {
                case 'waitForSelector':
                    await activePage.waitForSelector(params.selector, { timeout: params.timeout || 10000 });
                    result = { found: true };
                    break;

                case 'pressKey':
                    await activePage.keyboard.press(params.key);
                    result = { pressed: params.key };
                    break;

                case 'goBack':
                    await activePage.goBack();
                    result = { navigated: true };
                    break;

                case 'goForward':
                    await activePage.goForward();
                    result = { navigated: true };
                    break;

                case 'reload':
                    await activePage.reload();
                    result = { reloaded: true };
                    break;

                default:
                    throw new Error(`Unknown action: ${action}`);
            }

            callback({ success: true, result });
        } catch (error) {
            callback({ success: false, error: error.message });
        }
    });

    // =========================================================================
    //                      DISCONNECT HANDLER
    // =========================================================================

    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
        stopStreaming();
        connectedClient = null;

        // Don't close browser immediately, keep it warm for reconnection
        // closeBrowser();
    });
});

// =============================================================================
//                          START SERVER
// =============================================================================

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  🦾 Lukas Worker (The Muscles) is running`);
    console.log(`  📡 Socket.io server: http://0.0.0.0:${PORT}`);
    console.log(`  🔐 Secret required for connection`);
    console.log('═══════════════════════════════════════════════════════════════');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down...');
    stopStreaming();
    await closeBrowser();
    process.exit(0);
});
