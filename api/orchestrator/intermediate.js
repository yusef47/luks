// Intermediate API - GROQ ONLY (Testing Mode)
import { callGroqAPI } from '../lib/groq.js';

function truncateText(text, maxLength = 6000) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '\n[محتوى مختصر...]';
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        const { task, prompt, results } = req.body || {};

        const truncatedPrompt = truncateText(prompt, 5000);
        const truncatedResults = results ? truncateText(JSON.stringify(results), 1500) : '[]';

        const intermediatePrompt = `أنت لوكاس. نفذ هذه المهمة بدقة:

المهمة: ${task}
الطلب: ${truncatedPrompt}
${truncatedResults !== '[]' ? `السياق: ${truncatedResults}` : ''}

قدم إجابة مفيدة وموجزة.`;

        console.log('[Intermediate] Using GROQ');
        const responseText = await callGroqAPI(intermediatePrompt);
        res.status(200).json({ success: true, data: responseText });
    } catch (error) {
        console.error('[Intermediate] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
