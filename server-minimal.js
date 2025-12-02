#!/usr/bin/env node

/**
 * Minimal Backend Server - Working version
 */

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

// Load .env
dotenv.config();

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Get API keys
const ALL_API_KEYS = [
  process.env.VITE_GEMINI_API_KEY_1,
  process.env.VITE_GEMINI_API_KEY_2,
  process.env.VITE_GEMINI_API_KEY_3,
  process.env.VITE_GEMINI_API_KEY_4,
  process.env.VITE_GEMINI_API_KEY_5,
].filter(Boolean);

const UNIQUE_KEYS = [...new Set(ALL_API_KEYS)];
let currentKeyIndex = 0;

const getNextKey = () => {
  if (UNIQUE_KEYS.length === 0) return null;
  const key = UNIQUE_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % UNIQUE_KEYS.length;
  return key;
};

console.log(`🔑 Loaded ${UNIQUE_KEYS.length} API keys`);

// ==================== ROUTES ====================

// Health check
app.get('/api/health', (req, res) => {
  console.log('📍 Health check');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Gemini status
app.get('/api/gemini/status', (req, res) => {
  console.log('📍 Gemini status');
  res.json({
    status: 'ok',
    keysAvailable: UNIQUE_KEYS.length,
    timestamp: new Date().toISOString()
  });
});

// Tutor generate response
app.post('/api/tutor/generate-response', async (req, res) => {
  try {
    const { history, userMessage, level = 'B1' } = req.body;
    
    console.log(`📨 Tutor request: "${userMessage?.substring(0, 30)}..."`);
    
    if (!userMessage) {
      return res.status(400).json({
        success: false,
        error: 'Missing userMessage'
      });
    }

    const key = getNextKey();
    if (!key) {
      return res.status(500).json({
        success: false,
        error: 'No API keys available'
      });
    }

    console.log(`🔐 Using key: ${key.substring(0, 10)}...`);
    
    const ai = new GoogleGenAI({ apiKey: key });
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash-lite-preview-02-05' });
    
    const conversationText = (history || []).map(msg =>
      `${msg.role === 'user' ? 'Student' : 'Tutor'}: ${msg.content}`
    ).join('\n\n');

    const systemPrompt = `You are "Lukas", an English Tutor for Arabic-speaking students.
Student Level: ${level}
- Correct mistakes - this is how students learn!
- After correction, ask a follow-up question
- Be encouraging but educational
- Keep responses SHORT (2-4 sentences max)`;

    const fullPrompt = `${systemPrompt}\n\nConversation:\n${conversationText}\n\nStudent: ${userMessage}\n\nTutor:`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }]
    });
    
    const responseText = result.response.text();
    console.log(`✅ Got response (${responseText.length} chars)`);
    
    res.json({
      success: true,
      data: responseText
    });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== START SERVER ====================

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Server running on http://localhost:${PORT}`);
  console.log(`📍 Health: GET /api/health`);
  console.log(`📍 Tutor: POST /api/tutor/generate-response\n`);
});

// Handle errors
server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught exception:', err);
});
