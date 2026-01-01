// ═══════════════════════════════════════════════════════════════
//                    OPENROUTER CLIENT
//            Smart Fallback System + 32 Free Models
// ═══════════════════════════════════════════════════════════════

// API Keys (rotated randomly)
const OPENROUTER_KEYS = [
    process.env.OPENROUTER_API_KEY_1,
    process.env.OPENROUTER_API_KEY_2,
    process.env.OPENROUTER_API_KEY_3,
    process.env.OPENROUTER_API_KEY_4,
    process.env.OPENROUTER_API_KEY,
].filter(k => k && k.trim());

// ═══════════════════════════════════════════════════════════════
//                    ALL FREE MODELS (32)
// ═══════════════════════════════════════════════════════════════

const OPENROUTER_MODELS = {
    // 🏆 Tier 1: الأقوى (405B+)
    TIER_1: [
        'meta-llama/llama-3.1-405b-instruct:free',
        'nousresearch/hermes-3-llama-3.1-405b:free',
        'openai/gpt-oss-120b:free',
    ],

    // 🧠 Tier 2: تفكير عميق
    TIER_2: [
        'deepseek/deepseek-r1-0528:free',
        'tngtech/deepseek-r1t2-chimera:free',
        'nex-agi/deepseek-v3.1-nex-n1:free',
        'tngtech/deepseek-r1t-chimera:free',
        'allenai/olmo-3.1-32b-think:free',
        'alibaba/tongyi-deepresearch-30b-a3b:free',
        'tngtech/tng-r1t-chimera:free',
    ],

    // 💻 Tier 3: كود
    TIER_3: [
        'qwen/qwen3-coder:free',
        'kwaipilot/kat-coder-pro:free',
        'mistralai/devstral-2512:free',
    ],

    // 🌍 Tier 4: متعدد اللغات (العربية)
    TIER_4: [
        'qwen/qwen-2.5-vl-7b-instruct:free',
        'google/gemini-2.0-flash-exp:free',
        'google/gemma-3-27b-it:free',
        'meta-llama/llama-3.3-70b-instruct:free',
        'moonshotai/kimi-k2:free',
        'z-ai/glm-4.5-air:free',
        'mistralai/mistral-small-3.1-24b-instruct:free',
    ],

    // ⚡ Tier 5: سريعة وخفيفة
    TIER_5: [
        'nvidia/nemotron-3-nano-30b-a3b:free',
        'nvidia/nemotron-nano-12b-v2-vl:free',
        'nvidia/nemotron-nano-9b-v2:free',
        'google/gemma-3-4b-it:free',
        'google/gemma-3n-e2b-it:free',
        'qwen/qwen3-4b:free',
        'meta-llama/llama-3.2-3b-instruct:free',
        'mistralai/mistral-7b-instruct:free',
        'arcee-ai/trinity-mini:free',
        'xiaomi/mimo-v2-flash:free',
        'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
    ],
};

// Flat list of all models
const ALL_MODELS = [
    ...OPENROUTER_MODELS.TIER_1,
    ...OPENROUTER_MODELS.TIER_2,
    ...OPENROUTER_MODELS.TIER_3,
    ...OPENROUTER_MODELS.TIER_4,
    ...OPENROUTER_MODELS.TIER_5,
];

// ═══════════════════════════════════════════════════════════════
//                    KEY ROTATION
// ═══════════════════════════════════════════════════════════════

let keyIndex = 0;

function getNextKey() {
    if (OPENROUTER_KEYS.length === 0) {
        throw new Error('No OpenRouter API keys configured');
    }
    const key = OPENROUTER_KEYS[keyIndex % OPENROUTER_KEYS.length];
    keyIndex++;
    return key;
}

function shuffleKeys() {
    return [...OPENROUTER_KEYS].sort(() => Math.random() - 0.5);
}

// ═══════════════════════════════════════════════════════════════
//                    MAIN API CALL
// ═══════════════════════════════════════════════════════════════

