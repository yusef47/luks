import { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

// API Keys from environment
const API_KEYS = (process.env.GEMINI_API_KEYS || '').split(',').filter(k => k.trim());
let keyIndex = 0;

const getNextKey = () => {
  if (API_KEYS.length === 0) return null;
  const key = API_KEYS[keyIndex % API_KEYS.length];
  keyIndex++;
  return key;
};

const truncateResponse = (text: string, maxChars = 2000) => {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars) + '...';
};

export default async (req: VercelRequest, res: VercelResponse) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { prompt, task } = req.body;

    if (!prompt && !task) {
      return res.status(400).json({ success: false, error: 'Missing prompt or task' });
    }

    const key = getNextKey();
    if (!key) {
      return res.status(500).json({ success: false, error: 'No API keys available' });
    }

    const systemPrompt = `You are a helpful AI assistant. Answer the user's question clearly and concisely.`;
    const userPrompt = prompt || task;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key
      },
      body: JSON.stringify({
        contents: [{ 
          role: 'user', 
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] 
        }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
    }

    const result = await response.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';

    res.status(200).json({
      success: true,
      data: truncateResponse(responseText, 2000)
    });
  } catch (error: any) {
    console.error('Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
