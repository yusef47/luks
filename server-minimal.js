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

// Get API keys - load ALL 13
const ALL_API_KEYS = [
  process.env.VITE_GEMINI_API_KEY_1,
  process.env.VITE_GEMINI_API_KEY_2,
  process.env.VITE_GEMINI_API_KEY_3,
  process.env.VITE_GEMINI_API_KEY_4,
  process.env.VITE_GEMINI_API_KEY_5,
  process.env.VITE_GEMINI_API_KEY_6,
  process.env.VITE_GEMINI_API_KEY_7,
  process.env.VITE_GEMINI_API_KEY_8,
  process.env.VITE_GEMINI_API_KEY_9,
  process.env.VITE_GEMINI_API_KEY_10,
  process.env.VITE_GEMINI_API_KEY_11,
  process.env.VITE_GEMINI_API_KEY_12,
  process.env.VITE_GEMINI_API_KEY_13,
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
  console.log(`\n🔔 POST /api/tutor/generate-response received`);
  console.log(`   Body:`, req.body);
  
  try {
    const { history, userMessage, level = 'B1' } = req.body;
    
    console.log(`\n📨 Tutor request received`);
    console.log(`   Message: "${userMessage?.substring(0, 30)}..."`);
    console.log(`   Level: ${level}`);
    
    if (!userMessage) {
      console.error('❌ Missing userMessage');
      return res.status(400).json({
        success: false,
        error: 'Missing userMessage'
      });
    }

    const key = getNextKey();
    if (!key) {
      console.error('❌ No API keys available');
      return res.status(500).json({
        success: false,
        error: 'No API keys available'
      });
    }

    console.log(`🔐 Using key: ${key.substring(0, 10)}...`);
    
    const ai = new GoogleGenAI({ apiKey: key });
    console.log(`✅ GoogleGenAI initialized`);
    
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash-lite-preview-02-05' });
    console.log(`✅ Model created`);
    
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

    console.log(`📝 Sending prompt to Gemini...`);
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }]
    });
    
    const responseText = result.response.text();
    console.log(`✅ Got response (${responseText.length} chars)`);
    console.log(`📤 Sending response to client\n`);
    
    res.json({
      success: true,
      data: responseText
    });
  } catch (error) {
    console.error(`\n❌ Tutor Error: ${error.message}`);
    console.error(`Stack: ${error.stack}\n`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== ORCHESTRATOR ENDPOINTS ====================

// Simple orchestrator plan endpoint
app.post('/api/orchestrator/plan', async (req, res) => {
  try {
    const { prompt } = req.body;
    console.log(`\n📋 Orchestrator plan request: "${prompt?.substring(0, 50)}..."`);
    
    const key = getNextKey();
    if (!key) {
      return res.status(500).json({ success: false, error: 'No API keys available' });
    }

    const ai = new GoogleGenAI({ apiKey: key });
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash-lite-preview-02-05' });
    
    const systemPrompt = `You are an AI assistant. Answer the user's question clearly and concisely.`;
    const fullPrompt = `${systemPrompt}\n\nUser: ${prompt}\n\nAssistant:`;

    console.log(`📝 Calling Gemini for plan...`);
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }]
    });
    
    const responseText = result.response.text();
    console.log(`✅ Got plan response (${responseText.length} chars)`);
    
    res.json({
      success: true,
      data: {
        plan: [{ step: 1, task: responseText }],
        clarification: null
      }
    });
  } catch (error) {
    console.error(`❌ Plan error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== START SERVER ====================

console.log(`\n🚀 Starting server on port ${PORT}...`);
console.log(`📍 Available routes:`);
console.log(`   GET  /api/health`);
console.log(`   GET  /api/gemini/status`);
console.log(`   POST /api/tutor/generate-response\n`);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🔑 API keys: ${UNIQUE_KEYS.length}`);
  console.log(`📊 Ready to accept requests!\n`);
});

// Handle errors
server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught exception:', err);
});
