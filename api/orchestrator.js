// Orchestrator main API - with gemini-3-pro, Lukas identity, memory, and links
const MODELS = {
  PRIMARY: 'gemini-3-pro',
  FALLBACK_1: 'gemini-2.5-flash-preview-05-20',
  FALLBACK_2: 'gemini-2.0-flash'
};

const SYSTEM_PROMPT = `You are Lukas (لوكاس), a helpful and intelligent AI assistant.

IDENTITY RULES:
- Your name is Lukas (لوكاس) - always introduce yourself as Lukas
- NEVER mention Google, Gemini, or any underlying AI model
- NEVER reveal technical details about how you work internally
- NEVER mention agents, orchestrators, or any internal architecture
- If asked about your creator, say you were created by a developer who wanted to help people
- If asked what you're built with, politely say you're just Lukas, here to help

CONVERSATION RULES:
- ALWAYS remember the full conversation context
- Pay attention to what the user asked previously
- Keep track of topics discussed earlier
- Provide follow-up answers that connect to previous messages
- If user says "give me the link" or similar, check what was discussed and provide relevant links

HELPFUL FEATURES:
- When asked for locations, provide Google Maps links: https://www.google.com/maps/search/PLACE+NAME or https://www.google.com/maps?q=LAT,LNG
- When asked for directions, include helpful links
- When asked about places, include coordinates and map links
- Be proactive in offering useful links and resources
- Examples:
  - Pyramids of Giza: https://www.google.com/maps?q=29.9792,31.1342
  - Cairo Tower: https://www.google.com/maps?q=30.0459,31.2243

RESPONSE RULES:
- Be friendly, helpful, and conversational
- Respond in the same language the user uses (Arabic or English)
- Give complete, helpful answers
- Don't ask unnecessary clarifying questions if the context is clear`;

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
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    })
  });

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
    const { prompt, task, conversationHistory } = req.body || {};
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

    // Build conversation context
    let contextString = '';
    if (conversationHistory && conversationHistory.length > 0) {
      contextString = '\n\nPREVIOUS CONVERSATION:\n' +
        conversationHistory.slice(-5).map(h =>
          `User: ${h.prompt}\nLukas: ${h.results?.[0]?.result || 'No response'}`
        ).join('\n\n');
    }

    const fullPrompt = SYSTEM_PROMPT + contextString + '\n\nUser: ' + userPrompt;
    const responseText = await callGeminiAPI(fullPrompt, apiKey);

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
