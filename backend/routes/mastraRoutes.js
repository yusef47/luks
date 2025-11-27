/**
 * Mastra Routes - API endpoints للـ Mastra Workflows
 * كل الـ endpoints بتشتغل من خلال Mastra
 */

import express from 'express';
import orchestratorFlow from '../workflows/orchestratorFlow.js';
import englishTutorFlow from '../workflows/englishTutorFlow.js';
import searchFlow from '../workflows/searchFlow.js';

const router = express.Router();

/**
 * POST /api/mastra/orchestrate
 * Main orchestration endpoint - streaming
 */
router.post('/orchestrate', async (req, res) => {
  try {
    const { 
      userMessage, 
      hasImage = false, 
      hasVideo = false,
      imageData = null,
      videoData = null,
      location = null,
      history = []
    } = req.body;
    
    if (!userMessage) {
      return res.status(400).json({ error: 'userMessage is required' });
    }

    console.log('🚀 Starting orchestration for:', userMessage.substring(0, 50) + '...');

    // Set SSE headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send planning status
    res.write(`data: ${JSON.stringify({
      type: 'status',
      status: 'planning',
      message: 'جاري إنشاء الخطة...'
    })}\n\n`);

    // Run workflow
    const result = await orchestratorFlow.run({
      userMessage,
      hasImage,
      hasVideo,
      imageFile: imageData,
      videoFile: videoData,
      location,
      history
    });

    // Send plan
    if (result.plan && result.plan.length > 0) {
      res.write(`data: ${JSON.stringify({
        type: 'plan',
        plan: result.plan,
        reasoning: result.reasoning
      })}\n\n`);
    }

    // Send step results
    if (result.results) {
      for (const stepResult of result.results) {
        res.write(`data: ${JSON.stringify({
          type: 'step_result',
          ...stepResult
        })}\n\n`);
      }
    }

    // Send final response
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      response: result.finalResponse,
      plan: result.plan,
      results: result.results
    })}\n\n`);

    res.end();

  } catch (error) {
    console.error('❌ Orchestration error:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: error.message
    })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/mastra/tutor
 * English Tutor endpoint - streaming
 */
router.post('/tutor', async (req, res) => {
  try {
    const { 
      message, 
      level = 'B1', 
      mode = 'conversation',
      history = []
    } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    console.log('🎓 Tutor request:', message.substring(0, 50) + '...');

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send processing status
    res.write(`data: ${JSON.stringify({
      type: 'status',
      status: 'processing',
      message: 'Thinking...'
    })}\n\n`);

    // Run tutor workflow
    const result = await englishTutorFlow.run({
      message,
      level,
      mode,
      history
    });

    // Send corrections if any
    if (result.corrections && result.corrections.length > 0) {
      res.write(`data: ${JSON.stringify({
        type: 'corrections',
        corrections: result.corrections
      })}\n\n`);
    }

    // Send final response
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      response: result.response,
      corrections: result.corrections,
      analysis: result.analysis,
      history: result.history
    })}\n\n`);

    res.end();

  } catch (error) {
    console.error('❌ Tutor error:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: error.message,
      response: "I'm sorry, I had trouble understanding. Could you please repeat that?"
    })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/mastra/tutor/practice
 * Generate practice sentence
 */
router.post('/tutor/practice', async (req, res) => {
  try {
    const { level = 'B1', topic = null } = req.body;
    
    const practice = await englishTutorFlow.generatePractice(level, topic);
    
    res.json({
      success: true,
      ...practice
    });
    
  } catch (error) {
    console.error('❌ Practice generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mastra/tutor/evaluate
 * Evaluate pronunciation attempt
 */
router.post('/tutor/evaluate', async (req, res) => {
  try {
    const { targetSentence, studentAttempt, level = 'B1' } = req.body;
    
    if (!targetSentence || !studentAttempt) {
      return res.status(400).json({ error: 'targetSentence and studentAttempt are required' });
    }
    
    const evaluation = await englishTutorFlow.evaluateAttempt(
      targetSentence, 
      studentAttempt, 
      level
    );
    
    res.json({
      success: true,
      ...evaluation
    });
    
  } catch (error) {
    console.error('❌ Evaluation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mastra/search
 * Search endpoint using Mastra
 */
router.post('/search', async (req, res) => {
  try {
    const { query, language = 'ar', maxResults = 10 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    res.write(`data: ${JSON.stringify({
      type: 'status',
      status: 'searching',
      message: 'جاري البحث...'
    })}\n\n`);

    const result = await searchFlow.run({
      userMessage: query,
      language,
      maxResults
    });

    res.write(`data: ${JSON.stringify({
      type: 'complete',
      ...result
    })}\n\n`);

    res.end();

  } catch (error) {
    console.error('❌ Search error:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: error.message
    })}\n\n`);
    res.end();
  }
});

/**
 * GET /api/mastra/agents
 * List available agents
 */
router.get('/agents', (req, res) => {
  const agentsList = [
    { name: 'SearchAgent', description: 'البحث على الإنترنت والحصول على معلومات محدثة' },
    { name: 'MapsAgent', description: 'البحث عن الأماكن والمواقع والاتجاهات' },
    { name: 'VisionAgent', description: 'تحليل الصور واستخراج المعلومات منها' },
    { name: 'VideoAgent', description: 'تحليل مقاطع الفيديو' },
    { name: 'ImageGenerationAgent', description: 'إنشاء صور من النص' },
    { name: 'EmailAgent', description: 'كتابة وإدارة رسائل البريد الإلكتروني' },
    { name: 'SheetsAgent', description: 'إنشاء وتحليل جداول البيانات' },
    { name: 'DriveAgent', description: 'إدارة وتنظيم الملفات' },
    { name: 'EnglishTutorAgent', description: 'تعليم وممارسة اللغة الإنجليزية' },
    { name: 'OrchestratorAgent', description: 'المنسق الرئيسي الذي يدير كل الوكلاء' }
  ];
  
  res.json({
    success: true,
    count: agentsList.length,
    agents: agentsList
  });
});

/**
 * GET /api/mastra/workflows
 * List available workflows
 */
router.get('/workflows', (req, res) => {
  const workflowsList = [
    { name: 'orchestratorFlow', description: 'سير العمل الرئيسي - من الطلب إلى الرد النهائي' },
    { name: 'searchFlow', description: 'سير عمل البحث الكامل' },
    { name: 'englishTutorFlow', description: 'سير عمل معلم الإنجليزية' }
  ];
  
  res.json({
    success: true,
    count: workflowsList.length,
    workflows: workflowsList
  });
});

export default router;
