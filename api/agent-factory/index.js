// Agent Factory: Main Orchestrator v2.0
// With Genetic Memory, Tavily Web Search, Strict Personas, Synthesis

// ═══════════════════════════════════════════════════════════════
//                    GENETIC MEMORY
// ═══════════════════════════════════════════════════════════════

const memoryCache = new Map();
const SIMILARITY_THRESHOLD = 0.75;
const CACHE_TTL = 60 * 60 * 1000;

function normalizeQuestion(q) {
    return q.replace(/[؟?.!,،]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function calculateSimilarity(t1, t2) {
    const w1 = new Set(t1.split(/\s+/));
    const w2 = new Set(t2.split(/\s+/));
    const intersection = [...w1].filter(x => w2.has(x)).length;
    const union = new Set([...w1, ...w2]).size;
    return intersection / union;
}

async function checkGeneticMemory(question) {
    const normalizedQ = normalizeQuestion(question);
    const now = Date.now();

    for (const [cachedQ, data] of memoryCache.entries()) {
        if (now - data.timestamp > CACHE_TTL) {
            memoryCache.delete(cachedQ);
            continue;
        }
        const similarity = calculateSimilarity(normalizedQ, cachedQ);
        if (similarity >= SIMILARITY_THRESHOLD) {
            return { ...data, similarity };
        }
    }
    return null;
}

async function saveToGeneticMemory(question, response, agents) {
    const normalizedQ = normalizeQuestion(question);
    memoryCache.set(normalizedQ, { response, agents, timestamp: Date.now() });
    console.log(`[Memory] 📝 Cached (${memoryCache.size} items)`);
}

// ═══════════════════════════════════════════════════════════════
//                    API KEYS & MODELS
// ═══════════════════════════════════════════════════════════════

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

function getGeminiKeys() {
    const keys = [];
    for (let i = 1; i <= 15; i++) {
        const key = process.env[`GEMINI_API_KEY_${i}`];
        if (key && key.trim()) keys.push(key.trim());
    }
    if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY.trim());
    return keys.sort(() => Math.random() - 0.5);
}

function getGroqKeys() {
    const keys = [];
    for (let i = 1; i <= 10; i++) {
        const key = process.env[`GROQ_API_KEY_${i}`];
        if (key && key.trim()) keys.push(key.trim());
    }
    return keys;
}

let geminiKeyIndex = 0;

// ═══════════════════════════════════════════════════════════════
//                    TEMPLATES
// ═══════════════════════════════════════════════════════════════

const TEMPLATES = {
    "financial_expert": { id: "financial_expert", name: "خبير مالي", emoji: "💰", basePrompt: "أنت خبير مالي محترف.", outputFormat: "قدم: ملخص مالي + توصيات" },
    "legal_expert": { id: "legal_expert", name: "مستشار قانوني", emoji: "⚖️", basePrompt: "أنت مستشار قانوني.", outputFormat: "قدم: المتطلبات القانونية" },
    "tech_expert": { id: "tech_expert", name: "خبير تقني", emoji: "💻", basePrompt: "أنت خبير تقني.", outputFormat: "قدم: الحل التقني" },
    "research_expert": { id: "research_expert", name: "باحث", emoji: "🔍", basePrompt: "أنت باحث ومحلل.", outputFormat: "قدم: النتائج والمصادر" },
    "marketing_expert": { id: "marketing_expert", name: "خبير تسويق", emoji: "📢", basePrompt: "أنت خبير تسويق.", outputFormat: "قدم: الاستراتيجية" },
    "operations_expert": { id: "operations_expert", name: "خبير عمليات", emoji: "⚙️", basePrompt: "أنت خبير عمليات.", outputFormat: "قدم: خطة التنفيذ" },
    "hr_expert": { id: "hr_expert", name: "خبير موارد بشرية", emoji: "👥", basePrompt: "أنت خبير HR.", outputFormat: "قدم: الهيكل والتوظيف" },
    "general_expert": { id: "general_expert", name: "خبير عام", emoji: "🧠", basePrompt: "أنت مساعد ذكي.", outputFormat: "قدم إجابة شاملة" },
    "web_researcher": { id: "web_researcher", name: "باحث الويب", emoji: "🌐", basePrompt: "أنت باحث متصل بالإنترنت.", outputFormat: "قدم: معلومات حديثة مع المصادر", tools: ["web_search"] }
};

const EXPERT_BOUNDARIES = {
    financial_expert: 'لا تتحدث عن التراخيص أو القوانين.',
    legal_expert: 'لا تتحدث عن التكاليف أو الأرقام المالية.',
    tech_expert: 'لا تتحدث عن الجوانب المالية أو القانونية.',
    research_expert: 'قدم معلومات عامة فقط.',
    web_researcher: 'ابحث على الإنترنت وقدم أحدث المعلومات.',
    general_expert: ''
};

// ═══════════════════════════════════════════════════════════════
//                    STEP 1: ANALYZE
// ═══════════════════════════════════════════════════════════════

async function analyzeTask(prompt) {
    const analysisPrompt = `أنت محلل ذكي. حلل السؤال وحدد الخبراء المطلوبين.

الخبراء المتاحين:
- financial_expert: مالية، ميزانيات، تكاليف، استثمار
- legal_expert: قانوني، تراخيص، عقود، تصريح
- tech_expert: تقني، برمجة، أنظمة
- research_expert: بحث، معلومات عامة
- web_researcher: بحث حي (أسعار، أخبار، إحصائيات 2024/2025)
- marketing_expert: تسويق، علامة تجارية
- operations_expert: عمليات، لوجستيات
- hr_expert: موارد بشرية، توظيف
- general_expert: أسئلة عامة بسيطة

⚠️ استخدم web_researcher لو السؤال يحتاج معلومات حية.

السؤال: ${prompt}

أجب بـ JSON فقط:
{"complexity":"simple/moderate/complex","agents":[{"type":"نوع","task":"المهمة","priority":1}]}`;

    const keys = getGeminiKeys();
    for (const model of GEMINI_MODELS) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': keys[geminiKeyIndex++ % keys.length] },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: analysisPrompt }] }],
                    generationConfig: { maxOutputTokens: 1000, temperature: 0.2 }
                })
            });
            if (res.ok) {
                const d = await res.json();
                const text = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    parsed.agents = (parsed.agents || []).filter(a => TEMPLATES[a.type]);
                    if (parsed.agents.length === 0) {
                        parsed.agents = [{ type: 'general_expert', task: prompt, priority: 1 }];
                    }
                    return parsed;
                }
            }
        } catch (e) { }
    }
    return { complexity: 'simple', agents: [{ type: 'general_expert', task: prompt, priority: 1 }] };
}

