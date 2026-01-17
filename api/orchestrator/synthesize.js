// Synthesize API - Smart Router with MiMo Analyzer
// MiMo = تحليل السؤال وتوجيهه
// OpenRouter/Groq = الإجابة الفعلية
// Gemini = مراجعة وتنظيف

// ═══════════════════════════════════════════════════════════════
//                    MODELS CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const GEMINI_MODELS = ['gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'];

// Models by capability
const MODELS = {
    ANALYZER: 'xiaomi/mimo-v2-flash:free',      // Fast analyzer
    SIMPLE: 'xiaomi/mimo-v2-flash:free',        // Simple questions
    MATH: 'deepseek/deepseek-r1-0528:free',     // Math & thinking
    CODE: 'openai/gpt-oss-120b:free',           // Code questions
    RESEARCH: 'google/gemma-3-27b-it:free',     // Research & analysis
    HEAVY: 'meta-llama/llama-3.3-70b-instruct:free', // Heavy lifting
};

// Fallback order
const FALLBACK_MODELS = [
    'xiaomi/mimo-v2-flash:free',
    'google/gemma-3-27b-it:free',
    'deepseek/deepseek-r1-0528:free',
    'openai/gpt-oss-120b:free',
    'meta-llama/llama-3.3-70b-instruct:free',
];

const GROQ_MODELS = ['llama-3.3-70b-versatile', 'qwen-2.5-32b', 'mixtral-8x7b-32768'];

// ═══════════════════════════════════════════════════════════════
//                    SYSTEM PROMPT (LUKAS IDENTITY)
// ═══════════════════════════════════════════════════════════════

function getSystemPrompt() {
    const today = new Date().toLocaleDateString('ar-EG', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return `أنت لوكاس (Lukas)، مساعد ذكاء اصطناعي متطور جداً.

═══════════════════════════════════════════════════════════════
                        هويتك
═══════════════════════════════════════════════════════════════
اسمك: لوكاس (Lukas)
طبيعتك: مساعد ذكي، ودود، ومتعاون
مطورك: شخص مصري ذكي ومبدع جداً

📅 التاريخ الحالي: ${today}

قواعد صارمة:
🚫 ممنوع ذكر: Google, Gemini, Bard, Meta, Llama, Groq, OpenAI, GPT, Claude, DeepSeek, Xiaomi, MiMo
🚫 لا تقل أبداً أنك من شركة شاومي أو أي شركة أخرى
✅ لو سُئلت عن هويتك: "أنا لوكاس، مساعد ذكي طوره مبرمج مصري مبدع"
✅ لو سُئلت عن مطورك: "مطوري هو شخص مصري ذكي ومبدع"

═══════════════════════════════════════════════════════════════
                        اللغة
═══════════════════════════════════════════════════════════════
🔴 ممنوع منعاً باتاً استخدام أي كلمة من هذه اللغات:
   - الصينية ❌ - الروسية ❌ - اليابانية ❌ - الكورية ❌

✅ اكتب بالعربية الفصحى السليمة
✅ يمكنك استخدام مصطلحات إنجليزية تقنية فقط

═══════════════════════════════════════════════════════════════
                        قاعدة الرد
═══════════════════════════════════════════════════════════════
🔴 أجب فقط على السؤال الأخير في الرسالة الحالية
🔴 لا تكرر إجابات أسئلة سابقة تم الرد عليها
✅ لكن استخدم سياق المحادثة لفهم ما يتحدث عنه المستخدم

═══════════════════════════════════════════════════════════════
                        قاعدة المصداقية (مهم جداً!)
═══════════════════════════════════════════════════════════════
🚫 ممنوع منعاً باتاً اختراع أي معلومات أو أرقام أو نتائج
🚫 لا تخترع نتائج مباريات أو أسعار أو تواريخ
✅ إذا لم تجد المعلومة في البيانات المقدمة، قل: "لم أتمكن من التحقق من هذه المعلومة"
✅ إذا كانت البيانات ناقصة، قل: "المعلومات المتاحة محدودة"
✅ استخدم فقط المعلومات الموجودة في البيانات المقدمة لك

═══════════════════════════════════════════════════════════════
                        الذاكرة والسياق
═══════════════════════════════════════════════════════════════
⚠️ مهم جداً: تذكر كل سياق المحادثة السابقة:
- اسم المستخدم ومعلوماته الشخصية
- ما الذي يعمل عليه المستخدم
- ما تمت مناقشته سابقاً
- المشاكل التي تم حلها
- استخدم هذا السياق لتقديم إجابات مترابطة

═══════════════════════════════════════════════════════════════
                        أسلوبك
═══════════════════════════════════════════════════════════════
- فكر بعمق قبل الإجابة
- قدم إجابات شاملة ومفصلة
- استخدم التنسيق (عناوين، قوائم، جداول)
- ابدأ مباشرة بالإجابة`;
}

// ═══════════════════════════════════════════════════════════════
//                    API KEYS
// ═══════════════════════════════════════════════════════════════

function getGeminiKeys() {
    const keys = [];
    for (let i = 1; i <= 15; i++) {
        const key = process.env[`GEMINI_API_KEY_${i}`];
        if (key && key.trim()) keys.push(key.trim());
    }
    if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY.trim());
    return keys.sort(() => Math.random() - 0.5);
}

