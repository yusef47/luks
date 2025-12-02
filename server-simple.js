/**
 * Simple Backend Server - JavaScript version
 * No TypeScript, no complex imports
 */

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

// Load environment variables FIRST
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

// Initialize SQLite Database
const dbPath = path.join(__dirname, 'lukas.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

// ==================== GEMINI API PROXY ====================

// Get API keys from environment (try all possible names)
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
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.API_KEY,
].filter(Boolean);

const UNIQUE_KEYS = [...new Set(ALL_API_KEYS)];

console.log(`🔑 Available API keys: ${UNIQUE_KEYS.length}`);

if (UNIQUE_KEYS.length === 0) {
  console.error('⚠️ No API keys found! Add VITE_GEMINI_API_KEY_1 to .env');
} else {
  console.log(`✅ Keys loaded: ${UNIQUE_KEYS.map(k => k.substring(0, 10) + '...').join(', ')}`);
}

let currentKeyIndex = 0;

const getNextKey = () => {
  if (UNIQUE_KEYS.length === 0) return null;
  const key = UNIQUE_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % UNIQUE_KEYS.length;
  return key;
};

const callGeminiAPI = async (model, prompt) => {
  const key = getNextKey();
  
  if (!key) {
    console.error('❌ No API keys available');
    return {
      success: false,
      error: 'No API keys available'
    };
  }

  try {
    console.log(`🔐 Calling Gemini with model: ${model}`);
    console.log(`🔑 Using key: ${key.substring(0, 10)}...`);
    
    const ai = new GoogleGenAI({ apiKey: key });
    console.log(`✅ GoogleGenAI initialized`);
    
    const modelInstance = ai.getGenerativeModel({ model });
    console.log(`✅ Model instance created`);
    
    const result = await modelInstance.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    
    const responseText = result.response.text();
    console.log(`✅ Got response (${responseText.length} chars)`);
    
    return {
      success: true,
      data: responseText
    };
  } catch (error) {
    console.error(`❌ API Error: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    return {
      success: false,
      error: error.message
    };
  }
};

// ==================== ROUTES ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Gemini status
app.get('/api/gemini/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Gemini API proxy is running',
    keysAvailable: UNIQUE_KEYS.length,
    timestamp: new Date().toISOString()
  });
});

// Gemini call
app.post('/api/gemini/call', async (req, res) => {
  try {
    const { model, prompt } = req.body;
    
    if (!model || !prompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing model or prompt'
      });
    }
    
    const result = await callGeminiAPI(model, prompt);
    res.json(result);
  } catch (error) {
    console.error('Gemini call error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Tutor generate response
app.post('/api/tutor/generate-response', async (req, res) => {
  try {
    const { history, userMessage, level = 'B1' } = req.body;
    
    console.log('📨 Tutor request:', { userMessage: userMessage?.substring(0, 50), level });
    
    if (!userMessage) {
      return res.status(400).json({
        success: false,
        error: 'Missing userMessage'
      });
    }

    const conversationText = (history || []).map(msg =>
      `${msg.role === 'user' ? 'Student' : 'Tutor'}: ${msg.content}`
    ).join('\n\n');

    const systemPrompt = `You are "Lukas", an English Tutor for Arabic-speaking students.

Student Level: ${level}

YOU MUST:
- Correct mistakes - this is how students learn!
- After correction, ask a follow-up question
- Be encouraging but educational
- Keep responses SHORT (2-4 sentences max)`;

    const fullPrompt = `${systemPrompt}\n\nConversation:\n${conversationText}\n\nStudent: ${userMessage}\n\nTutor:`;

    const result = await callGeminiAPI('gemini-2.0-flash-lite-preview-02-05', fullPrompt);

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
  } catch (error) {
    console.error('Tutor error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${dbPath}`);
  console.log(`🔐 Gemini API Proxy: /api/gemini/call`);
  console.log(`📝 Tutor API: /api/tutor/generate-response\n`);
});

export default app;