// ═══════════════════════════════════════════════════════════════
//                    STEP 2: GENERATE CONFIGS
// ═══════════════════════════════════════════════════════════════

function generateAgentConfigs(agents, originalPrompt, complexity) {
    return agents.map((agent, index) => {
        const template = TEMPLATES[agent.type] || TEMPLATES.general_expert;
        const model = complexity === 'simple' ? 'llama-3.1-8b-instant' : 'llama-3.3-70b-versatile';
        const boundary = EXPERT_BOUNDARIES[agent.type] || '';

        const systemPrompt = `${template.basePrompt}

⚠️ قواعد صارمة:
1. أجب بالعربية الفصحى فقط
2. ${boundary}
3. أجب في نطاق تخصصك فقط
4. كن مختصراً ومحدداً
5. ${template.outputFormat}

المهمة: ${agent.task}
السؤال الأصلي: ${originalPrompt}`;

        return {
            id: `agent_${index}_${template.id}`,
            name: template.name,
            emoji: template.emoji,
            type: template.id,
            task: agent.task,
            model,
            systemPrompt,
            maxTokens: complexity === 'complex' ? 1500 : 800
        };
    });
}

// ═══════════════════════════════════════════════════════════════
//                    STEP 3: WEB SEARCH (Tavily + Gemini)
// ═══════════════════════════════════════════════════════════════

async function searchWithTavily(query) {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) return null;

    try {
        const res = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                query: query,
                search_depth: 'advanced',
                include_answer: true,
                max_results: 5
            })
        });
        if (res.ok) {
            const data = await res.json();
            let result = data.answer ? `📊 **ملخص:**\n${data.answer}\n\n` : '';
            result += '📰 **المصادر:**\n';
            (data.results || []).slice(0, 3).forEach((r, i) => {
                result += `${i + 1}. ${r.title}\n   ${r.content.substring(0, 100)}...\n\n`;
            });
            return result;
        }
    } catch (e) { }
    return null;
}

async function searchWithGemini(query) {
    const keys = getGeminiKeys();
    for (const model of GEMINI_MODELS) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': keys[geminiKeyIndex++ % keys.length] },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: `ابحث عن أحدث المعلومات (2024-2025) عن: ${query}` }] }],
                    generationConfig: { maxOutputTokens: 2000, temperature: 0.5 },
                    tools: [{ googleSearch: {} }]
                })
            });
            if (res.ok) {
                const d = await res.json();
                return d.candidates?.[0]?.content?.parts?.[0]?.text || null;
            }
        } catch (e) { }
    }
    return null;
}

