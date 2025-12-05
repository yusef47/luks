// AUTONOMOUS AGENT - Fast Mode with Charts Support
const MODELS = {
    BRAIN: 'gemini-2.5-flash',
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

    const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
    if (useSearch) body.tools = [{ googleSearch: {} }];

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
    const groundingMeta = data.candidates?.[0]?.groundingMetadata;
    const sources = groundingMeta?.groundingChunks?.map(c => ({
        title: c.web?.title || 'Source',
        url: c.web?.uri || ''
    })).filter(s => s.url) || [];

    return {
        text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
        sources: sources.slice(0, 8)
    };
}

// Extract chart-friendly data from text
function extractChartData(text, isArabic) {
    const charts = [];

    // Pattern 1: "Name: XX%" or "Name XX%"
    const percentagePattern = /([A-Za-z\u0600-\u06FF][A-Za-z\u0600-\u06FF\s\-\.0-9]{2,25}?)[\s:]+(\d+(?:\.\d+)?)\s*%/g;
    const percentItems = [];
    let match;
    while ((match = percentagePattern.exec(text)) !== null && percentItems.length < 8) {
        const label = match[1].trim();
        const value = parseFloat(match[2]);
        if (value > 0 && value <= 100 && !percentItems.find(p => p.label.toLowerCase() === label.toLowerCase())) {
            percentItems.push({ label, value });
        }
    }
    if (percentItems.length >= 3) {
        charts.push({
            type: 'bar',
            title: isArabic ? 'المقارنة بالنسب المئوية' : 'Percentage Comparison',
            data: percentItems.slice(0, 6),
            unit: '%',
            color: '#6366f1'
        });
    }

    // Pattern 2: "$XXX" or "XXX دولار" - Prices
    const pricePattern = /([A-Za-z\u0600-\u06FF][A-Za-z\u0600-\u06FF\s\-\.0-9]{2,20}?)[\s:]+\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:دولار|\$|USD|K)?(?:\s*(?:per|\/)\s*(?:month|year|M|million))?/gi;
    const priceItems = [];
    while ((match = pricePattern.exec(text)) !== null && priceItems.length < 8) {
        const label = match[1].trim();
        let value = parseFloat(match[2].replace(/,/g, ''));
        if (value > 0 && value < 1000000 && !priceItems.find(p => p.label.toLowerCase() === label.toLowerCase())) {
            priceItems.push({ label, value });
        }
    }
    if (priceItems.length >= 3) {
        charts.push({
            type: 'horizontal',
            title: isArabic ? 'مقارنة الأسعار/القيم' : 'Price/Value Comparison',
            data: priceItems.slice(0, 6),
            unit: '$',
            color: '#22c55e'
        });
    }

    // Pattern 3: Rankings "1. Name", "2. Name"
    const rankPattern = /(?:^|\n)\s*(\d+)[\.\)]\s*([A-Za-z\u0600-\u06FF][A-Za-z\u0600-\u06FF\s\-]{3,25})/gm;
    const rankItems = [];
    while ((match = rankPattern.exec(text)) !== null && rankItems.length < 10) {
        const rank = parseInt(match[1]);
        const label = match[2].trim();
        if (rank > 0 && rank <= 10 && !rankItems.find(r => r.label.toLowerCase() === label.toLowerCase())) {
            rankItems.push({ label, value: 11 - rank, rank }); // Invert for display
        }
    }
    if (rankItems.length >= 3) {
        rankItems.sort((a, b) => a.rank - b.rank);
        charts.push({
            type: 'ranking',
            title: isArabic ? 'الترتيب' : 'Rankings',
            data: rankItems.slice(0, 6),
            unit: '',
            color: '#f59e0b'
        });
    }

    return charts;
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

        console.log(`[Autonomous] Starting: ${prompt.substring(0, 50)}...`);

        const researchPrompt = `You are an expert researcher. Research this topic using web search:

TOPIC: ${prompt}

Provide a COMPLETE response in ${isArabic ? 'Arabic' : 'English'}:

## ${isArabic ? 'الملخص التنفيذي' : 'Executive Summary'}
Write 2-3 paragraphs summarizing key findings.

## ${isArabic ? 'النتائج الرئيسية' : 'Key Findings'}
Include specific numbers, percentages, and statistics.
Format data clearly: "Item Name: 85%" or "Product: $500"

## ${isArabic ? 'البيانات المقارنة' : 'Comparative Data'}
If comparing items, list them with scores/values:
- Item 1: 95%
- Item 2: 88%
- Item 3: 82%

## ${isArabic ? 'التحليل التفصيلي' : 'Detailed Analysis'}
In-depth analysis with facts.

## ${isArabic ? 'التوصيات' : 'Recommendations'}
Actionable recommendations.

## ${isArabic ? 'الخلاصة' : 'Conclusion'}
Summary and outlook.

IMPORTANT: Include lots of specific numbers and percentages that can be visualized in charts.`;

        const result = await callGeminiAPI(researchPrompt, apiKey, MODELS.BRAIN, true);
        const text = result.text;

        // Extract summary
        const summaryMatch = text.match(/(?:الملخص التنفيذي|Executive Summary)[\s:]*?([\s\S]*?)(?=##|$)/i);
        const summary = summaryMatch ? summaryMatch[1].trim().substring(0, 1200) : text.substring(0, 600);

        // Extract chart data
        const charts = extractChartData(text, isArabic);

        // Simple stats for cards
        const statsMatch = text.match(/(\d+(?:\.\d+)?)\s*%/g) || [];
        const stats = statsMatch.slice(0, 4).map((s, i) => ({
            label: `${isArabic ? 'إحصائية' : 'Stat'} ${i + 1}`,
            value: parseFloat(s),
            unit: '%'
        }));

        const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[Autonomous] Done in ${executionTime}s, ${charts.length} charts`);

        return res.status(200).json({
            success: true,
            data: {
                title: prompt.substring(0, 60) + (prompt.length > 60 ? '...' : ''),
                execution: { executionTime: `${executionTime}s` },
                results: {
                    summary,
                    report: text,
                    stats,
                    charts,
                    sources: result.sources
                }
            }
        });

    } catch (error) {
        console.error('[Autonomous] Error:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
}
