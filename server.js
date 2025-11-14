import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import keyRotationManager from './backend/utils/keyRotation.js';
import quotaManager from './backend/utils/quotaManager.js';
import smartKeyRotation from './backend/utils/smartKeyRotation.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

// Initialize Gemini API - Multiple keys for different agents
const API_KEYS = {
  SearchAgent: process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY,
  MapsAgent: process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY,
  VisionAgent: process.env.GEMINI_API_KEY_3 || process.env.GEMINI_API_KEY,
  VideoAgent: process.env.GEMINI_API_KEY_4 || process.env.GEMINI_API_KEY,
  ImageGenerationAgent: process.env.GEMINI_API_KEY_5 || process.env.GEMINI_API_KEY,
  backup1: process.env.GEMINI_API_KEY_6 || process.env.GEMINI_API_KEY,
  backup2: process.env.GEMINI_API_KEY_7 || process.env.GEMINI_API_KEY,
  backup3: process.env.GEMINI_API_KEY_8 || process.env.GEMINI_API_KEY,
  default: process.env.GEMINI_API_KEY
};

if (!API_KEYS.default) {
  throw new Error('GEMINI_API_KEY environment variable not set');
}

// Track key usage and failures
const keyStats = {
  SearchAgent: { failures: 0, lastError: null },
  MapsAgent: { failures: 0, lastError: null },
  VisionAgent: { failures: 0, lastError: null },
  VideoAgent: { failures: 0, lastError: null },
  ImageGenerationAgent: { failures: 0, lastError: null },
  backup1: { failures: 0, lastError: null },
  backup2: { failures: 0, lastError: null },
  backup3: { failures: 0, lastError: null },
  default: { failures: 0, lastError: null }
};

// Create AI instances for each key
const aiInstances = {};
for (const [agent, key] of Object.entries(API_KEYS)) {
  if (key) {
    aiInstances[agent] = new GoogleGenAI({ apiKey: key });
  }
}

// Helper function to get AI instance for an agent with fallback
const getAIInstance = (agent) => {
  let instance = aiInstances[agent] || aiInstances.default;
  
  // If this agent's key has too many failures, try another key
  if (keyStats[agent] && keyStats[agent].failures > 2) {
    console.log(`⚠️ Agent ${agent} has too many failures, trying fallback key...`);
    instance = aiInstances.default;
  }
  
  return instance;
};

// Helper function to handle API errors and switch keys
const handleAPIError = (agent, error) => {
  const errorCode = error?.status || error?.code;
  
  if (errorCode === 429 || errorCode === 503) {
    keyStats[agent].failures++;
    keyStats[agent].lastError = error.message;
    console.error(`❌ Error ${errorCode} for ${agent}. Failures: ${keyStats[agent].failures}`);
    
    // Reset failures after 1 minute
    setTimeout(() => {
      keyStats[agent].failures = 0;
      console.log(`✅ Reset failure count for ${agent}`);
    }, 60000);
    
    return true; // Error was handled
  }
  
  return false;
};

