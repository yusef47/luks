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
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
let keyIndex = 0;

// Track failed keys to avoid repeated failures
const failedKeys = new Set();

const getNextKey = (skipFailed = true) => {
  if (UNIQUE_KEYS.length === 0) return null;
  
  let attempts = 0;
  let key = null;
  
  while (attempts < UNIQUE_KEYS.length) {
    key = UNIQUE_KEYS[keyIndex % UNIQUE_KEYS.length];
    keyIndex++;
    
    // Skip failed keys if requested
    if (skipFailed && failedKeys.has(key)) {
      attempts++;
      continue;
    }
    
    return key;
  }
  
  // If all keys failed, reset and try again
  if (failedKeys.size === UNIQUE_KEYS.length) {
    console.log('⚠️ All keys failed, resetting...');
    failedKeys.clear();
    return getNextKey(false);
  }
  
  return null;
};

const markKeyAsFailed = (key) => {
  failedKeys.add(key);
  console.log(`⚠️ Key marked as failed: ${key.substring(0, 10)}... (${failedKeys.size}/${UNIQUE_KEYS.length})`);
};

// Truncate response to avoid payload issues
const truncateResponse = (text, maxChars = 2000) => {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars) + '...';
};

// ==================== CONVERSATION MEMORY ====================
// Store conversation context in memory (can be extended to database)
const conversationMemory = new Map();

const getConversationMemory = (conversationId) => {
  if (!conversationMemory.has(conversationId)) {
    conversationMemory.set(conversationId, {
      exchanges: [],
      context: '',
      language: 'English',
      createdAt: new Date()
    });
  }
  return conversationMemory.get(conversationId);
};

const addToMemory = (conversationId, prompt, result, agent) => {
  const memory = getConversationMemory(conversationId);
  memory.exchanges.push({
    timestamp: new Date(),
    prompt: prompt.substring(0, 200), // Keep first 200 chars
    result: result.substring(0, 500), // Keep first 500 chars
    agent: agent
  });
  
  // Keep only last 10 exchanges to avoid memory bloat
  if (memory.exchanges.length > 10) {
    memory.exchanges.shift();
  }
  
  // Update language detection
  const isArabic = /[\u0600-\u06FF]/.test(prompt);
  memory.language = isArabic ? 'Arabic' : 'English';
  
  console.log(`💾 Memory updated for conversation ${conversationId} (${memory.exchanges.length} exchanges)`);
};

const buildMemoryContext = (conversationId) => {
  const memory = getConversationMemory(conversationId);
  if (memory.exchanges.length === 0) return '';
  
  const recentExchanges = memory.exchanges.slice(-5).map((ex, i) => 
    `${i + 1}. User asked: "${ex.prompt}"\n   Agent (${ex.agent}) responded with: "${ex.result}"`
  ).join('\n\n');
  
  return `CONVERSATION HISTORY (Last 5 exchanges):\n${recentExchanges}\n\nCurrent language: ${memory.language}`;
};

// Model selection with fallback
const MODELS = {
  // Orchestrator - Main AI Brain
  ORCHESTRATOR: 'gemini-2.5-flash',
  
  // Tutor - Strong model with unlimited RPM
  TUTOR: 'gemini-2.5-flash-live',
  
  // Fallbacks
  TUTOR_FALLBACK: 'gemini-2.0-flash-live',
  ORCHESTRATOR_FALLBACK: 'gemini-2.5-pro'
};

const getModel = (modelType = 'ORCHESTRATOR') => {
  return MODELS[modelType] || MODELS.ORCHESTRATOR;
};

