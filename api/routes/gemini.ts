/**
 * Gemini API Routes
 * Backend endpoints للـ Gemini API calls
 * الـ API keys آمنة في الـ backend فقط
 */

import { Router, Request, Response } from 'express';
import { callGeminiAPI } from '../gemini-proxy';

const router = Router();

// ============================================
// POST /api/gemini/call
// ============================================
// آمن: الـ API key في الـ backend فقط
// الـ client بيرسل prompt فقط

router.post('/call', async (req: Request, res: Response) => {
    try {
        const { model, prompt } = req.body;
        
        if (!model || !prompt) {
            return res.status(400).json({
                success: false,
                error: 'Missing model or prompt'
            });
        }
        
        const result = await callGeminiAPI({
            model,
            prompt
        });
        
        res.json(result);
    } catch (error: any) {
        console.error('Gemini API error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
});

// ============================================
// GET /api/gemini/status
// ============================================
// معلومات عن حالة الـ API keys

router.get('/status', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        message: 'Gemini API proxy is running',
        timestamp: new Date().toISOString()
    });
});

export default router;
