// Search API - GROQ ONLY (Testing Mode)
import { callGroqAPI } from '../lib/groq.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        const { task } = req.body || {};
        if (!task) return res.status(400).json({ success: false, error: 'Missing task' });

        console.log('[Search] Using GROQ for:', task);
        const result = await callGroqAPI(`ابحث وقدم معلومات دقيقة ومفصلة عن: ${task}`);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('[Search] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