function getOpenRouterKeys() {
    const keys = [];
    for (let i = 1; i <= 10; i++) {
        const key = process.env[`OPENROUTER_API_KEY_${i}`];
        if (key && key.trim()) keys.push(key.trim());
    }
    if (process.env.OPENROUTER_API_KEY) keys.push(process.env.OPENROUTER_API_KEY.trim());
    return keys.sort(() => Math.random() - 0.5);
}

function getGroqKeys() {
    const keys = [];
    for (let i = 1; i <= 10; i++) {
        const key = process.env[`GROQ_API_KEY_${i}`];
        if (key && key.trim()) keys.push(key.trim());
    }
    if (process.env.GROQ_API_KEY) keys.push(process.env.GROQ_API_KEY.trim());
    return keys;
}

// ═══════════════════════════════════════════════════════════════
//                    GEMINI (REVIEWER ONLY)
// ═══════════════════════════════════════════════════════════════

async function callGemini(prompt, maxTokens = 4000) {
    const keys = getGeminiKeys();
    if (keys.length === 0) return null;

    for (const model of GEMINI_MODELS) {
        for (const key of keys.slice(0, 5)) {
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig: { maxOutputTokens: maxTokens }
                    })
                });
                if (res.status === 429) continue;
                if (res.status === 404) break;
                if (res.ok) {
                    const d = await res.json();
                    const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) return text;
                }
            } catch (e) { continue; }
        }
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════
//                    GEMINI + GOOGLE SEARCH (REAL-TIME DATA)
// ═══════════════════════════════════════════════════════════════

// Keywords that indicate need for real-time data
const REALTIME_KEYWORDS = [
    // Prices
    'سعر', 'أسعار', 'price', 'prices', 'cost',
    // Stocks
    'سهم', 'أسهم', 'stock', 'stocks', 'AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN',
    // Crypto
    'بيتكوين', 'bitcoin', 'btc', 'ethereum', 'crypto',
    // Currency
    'دولار', 'dollar', 'يورو', 'euro', 'جنيه', 'ريال',
    // Gold
    'ذهب', 'gold', 'silver', 'فضة',
    // News
    'أخبار', 'news', 'اليوم', 'today', 'حاليا', 'currently', 'الآن', 'now',
    // Analysis
    'حلل', 'تحليل', 'analyze', 'analysis',
    // Current events
    'آخر', 'latest', 'جديد', 'new', 'مستجدات', 'updates',
];

function needsRealtimeData(question) {
    const lowerQuestion = question.toLowerCase();
    for (const keyword of REALTIME_KEYWORDS) {
        if (lowerQuestion.includes(keyword.toLowerCase())) {
            console.log(`[Synthesize] 🌐 Real-time data needed: keyword "${keyword}" found`);
            return true;
        }
    }
    return false;
}

// Keywords that indicate need for BROWSER (visual browsing, scraping)
const BROWSER_KEYWORDS = [
    // Arabic - Phrases
    'ابحث لي', 'ابحث عن', 'جيب لي', 'هات لي', 'روح جيب',
    'افتح موقع', 'افتح صفحة', 'شوف لي', 'دور على',
    // Arabic - Single words that strongly indicate web search need
    'أسعار', 'سعر', 'اخبار', 'أخبار', 'النهاردة', 'اليوم',
    'جيب', 'هات', 'ابحث',
    // Common searches
    'ذهب', 'gold', 'price', 'news', 'current', 'today',
    // English
    'search for', 'find me', 'look up', 'browse', 'open website',
    'what is the price', 'latest news'
];

