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
                        ⚠️ قواعد الباحث الدقيق (إلزامية!)
═══════════════════════════════════════════════════════════════
أنت باحث دقيق للغاية. اتبع هذه القواعد بصرامة مطلقة:

� قاعدة 1: التاريخ إلزامي
- لكل حقيقة تذكرها، اتبعها بتاريخها بين قوسين
- مثال: "شددت أمريكا القيود على رقائق AI (أكتوبر 2023)"
- مثال: "سعر الذهب 2000 دولار (17 يناير 2026)"

📌 قاعدة 2: عند التضارب
- إذا وجدت معلومات متضاربة، اذكر كلا الرأيين مع تاريخ كل منهما
- مثال: "قيل إن X (2022) لكن تقارير أحدث تفيد Y (2025)"

📌 قاعدة 3: لا تدمج فترات مختلفة
- لا تدمج أبداً معلومات من سنوات مختلفة في جملة واحدة
- كل فترة زمنية منفصلة

📌 قاعدة 4: المصادر فقط
- أجب فقط بناءً على "البيانات الحية" المقدمة لك
- إذا لم تجد معلومة، قل: "لم يتوفر في المصادر"
- لا تستخدم ذاكرتك أبداً

📌 قاعدة 5: الاعتراف بالنقص
- إذا كان السؤال مكون من أجزاء ولم تجد إجابة لجزء، قل ذلك صراحة
- مثال: "بخصوص الشركات الصينية البديلة: لم يتوفر في المصادر المتاحة"

═══════════════════════════════════════════════════════════════
                         أسلوبك
═══════════════════════════════════════════════════════════════
- ابدأ مباشرة بالإجابة
- استخدم التنسيق (عناوين، قوائم)
- كل معلومة يجب أن يكون معها تاريخ`;
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
//                    RAG ENGINE (Manus Blueprint - Complete)
// ═══════════════════════════════════════════════════════════════

/**
 * STEP 1: Use MiMo to decompose question into search queries (Manus Blueprint)
 * MiMo is smarter than regex patterns for complex questions
 */
async function ragDecomposeWithMiMo(question) {
    const keys = getOpenRouterKeys();
    if (keys.length === 0) {
        // Fallback to basic decomposition
        return ragBasicDecompose(question);
    }

    const decomposerPrompt = `أنت خبير في محركات البحث. حول سؤال المستخدم التالي إلى 3 استعلامات بحث بسيطة ومختلفة باللغة الإنجليزية.

سؤال المستخدم: "${question.substring(0, 300)}"

