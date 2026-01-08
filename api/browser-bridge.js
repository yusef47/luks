/**
 * Browser Bridge API - Connects "The Brain" (Vercel) to "The Muscles" (Hugging Face Worker)
 * This is the Vercel Serverless Function that proxies browser commands to the worker
 */

import { io } from 'socket.io-client';

// Worker URL (Hugging Face Space)
const WORKER_URL = process.env.WORKER_URL || 'https://your-space.hf.space';
const WORKER_SECRET = process.env.WORKER_SECRET || 'lukas-dev-secret';

// Connection cache (reuse across invocations when possible)
let cachedSocket = null;

function getSocket() {
    if (cachedSocket?.connected) {
        return cachedSocket;
    }

    console.log('[BrowserBridge] 🔗 Connecting to worker:', WORKER_URL);

    cachedSocket = io(WORKER_URL, {
        auth: { token: WORKER_SECRET },
        transports: ['websocket'],
        reconnection: true,
        timeout: 30000
    });

    cachedSocket.on('connect', () => {
        console.log('[BrowserBridge] ✅ Connected to worker');
    });

    cachedSocket.on('connect_error', (error) => {
        console.error('[BrowserBridge] ❌ Connection error:', error.message);
    });

    return cachedSocket;
}

// Promisify socket emit with callback
function emitAsync(socket, event, data, timeout = 30000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Timeout waiting for ${event}`));
        }, timeout);

        socket.emit(event, data, (response) => {
            clearTimeout(timer);
            if (response.success) {
                resolve(response);
            } else {
                reject(new Error(response.error || 'Unknown error'));
            }
        });
    });
}

// =============================================================================
//                          MAIN HANDLER
// =============================================================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { action, params } = req.body || {};

        if (!action) {
            return res.status(400).json({ success: false, error: 'Missing action' });
        }

        console.log('[BrowserBridge] 🎯 Action:', action);

        // Check if worker URL is configured
        if (!process.env.WORKER_URL) {
            return res.status(503).json({
                success: false,
                error: 'Browser worker not configured. Set WORKER_URL environment variable.',
                fallback: true
            });
        }

        const socket = getSocket();

        // Wait for connection if not connected
        if (!socket.connected) {
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
                socket.once('connect', () => {
                    clearTimeout(timeout);
                    resolve();
                });
                socket.once('connect_error', (err) => {
                    clearTimeout(timeout);
                    reject(err);
                });
            });
        }

        let result;

        switch (action) {
            case 'goto':
                result = await emitAsync(socket, 'browser:goto', { url: params.url });
                break;

            case 'click':
                result = await emitAsync(socket, 'browser:click', {
                    selector: params.selector,
                    x: params.x,
                    y: params.y
                });
                break;

            case 'type':
                result = await emitAsync(socket, 'browser:type', {
                    selector: params.selector,
                    text: params.text
                });
                break;

            case 'scroll':
                result = await emitAsync(socket, 'browser:scroll', {
                    direction: params.direction || 'down',
                    amount: params.amount || 500
                });
                break;

            case 'screenshot':
                result = await emitAsync(socket, 'browser:screenshot', {
                    fullPage: params.fullPage || false
                });
                break;

            case 'getContent':
                result = await emitAsync(socket, 'browser:getContent', {});
                break;

            case 'getAccessibility':
                result = await emitAsync(socket, 'browser:getAccessibility', {});
                break;

            case 'execute':
                result = await emitAsync(socket, 'browser:execute', {
                    action: params.action,
                    params: params.actionParams
                });
                break;

            case 'status':
                // Just check if connected
                result = { connected: socket.connected, workerUrl: WORKER_URL };
                break;

            default:
                return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
        }

        console.log('[BrowserBridge] ✅ Action completed:', action);

        res.status(200).json({
            success: true,
            action,
            ...result
        });

    } catch (error) {
        console.error('[BrowserBridge] ❌ Error:', error.message);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
