// RAG Engine - Clean Retrieval-Augmented Generation
// Following Manus specification for reliable Q&A

/**
 * Decompose complex question into simple, targeted sub-queries
 */
function decomposeQuestion(question) {
    const queries = [];

    // Always add the core question
    const coreQuestion = question.substring(0, 150);

    // Detect entities and create focused queries
    const hasNvidia = /nvidia|إنفيديا/i.test(question);
    const hasChina = /صين|الصين|china/i.test(question);
    const hasRestrictions = /قيود|عقوبات|حظر|restrictions|ban|export/i.test(question);
    const hasChips = /رقائق|chips|AI|semiconductor/i.test(question);
    const askAboutCompanies = /شركات|companies|بدائل|alternatives/i.test(question);

    // Query 1: Policy/restrictions focus (English for better results)
    if (hasRestrictions || hasChips) {
        queries.push("US AI chip export restrictions China policy 2025 2026 latest news");
    }

    // Query 2: Company-specific
    if (hasNvidia && hasChina) {
        queries.push("Nvidia China chip ban H100 H200 strategy 2025 2026");
    }

    // Query 3: Alternatives/competitors
    if (askAboutCompanies || question.includes('بدائل')) {
        queries.push("Chinese AI chip companies alternatives Huawei SMIC Cambricon 2025");
    }

    // Fallback: use original question in English translation style
    if (queries.length === 0) {
        queries.push(`${coreQuestion} latest news 2025 2026`);
    }

    console.log(`[RAG] Decomposed into ${queries.length} queries:`, queries);
    return queries.slice(0, 3);
}

/**
 * Search Tavily with multiple queries and collect full text
 */
async function searchAndCollect(queries) {
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (!tavilyKey) {
        console.log('[RAG] No Tavily API key');
        return null;
    }

    const allResults = [];

    for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        console.log(`[RAG] Query ${i + 1}/${queries.length}: "${query}"`);

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
                    days: 7  // Last week only for freshness
                })
            });

            if (response.ok) {
                const data = await response.json();

                // Collect answer if available
                if (data.answer) {
                    allResults.push({
                        type: 'answer',
                        query: query,
                        content: data.answer,
                        source: 'Tavily AI Summary'
                    });
                }

                // Collect each result with full context
                if (data.results) {
                    data.results.forEach((r, idx) => {
                        allResults.push({
                            type: 'source',
                            sourceId: allResults.length + 1,
                            title: r.title,
                            url: r.url,
                            content: r.content || '',
                            publishedDate: r.published_date || 'Unknown date'
                        });
                    });
                }
            }
        } catch (e) {
            console.log(`[RAG] Query failed: ${e.message}`);
        }
    }

    console.log(`[RAG] Collected ${allResults.length} total sources`);
    return allResults;
}

/**
 * Format collected results into clear, labeled context for LLM
 */
function formatContext(results) {
    if (!results || results.length === 0) {
        return null;
    }

    let context = "═══════════════════════════════════════════════════════════════\n";
    context += "المصادر المتاحة (هذا هو مصدرك الوحيد للإجابة):\n";
    context += "═══════════════════════════════════════════════════════════════\n\n";

    results.forEach((r, i) => {
        if (r.type === 'answer') {
            context += `[ملخص تلقائي]: ${r.content}\n\n`;
        } else {
            context += `[المصدر ${r.sourceId}] ${r.title}\n`;
            context += `التاريخ: ${r.publishedDate}\n`;
            context += `المحتوى: ${r.content}\n`;
            context += `الرابط: ${r.url}\n\n`;
        }
    });

    context += "═══════════════════════════════════════════════════════════════\n";

    return context;
}

/**
 * Build the strict summarizer prompt (Manus specification)
 */
function buildSummarizerPrompt(context, question) {
    return `أنت آلة تلخيص فقط. مهمتك الوحيدة هي قراءة النصوص المقدمة ودمجها في إجابة.

قواعد صارمة لا يمكن كسرها:
1. اقتبس فقط من النص المقدم أدناه
2. لا تضف أي معلومة، أي تاريخ، أي اسم، أو أي رقم غير موجود حرفياً في النصوص
3. اذكر رقم المصدر بين قوسين بعد كل جملة [المصدر X]
4. إذا كانت النصوص لا تجيب على جزء من السؤال، قل: "لم يتوفر في المصادر"
5. لا تستخدم أي معرفة سابقة - النص أدناه هو مصدرك الوحيد

${context}

السؤال: ${question}

لخص المصادر أعلاه للإجابة على السؤال. تذكر: اقتبس فقط ما هو موجود في النص:`;
}

/**
 * Main RAG function - orchestrates the entire pipeline
 */
async function processWithRAG(question) {
    console.log('[RAG] Starting RAG pipeline...');

    // Step 1: Decompose
    const queries = decomposeQuestion(question);

    // Step 2: Search and collect
    const results = await searchAndCollect(queries);
    if (!results || results.length === 0) {
        console.log('[RAG] No results found');
        return {
            success: false,
            context: null,
            prompt: null
        };
    }

    // Step 3: Format context
    const context = formatContext(results);

    // Step 4: Build summarizer prompt
    const prompt = buildSummarizerPrompt(context, question);

    console.log('[RAG] Pipeline complete. Ready for summarization.');

    return {
        success: true,
        context: context,
        prompt: prompt,
        sourceCount: results.length
    };
}

module.exports = {
    processWithRAG,
    decomposeQuestion,
    searchAndCollect,
    formatContext,
    buildSummarizerPrompt
};
