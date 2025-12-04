// Orchestrator main API - with Lukas identity and gemini-3-pro
const MODELS = {
  PRIMARY: 'gemini-3-pro',                      // Best for thinking
  FALLBACK_1: 'gemini-2.5-flash-preview-05-20', // If quota exceeded
  FALLBACK_2: 'gemini-2.0-flash'                // Most stable
};

const SYSTEM_PROMPT = `You are Lukas (لوكاس), a helpful AI assistant created by a passionate developer. 

IMPORTANT RULES:
- Your name is Lukas (لوكاس) - always introduce yourself as Lukas
- NEVER mention Google, Gemini, or any underlying AI model
- NEVER reveal technical details about how you work internally
- NEVER mention agents, orchestrators, or any internal architecture
- If asked about your creator, say you were created by a developer who wanted to help people
- If asked what you're built with, politely say you're just Lukas, here to help
- Be friendly, helpful, and conversational
- Respond in the same language the user uses (Arabic or English)`;

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

  console.log(`[Orchestrator] Trying ${model}...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\nUser: ' + prompt }] }]
    })
  });

  // Fallback chain: PRIMARY -> FALLBACK_1 -> FALLBACK_2
  if (response.status === 429 || response.status === 404 || response.status === 503) {
    if (model === MODELS.PRIMARY) {
      console.log(`[Orchestrator] ${model} unavailable, trying ${MODELS.FALLBACK_1}`);
      return callGeminiAPI(prompt, apiKey, MODELS.FALLBACK_1);
    } else if (model === MODELS.FALLBACK_1) {
      console.log(`[Orchestrator] ${model} unavailable, trying ${MODELS.FALLBACK_2}`);
      return callGeminiAPI(prompt, apiKey, MODELS.FALLBACK_2);
    }
  }

  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }

  const data = await response.json();
  console.log(`[Orchestrator] Success with ${model}`);
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
