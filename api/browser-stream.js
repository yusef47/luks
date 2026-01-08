/**
 * Browser Stream API - SSE endpoint for receiving live stream from worker
 * This forwards the MJPEG stream from the worker to the frontend
 */

import { io } from 'socket.io-client';

const WORKER_URL = process.env.WORKER_URL || 'https://your-space.hf.space';
const WORKER_SECRET = process.env.WORKER_SECRET || 'lukas-dev-secret';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // Check if worker is configured
    if (!process.env.WORKER_URL) {
        return res.status(503).json({
            success: false,
            error: 'Browser worker not configured'
        });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    console.log('[BrowserStream] 📺 Starting stream proxy...');

    const socket = io(WORKER_URL, {
        auth: { token: WORKER_SECRET },
        transports: ['websocket'],
        timeout: 30000
    });

    socket.on('connect', () => {
        console.log('[BrowserStream] ✅ Connected to worker for streaming');
        res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
    });

    socket.on('stream:frame', (data) => {
        res.write(`data: ${JSON.stringify({ type: 'frame', image: data.image })}\n\n`);
    });

    socket.on('connect_error', (error) => {
        console.error('[BrowserStream] ❌ Connection error:', error.message);
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    });

    socket.on('disconnect', () => {
        console.log('[BrowserStream] 🔌 Disconnected from worker');
        res.write(`data: ${JSON.stringify({ type: 'disconnected' })}\n\n`);
        res.end();
    });

    // Handle client disconnect
    req.on('close', () => {
        console.log('[BrowserStream] 📴 Client disconnected, closing worker socket');
        socket.disconnect();
    });
}