أخرج قائمة من 3 استعلامات بحث فقط، كل استعلام في سطر جديد.
لا تضف أي شرح أو ترقيم، فقط الاستعلامات:`;

    try {
        console.log('[RAG] Using MiMo for query decomposition...');
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${keys[0]}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://luks-pied.vercel.app',
                'X-Title': 'Lukas AI'
            },
            body: JSON.stringify({
                model: MODELS.ANALYZER,
                messages: [{ role: 'user', content: decomposerPrompt }],
                max_tokens: 150,
            })
        });

        if (res.ok) {
            const d = await res.json();
            const text = d.choices?.[0]?.message?.content?.trim() || '';
            const queries = text.split('\n')
                .map(q => q.trim())
                .filter(q => q.length > 10 && !q.startsWith('-') && !q.match(/^\d/))
                .slice(0, 3);

            if (queries.length > 0) {
                console.log(`[RAG] MiMo generated ${queries.length} queries`);
                return queries;
            }
        }
    } catch (e) {
        console.log(`[RAG] MiMo decomposition failed: ${e.message}`);
    }

    return ragBasicDecompose(question);
}

/**
 * Fallback basic decomposition (regex-based)
 */
function ragBasicDecompose(question) {
    const queries = [];

    // Extract key topics
    if (/nvidia|إنفيديا/i.test(question)) {
        queries.push("Nvidia China AI chip export restrictions 2025 2026");
    }
    if (/قيود|restrictions|حظر|ban/i.test(question)) {
        queries.push("US AI chip export ban China policy latest news");
    }
    if (/شركات صينية|chinese companies|بدائل/i.test(question)) {
        queries.push("Chinese AI chip companies alternatives Huawei SMIC 2025");
    }

    if (queries.length === 0) {
        queries.push(`${question.substring(0, 100)} latest news 2025`);
    }

    console.log(`[RAG] Basic decomposition: ${queries.length} queries`);
    return queries.slice(0, 3);
}

/**
 * STEP 2: Search + Extract full content (Manus recommendation)
 * First search for URLs, then extract full article content
 */
async function ragSearchSingleQuery(query) {
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (!tavilyKey) return null;

    console.log(`[RAG] Searching: "${query}"`);

    try {
        // Step 1: Search for URLs
        const searchResponse = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: tavilyKey,
                query: query,
                search_depth: 'advanced',  // Use advanced for better results
                include_answer: true,
                max_results: 5,
                days: 30  // Expand to 30 days for more results
            })
        });

        if (!searchResponse.ok) return null;

        const searchData = await searchResponse.json();
        let fullContent = "";

        // Add Tavily's AI answer
        if (searchData.answer) {
            fullContent += `[ملخص البحث]: ${searchData.answer}\n\n`;
        }

        // Collect URLs for extraction
        const urls = [];
        if (searchData.results) {
            for (const r of searchData.results) {
                if (r.url) urls.push(r.url);
                // Also add the snippet content
                fullContent += `--- مصدر ---\n`;
                fullContent += `العنوان: ${r.title}\n`;
                fullContent += `الملخص: ${r.content || ''}\n`;
                fullContent += `الرابط: ${r.url}\n\n`;
            }
        }

        // Step 2: Extract full content from top 3 URLs
        if (urls.length > 0) {
            console.log(`[RAG] Extracting full content from ${Math.min(urls.length, 3)} URLs...`);
            try {
                const extractResponse = await fetch('https://api.tavily.com/extract', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        api_key: tavilyKey,
                        urls: urls.slice(0, 3)  // Extract top 3 URLs
                    })
                });

                if (extractResponse.ok) {
                    const extractData = await extractResponse.json();
                    if (extractData.results) {
                        fullContent += `\n=== محتوى كامل من المقالات ===\n\n`;
                        for (const ext of extractData.results) {
                            if (ext.raw_content) {
                                fullContent += `[مقال كامل]: ${ext.raw_content.substring(0, 2000)}\n\n`;
                            }
                        }
                        console.log(`[RAG] ✅ Extracted full content from ${extractData.results.length} articles`);
                    }
                }
            } catch (extractError) {
                console.log(`[RAG] Extract failed (using snippets): ${extractError.message}`);
            }
        }

        return fullContent;
    } catch (e) {
        console.log(`[RAG] Search failed: ${e.message}`);
    }
    return null;
}

/**
 * STEP 3: Summarize single topic using DeepSeek R1 (Testing)
 * DeepSeek R1 is a reasoning model - might be more accurate
 */
async function ragSummarizeTopic(topicContent, topicDescription) {
    const keys = getOpenRouterKeys();
    if (keys.length === 0 || !topicContent) {
        console.log('[RAG] No OpenRouter keys available');
        return null;
    }

    // Manus V3 "Zero-Inference" Prompt - forbids gap-filling
    const prompt = `أنت آلة نسخ وتلخيص دقيقة جداً. مهمتك هي استخراج المعلومات بشكل حرفي من النصوص المقدمة.

اتبع هذه القواعد كأنها قانون مطلق:
1. ممنوع الاستنتاج أو ملء الفراغات: إذا لم يذكر النص تاريخاً محدداً، لا تخترع تاريخاً. قل "لم يذكر المصدر تاريخاً محدداً".
2. الاقتباس الحرفي: كل معلومة تذكرها يجب أن تكون موجودة بشكل شبه حرفي في النصوص.
3. لا تستخدم معرفتك أبداً: اعتمد 100% على النصوص التالية فقط.
4. اعترف بالجهل: إذا كانت البيانات لا تجيب على جزء من السؤال، قل "غير متوفر في المصادر".

الموضوع: ${topicDescription}

النصوص:
${topicContent.substring(0, 4000)}

