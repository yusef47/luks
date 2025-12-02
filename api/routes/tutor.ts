/**
 * Tutor API Routes
 * Backend endpoints للـ English Tutor
 * الـ API keys آمنة في الـ backend فقط
 */

import { Router, Request, Response } from 'express';
import { callGeminiAPI } from '../gemini-proxy';

const router = Router();

const TUTOR_MODEL = 'gemini-2.0-flash-lite-preview-02-05';

// ============================================
// POST /api/tutor/generate-response
// ============================================

router.post('/generate-response', async (req: Request, res: Response) => {
    try {
        const { history, userMessage, level = 'B1' } = req.body;
        
        console.log('📨 Tutor request received:', { userMessage: userMessage?.substring(0, 50), level });
        
        if (!userMessage) {
            return res.status(400).json({
                success: false,
                error: 'Missing userMessage'
            });
        }

        const levelDescriptions: Record<string, any> = {
            'A1': {
                description: 'ABSOLUTE BEGINNER',
                vocabulary: 'Use ONLY the 500 most common English words. Avoid any complex words.',
                sentenceLength: 'Use VERY SHORT sentences (3-5 words max).',
                corrections: 'Give corrections in VERY simple way.',
                examples: 'Good: "Hello! How are you?" Bad: "Hello! How are you doing today?"'
            },
            'A2': {
                description: 'ELEMENTARY',
                vocabulary: 'Use simple everyday words only.',
                sentenceLength: 'Use short sentences (5-8 words).',
                corrections: 'Explain mistakes simply.',
                examples: 'Good: "Where do you live?" Bad: "Whereabouts do you reside?"'
            },
            'B1': {
                description: 'INTERMEDIATE',
                vocabulary: 'Use common vocabulary.',
                sentenceLength: 'Normal sentences (8-12 words).',
                corrections: 'Explain grammar rules briefly.',
                examples: 'Can use phrases like "What do you think about...?"'
            },
            'B2': {
                description: 'UPPER-INTERMEDIATE',
                vocabulary: 'Use varied vocabulary including idioms.',
                sentenceLength: 'Natural length sentences.',
                corrections: 'Give detailed grammar explanations.',
                examples: 'Can use: "That\'s a great point!"'
            },
            'C1': {
                description: 'ADVANCED',
                vocabulary: 'Use sophisticated vocabulary.',
                sentenceLength: 'Natural, flowing sentences.',
                corrections: 'Discuss nuances and style.',
                examples: 'Discuss topics in depth.'
            }
        };

        const levelInfo = levelDescriptions[level] || levelDescriptions['B1'];

        const conversationText = (history || []).map((msg: any) =>
            `${msg.role === 'user' ? 'Student' : 'Tutor'}: ${msg.content}`
        ).join('\n\n');

        const systemPrompt = `You are "Lukas", an English Tutor for Arabic-speaking students.

=== CRITICAL: STUDENT LEVEL IS ${level} (${levelInfo.description}) ===

YOU MUST FOLLOW THESE RULES STRICTLY:

1. VOCABULARY: ${levelInfo.vocabulary}
2. SENTENCE LENGTH: ${levelInfo.sentenceLength}
3. CORRECTIONS: ${levelInfo.corrections}
4. EXAMPLES: ${levelInfo.examples}

=== TEACHING STYLE ===
- You are a REAL TEACHER, not just chatting
- ALWAYS correct mistakes - this is how students learn!
- After correction, ask a follow-up question
- Be encouraging but also educational
- Keep responses SHORT (2-4 sentences max)`;

        const fullPrompt = `${systemPrompt}\n\nConversation so far:\n${conversationText}\n\nStudent: ${userMessage}\n\nTutor:`;

        const result = await callGeminiAPI({
            model: TUTOR_MODEL,
            prompt: fullPrompt
        });

        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.data
        });
    } catch (error: any) {
        console.error('Tutor response error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate response'
        });
    }
});

// ============================================
// POST /api/tutor/generate-practice
// ============================================

router.post('/generate-practice', async (req: Request, res: Response) => {
    try {
        const { level = 'B1', topic } = req.body;

        const levelDescriptions: Record<string, any> = {
            'A1': { description: 'ABSOLUTE BEGINNER' },
            'A2': { description: 'ELEMENTARY' },
            'B1': { description: 'INTERMEDIATE' },
            'B2': { description: 'UPPER-INTERMEDIATE' },
            'C1': { description: 'ADVANCED' }
        };

        const levelInfo = levelDescriptions[level] || levelDescriptions['B1'];
        const topicPrompt = topic ? `about "${topic}"` : 'about any everyday topic';

        const prompt = `Generate a practice sentence for ${level} (${levelInfo.description}) level student ${topicPrompt}.

Respond in JSON format:
{
  "sentence": "the practice sentence",
  "topic": "the topic category",
  "hints": ["pronunciation hint 1", "pronunciation hint 2"]
}`;

        const result = await callGeminiAPI({
            model: TUTOR_MODEL,
            prompt
        });

        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.error
            });
        }

        try {
            const parsed = JSON.parse(result.data);
            res.json({
                success: true,
                data: {
                    sentence: parsed.sentence,
                    topic: parsed.topic,
                    level,
                    hints: parsed.hints
                }
            });
        } catch (e) {
            res.json({
                success: true,
                data: result.data
            });
        }
    } catch (error: any) {
        console.error('Practice generation error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate practice'
        });
    }
});

// ============================================
// POST /api/tutor/evaluate-attempt
// ============================================

router.post('/evaluate-attempt', async (req: Request, res: Response) => {
    try {
        const { targetSentence, studentAttempt, level = 'B1' } = req.body;

        if (!targetSentence || !studentAttempt) {
            return res.status(400).json({
                success: false,
                error: 'Missing targetSentence or studentAttempt'
            });
        }

        const prompt = `You are an English pronunciation and grammar evaluator for Arabic-speaking students.

Target sentence: "${targetSentence}"
Student's attempt: "${studentAttempt}"
Student level: ${level}

Evaluate the student's attempt and provide feedback.

Respond in JSON format:
{
  "correctedSentence": "the corrected version if needed",
  "mistakes": [
    {
      "original": "what the student said",
      "corrected": "what they should say",
      "explanation": "brief explanation"
    }
  ],
  "pronunciationTips": ["tip 1", "tip 2"],
  "score": 85
}

Score should be 0-100 based on accuracy.`;

        const result = await callGeminiAPI({
            model: TUTOR_MODEL,
            prompt
        });

        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.error
            });
        }

        try {
            const parsed = JSON.parse(result.data);
            res.json({
                success: true,
                data: parsed
            });
        } catch (e) {
            res.json({
                success: true,
                data: result.data
            });
        }
    } catch (error: any) {
        console.error('Evaluation error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to evaluate attempt'
        });
    }
});

export default router;
