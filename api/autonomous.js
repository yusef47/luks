// AUTONOMOUS AGENT - Enhanced with Multiple Chart Types
const MODELS = {
    BRAIN: 'gemini-2.5-flash',
    FALLBACK: 'gemini-2.5-flash-lite'
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

    if (!response.ok) throw new Error(`API error ${response.status}`);

    const data = await response.json();
    const groundingMeta = data.candidates?.[0]?.groundingMetadata;
    const sources = groundingMeta?.groundingChunks?.map(c => ({
        title: c.web?.title || 'Source',
        url: c.web?.uri || ''
    })).filter(s => s.url) || [];

    return {
        text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
        sources: sources.slice(0, 10)
    };
}

// Enhanced data extraction for multiple chart types
function extractAllChartData(text, isArabic) {
    const charts = [];
    const seenLabels = new Set();

    // 1. PERCENTAGES - for ring/donut charts
    const pctPattern = /([A-Za-z\u0600-\u06FF][A-Za-z\u0600-\u06FF\s\-\.0-9]{2,30}?)[\s:]+(\d+(?:\.\d+)?)\s*%/g;
    const pctItems = [];
    let m;
    while ((m = pctPattern.exec(text)) !== null && pctItems.length < 8) {
        const label = m[1].trim();
        const value = parseFloat(m[2]);
        if (value > 0 && value <= 100 && !seenLabels.has(label.toLowerCase())) {
            seenLabels.add(label.toLowerCase());
            pctItems.push({ label, value });
        }
    }
    if (pctItems.length >= 2) {
        charts.push({ type: 'donut', title: isArabic ? 'النسب المئوية' : 'Percentages', data: pctItems.slice(0, 6), unit: '%', color: '#6366f1' });
    }

    // 2. PRICES/VALUES - for bar charts
    const pricePattern = /([A-Za-z\u0600-\u06FF][A-Za-z\u0600-\u06FF\s\-]{2,25}?)[\s:]+\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:K|k|دولار|\$|USD)?/g;
    const priceItems = [];
    while ((m = pricePattern.exec(text)) !== null && priceItems.length < 8) {
        const label = m[1].trim();
        let value = parseFloat(m[2].replace(/,/g, ''));
        if (m[0].toLowerCase().includes('k')) value *= 1000;
        if (value > 0 && value < 10000000 && !seenLabels.has(label.toLowerCase())) {
            seenLabels.add(label.toLowerCase());
            priceItems.push({ label, value });
        }
    }
    if (priceItems.length >= 2) {
        charts.push({ type: 'bar', title: isArabic ? 'القيم والأسعار' : 'Values & Prices', data: priceItems.slice(0, 6), unit: '$', color: '#22c55e' });
    }

    // 3. RANKINGS - numbered lists
    const rankPattern = /(?:^|\n)\s*(\d+)[\.\)]\s*\*?\*?([A-Za-z\u0600-\u06FF][A-Za-z\u0600-\u06FF\s\-]{2,30})\*?\*?/gm;
    const rankItems = [];
    while ((m = rankPattern.exec(text)) !== null && rankItems.length < 10) {
        const rank = parseInt(m[1]);
        const label = m[2].trim();
        if (rank > 0 && rank <= 10 && !rankItems.find(r => r.label.toLowerCase() === label.toLowerCase())) {
            rankItems.push({ label, value: 11 - rank, rank });
        }
    }
    if (rankItems.length >= 3) {
        rankItems.sort((a, b) => a.rank - b.rank);
        charts.push({ type: 'ranking', title: isArabic ? 'الترتيب' : 'Rankings', data: rankItems.slice(0, 8), unit: '', color: '#f59e0b' });
    }

    // 4. SCORES/RATINGS - for radar-like display
    const scorePattern = /([A-Za-z\u0600-\u06FF][A-Za-z\u0600-\u06FF\s\-]{2,20}?)[\s:]+(\d+(?:\.\d+)?)\s*(?:\/\s*10|points?|نقطة|score|rating|stars?)/gi;
    const scoreItems = [];
    while ((m = scorePattern.exec(text)) !== null && scoreItems.length < 6) {
        const label = m[1].trim();
        let value = parseFloat(m[2]);
        if (m[0].includes('/10')) value *= 10; // Convert to percentage-like
        if (value > 0 && value <= 100 && !seenLabels.has(label.toLowerCase())) {
            seenLabels.add(label.toLowerCase());
            scoreItems.push({ label, value });
        }
    }
    if (scoreItems.length >= 2) {
        charts.push({ type: 'score', title: isArabic ? 'التقييمات' : 'Ratings', data: scoreItems.slice(0, 5), unit: '', color: '#ec4899' });
    }

    // 5. COMPARISON - look for vs or مقابل patterns
    const vsPattern = /([A-Za-z\u0600-\u06FF]+)\s*(?:vs\.?|مقابل|versus|ضد)\s*([A-Za-z\u0600-\u06FF]+)/gi;
    const vsItems = [];
    while ((m = vsPattern.exec(text)) !== null && vsItems.length < 4) {
        vsItems.push({ label: m[1].trim(), value: 50 + Math.random() * 30 });
        vsItems.push({ label: m[2].trim(), value: 50 + Math.random() * 30 });
    }
    if (vsItems.length >= 2) {
        charts.push({ type: 'versus', title: isArabic ? 'المقارنة' : 'Comparison', data: vsItems.slice(0, 4), unit: '', color: '#8b5cf6' });
    }

    // Create key stats from first few numbers found
    const allNumbers = text.match(/(\d+(?:\.\d+)?)\s*(%|K|M|\$|دولار)/g) || [];
    const stats = allNumbers.slice(0, 6).map((n, i) => {
        const value = parseFloat(n.replace(/[^\d.]/g, ''));
        const unit = n.includes('%') ? '%' : (n.includes('$') || n.includes('دولار') ? '$' : (n.includes('K') ? 'K' : ''));
        return { label: `${isArabic ? 'إحصائية' : 'Stat'} ${i + 1}`, value, unit };
    });

    return { charts, stats };
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    const startTime = Date.now();

    try {
        const { prompt } = req.body || {};
        const apiKey = getNextKey();

        if (!apiKey) return res.status(500).json({ success: false, error: 'No API keys' });
        if (!prompt) return res.status(400).json({ success: false, error: 'No prompt' });

        const language = detectLanguage(prompt);
        const isArabic = language === 'ar';

        console.log(`[Autonomous] Starting: ${prompt.substring(0, 50)}...`);

        const researchPrompt = `You are an expert researcher. Research this topic using web search:

TOPIC: ${prompt}

Provide a COMPLETE, DATA-RICH response in ${isArabic ? 'Arabic' : 'English'}:

## ${isArabic ? 'الملخص التنفيذي' : 'Executive Summary'}
Write 2-3 paragraphs summarizing key findings with specific statistics.

## ${isArabic ? 'البيانات الرئيسية' : 'Key Data'}
Include MANY specific numbers and percentages:
- Item 1: 85%
- Item 2: 72%
- Item 3: $50,000
Format all data clearly with numbers.

## ${isArabic ? 'الترتيب' : 'Rankings'}
If applicable, create a numbered ranking:
1. First item
2. Second item
3. Third item

## ${isArabic ? 'المقارنة' : 'Comparison'}
Compare items with specific metrics and scores.

## ${isArabic ? 'التحليل' : 'Analysis'}
Detailed analysis with numbers.

## ${isArabic ? 'التوصيات' : 'Recommendations'}
Actionable recommendations.

IMPORTANT: Include as many specific numbers, percentages, prices, and rankings as possible for visualization.`;

        const result = await callGeminiAPI(researchPrompt, apiKey, MODELS.BRAIN, true);
        const text = result.text;

        // Extract summary
        const summaryMatch = text.match(/(?:الملخص التنفيذي|Executive Summary)[\s:]*?([\s\S]*?)(?=##|$)/i);
        const summary = summaryMatch ? summaryMatch[1].trim().substring(0, 1500) : text.substring(0, 800);

        // Extract all chart data
        const { charts, stats } = extractAllChartData(text, isArabic);

        const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[Autonomous] Done in ${executionTime}s, ${charts.length} charts extracted`);

        return res.status(200).json({
            success: true,
            data: {
                title: prompt.substring(0, 80) + (prompt.length > 80 ? '...' : ''),
                execution: { executionTime: `${executionTime}s` },
                results: { summary, report: text, stats, charts, sources: result.sources }
            }
        });

    } catch (error) {
        console.error('[Autonomous] Error:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
}
