// Collect API Keys from environment
function getAPIKeys() {
  const keys = [];
  for (let i = 1; i <= 13; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key && key.trim().length > 0) {
      keys.push(key.trim());
    }
  }
  return keys;
}

let keyIndex = 0;
const API_KEYS = getAPIKeys();

function getNextKey() {
  if (API_KEYS.length === 0) {
    return null;
  }
  const key = API_KEYS[keyIndex % API_KEYS.length];
  keyIndex = (keyIndex + 1) % API_KEYS.length;
  return key;
}

function truncateResponse(text, maxChars = 2000) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  if (text.length <= maxChars) {
    return text;
  }
  return text.substring(0, maxChars) + '...';
}

async function callGeminiAPI(prompt, apiKey) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  
  const payload = {
    contents: [{
      role: 'user',
      parts: [{
        text: prompt
      }]
    }]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
}

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { prompt, task } = req.body;
    const userPrompt = prompt || task;

    if (!userPrompt) {
      res.status(400).json({ success: false, error: 'Missing prompt or task' });
      return;
    }

    const apiKey = getNextKey();
    if (!apiKey) {
      console.error('ERROR: No API keys configured');
      res.status(500).json({ success: false, error: 'No API keys available' });
      return;
    }

    console.log(`[Orchestrator] Using key index: ${keyIndex}, Total keys: ${API_KEYS.length}`);
    console.log(`[Orchestrator] Prompt: ${userPrompt.substring(0, 50)}...`);

    const responseText = await callGeminiAPI(userPrompt, apiKey);
    const truncated = truncateResponse(responseText, 2000);

    res.status(200).json({
      success: true,
      data: truncated
    });
  } catch (error) {
    console.error('[Orchestrator] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};
