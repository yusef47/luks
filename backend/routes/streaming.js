/**
 * Streaming Routes - مع Mastra
 * Endpoints للـ Streaming الحقيقي
 */

import express from 'express';
import { GoogleGenAI } from '@google/genai';

const router = express.Router();

// Streaming Chat Endpoint
router.post('/api/chat/stream', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: 'Messages are required' });
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'user') {
      return res.status(400).json({ error: 'Last message must be from user' });
    }

    // Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Prepare conversation history
    const conversationHistory = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Start chat session
    const chat = model.startChat({ history: conversationHistory.slice(0, -1) });

    // Send message and stream response
    const result = await chat.sendMessageStream(lastMessage.content);
    
    let fullText = '';
    
    for await (const chunk of result.stream) {
      const text = chunk.text();
      fullText += text;
      
      // Send each chunk as SSE
      res.write(`data: ${JSON.stringify({
        type: 'chunk',
        content: text,
        timestamp: new Date().toISOString()
      })}\n\n`);
    }

    // Send completion message
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      content: fullText,
      timestamp: new Date().toISOString()
    })}\n\n`);

    res.end();

  } catch (error) {
    console.error('❌ Error in streaming chat:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    })}\n\n`);
    res.end();
  }
});

// Streaming Search Endpoint
router.post('/api/search/stream', async (req, res) => {
  try {
    const { query, language = 'ar' } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `ابحث عن: ${query}\nأرجع النتائج كـ JSON بهذا الشكل:
    {
      "results": [
        {"title": "...", "description": "...", "url": "...", "relevance": 0.95}
      ],
      "totalResults": 2,
      "query": "${query}"
    }`;

    const result = await model.generateContentStream(prompt);
    
    let fullText = '';
    
    for await (const chunk of result.stream) {
      const text = chunk.text();
      fullText += text;
      
      // Send each chunk as SSE
      res.write(`data: ${JSON.stringify({
        type: 'chunk',
        content: text,
        timestamp: new Date().toISOString()
      })}\n\n`);
    }

    // Send completion message
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      content: fullText,
      timestamp: new Date().toISOString()
    })}\n\n`);

    res.end();

  } catch (error) {
    console.error('❌ Error in streaming search:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    })}\n\n`);
    res.end();
  }
});

export default router;