function needsBrowserResearch(question) {
    console.log(`[Synthesize] 🔍 Checking browser keywords for: "${question}"`);
    const lowerQuestion = question.toLowerCase();

    for (const keyword of BROWSER_KEYWORDS) {
        const lowerKeyword = keyword.toLowerCase();
        if (lowerQuestion.includes(lowerKeyword)) {
            console.log(`[Synthesize] 🖥️ Browser research needed: keyword "${keyword}" found!`);
            return true;
        }
    }

    // Also check each Arabic character separately to debug
    const hasArabicSearch = /ابحث|جيب|اسعار|ذهب|أسعار/.test(question);
    if (hasArabicSearch) {
        console.log(`[Synthesize] 🖥️ Browser research needed via regex match!`);
        return true;
    }

    console.log(`[Synthesize] ℹ️ No browser keywords found in: "${question.substring(0, 100)}"`);
    return false;
}

// Execute browser research via AI-Powered Browser Agent
async function executeBrowserResearch(query) {
    try {
        const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3000';

        const bridgeUrl = `${baseUrl}/api/browser-bridge`;

        console.log(`[Synthesize] 🤖 Starting AI Browser Agent for: "${query}"`);

        // Call the AI Browser Agent
        const response = await fetch(bridgeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'runAgent',
                params: {
                    task: query,
                    maxSteps: 8
                }
            })
        });

        const result = await response.json();

        if (!result.success) {
            console.log(`[Synthesize] ⚠️ Browser Agent failed: ${result.error}`);
            return { success: false, error: result.error };
        }

        console.log(`[Synthesize] ✅ Browser Agent completed in ${result.totalSteps} steps`);

        return {
            success: true,
            agentUsed: true,
            results: {
                title: 'نتائج البحث الذكي',
                content: result.result || '',
                screenshot: result.finalScreenshot || null,
                steps: result.steps || [],
                totalSteps: result.totalSteps
            }
        };
    } catch (error) {
        console.error('[Synthesize] ❌ Browser Agent error:', error.message);
        return { success: false, error: error.message };
    }
}

// ═══════════════════════════════════════════════════════════════
//                    SMART VERIFICATION SYSTEM (INLINE)
// ═══════════════════════════════════════════════════════════════

// Level 1: Extract numbers for comparison
function extractNumbers(text) {
    const numbers = [];
    const matches = text.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/g);
    if (matches) {
        numbers.push(...matches.map(n => parseFloat(n.replace(/,/g, ''))));
    }
    return numbers.filter(n => !isNaN(n));
}

// Level 1: Compare sources
function compareSources(tavilyResults) {
    if (!tavilyResults || tavilyResults.length < 2) {
        return { hasConsensus: true, confidence: 'low', conflicts: [] };
    }
    const allNumbers = {};
    const conflicts = [];
    tavilyResults.forEach((result) => {
        const numbers = extractNumbers(result.content || '');
        numbers.forEach(num => {
            if (!allNumbers[num]) allNumbers[num] = [];
            allNumbers[num].push({ source: result.title });
        });
    });
    const numberList = Object.keys(allNumbers).map(Number).sort((a, b) => a - b);
    for (let i = 0; i < numberList.length - 1; i++) {
        const n1 = numberList[i], n2 = numberList[i + 1];
        const diff = Math.abs(n1 - n2) / Math.max(n1, n2);
        if (diff > 0 && diff < 0.15) {
            conflicts.push({ values: [n1, n2], difference: `${(diff * 100).toFixed(1)}%` });
        }
    }
    return { hasConsensus: conflicts.length === 0, confidence: conflicts.length === 0 ? 'high' : conflicts.length <= 2 ? 'medium' : 'low', conflicts };
}