async function executeWebSearch(task) {
    const startTime = Date.now();
    let result = await searchWithTavily(task);
    if (!result) result = await searchWithGemini(task);
    const duration = (Date.now() - startTime) / 1000;
    if (result) return { success: true, response: result, duration };
    return { success: false, error: 'Web search failed', duration };
}

// ═══════════════════════════════════════════════════════════════
//                    STEP 3: EXECUTE AGENTS
// ═══════════════════════════════════════════════════════════════

async function executeAgents(agentConfigs) {
    const groqKeys = getGroqKeys();

    const promises = agentConfigs.map(async (config, index) => {
        const startTime = Date.now();

        if (config.type === 'web_researcher') {
            const result = await executeWebSearch(config.task);
            return { ...config, ...result };
        }

        const key = groqKeys[index % groqKeys.length];
        try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: config.model,
                    messages: [
                        { role: 'system', content: config.systemPrompt },
                        { role: 'user', content: config.task }
                    ],
                    max_tokens: config.maxTokens,
                    temperature: 0.7
                })
            });
            const duration = (Date.now() - startTime) / 1000;
            if (res.ok) {
                const d = await res.json();
                return { ...config, success: true, response: d.choices?.[0]?.message?.content || '', duration };
            }
            return { ...config, success: false, error: `HTTP ${res.status}`, duration };
        } catch (e) {
            return { ...config, success: false, error: e.message, duration: (Date.now() - startTime) / 1000 };
        }
    });

    return Promise.all(promises);
}

// ═══════════════════════════════════════════════════════════════
//                    STEP 4: SYNTHESIZE
// ═══════════════════════════════════════════════════════════════

async function synthesizeResults(results, originalPrompt) {
    const successfulResults = results.filter(r => r.success);
    if (successfulResults.length === 0) return 'عذراً، لم أتمكن من معالجة طلبك.';
    if (successfulResults.length === 1) return successfulResults[0].response;

    const agentOutputs = successfulResults.map(r => `## ${r.emoji} ${r.name}:\n${r.response}`).join('\n\n');

    const synthesizePrompt = `أنت "المنسق العام" لنظام لوكاس. أمامك إجابات من خبراء مختلفين.

السؤال الأصلي: "${originalPrompt}"

مهمتك:
1. دمج الإجابات في رد واحد متسق
2. حذف التكرار
3. اختيار الأدق من كل خبير
4. تنسيق بـ Markdown
5. لا تذكر أسماء الخبراء

الإجابات:
${agentOutputs}

قدم الرد النهائي المدمج:`;

    const keys = getGeminiKeys();
    for (const model of GEMINI_MODELS) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': keys[geminiKeyIndex++ % keys.length] },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: synthesizePrompt }] }],
                    generationConfig: { maxOutputTokens: 4000, temperature: 0.4 }
                })
            });
            if (res.ok) {
                const d = await res.json();
                const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) return text;
            }
        } catch (e) { }
    }
    return agentOutputs;
}

// ═══════════════════════════════════════════════════════════════
//                    MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        const { prompt, skipCache = false } = req.body || {};
        if (!prompt) return res.status(400).json({ success: false, error: 'Missing prompt' });

        const startTime = Date.now();
        console.log('[AgentFactory] 🏭 Starting...');

        // Check memory
        if (!skipCache) {
            const cached = await checkGeneticMemory(prompt);
            if (cached) {
                console.log(`[AgentFactory] 💾 Cache HIT`);
                return res.status(200).json({
                    success: true,
                    data: cached.response,
                    meta: { fromCache: true, similarity: cached.similarity?.toFixed(2) }
                });
            }
        }

        // Analyze → Generate → Execute → Synthesize
        const analysis = await analyzeTask(prompt);
        console.log(`[AgentFactory] Agents: ${analysis.agents.map(a => a.type).join(', ')}`);

        const configs = generateAgentConfigs(analysis.agents, prompt, analysis.complexity);
        const results = await executeAgents(configs);
        const finalResponse = await synthesizeResults(results, prompt);

        // Save to memory
        await saveToGeneticMemory(prompt, finalResponse, results.map(r => r.type));

        const duration = (Date.now() - startTime) / 1000;
        console.log(`[AgentFactory] ✅ Done in ${duration.toFixed(2)}s`);

        res.status(200).json({
            success: true,
            data: finalResponse,
            meta: {
                complexity: analysis.complexity,
                agentsUsed: results.map(r => ({ name: r.name, emoji: r.emoji, success: r.success })),
                duration: duration.toFixed(2) + 's',
                fromCache: false
            }
        });

    } catch (error) {
        console.error('[AgentFactory] ❌ Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
