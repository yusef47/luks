// Orchestrator main API - with model fallback
const MODELS = {
  PRIMARY: 'gemini-2.5-flash-preview-05-20',
  FALLBACK: 'gemini-2.0-flash'
};

function getAPIKeys() {
  const keys = [];
  for (let i = 1; i <= 13; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key && key.trim().length > 0) {
      keys.push(key.trim());
    }
  }
  if (process.env.GEMINI_API_KEY) {
    keys.push(process.env.GEMINI_API_KEY.trim());
  }
  return keys;
}

function getNextKey() {
  const keys = getAPIKeys();
  if (keys.length === 0) return null;
  return keys[Math.floor(Math.random() * keys.length)];
}

async function callGeminiAPI(prompt, apiKey, model = MODELS.PRIMARY) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    })
  });

  // Fallback if quota exceeded or model unavailable
  if ((response.status === 429 || response.status === 404) && model === MODELS.PRIMARY) {
    console.log(`[Orchestrator] Fallback to ${MODELS.FALLBACK}`);
    return callGeminiAPI(prompt, apiKey, MODELS.FALLBACK);
  }

  if (!response.ok) {
    throw new Error(`Gemini API error ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { prompt, task } = req.body || {};
    const userPrompt = prompt || task;

    if (!userPrompt) {
      res.status(400).json({ success: false, error: 'Missing prompt or task' });
      return;
    }

    const apiKey = getNextKey();
    if (!apiKey) {
      res.status(500).json({ success: false, error: 'No API keys available' });
      return;
    }

    const responseText = await callGeminiAPI(userPrompt, apiKey);

    res.status(200).json({
      success: true,
      data: responseText
    });
  } catch (error) {
    console.error('[Orchestrator] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