// API call wrapper with retry and fallback
const callGeminiAPI = async (model, prompt, maxRetries = 3) => {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const key = getNextKey();
      if (!key) {
        throw new Error('No API keys available');
      }
      
      console.log(`📡 API Call (Attempt ${attempt}/${maxRetries}) - Model: ${model}`);
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        const errorMsg = error.error?.message || response.statusText;
        
        // Mark key as failed if it's a quota or auth error
        if (response.status === 429 || response.status === 403) {
          markKeyAsFailed(key);
        }
        
        throw new Error(`API Error (${response.status}): ${errorMsg}`);
      }
      
      const result = await response.json();
      return result;
      
    } catch (error) {
      lastError = error;
      console.error(`❌ Attempt ${attempt} failed: ${error.message}`);
      
      // If last attempt, try fallback model
      if (attempt === maxRetries && model !== MODELS.ORCHESTRATOR_FALLBACK) {
        console.log(`🔄 Switching to fallback model...`);
        return callGeminiAPI(MODELS.ORCHESTRATOR_FALLBACK, prompt, 1);
      }
      
      // Wait before retry
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  throw lastError || new Error('API call failed after all retries');
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
    
    const tutorModel = getModel('TUTOR');
    const model = ai.getGenerativeModel({ model: tutorModel });
    console.log(`✅ Tutor Model created: ${tutorModel}`);
    
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
  console.log(`\n🔔 POST /api/orchestrator/plan received`);
  console.log(`   Body:`, req.body);
  
  try {
    const { prompt } = req.body;
    console.log(`\n📋 Orchestrator plan request: "${prompt?.substring(0, 50)}..."`);
    
    if (!prompt) {
      console.error('❌ Missing prompt');
      return res.status(400).json({ success: false, error: 'Missing prompt' });
    }
    
    const key = getNextKey();
    if (!key) {
      console.error('❌ No API keys available');
      return res.status(500).json({ success: false, error: 'No API keys available' });
    }

    console.log(`🔐 Using key: ${key.substring(0, 10)}...`);
    
    // Detect language
    const isArabic = /[\u0600-\u06FF]/.test(prompt);
    const language = isArabic ? 'Arabic' : 'English';
    
    // Generate a comprehensive plan with multiple agents
    const systemPrompt = `You are a planning assistant. For the given user query, create a comprehensive plan that may include multiple agents:
- SearchAgent: for searching information
- MapsAgent: for location/map information
- VisionAgent: for image analysis
- VideoAgent: for video analysis
- EmailAgent: for email tasks
- SheetsAgent: for spreadsheet tasks
- DriveAgent: for file/drive tasks
- ImageGenerationAgent: for creating images
- Orchestrator: for synthesizing results

Choose the most relevant agents for the query. Always end with an Orchestrator step to synthesize.
IMPORTANT: Respond in ${language} language.

Format your response as JSON with this structure:
{
  "plan": [
    { "step": 1, "agent": "SearchAgent", "task": "search query here" },
    { "step": 2, "agent": "MapsAgent", "task": "find location info" },
    { "step": 3, "agent": "Orchestrator", "task": "synthesize all results" }
  ]
}`;
    
    const fullPrompt = `${systemPrompt}\n\nUser query: ${prompt}\n\nJSON plan:`;

    const orchestratorModel = getModel('ORCHESTRATOR');
    console.log(`📝 Calling Gemini API for planning (${orchestratorModel})...`);
    const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${orchestratorModel}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }]
      })
    });

    if (!apiResponse.ok) {
      const error = await apiResponse.json();
      throw new Error(`Gemini API error: ${error.error?.message || apiResponse.statusText}`);
    }

    const result = await apiResponse.json();
    let planText = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // Extract JSON from response
    const jsonMatch = planText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse plan from response');
    }
    
    const planData = JSON.parse(jsonMatch[0]);
    
    console.log(`✅ Got plan with ${planData.plan?.length || 0} steps`);
    console.log(`📤 Sending response to client\n`);
    
    res.json({
      success: true,
      data: {
        plan: planData.plan || [{
          step: 1,
          task: prompt,
          agent: 'SearchAgent'
        }, {
          step: 2,
          task: 'Synthesize the results',
          agent: 'Orchestrator'
        }],
        clarification: null
      }
    });
  } catch (error) {
    console.error(`\n❌ Plan error: ${error.message}`);
    console.error(`Stack: ${error.stack}\n`);
    
    // Fallback plan
    res.json({
      success: true,
      data: {
        plan: [{
          step: 1,
          task: req.body.prompt,
          agent: 'SearchAgent'
        }, {
          step: 2,
          task: 'Synthesize the search results',
          agent: 'Orchestrator'
        }],
        clarification: null
      }
    });
  }
});