// Initialize SQLite Database
const dbPath = path.join(__dirname, 'lukas.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize Database Tables
function initializeDatabase() {
  db.serialize(() => {
    // Conversations table
    db.run(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Messages table
    db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversationId TEXT NOT NULL,
        userMessage TEXT NOT NULL,
        agentResponse TEXT,
        agent TEXT,
        status TEXT DEFAULT 'pending',
        evaluationScore REAL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversationId) REFERENCES conversations(id)
      )
    `);

    // Context table for session memory
    db.run(`
      CREATE TABLE IF NOT EXISTS context (
        id TEXT PRIMARY KEY,
        conversationId TEXT NOT NULL,
        contextData TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversationId) REFERENCES conversations(id)
      )
    `);

    console.log('Database tables initialized');
  });
}

// ==================== INTENT CLASSIFIER ====================
// Simple keyword-based classifier to reduce API calls
const simpleIntentClassifier = (userMessage) => {
  const message = userMessage.toLowerCase();
  
  // Define keywords for each agent
  const keywords = {
    SearchAgent: ['search', 'find', 'look', 'what', 'who', 'where', 'when', 'how', 'tell', 'explain', 'information', 'news', 'facts', 'ابحث', 'ابحث عن', 'أخبار', 'معلومات'],
    MapsAgent: ['map', 'location', 'place', 'direction', 'near', 'distance', 'cafe', 'restaurant', 'hotel', 'خريطة', 'مكان', 'قريب', 'اتجاه'],
    ImageGenerationAgent: ['create', 'generate', 'draw', 'image', 'picture', 'photo', 'design', 'أنشئ', 'صورة', 'رسم'],
    VisionAgent: ['analyze', 'describe', 'image', 'picture', 'photo', 'see', 'look', 'حلل', 'صورة', 'وصف'],
    SheetsAgent: ['organize', 'table', 'data', 'format', 'sheet', 'excel', 'نظم', 'جدول', 'بيانات'],
    EmailAgent: ['send', 'email', 'mail', 'message', 'أرسل', 'بريد', 'رسالة'],
    CodeAgent: ['code', 'program', 'write', 'function', 'script', 'javascript', 'python', 'كود', 'برنامج', 'اكتب']
  };
  
  // Count keyword matches for each agent
  const scores = {};
  for (const [agent, agentKeywords] of Object.entries(keywords)) {
    scores[agent] = agentKeywords.filter(kw => message.includes(kw)).length;
  }
  
  // Find agent with highest score
  let bestAgent = 'SearchAgent';
  let bestScore = 0;
  for (const [agent, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestAgent = agent;
    }
  }
  
  return {
    intent: userMessage.substring(0, 50),
    agent: bestAgent,
    confidence: bestScore > 0 ? Math.min(0.95, 0.5 + (bestScore * 0.1)) : 0.5,
    keywords: keywords[bestAgent].filter(kw => message.includes(kw))
  };
};

const intentClassifier = async (userMessage) => {
  // Use simple classifier first to reduce API calls
  return simpleIntentClassifier(userMessage);
};

// ==================== RESULT EVALUATOR ====================
// Simple evaluation to reduce API calls
const simpleResultEvaluator = (userRequest, agentResponse, agent) => {
  // Check if response is empty or too short
  if (!agentResponse || agentResponse.trim().length < 10) {
    return {
      score: 0.2,
      isAcceptable: false,
      feedback: 'Response is too short',
      shouldRetry: true
    };
  }
  
  // Check if response contains error messages
  if (agentResponse.toLowerCase().includes('error') || 
      agentResponse.toLowerCase().includes('failed') ||
      agentResponse.toLowerCase().includes('خطأ')) {
    return {
      score: 0.3,
      isAcceptable: false,
      feedback: 'Response contains error',
      shouldRetry: true
    };
  }
  
  // If response is reasonable length and no errors, accept it
  return {
    score: 0.8,
    isAcceptable: true,
    feedback: 'Response is acceptable',
    shouldRetry: false
  };
};

const resultEvaluator = async (userRequest, agentResponse, agent) => {
  // Use simple evaluator to reduce API calls
  return simpleResultEvaluator(userRequest, agentResponse, agent);
};

// ==================== API ENDPOINTS ====================

// Intent Classification Endpoint
app.post('/api/classify-intent', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await intentClassifier(message);
    res.json(result);
  } catch (error) {
    console.error('Error in classify-intent:', error);
    res.status(500).json({ error: 'Failed to classify intent' });
  }
});

// API Keys Status Endpoint - Show which keys are active and their stats
app.get('/api/keys-status', (req, res) => {
  try {
    const status = {};
    for (const [agent, key] of Object.entries(API_KEYS)) {
      status[agent] = {
        status: key ? '✅ Active' : '❌ Not set',
        failures: keyStats[agent]?.failures || 0,
        lastError: keyStats[agent]?.lastError || null
      };
    }
    res.json(status);
  } catch (error) {
    console.error('Error in keys-status:', error);
    res.status(500).json({ error: 'Failed to get keys status' });
  }
});

// Result Evaluation Endpoint
app.post('/api/evaluate-result', async (req, res) => {
  try {
    const { userRequest, agentResponse, agent } = req.body;
    if (!userRequest || !agentResponse || !agent) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await resultEvaluator(userRequest, agentResponse, agent);
    res.json(result);
  } catch (error) {
    console.error('Error in evaluate-result:', error);
    res.status(500).json({ error: 'Failed to evaluate result' });
  }
});

// Save Conversation Endpoint
app.post('/api/conversations', (req, res) => {
  try {
    const { id, title } = req.body;
    if (!id || !title) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    db.run(
      'INSERT INTO conversations (id, title) VALUES (?, ?)',
      [id, title],
      (err) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to save conversation' });
        }
        res.json({ success: true, id });
      }
    );
  } catch (error) {
    console.error('Error in save conversation:', error);
    res.status(500).json({ error: 'Failed to save conversation' });
  }
});

// Save Message Endpoint
app.post('/api/messages', (req, res) => {
  try {
    const { id, conversationId, userMessage, agentResponse, agent, status } = req.body;
    if (!id || !conversationId || !userMessage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    db.run(
      `INSERT INTO messages (id, conversationId, userMessage, agentResponse, agent, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, conversationId, userMessage, agentResponse || null, agent || null, status || 'pending'],
      (err) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to save message' });
        }
        res.json({ success: true, id });
      }
    );
  } catch (error) {
    console.error('Error in save message:', error);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// Get Conversation History Endpoint
app.get('/api/conversations/:conversationId', (req, res) => {
  try {
    const { conversationId } = req.params;

    db.all(
      `SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt ASC`,
      [conversationId],
      (err, rows) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to fetch conversation' });
        }
        res.json(rows || []);
      }
    );
  } catch (error) {
    console.error('Error in get conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Save Context Endpoint
app.post('/api/context', (req, res) => {
  try {
    const { id, conversationId, contextData } = req.body;
    if (!id || !conversationId || !contextData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    db.run(
      `INSERT INTO context (id, conversationId, contextData) VALUES (?, ?, ?)`,
      [id, conversationId, JSON.stringify(contextData)],
      (err) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to save context' });
        }
        res.json({ success: true, id });
      }
    );
  } catch (error) {
    console.error('Error in save context:', error);
    res.status(500).json({ error: 'Failed to save context' });
  }
});

// Get Context Endpoint
app.get('/api/context/:conversationId', (req, res) => {
  try {
    const { conversationId } = req.params;

    db.all(
      `SELECT contextData FROM context WHERE conversationId = ? ORDER BY createdAt DESC LIMIT 5`,
      [conversationId],
      (err, rows) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to fetch context' });
        }
        const contextArray = rows?.map((row) => JSON.parse(row.contextData)) || [];
        res.json(contextArray);
      }
    );
  } catch (error) {
    console.error('Error in get context:', error);
    res.status(500).json({ error: 'Failed to fetch context' });
  }
});

