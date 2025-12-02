import express, { Request, Response } from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

// Initialize Gemini API
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable not set');
}
const ai = new GoogleGenAI({ apiKey: API_KEY }) as any;

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
interface IntentResult {
  intent: string;
  agent: string;
  confidence: number;
  keywords: string[];
}

const intentClassifier = async (userMessage: string): Promise<IntentResult> => {
  const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
You are an intent classifier for an AI orchestrator system. Analyze the user's message and determine which agent should handle it.

Available agents:
- SearchAgent: For web searches, news, facts, real-time information
- MapsAgent: For location-based queries, places, directions
- VisionAgent: For analyzing images
- VideoAgent: For analyzing videos
- ImageGenerationAgent: For creating images from descriptions
- EmailAgent: For sending emails
- SheetsAgent: For organizing and formatting data
- DriveAgent: For interacting with cloud files
- CodeAgent: For writing and analyzing code
- DataAnalysisAgent: For analyzing and processing data

User message: "${userMessage}"

Respond with a JSON object containing:
{
  "intent": "brief description of the intent",
  "agent": "the agent name that should handle this",
  "confidence": 0.0-1.0,
  "keywords": ["keyword1", "keyword2"]
}

Respond ONLY with the JSON object, no other text.
`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return {
      intent: 'unknown',
      agent: 'SearchAgent',
      confidence: 0.5,
      keywords: []
    };
  } catch (error) {
    console.error('Intent classification error:', error);
    return {
      intent: 'unknown',
      agent: 'SearchAgent',
      confidence: 0.3,
      keywords: []
    };
  }
};

// ==================== RESULT EVALUATOR ====================
interface EvaluationResult {
  score: number;
  isAcceptable: boolean;
  feedback: string;
  shouldRetry: boolean;
}

const resultEvaluator = async (
  userRequest: string,
  agentResponse: string,
  agent: string
): Promise<EvaluationResult> => {
  const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
You are a quality evaluator for an AI orchestrator system.

User Request: "${userRequest}"
Agent: ${agent}
Agent Response: "${agentResponse}"

Evaluate the response on these criteria:
1. Relevance: Does it answer the user's request?
2. Completeness: Is the answer complete and thorough?
3. Accuracy: Is the information accurate?
4. Clarity: Is it clear and well-structured?

Respond with a JSON object:
{
  "score": 0.0-1.0,
  "isAcceptable": true/false,
  "feedback": "brief feedback",
  "shouldRetry": true/false
}

Respond ONLY with the JSON object.
`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return {
      score: 0.7,
      isAcceptable: true,
      feedback: 'Response evaluated',
      shouldRetry: false
    };
  } catch (error) {
    console.error('Result evaluation error:', error);
    return {
      score: 0.5,
      isAcceptable: false,
      feedback: 'Evaluation failed',
      shouldRetry: true
    };
  }
};

// ==================== API ENDPOINTS ====================

// Intent Classification Endpoint
app.post('/api/classify-intent', async (req: Request, res: Response) => {
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

// Result Evaluation Endpoint
app.post('/api/evaluate-result', async (req: Request, res: Response) => {
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
app.post('/api/conversations', (req: Request, res: Response) => {
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
app.post('/api/messages', (req: Request, res: Response) => {
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
app.get('/api/conversations/:conversationId', (req: Request, res: Response) => {
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
app.post('/api/context', (req: Request, res: Response) => {
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
app.get('/api/context/:conversationId', (req: Request, res: Response) => {
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
        const contextArray = rows?.map((row: any) => JSON.parse(row.contextData)) || [];
        res.json(contextArray);
      }
    );
  } catch (error) {
    console.error('Error in get context:', error);
    res.status(500).json({ error: 'Failed to fetch context' });
  }
});

// ==================== GEMINI API PROXY ====================
// Secure backend proxy for Gemini API calls

import geminiRoutes from './api/routes/gemini';
import tutorRoutes from './api/routes/tutor';

app.use('/api/gemini', geminiRoutes);
app.use('/api/tutor', tutorRoutes);

// Health Check Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${dbPath}`);
  console.log(`🔐 Gemini API Proxy: /api/gemini/call`);
});

export default app;