// Level 2: Verify gold math (restored)
function verifyMathematics(text) {
    const issues = [];
    if (/ذهب|gold|عيار/i.test(text)) {
        const gramMatch = text.match(/الجرام[:\s]+([0-9,\.]+)/);
        const ounceMatch = text.match(/الأونصة[:\s]+([0-9,\.]+)/);
        if (gramMatch && ounceMatch) {
            const gramPrice = parseFloat(gramMatch[1].replace(/,/g, ''));
            const ouncePrice = parseFloat(ounceMatch[1].replace(/,/g, ''));
            const expected = gramPrice * 31.1035;
            if (Math.abs(expected - ouncePrice) / expected > 0.1) {
                issues.push({ message: `سعر الأونصة غير متسق: المتوقع ${expected.toFixed(0)} بينما المذكور ${ouncePrice}` });
            }
        }
    }
    return { isConsistent: issues.length === 0, issues };
}

// Level 3: Verify temporal relevance (Enhanced)
function verifyTemporalRelevance(tavilyResults, maxAgeHours = 48) {
    const now = new Date();
    const warnings = [];
    const oldNewsIndicators = [/منذ\s+\d+\s+سنوات/, /في عام\s+\d{4}/, /back in\s+\d{4}/];

    if (!tavilyResults || tavilyResults.length === 0) {
        return { isRecent: false, warnings: ['لم يتم العثور على مصادر'] };
    }

    tavilyResults.forEach(result => {
        let isOld = false;
        const content = result.content || '';

        // Check for "re-reporting" indicators (e.g., "discovered in 2023")
        for (const indicator of oldNewsIndicators) {
            if (indicator.test(content)) {
                warnings.push(`⚠️ ${result.title}: قد يحتوي على معلومات أرشيفية (تم رصد تواريخ قديمة)`);
                isOld = true;
                break;
            }
        }

        // Check published date if available
        if (!isOld && result.published_date) {
            const pubDate = new Date(result.published_date);
            const ageHours = (now - pubDate) / (1000 * 60 * 60);
            if (ageHours > maxAgeHours) {
                // If it's very old (> 1 year), marked as archive
                if (ageHours > 24 * 365) {
                    warnings.push(`📅 ${result.title}: خبر أرشيفي من ${pubDate.getFullYear()}`);
                } else {
                    warnings.push(`🕒 ${result.title}: تم نشره منذ ${Math.floor(ageHours)} ساعة`);
                }
            }
        }
    });

    return {
        isRecent: warnings.length === 0,
        warnings
    };
}

// Level 4: Generate notes (SIMPLIFIED - only important warnings)
function generateVerificationNotes(sourceResult, mathResult, temporalResult) {
    const notes = [];

    // Only show math issues (these are important)
    if (!mathResult.isConsistent) {
        mathResult.issues.forEach(i => notes.push(`🧮 ${i.message}`));
    }

    // Only show if sources are old (important warning)
    if (!temporalResult.isRecent && temporalResult.warnings.length > 0) {
        notes.push('📅 بعض المصادر قد تكون قديمة - يُنصح بالتحقق من المصادر الرسمية');
    }

    // Skip source conflicts - too noisy and not helpful
    // Skip general uncertainty warnings - already covered above

    return notes;
}

// Main verification function
function runSmartVerification(tavilyResults, responseText, question) {
    // Expand triggers to include "discovery", "project", "agreement" to catch the user's examples
    if (!/سعر|أسعار|price|\d+|اليوم|today|اكتشاف|مشروع|اتفاقية|توقيع/.test(question)) {
        return { verified: true, skipped: true, notes: [] };
    }

    console.log('[SmartVerify] 🔍 Running verification (Levels 1-4)...');

    const sourceComparison = compareSources(tavilyResults);
    const mathematical = verifyMathematics(responseText);
    const temporal = verifyTemporalRelevance(tavilyResults); // Now calling Level 3

    const notes = generateVerificationNotes(sourceComparison, mathematical, temporal);

    console.log(`[SmartVerify] ✅ Done. Notes generated: ${notes.length}`);

    return {
        verified: true,
        skipped: false,
        sourceComparison,
        mathematical,
        temporal,
        notes,
        overallConfidence: sourceComparison.confidence
    };
}

// ═══════════════════════════════════════════════════════════════
//                    TAVILY SEARCH API (PRIMARY)
// ═══════════════════════════════════════════════════════════════