async function callOpenRouter(prompt, options = {}) {
    const {
        model = null,           // null = try all models
        maxTokens = 4000,
        temperature = 0.7,
        tier = null,            // 1-5 or null for all
        maxRetries = 50,
    } = options;

    const keys = shuffleKeys();
    const models = model ? [model] : (tier ? OPENROUTER_MODELS[`TIER_${tier}`] : ALL_MODELS);

    console.log(`[OpenRouter] 🚀 Starting with ${keys.length} keys and ${models.length} models`);

    let attempts = 0;
    let lastError = null;

    // Try each model
    for (const currentModel of models) {
        // Try each key
        for (const apiKey of keys) {
            if (attempts >= maxRetries) {
                console.log(`[OpenRouter] ❌ Max retries (${maxRetries}) reached`);
                break;
            }
            attempts++;

            try {
                console.log(`[OpenRouter] 🔄 Attempt ${attempts}: ${currentModel.split('/')[1]?.split(':')[0]}`);

                const startTime = Date.now();

                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://luks-pied.vercel.app',
                        'X-Title': 'Lukas AI'
                    },
                    body: JSON.stringify({
                        model: currentModel,
                        messages: [{ role: 'user', content: prompt }],
                        max_tokens: maxTokens,
                        temperature: temperature,
                    })
                });

                const elapsed = Date.now() - startTime;

                // Rate limit - try next key
                if (response.status === 429) {
                    console.log(`[OpenRouter] ⚠️ Rate limited, trying next key...`);
                    lastError = new Error('Rate limited');
                    continue;
                }

                // Model not found - try next model
                if (response.status === 404) {
                    console.log(`[OpenRouter] ⚠️ Model not found, trying next...`);
                    lastError = new Error('Model not found');
                    break;
                }

                // Other errors
                if (!response.ok) {
                    const errText = await response.text();
                    console.log(`[OpenRouter] ⚠️ Error ${response.status}: ${errText.substring(0, 100)}`);
                    lastError = new Error(`Error ${response.status}`);
                    continue;
                }

                const data = await response.json();
                const text = data.choices?.[0]?.message?.content;

                if (!text || text.trim().length === 0) {
                    console.log(`[OpenRouter] ⚠️ Empty response, trying next...`);
                    lastError = new Error('Empty response');
                    continue;
                }

                console.log(`[OpenRouter] ✅ SUCCESS with ${currentModel} in ${elapsed}ms (${text.length} chars)`);

                return {
                    success: true,
                    text: text,
                    model: currentModel,
                    responseTime: elapsed,
                    attempts: attempts,
                };

            } catch (error) {
                console.log(`[OpenRouter] ⚠️ Exception: ${error.message}`);
                lastError = error;
                continue;
            }
        }
    }

    // All attempts failed
    console.log(`[OpenRouter] ❌ All ${attempts} attempts failed`);
    return {
        success: false,
        error: lastError?.message || 'All attempts failed',
        attempts: attempts,
    };
}

// ═══════════════════════════════════════════════════════════════
//                    SPECIFIC MODEL CALL
// ═══════════════════════════════════════════════════════════════

async function callSpecificModel(model, prompt, options = {}) {
    return callOpenRouter(prompt, { ...options, model: model });
}

// ═══════════════════════════════════════════════════════════════
//                    TEST ALL MODELS
// ═══════════════════════════════════════════════════════════════

async function testAllModels(prompt, options = {}) {
    const results = [];
    const keys = shuffleKeys();

    console.log(`[OpenRouter] 🧪 Testing ${ALL_MODELS.length} models...`);

    for (const model of ALL_MODELS) {
        const apiKey = keys[Math.floor(Math.random() * keys.length)];

        try {
            const startTime = Date.now();

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://luks-pied.vercel.app',
                    'X-Title': 'Lukas AI Test'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: options.maxTokens || 2000,
                    temperature: options.temperature || 0.7,
                })
            });

            const elapsed = Date.now() - startTime;

            if (!response.ok) {
                results.push({
                    model: model,
                    success: false,
                    error: `HTTP ${response.status}`,
                    responseTime: elapsed,
                });
                continue;
            }

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content || '';

            results.push({
                model: model,
                success: text.length > 0,
                text: text,
                responseTime: elapsed,
                textLength: text.length,
            });

            console.log(`[OpenRouter] ${text.length > 0 ? '✅' : '❌'} ${model.split('/')[1]} - ${elapsed}ms`);

        } catch (error) {
            results.push({
                model: model,
                success: false,
                error: error.message,
                responseTime: 0,
            });
        }

        // Small delay between requests
        await new Promise(r => setTimeout(r, 200));
    }

    return results;
}

// ═══════════════════════════════════════════════════════════════
//                    EXPORTS
// ═══════════════════════════════════════════════════════════════

export {
    callOpenRouter,
    callSpecificModel,
    testAllModels,
    ALL_MODELS,
    OPENROUTER_MODELS,
};

export default callOpenRouter;