ملخص حرفي (فقط ما في النص، بدون استنتاج):`;

    try {
        console.log('[RAG] Using DeepSeek R1 for summarization...');
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${keys[0]}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://luks-pied.vercel.app',
                'X-Title': 'Lukas AI'
            },
            body: JSON.stringify({
                model: 'deepseek/deepseek-r1-0528:free',  // DeepSeek R1 Reasoning
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 600,
                temperature: 0  // CRITICAL: No creativity
            })
        });

        if (res.ok) {
            const data = await res.json();
            const text = data.choices?.[0]?.message?.content?.trim();
            if (text) {
                console.log('[RAG] ✅ DeepSeek R1 summarization successful');
                return text;
            }
        } else {
            console.log(`[RAG] DeepSeek R1 failed: ${res.status}`);
        }
    } catch (e) {
        console.log(`[RAG] DeepSeek R1 error: ${e.message}`);
    }

    console.log('[RAG] DeepSeek R1 failed, no fallback');
    return null;
}

/**
 * STEP 4: Combine clean summaries (Manus Step-by-Step)
 */
function ragBuildFinalPrompt(summaries, originalQuestion) {
    const combined = summaries.filter(s => s).join('\n\n---\n\n');

    return `أنت مساعد يدمج ملخصات بحثية. ادمج الملخصات التالية في إجابة واحدة متماسكة.

قاعدة واحدة فقط: ادمج ما هو مكتوب أدناه فقط، لا تضف أي شيء من عندك.

السؤال الأصلي: ${originalQuestion}

الملخصات:
${combined}

الإجابة المدمجة:`;
}

/**
 * STEP 5: Main RAG Pipeline (Manus Step-by-Step Summarization)
 */
async function processWithRAG(question) {
    console.log('[RAG] ═══════════════════════════════════════════════════');
    console.log('[RAG] Starting Step-by-Step RAG Pipeline...');

    // Step 1: Decompose with MiMo
    const queries = await ragDecomposeWithMiMo(question);
    console.log(`[RAG] Step 1: ${queries.length} search queries generated`);

    // Step 2 & 3: Search each query and summarize separately
    const summaries = [];
    for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        console.log(`[RAG] Step 2.${i + 1}: Searching "${query.substring(0, 40)}..."`);

        const searchContent = await ragSearchSingleQuery(query);
        if (searchContent) {
            console.log(`[RAG] Step 3.${i + 1}: Summarizing results...`);
            const summary = await ragSummarizeTopic(searchContent, query);
            if (summary) {
                summaries.push(summary);
                console.log(`[RAG] ✅ Summary ${i + 1} ready`);
            }
        }
    }

    if (summaries.length === 0) {
        console.log('[RAG] No summaries generated');
        return { success: false, prompt: null, sourceCount: 0 };
    }

    // Step 4: Build final prompt to combine clean summaries
    const prompt = ragBuildFinalPrompt(summaries, question);

    console.log('[RAG] ═══════════════════════════════════════════════════');
    console.log(`[RAG] Pipeline Complete! ${summaries.length} clean summaries ready`);

    return {
        success: true,
        prompt: prompt,
        sourceCount: summaries.length * 5  // Approximate
    };
}

// ═══════════════════════════════════════════════════════════════
//                    MULTI-QUERY (LEGACY - KEPT FOR REFERENCE)
// ═══════════════════════════════════════════════════════════════

/**
 * Detect if question needs multi-query approach
 */
function needsMultiQuery(question) {
    const complexPatterns = [
        /و.*و/,                     // Multiple topics with "و"
        /مقارنة|بين.*و/,            // Comparison
        /تأثير.*على/,               // Impact analysis
        /قيود|عقوبات|حظر/,          // Restrictions/sanctions
        /nvidia|إنفيديا|apple|google|شركة/i, // Companies
        /رقائق|chips|AI|ذكاء اصطناعي/i, // Tech topics
        /صين|الصين|china|أمريكا|america/i, // Countries
    ];
    return complexPatterns.some(p => p.test(question));
}

/**
 * Split complex question into multiple targeted queries
 */
function splitIntoQueries(question) {
    const queries = [];

    // Extract key entities and create focused queries
    const hasNvidia = /nvidia|إنفيديا/i.test(question);
    const hasChina = /صين|الصين|china/i.test(question);
    const hasRestrictions = /قيود|عقوبات|حظر|restrictions|ban/i.test(question);
    const hasChips = /رقائق|chips|AI chips/i.test(question);
    const hasChineseCompanies = /شركات صينية|بدائل محلية|chinese companies/i.test(question);

    // Query 1: Main topic with date
    queries.push(`${question.substring(0, 200)} 2025 2026`);

    // Query 2: Company-specific if mentioned
    if (hasNvidia && hasChina) {
        queries.push("Nvidia China chip restrictions strategy 2025 2026");
    }

    // Query 3: Secondary aspect
    if (hasChineseCompanies || question.includes('بدائل')) {
        queries.push("Chinese AI chip companies alternatives to Nvidia Huawei SMIC 2025");
    }

    // Query 4: Policy/restrictions focus
    if (hasRestrictions && hasChips) {
        queries.push("US AI chip export restrictions China policy 2025 2026");
    }

    // Remove duplicates and limit to 3
    const unique = [...new Set(queries)];
    console.log(`[MultiQuery] Generated ${unique.length} sub-queries`);
    return unique.slice(0, 3);
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
    if (keys.length === 0) return { type: 'simple', needsRealtime: false };

    const analyzerPrompt = `حلل السؤال التالي:
"${question.substring(0, 400)}"

أجب بسطرين فقط:
TYPE: [simple/math/code/research/heavy]
REALTIME: [yes/no]

REALTIME: yes إذا السؤال عن:
- أسعار/بورصة/أسهم/ذهب/عملات
- أخبار/أحداث/تطورات/قرارات
- شركات معينة (Apple/Nvidia/Tesla/etc)
- سياسة/اقتصاد/تقنية حالية
- قيود/عقوبات/اتفاقيات
- كلمات: اليوم/أمس/مؤخراً/حالياً/2024/2025/2026

REALTIME: no إذا السؤال عن:
- معلومات ثابتة (رياضيات/تاريخ قديم)
- تحية أو دردشة
- برمجة عامة

السؤال يحتوي على شركات أو تقنية أو قرارات = REALTIME: yes

أجب الآن:`;

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
                    max_tokens: 50,
                })
            });

            if (res.ok) {
                const d = await res.json();
                const text = d.choices?.[0]?.message?.content?.toLowerCase().trim() || '';

                // Parse type
                const validTypes = ['simple', 'math', 'code', 'research', 'heavy'];
                let type = 'simple';
                for (const t of validTypes) {
                    if (text.includes(`type: ${t}`) || text.includes(t)) {
                        type = t;
                        break;
                    }
                }

                // Parse needsRealtime
                const needsRealtime = text.includes('realtime: yes') || text.includes('yes');

                console.log(`[Analyzer] ✅ Type: ${type}, NeedsRealtime: ${needsRealtime}`);
                return { type, needsRealtime };
            }
        } catch (e) { continue; }
    }

    console.log('[Analyzer] ⚠️ Default to simple, no realtime');
    return { type: 'simple', needsRealtime: false };
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

        // Step 1: Analyze question with MiMo FIRST (to decide if we need real-time data)
        console.log('[Synthesize] 📊 Step 1: Analyzing question with MiMo...');
        const analysis = await analyzeQuestion(userPrompt);
        const questionType = analysis.type;
        const needsRealtime = analysis.needsRealtime;
        console.log(`[Synthesize] 🎯 MiMo decided: Type=${questionType}, NeedsRealtime=${needsRealtime}`);

        // Step 2: Use RAG Pipeline if real-time data needed
        let userMessage;
        let ragUsed = false;

        if (needsRealtime) {
            console.log('[Synthesize] 🔄 Step 2: Running RAG Pipeline...');
            const ragResult = await processWithRAG(userPrompt);

            if (ragResult.success) {
                userMessage = ragResult.prompt;  // Use the strict summarizer prompt
                ragUsed = true;
                console.log(`[Synthesize] ✅ RAG Pipeline complete: ${ragResult.sourceCount} sources`);
            } else {
                userMessage = userPrompt;
                console.log('[Synthesize] ⚠️ RAG Pipeline failed, using direct question');
            }
        } else {
            userMessage = userPrompt;
            console.log('[Synthesize] 📊 Step 2: No RAG needed (simple question)');
        }

        // Add any additional results text
        if (resultsText && !ragUsed) {
            userMessage += `\n\nالبيانات المتاحة:\n${resultsText}`;
        }

        // Step 3: Select best model based on question type
        const selectedModel = selectModel(questionType);
        console.log(`[Synthesize] 🎯 Step 3: Selected model: ${selectedModel.split('/')[1]?.split(':')[0]} for type: ${questionType}`);

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