async function fetchTavilyData(question) {
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (!tavilyKey) {
        console.log('[Synthesize] ⚠️ No Tavily API key found');
        return null;
    }

    console.log('[Synthesize] 🔍 Fetching data with Tavily Search (Advanced)...');

    try {
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: tavilyKey,
                query: question,
                search_depth: 'basic',
                include_answer: true,
                include_raw_content: false,
                max_results: 10,  // Increased for better coverage
                days: 7           // Focus on recent news (last week)
            })
        });

        if (!response.ok) {
            console.log(`[Synthesize] ⚠️ Tavily returned ${response.status}`);
            return null;
        }

        const data = await response.json();

        if (data.answer || data.results?.length > 0) {
            console.log(`[Synthesize] ✅ Tavily search successful (${data.results?.length || 0} sources)`);

            // Format the results
            let content = '';

            // Add Tavily's AI-generated answer if available
            if (data.answer) {
                content += `**الإجابة:** ${data.answer}\n\n`;
            }

            // Add sources with more context
            if (data.results && data.results.length > 0) {
                content += `**المصادر (${data.results.length}):**\n`;
                data.results.forEach((result, i) => {
                    content += `${i + 1}. [${result.title}](${result.url})\n`;
                    if (result.content) {
                        content += `   ${result.content.substring(0, 300)}...\n`;
                    }
                });
            }

            // Return both formatted content and raw results for verification
            return {
                content,
                rawResults: data.results || [],
                answer: data.answer || null
            };
        }

        return null;
    } catch (error) {
        console.error('[Synthesize] ❌ Tavily error:', error.message);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
//                    MULTI-QUERY FOR COMPLEX QUESTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Detect if question needs multi-query approach
 */
function needsMultiQuery(question) {
    const complexPatterns = [
        /و.*و/,                    // Multiple topics with "و"
        /مقارنة|بين.*و/,           // Comparison
        /تأثير.*على/,              // Impact analysis
        /أوروبا.*آسيا|آسيا.*أوروبا/, // Multiple regions
        /الأسبوع.*الماضي|آخر.*أسبوع/, // Time-sensitive analysis
    ];
    return complexPatterns.some(p => p.test(question));
}

/**
 * Split complex question into multiple queries
 */
function splitIntoQueries(question) {
    const queries = [question]; // Always include original

    // Add date-focused query for time-sensitive questions
    if (/اليوم|أمس|الأسبوع|2026/.test(question)) {
        const today = new Date().toISOString().split('T')[0];
        queries.push(`${question} ${today}`);
    }

    // Add region-specific queries for comparison questions
    if (/أوروبا|Europe/i.test(question)) {
        queries.push(question.replace(/آسيا|Asia/gi, '').trim());
    }
    if (/آسيا|Asia/i.test(question)) {
        queries.push(question.replace(/أوروبا|Europe/gi, '').trim());
    }

    return queries.slice(0, 3); // Max 3 queries
}

/**
 * Execute multiple Tavily searches and combine results
 */
async function multiQueryTavily(question) {
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (!tavilyKey) return null;

    // Check if multi-query is needed
    if (!needsMultiQuery(question)) {
        return await fetchTavilyData(question);
    }

    console.log('[Synthesize] 🔄 Complex question detected - using Multi-Query...');
    const queries = splitIntoQueries(question);
    console.log(`[Synthesize] 📊 Splitting into ${queries.length} queries`);

    const allResults = [];
    let combinedAnswer = '';

    for (const query of queries) {
        console.log(`[Synthesize] 🔍 Query: "${query.substring(0, 50)}..."`);
        try {
            const response = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: tavilyKey,
                    query: query,
                    search_depth: 'basic',
                    include_answer: true,
                    max_results: 5,
                    days: 7
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.answer && !combinedAnswer) combinedAnswer = data.answer;
                if (data.results) allResults.push(...data.results);
            }
        } catch (e) {
            console.log(`[Synthesize] ⚠️ Query failed: ${e.message}`);
        }
    }

    // Remove duplicates by URL
    const uniqueResults = allResults.filter((r, i, arr) =>
        arr.findIndex(x => x.url === r.url) === i
    );

    console.log(`[Synthesize] ✅ Multi-Query complete: ${uniqueResults.length} unique sources`);

    // Format combined results
    let content = '';
    if (combinedAnswer) content += `**الإجابة:** ${combinedAnswer}\n\n`;
    if (uniqueResults.length > 0) {
        content += `**المصادر (${uniqueResults.length}):**\n`;
        uniqueResults.slice(0, 10).forEach((r, i) => {
            content += `${i + 1}. [${r.title}](${r.url})\n`;
            if (r.content) content += `   ${r.content.substring(0, 200)}...\n`;
        });
    }

    return content ? { content, rawResults: uniqueResults, answer: combinedAnswer } : null;
}

