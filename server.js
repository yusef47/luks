import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

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
  default: process.env.GEMINI_API_KEY
};

if (!API_KEYS.default) {
  throw new Error('GEMINI_API_KEY environment variable not set');
}

// Create AI instances for each key
const aiInstances = {};
for (const [agent, key] of Object.entries(API_KEYS)) {
  if (key) {
    aiInstances[agent] = new GoogleGenAI({ apiKey: key });
  }
}

// Helper function to get AI instance for an agent
const getAIInstance = (agent) => {
  return aiInstances[agent] || aiInstances.default;
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

// API Keys Status Endpoint - Show which keys are active
app.get('/api/keys-status', (req, res) => {
  try {
    const status = {};
    for (const [agent, key] of Object.entries(API_KEYS)) {
      status[agent] = key ? '✅ Active' : '❌ Not set';
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

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${dbPath}`);
});

export default app;