// Search Endpoint - Mastra Integration with Retry Logic
app.post('/api/search', async (req, res) => {
  try {
    const { query, language = 'ar', maxResults = 10 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log(`🔍 Searching for: ${query}`);

    // Retry logic for 503 errors
    let retries = 0;
    const maxRetries = 3;
    let lastError = null;

    while (retries < maxRetries) {
      try {
        // Simulate search results (في الإنتاج، سيتم استخدام Mastra workflow)
        const results = [
          {
            title: `نتيجة البحث عن: ${query}`,
            description: `هذه نتيجة تجريبية للبحث عن "${query}"`,
            url: 'https://example.com/result1',
            relevance: 0.95
          },
          {
            title: `معلومات إضافية عن ${query}`,
            description: `معلومات مفيدة تتعلق بـ "${query}"`,
            url: 'https://example.com/result2',
            relevance: 0.85
          }
        ];

        return res.json({
          query,
          results,
          totalResults: results.length,
          timestamp: new Date().toISOString(),
          agent: 'SearchAgent'
        });

      } catch (error) {
        lastError = error;
        
        // Check if it's a 503 error
        if (error.message && (error.message.includes('503') || error.message.includes('overloaded'))) {
          retries++;
          if (retries < maxRetries) {
            const delay = Math.pow(2, retries) * 1000;
            console.log(`⏳ Search retry ${retries}/${maxRetries} after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        break;
      }
    }

    // If we get here, all retries failed
    console.error('❌ Error in search after retries:', lastError);
    
    // Return fallback response with mock results
    const fallbackResults = [
      {
        title: `نتيجة البحث عن: ${query}`,
        description: `هذه نتيجة مؤقتة للبحث عن "${query}"`,
        url: 'https://example.com/result1',
        relevance: 0.95
      },
      {
        title: `معلومات إضافية عن ${query}`,
        description: `معلومات مفيدة تتعلق بـ "${query}"`,
        url: 'https://example.com/result2',
        relevance: 0.85
      }
    ];

    res.status(200).json({ 
      query,
      results: fallbackResults,
      totalResults: fallbackResults.length,
      timestamp: new Date().toISOString(),
      agent: 'SearchAgent',
      fallback: true,
      message: 'تم استخدام نتائج مؤقتة بسبب انشغال الخادم'
    });

  } catch (error) {
    console.error('❌ Unexpected error in search:', error);
    res.status(500).json({ 
      error: 'Failed to process search',
      details: error.message 
    });
  }
});

// Chat Endpoint - نظام ذكي لتدوير المفاتيح بدون إظهار أخطاء 503
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: 'Messages are required' });
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'user') {
      return res.status(400).json({ error: 'Last message must be from user' });
    }

    // حضّر محفوظات المحادثة
    const conversationHistory = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // محاول مستمرة مع تدوير عشوائي للمفاتيح
    const maxTotalAttempts = smartKeyRotation.keys.length * 5; // 70 محاولة
    let lastError = null;

    for (let attempt = 0; attempt < maxTotalAttempts; attempt++) {
      try {
        // احصل على مفتاح عشوائي
        const key = smartKeyRotation.getNextKey();
        
        console.log(`🔑 Attempt ${attempt + 1}/${maxTotalAttempts} with key ${smartKeyRotation.keyStats[key].index + 1}`);

        // أنشئ AI instance بالمفتاح
        const ai = new GoogleGenAI({ apiKey: key });
        const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // ابدأ جلسة المحادثة
        const chat = model.startChat({ history: conversationHistory.slice(0, -1) });

        // أرسل الرسالة
        const result = await chat.sendMessage(lastMessage.content);
        const response = await result.response;
        const text = response.text();

        // سجل النجاح
        smartKeyRotation.recordSuccess(key);
        quotaManager.recordUsage(key);

        // أرجع الرد
        return res.json({
          role: 'assistant',
          content: text,
          timestamp: new Date().toISOString(),
          attempt: attempt + 1,
          keyStatus: smartKeyRotation.getSummary()
        });

      } catch (error) {
        lastError = error;
        
        // احصل على المفتاح الحالي
        const currentKey = smartKeyRotation.getNextKey();
        
        // استخرج رمز الخطأ
        let errorCode = null;
        if (error.message.includes('503')) errorCode = 503;
        if (error.message.includes('429')) errorCode = 429;

        // سجل الفشل
        smartKeyRotation.recordFailure(currentKey, errorCode);

        console.error(`❌ Attempt ${attempt + 1} failed (${errorCode}):`, error.message.substring(0, 100));

        // إذا كان 503 أو 429، انتظر قليلاً وحاول مع مفتاح آخر
        if (errorCode === 503 || errorCode === 429) {
          const delay = Math.random() * 2000 + 1000; // 1-3 ثواني عشوائية
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // للأخطاء الأخرى، انتظر أطول
        const delay = Math.random() * 5000 + 2000; // 2-7 ثواني
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // إذا فشلت جميع المحاولات، أرجع fallback (لا تظهر الخطأ)
    const fallbackMessage = 'معذرة، الخادم مشغول جداً الآن. يرجى المحاولة مرة أخرى.';
    
    res.status(200).json({ 
      role: 'assistant',
      content: fallbackMessage,
      timestamp: new Date().toISOString(),
      fallback: true,
      keyStatus: smartKeyRotation.getSummary()
    });

  } catch (error) {
    console.error('❌ Unexpected error in chat endpoint:', error);
    
    // حتى في حالة الخطأ غير المتوقع، أرجع رسالة بدلاً من الخطأ
    res.status(200).json({ 
      role: 'assistant',
      content: 'معذرة، حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
      timestamp: new Date().toISOString(),
      fallback: true
    });
  }
});

// Smart Key Rotation Status Endpoint
app.get('/api/smart-keys-status', (req, res) => {
  res.json({
    summary: smartKeyRotation.getSummary(),
    detailed: smartKeyRotation.getStatus()
  });
});

// Key Rotation Status Endpoint
app.get('/api/keys-rotation-status', (req, res) => {
  res.json(keyRotationManager.getDetailedStats());
});

// Quota Status Endpoint
app.get('/api/quota-status', (req, res) => {
  res.json({
    summary: quotaManager.getQuotaSummary(),
    detailed: quotaManager.getQuotaStatus()
  });
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    keysAvailable: keyRotationManager.keys.length,
    keyStats: keyRotationManager.getStatus()
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${dbPath}`);
});

export default app;
