// AUTONOMOUS AGENT - Fast Mode (Vercel 10s Timeout Compatible)
const MODELS = {
    BRAIN: 'gemini-2.5-flash', // Fast model
    FALLBACK: 'gemini-2.0-flash'
};

function getAPIKeys() {
    const keys = [];
    for (let i = 1; i <= 13; i++) {
        const key = process.env[`GEMINI_API_KEY_${i}`];
        if (key && key.trim().length > 0) keys.push(key.trim());
    }
    if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY.trim());
    return keys;
}

function getNextKey() {
    const keys = getAPIKeys();
    return keys.length ? keys[Math.floor(Math.random() * keys.length)] : null;
}

function detectLanguage(text) {
    return /[\u0600-\u06FF]/.test(text) ? 'ar' : 'en';
}

async function callGeminiAPI(prompt, apiKey, model = MODELS.BRAIN, useSearch = true) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const body = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
    };

    if (useSearch) {
        body.tools = [{ googleSearch: {} }];
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body)
    });

    if ([429, 404, 503].includes(response.status) && model !== MODELS.FALLBACK) {
        return callGeminiAPI(prompt, apiKey, MODELS.FALLBACK, useSearch);
    }

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`API error ${response.status}: ${err.substring(0, 100)}`);
    }

    const data = await response.json();

    // Extract sources from grounding
    const groundingMeta = data.candidates?.[0]?.groundingMetadata;
    const sources = groundingMeta?.groundingChunks?.map(c => ({
        title: c.web?.title || 'مصدر',
        url: c.web?.uri || ''
    })).filter(s => s.url) || [];

    return {
        text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
        sources: sources.slice(0, 8)
    };
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    const startTime = Date.now();

    try {
        const { action, prompt } = req.body || {};
        const apiKey = getNextKey();

        if (!apiKey) return res.status(500).json({ success: false, error: 'No API keys' });
        if (!prompt) return res.status(400).json({ success: false, error: 'No prompt provided' });

        const language = detectLanguage(prompt);
        const isArabic = language === 'ar';

        console.log(`[Autonomous] Starting fast execution for: ${prompt.substring(0, 50)}...`);

        // ONE comprehensive search + report (to fit in 10s timeout)
        const researchPrompt = `You are an expert researcher. Research this topic thoroughly using web search:

TOPIC: ${prompt}

Provide a COMPLETE, DETAILED response in ${isArabic ? 'Arabic' : 'English'} with:

## ${isArabic ? 'الملخص التنفيذي' : 'Executive Summary'}
(2-3 paragraphs summarizing key findings)

## ${isArabic ? 'النتائج الرئيسية' : 'Key Findings'}
(Detailed findings with specific numbers, statistics, and facts from 2024-2025)

## ${isArabic ? 'التحليل التفصيلي' : 'Detailed Analysis'}
(In-depth analysis of the topic)

## ${isArabic ? 'التوصيات' : 'Recommendations'}
(Actionable recommendations)

## ${isArabic ? 'الخلاصة' : 'Conclusion'}
(Summary and future outlook)

IMPORTANT:
- Include specific numbers and statistics
- Use current data (2024-2025)
- Be comprehensive and detailed
- Do NOT use placeholders
- Write the complete report NOW`;

        const result = await callGeminiAPI(researchPrompt, apiKey, MODELS.BRAIN, true);

        // Parse sections from result
        const text = result.text;

        // Extract summary (first section)
        const summaryMatch = text.match(/(?:الملخص التنفيذي|Executive Summary)[:\s]*([\s\S]*?)(?=##|$)/i);
        const summary = summaryMatch ? summaryMatch[1].trim().substring(0, 1000) : text.substring(0, 500);

        // Extract some stats (simple extraction)
        const numbers = text.match(/\d+(?:\.\d+)?(?:\s*)?(?:%|دولار|\$|USD|مليون|billion|million|ألف|thousand)/gi) || [];
        const stats = numbers.slice(0, 5).map((n, i) => ({
            label: `Stat ${i + 1}`,
            value: parseFloat(n.replace(/[^\d.]/g, '')) || 0,
            unit: n.includes('%') ? '%' : (n.includes('$') || n.includes('دولار') ? '$' : '')
        }));

        const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[Autonomous] Completed in ${executionTime}s`);

        return res.status(200).json({
            success: true,
            data: {
                title: prompt.substring(0, 60) + (prompt.length > 60 ? '...' : ''),
                complexity: 'fast',
                plan: {
                    stages: [
                        { id: 1, name: isArabic ? 'بحث شامل' : 'Comprehensive Research', status: 'completed' },
                        { id: 2, name: isArabic ? 'تحليل وكتابة' : 'Analysis & Writing', status: 'completed' }
                    ],
                    totalStages: 2,
                    expectedOutputs: [isArabic ? 'تقرير' : 'Report']
                },
                execution: {
                    stagesCompleted: 2,
                    executionTime: `${executionTime}s`,
                    stageDetails: [
                        { id: 1, name: isArabic ? 'بحث شامل' : 'Research', status: 'completed', queriesExecuted: 1 },
                        { id: 2, name: isArabic ? 'تحليل' : 'Analysis', status: 'completed', queriesExecuted: 0 }
                    ]
                },
                results: {
                    summary: summary,
                    report: text,
                    stats: stats,
                    sources: result.sources
                }
            }
        });

    } catch (error) {
        console.error('[Autonomous] Error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