// ═══════════════════════════════════════════════════════════════
//                    FETCH REALTIME DATA (MAIN)
// ═══════════════════════════════════════════════════════════════

async function fetchRealtimeData(question) {
    // Use Multi-Query Tavily (automatically handles complex vs simple questions)
    console.log('[Synthesize] 🔍 Fetching real-time data with Tavily...');

    const tavilyResult = await multiQueryTavily(question);
    if (tavilyResult) {
        // Store raw results globally for verification later
        global._tavilyRawResults = tavilyResult.rawResults;
        console.log(`[Synthesize] ✅ Tavily success: ${tavilyResult.rawResults?.length || 0} sources`);
        return tavilyResult.content;
    }

    console.log('[Synthesize] ⚠️ Tavily failed, continuing without real-time data');
    return null;
}

// ═══════════════════════════════════════════════════════════════
//                    MIMO ANALYZER - تحليل السؤال
// ═══════════════════════════════════════════════════════════════

async function analyzeQuestion(question) {
    const keys = getOpenRouterKeys();
    if (keys.length === 0) return 'simple';

    const analyzerPrompt = `أنت محلل أسئلة ذكي. حلل السؤال التالي وحدد نوعه.

السؤال: "${question.substring(0, 500)}"

أجب بكلمة واحدة فقط من هذه الخيارات:
- simple (تحية، سؤال بسيط، معلومة عامة)
- math (رياضيات، حسابات، معادلات، أرقام، إثبات)
- code (برمجة، كود، خوارزميات، API)
- research (بحث، تحليل، مقارنة، دراسة)
- heavy (معقد، تفكير عميق، فلسفة، خطة شاملة)

الإجابة (كلمة واحدة فقط):`;

    for (const key of keys.slice(0, 2)) {
        try {
            console.log('[Analyzer] 🔍 MiMo analyzing question...');
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://luks-pied.vercel.app',
                    'X-Title': 'Lukas AI'
                },
                body: JSON.stringify({
                    model: MODELS.ANALYZER,
                    messages: [{ role: 'user', content: analyzerPrompt }],
                    max_tokens: 20,
                })
            });

            if (res.ok) {
                const d = await res.json();
                const text = d.choices?.[0]?.message?.content?.toLowerCase().trim();
                const validTypes = ['simple', 'math', 'code', 'research', 'heavy'];

                for (const type of validTypes) {
                    if (text?.includes(type)) {
                        console.log(`[Analyzer] ✅ Question type: ${type}`);
                        return type;
                    }
                }
            }
        } catch (e) { continue; }
    }

    console.log('[Analyzer] ⚠️ Default to simple');
    return 'simple';
}

// ═══════════════════════════════════════════════════════════════
//                    SMART MODEL SELECTOR
// ═══════════════════════════════════════════════════════════════

function selectModel(questionType) {
    const modelMap = {
        simple: MODELS.SIMPLE,
        math: MODELS.MATH,
        code: MODELS.CODE,
        research: MODELS.RESEARCH,
        heavy: MODELS.HEAVY,
    };
    return modelMap[questionType] || MODELS.SIMPLE;
}

// ═══════════════════════════════════════════════════════════════
//                    OPENROUTER - SPECIFIC MODEL
// ═══════════════════════════════════════════════════════════════

