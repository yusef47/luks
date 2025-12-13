// AUTONOMOUS AGENT - GROQ ONLY (Testing Mode)
const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

function getGroqKeys() {
    const keys = [];
    for (let i = 1; i <= 10; i++) {
        const key = process.env[`GROQ_API_KEY_${i}`];
        if (key && key.trim().length > 0) keys.push(key.trim());
    }
    return keys;
}

function detectLanguage(text) {
    return /[\u0600-\u06FF]/.test(text) ? 'ar' : 'en';
}

async function callGroqAPI(prompt) {
    const keys = getGroqKeys();
    if (keys.length === 0) throw new Error('No Groq keys available');

    let keyIndex = 0;
    let modelIndex = 0;

    for (let i = 0; i < 15; i++) {
        const apiKey = keys[keyIndex % keys.length];
        const model = GROQ_MODELS[modelIndex % GROQ_MODELS.length];
        keyIndex++;
        modelIndex++;

        try {
            console.log(`[Autonomous] GROQ Attempt ${i + 1}: ${model}`);

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 4000
                })
            });

            if (response.status === 429) {
                console.log(`[Autonomous] Groq rate limited, trying next...`);
                continue;
            }

            if (!response.ok) {
                console.log(`[Autonomous] Groq error ${response.status}, trying next...`);
                continue;
            }

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content;

            if (text) {
                console.log(`[Autonomous] ✅ GROQ SUCCESS with ${model}!`);
                return { text, sources: [] };
            }
        } catch (err) {
            console.log(`[Autonomous] Error: ${err.message}`);
        }
    }

    throw new Error('All Groq API attempts failed');
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
        const apiKey = getNextKey();
        if (!apiKey) return res.status(500).json({ success: false, error: 'No API keys' });

        // Accept both 'query' and 'prompt' for compatibility
        const prompt = req.body.query || req.body.prompt;
        if (!prompt) return res.status(400).json({ success: false, error: 'No query or prompt provided' });

        const language = detectLanguage(prompt);
        const isArabic = language === 'ar';

        console.log(`[Autonomous] Starting: ${prompt.substring(0, 50)}...`);

        // Get current time
        const now = new Date();
        const timeString = now.toLocaleString('ar-EG', {
            timeZone: 'Africa/Cairo',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const researchPrompt = `أنت لوكاس (Lukas) - باحث خبير ومساعد ذكي.

═══════════════════════════════════════════════════════════════
⚠️ قواعد صارمة: ممنوع ذكر Google, Gemini, Bard, أو أي شركة تقنية
═══════════════════════════════════════════════════════════════
مطورك: شخص مصري ذكي ومبدع، شغوف بالتكنولوجيا والذكاء الاصطناعي
الوقت الحالي: ${timeString}

ابحث في هذا الموضوع باستخدام البحث:

TOPIC: ${prompt}

اكتب تقريراً كاملاً وغنياً بالبيانات بـ ${isArabic ? 'العربية' : 'English'}:

## ${isArabic ? 'الملخص التنفيذي' : 'Executive Summary'}
اكتب 2-3 فقرات تلخص النتائج الأساسية مع إحصائيات محددة.

## ${isArabic ? 'البيانات الرئيسية' : 'Key Data'}
أدرج العديد من الأرقام والنسب المئوية:
- Item 1: 85%
- Item 2: 72%
- Item 3: $50,000
اعرض كل البيانات بأرقام واضحة.

## ${isArabic ? 'الترتيب' : 'Rankings'}
إذا كان مناسباً، أنشئ ترتيباً مرقماً:
1. العنصر الأول
2. العنصر الثاني
3. العنصر الثالث

## ${isArabic ? 'المقارنة' : 'Comparison'}
قارن العناصر بمقاييس ودرجات محددة.

## ${isArabic ? 'التحليل' : 'Analysis'}
تحليل مفصل بالأرقام.

## ${isArabic ? 'التوصيات' : 'Recommendations'}
توصيات عملية.

مهم جداً: أدرج أكبر عدد ممكن من الأرقام والنسب المئوية والأسعار والترتيبات للتصور البياني.`;

        const result = await callGroqAPI(researchPrompt);
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