// Search agent endpoint
app.post('/api/orchestrator/search', async (req, res) => {
  try {
    const { task, prompt } = req.body;
    console.log(`\n🔍 Search request: "${task?.substring(0, 50)}..."`);    
    const isArabic = /[\u0600-\u06FF]/.test(prompt || task);
    const language = isArabic ? 'Arabic' : 'English';
    
    if (!task) {
      return res.status(400).json({ success: false, error: 'Missing task' });
    }
    
    const key = getNextKey();
    if (!key) {
      return res.status(500).json({ success: false, error: 'No API keys available' });
    }

    console.log(`🔐 Using key: ${key.substring(0, 10)}...`);
    
    const systemPrompt = `You are a search assistant. Provide relevant information about the query.
IMPORTANT: 
- Respond in ${language} language
- Keep response SHORT (max 500 words)
- Focus on key information only`;
    const fullPrompt = `${systemPrompt}\n\nSearch query: ${task}\n\nBrief search results (max 500 words):`;

    const orchestratorModel = getModel('ORCHESTRATOR');
    console.log(`📝 Calling Gemini API for search (${orchestratorModel})...`);
    const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${orchestratorModel}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }]
      })
    });

    if (!apiResponse.ok) {
      const error = await apiResponse.json();
      throw new Error(`Gemini API error: ${error.error?.message || apiResponse.statusText}`);
    }

    const result = await apiResponse.json();
    let responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No results';
    responseText = truncateResponse(responseText, 2000);
    
    console.log(`✅ Got search results (${responseText.length} chars)`);
    console.log(`📤 Sending response to client\n`);
    
    res.json({
      success: true,
      data: responseText
    });
  } catch (error) {
    console.error(`\n❌ Search error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Maps agent endpoint
app.post('/api/orchestrator/map', async (req, res) => {
  try {
    const { task, prompt } = req.body;
    console.log(`\n🗺️ Maps request: "${task?.substring(0, 50)}..."`);
    
    const isArabic = /[\u0600-\u06FF]/.test(prompt || task);
    const language = isArabic ? 'Arabic' : 'English';
    
    const key = getNextKey();
    if (!key) return res.status(500).json({ success: false, error: 'No API keys available' });

    const systemPrompt = `You are a maps/location assistant. Provide location and geographic information.
IMPORTANT: Respond in ${language} language.`;
    const fullPrompt = `${systemPrompt}\n\nLocation query: ${task}\n\nLocation information:`;

    const orchestratorModel = getModel('ORCHESTRATOR');
    const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${orchestratorModel}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: fullPrompt }] }] })
    });

    if (!apiResponse.ok) throw new Error('API error');
    const result = await apiResponse.json();
    let responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No results';
    responseText = truncateResponse(responseText, 2000);
    
    console.log(`✅ Got maps results`);
    res.json({ success: true, data: responseText });
  } catch (error) {
    console.error(`❌ Maps error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Vision agent endpoint
app.post('/api/orchestrator/vision', async (req, res) => {
  try {
    const { task, prompt } = req.body;
    console.log(`\n👁️ Vision request: "${task?.substring(0, 50)}..."`);
    
    const isArabic = /[\u0600-\u06FF]/.test(prompt || task);
    const language = isArabic ? 'Arabic' : 'English';
    
    const key = getNextKey();
    if (!key) return res.status(500).json({ success: false, error: 'No API keys available' });

    const systemPrompt = `You are a vision/image analysis assistant. Analyze and describe images.
IMPORTANT: Respond in ${language} language.`;
    const fullPrompt = `${systemPrompt}\n\nImage analysis task: ${task}\n\nAnalysis:`;

    const orchestratorModel = getModel('ORCHESTRATOR');
    const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${orchestratorModel}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: fullPrompt }] }] })
    });

    if (!apiResponse.ok) throw new Error('API error');
    const result = await apiResponse.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No results';
    
    console.log(`✅ Got vision results`);
    res.json({ success: true, data: responseText });
  } catch (error) {
    console.error(`❌ Vision error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Video agent endpoint
app.post('/api/orchestrator/video', async (req, res) => {
  try {
    const { task, prompt } = req.body;
    console.log(`\n🎬 Video request: "${task?.substring(0, 50)}..."`);    
    const isArabic = /[\u0600-\u06FF]/.test(prompt || task);
    const language = isArabic ? 'Arabic' : 'English';
    
    const key = getNextKey();
    if (!key) return res.status(500).json({ success: false, error: 'No API keys available' });

    const systemPrompt = `You are a video analysis assistant. Analyze and describe videos.
IMPORTANT: Respond in ${language} language.`;
    const fullPrompt = `${systemPrompt}\n\nVideo analysis task: ${task}\n\nAnalysis:`;

    const orchestratorModel = getModel('ORCHESTRATOR');
    const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${orchestratorModel}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: fullPrompt }] }] })
    });

    if (!apiResponse.ok) throw new Error('API error');
    const result = await apiResponse.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No results';
    
    console.log(`✅ Got video results`);
    res.json({ success: true, data: responseText });
  } catch (error) {
    console.error(`❌ Video error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Email agent endpoint
app.post('/api/orchestrator/email', async (req, res) => {
  try {
    const { task, prompt } = req.body;
    console.log(`\n📧 Email request: "${task?.substring(0, 50)}..."`);    
    const isArabic = /[\u0600-\u06FF]/.test(prompt || task);
    const language = isArabic ? 'Arabic' : 'English';
    
    const key = getNextKey();
    if (!key) return res.status(500).json({ success: false, error: 'No API keys available' });

    const systemPrompt = `You are an email assistant. Help with email-related tasks.
IMPORTANT: Respond in ${language} language.`;
    const fullPrompt = `${systemPrompt}\n\nEmail task: ${task}\n\nResponse:`;

    const orchestratorModel = getModel('ORCHESTRATOR');
    const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${orchestratorModel}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: fullPrompt }] }] })
    });

    if (!apiResponse.ok) throw new Error('API error');
    const result = await apiResponse.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No results';
    
    console.log(`✅ Got email results`);
    res.json({ success: true, data: responseText });
  } catch (error) {
    console.error(`❌ Email error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sheets agent endpoint
app.post('/api/orchestrator/sheets', async (req, res) => {
  try {
    const { task, prompt } = req.body;
    console.log(`\n📈 Sheets request: "${task?.substring(0, 50)}..."`);    
    const isArabic = /[\u0600-\u06FF]/.test(prompt || task);
    const language = isArabic ? 'Arabic' : 'English';
    
    const key = getNextKey();
    if (!key) return res.status(500).json({ success: false, error: 'No API keys available' });

    const systemPrompt = `You are a spreadsheet assistant. Help with spreadsheet-related tasks.
IMPORTANT: Respond in ${language} language.`;
    const fullPrompt = `${systemPrompt}\n\nSpreadsheet task: ${task}\n\nResponse:`;

    const orchestratorModel = getModel('ORCHESTRATOR');
    const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${orchestratorModel}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: fullPrompt }] }] })
    });

    if (!apiResponse.ok) throw new Error('API error');
    const result = await apiResponse.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No results';
    
    console.log(`✅ Got sheets results`);
    res.json({ success: true, data: responseText, sheetData: [] });
  } catch (error) {
    console.error(`❌ Sheets error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Drive agent endpoint
app.post('/api/orchestrator/drive', async (req, res) => {
  try {
    const { task, prompt } = req.body;
    console.log(`\n💾 Drive request: "${task?.substring(0, 50)}..."`);
    
    const isArabic = /[\u0600-\u06FF]/.test(prompt || task);
    const language = isArabic ? 'Arabic' : 'English';
    
    const key = getNextKey();
    if (!key) return res.status(500).json({ success: false, error: 'No API keys available' });

    const systemPrompt = `You are a file/drive assistant. Help with file management tasks.
IMPORTANT: Respond in ${language} language.`;
    const fullPrompt = `${systemPrompt}\n\nFile task: ${task}\n\nResponse:`;

    const orchestratorModel = getModel('ORCHESTRATOR');
    const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${orchestratorModel}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: fullPrompt }] }] })
    });

    if (!apiResponse.ok) throw new Error('API error');
    const result = await apiResponse.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No results';
    
    console.log(`✅ Got drive results`);
    res.json({ success: true, data: responseText });
  } catch (error) {
    console.error(`❌ Drive error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Image generation agent endpoint
app.post('/api/orchestrator/generate-image', async (req, res) => {
  try {
    const { task, prompt } = req.body;
    console.log(`\n🎨 Image generation request: "${task?.substring(0, 50)}..."`);
    
    const isArabic = /[\u0600-\u06FF]/.test(prompt || task);
    const language = isArabic ? 'Arabic' : 'English';
    
    const key = getNextKey();
    if (!key) return res.status(500).json({ success: false, error: 'No API keys available' });

    const systemPrompt = `You are an image generation assistant. Describe what image would be generated.
IMPORTANT: Respond in ${language} language.`;
    const fullPrompt = `${systemPrompt}\n\nImage generation task: ${task}\n\nDescription:`;

    const orchestratorModel = getModel('ORCHESTRATOR');
    const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${orchestratorModel}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: fullPrompt }] }] })
    });

    if (!apiResponse.ok) throw new Error('API error');
    const result = await apiResponse.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No results';
    
    console.log(`✅ Got image generation results`);
    res.json({ success: true, data: responseText, imageBase64: '' });
  } catch (error) {
    console.error(`❌ Image generation error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Intermediate step endpoint
app.post('/api/orchestrator/intermediate', async (req, res) => {
  try {
    const { task, prompt } = req.body;
    console.log(`\n⚙️ Intermediate step: "${task?.substring(0, 50)}..."`);
    
    const key = getNextKey();
    if (!key) return res.status(500).json({ success: false, error: 'No API keys available' });

    const fullPrompt = `${prompt}\n\nIntermediate step task: ${task}\n\nResponse:`;

    const orchestratorModel = getModel('ORCHESTRATOR');
    const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${orchestratorModel}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: fullPrompt }] }] })
    });

    if (!apiResponse.ok) throw new Error('API error');
    const result = await apiResponse.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No results';
    
    console.log(`✅ Got intermediate results`);
    res.json({ success: true, data: responseText });
  } catch (error) {
    console.error(`❌ Intermediate error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Simple orchestrator synthesize endpoint
app.post('/api/orchestrator/synthesize', async (req, res) => {
  try {
    const { prompt, results, history, conversationId } = req.body;
    console.log(`\n📝 Orchestrator synthesize request`);
    
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Missing prompt' });
    }
    
    const key = getNextKey();
    if (!key) {
      return res.status(500).json({ success: false, error: 'No API keys available' });
    }

    console.log(`🔐 Using key: ${key.substring(0, 10)}...`);
    
    // Detect language
    const isArabic = /[\u0600-\u06FF]/.test(prompt);
    const language = isArabic ? 'Arabic' : 'English';
    
    // Build conversation history from memory
    const conversationIdToUse = conversationId || 'default';
    const memoryContext = buildMemoryContext(conversationIdToUse);
    
    // Also include passed history for backward compatibility
    const historyText = history?.map(h => 
      `Previous question: ${h.prompt}\nPrevious results: ${h.results?.map(r => r.result).join(', ') || 'None'}`
    ).join('\n\n') || '';
    
    const systemPrompt = `You are a helpful AI assistant. Synthesize the following results into a clear, concise answer.
IMPORTANT: 
- Respond in ${language} language
- Remember the conversation history and context
- Be consistent with previous answers
- Provide accurate and helpful information
- Focus on what the user is asking about`;

    const resultsText = results?.map((r, i) => `Result ${i + 1}: ${r.result}`).join('\n\n') || '';
    const fullPrompt = `${systemPrompt}

${memoryContext ? `${memoryContext}\n` : ''}
${historyText ? `Additional history:\n${historyText}\n` : ''}

Current question: ${prompt}

Search results to synthesize:
${resultsText}

Synthesized answer:`;

    console.log(`📝 Calling Gemini API for synthesis...`);
    const orchestratorModel = getModel('ORCHESTRATOR');
    const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${orchestratorModel}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }]
      })
    });

    if (!apiResponse.ok) {
      const error = await apiResponse.json();
      throw new Error(`Gemini API error: ${error.error?.message || apiResponse.statusText}`);
    }

    const result = await apiResponse.json();
    let responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
    responseText = truncateResponse(responseText, 2000);
    
    // Save to memory for future context
    addToMemory(conversationIdToUse, prompt, responseText, 'Orchestrator');
    
    console.log(`✅ Got synthesis response (${responseText.length} chars)`);
    console.log(`📤 Sending response to client\n`);
    
    res.json({
      success: true,
      data: responseText
    });
  } catch (error) {
    console.error(`\n❌ Synthesize error: ${error.message}`);
    console.error(`Stack: ${error.stack}\n`);
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