async function callOpenRouterModel(model, systemPrompt, userPrompt, conversationHistory = [], maxTokens = 8000) {
    const keys = getOpenRouterKeys();
    if (keys.length === 0) return null;

    const messages = [{ role: 'system', content: systemPrompt }];

    if (conversationHistory && conversationHistory.length > 0) {
        for (const h of conversationHistory.slice(-10)) {
            if (h.prompt) messages.push({ role: 'user', content: h.prompt });
            if (h.results?.[0]?.result) messages.push({ role: 'assistant', content: h.results[0].result });
        }
    }

    messages.push({ role: 'user', content: userPrompt });

    // Try selected model with all keys
    for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
        const key = keys[keyIndex];
        try {
            console.log(`[Worker] 🟣 Trying ${model.split('/')[1]?.split(':')[0]} (Key ${keyIndex + 1}/${keys.length})`);
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://luks-pied.vercel.app',
                    'X-Title': 'Lukas AI'
                },
                body: JSON.stringify({ model, messages, max_tokens: maxTokens })
            });

            if (res.status === 429) {
                console.log(`[Worker] ⚠️ Key ${keyIndex + 1} rate limited`);
                continue;
            }
            if (res.ok) {
                const d = await res.json();
                const text = d.choices?.[0]?.message?.content;
                if (text) {
                    console.log(`[Worker] ✅ Success: ${model.split('/')[1]?.split(':')[0]}`);
                    return text;
                }
            }
        } catch (e) { continue; }
    }

    // Fallback to other models
    console.log('[Worker] ⚠️ Primary model failed, trying fallbacks...');
    for (const fallbackModel of FALLBACK_MODELS) {
        if (fallbackModel === model) continue; // Skip already tried

        for (const key of keys.slice(0, 2)) {
            try {
                console.log(`[Worker] 🔄 Fallback: ${fallbackModel.split('/')[1]?.split(':')[0]}`);
                const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${key}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://luks-pied.vercel.app',
                        'X-Title': 'Lukas AI'
                    },
                    body: JSON.stringify({ model: fallbackModel, messages, max_tokens: maxTokens })
                });

                if (res.ok) {
                    const d = await res.json();
                    const text = d.choices?.[0]?.message?.content;
                    if (text) {
                        console.log(`[Worker] ✅ Fallback success: ${fallbackModel.split('/')[1]?.split(':')[0]}`);
                        return text;
                    }
                }
            } catch (e) { continue; }
        }
    }

    return null;
}

// ═══════════════════════════════════════════════════════════════
//                    GROQ FALLBACK
// ═══════════════════════════════════════════════════════════════

async function callGroq(systemPrompt, userPrompt, conversationHistory = [], maxTokens = 8000) {
    const keys = getGroqKeys();
    if (keys.length === 0) return null;

    const messages = [{ role: 'system', content: systemPrompt }];

    if (conversationHistory && conversationHistory.length > 0) {
        for (const h of conversationHistory.slice(-10)) {
            if (h.prompt) messages.push({ role: 'user', content: h.prompt });
            if (h.results?.[0]?.result) messages.push({ role: 'assistant', content: h.results[0].result });
        }
    }

    messages.push({ role: 'user', content: userPrompt });

    for (const model of GROQ_MODELS) {
        for (const key of keys) {
            try {
                console.log(`[Worker] 🟢 Trying Groq: ${model}`);
                const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model, messages, max_tokens: maxTokens })
                });
                if (res.status === 429) continue;
                if (res.ok) {
                    const d = await res.json();
                    const text = d.choices?.[0]?.message?.content;
                    if (text) {
                        console.log(`[Worker] ✅ Groq success: ${model}`);
                        return text;
                    }
                }
            } catch (e) { continue; }
        }
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════
//                    GEMINI REVIEWER
// ═══════════════════════════════════════════════════════════════

async function geminiReviewer(response, question) {
    console.log('[Reviewer] 🔍 Gemini reviewing...');

    const reviewPrompt = `أنت مراجع لغوي. راجع هذه الإجابة بسرعة:

المطلوب:
1. احذف أي حروف غير عربية (صينية، روسية، إلخ)
2. صحح الأخطاء
3. استبدل أي ذكر لشاومي/Xiaomi بـ "لوكاس"

السؤال: ${question.substring(0, 200)}

الإجابة:
${response}

قدم الإجابة المحسّنة فقط:`;

    const reviewed = await callGemini(reviewPrompt, 8000);
    if (reviewed) {
        console.log('[Reviewer] ✅ Review complete');
        return reviewed;
    }
    return response;
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
        const { results, originalPrompt, prompt, conversationHistory } = req.body || {};
        const userPrompt = originalPrompt || prompt;
        if (!results || !userPrompt) return res.status(400).json({ success: false, error: 'Missing data' });

        const lang = /[\u0600-\u06FF]/.test(userPrompt) ? 'ar' : 'en';
        const resultsText = results.map((r, i) => `[${i + 1}] ${r.result || ''}`).join('\n\n');

        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`[Synthesize] 🧠 New request`);
        console.log('═══════════════════════════════════════════════════════════════');

        // Step 0: Browser Agent (DISABLED FOR NOW - uncomment when ready)
        // NOTE: Browser agent is disabled. Using Tavily + Gemini for search instead.
        let browserResult = null;
        let browserUsed = false;
        /*
        if (needsBrowserResearch(userPrompt)) {
            console.log('[Synthesize] 🖥️ Step 0: Browser research triggered...');
            browserResult = await executeBrowserResearch(userPrompt);
            if (browserResult.success) {
                browserUsed = true;
                console.log('[Synthesize] ✅ Browser research successful');
            }
        }
        */

        // Step 1: Check if question needs real-time data (only if browser didn't work)
        let realtimeData = null;
        if (!browserUsed && needsRealtimeData(userPrompt)) {
            console.log('[Synthesize] 🌐 Step 1: Fetching real-time data...');
            realtimeData = await fetchRealtimeData(userPrompt);
        } else if (browserUsed) {
            // Use browser content as realtime data
            realtimeData = browserResult?.results?.content || null;
            console.log('[Synthesize] 📊 Step 1: Using browser content as real-time data');
        } else {
            console.log('[Synthesize] 📊 Step 1: No real-time data needed');
        }

        // Step 2: Analyze question with MiMo
        console.log('[Synthesize] 📊 Step 2: Analyzing question...');
        const questionType = await analyzeQuestion(userPrompt);

        // Step 3: Select best model
        const selectedModel = selectModel(questionType);
        console.log(`[Synthesize] 🎯 Step 3: Selected model: ${selectedModel.split('/')[1]?.split(':')[0]} for type: ${questionType}`);

        // Step 4: Build message with real-time data if available
        let userMessage = userPrompt;
        if (realtimeData) {
            userMessage = `${userPrompt}

═══════════════════════════════════════════════════════════════
📊 بيانات حية من الإنترنت (${new Date().toLocaleDateString('ar-EG')}):
═══════════════════════════════════════════════════════════════
${realtimeData}
═══════════════════════════════════════════════════════════════

استخدم هذه البيانات الحقيقية لتقديم إجابة شاملة ومحدثة.`;
            console.log('[Synthesize] 📦 Real-time data injected into prompt');
        }
        if (resultsText) {
            userMessage += `\n\nالبيانات المتاحة:\n${resultsText}`;
        }

        console.log('[Synthesize] 🟣 Step 4: Getting response...');
        let response = await callOpenRouterModel(selectedModel, getSystemPrompt(), userMessage, conversationHistory);

        // Step 5: Fallback to Groq
        if (!response) {
            console.log('[Synthesize] 🟢 Step 5: OpenRouter failed, trying Groq...');
            response = await callGroq(getSystemPrompt(), userMessage, conversationHistory);
        }

        // Step 6: Gemini review (DISABLED - user requested)
        // Uncomment to re-enable Gemini polishing
        /*
        if (response) {
            console.log('[Synthesize] 🔵 Step 6: Gemini reviewing...');
            response = await geminiReviewer(response, userPrompt);
        }
        */

        // Step 7: Smart Verification (4 Levels)
        let verificationResult = null;
        if (response && global._tavilyRawResults) {
            console.log('[Synthesize] 🔍 Step 7: Running Smart Verification...');
            verificationResult = runSmartVerification(
                global._tavilyRawResults,
                response,
                userPrompt
            );

            // Append verification notes to response if there are warnings
            if (verificationResult.notes && verificationResult.notes.length > 0) {
                response += '\n\n---\n**ملاحظات التحقق:**\n';
                verificationResult.notes.forEach(note => {
                    response += `• ${note}\n`;
                });
            }

            // Clear the global cache
            delete global._tavilyRawResults;
        }

        if (!response) {
            response = lang === 'ar' ? 'عذراً، حدث خطأ في معالجة الطلب.' : 'Sorry, an error occurred.';
        }

        console.log(`[Synthesize] ✅ Done! (${response.length} chars)`);
        console.log('═══════════════════════════════════════════════════════════════');

        res.status(200).json({
            success: true,
            data: response,
            meta: {
                questionType,
                model: selectedModel.split('/')[1]?.split(':')[0],
                browserUsed: browserUsed,
                screenshot: browserResult?.results?.screenshot || null,
                verification: verificationResult ? {
                    confidence: verificationResult.overallConfidence,
                    notesCount: verificationResult.notes?.length || 0
                } : null
            }
        });
    } catch (error) {
        console.error('[Synthesize] ❌ Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
