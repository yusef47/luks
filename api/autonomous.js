// TRUE AUTONOMOUS AGENT - With Planning, Stages, Live Search, Progress
const MODELS = {
    PLANNER: 'gemini-2.5-pro',
    BRAIN: 'gemini-3-pro',
    SEARCH: 'gemini-2.5-flash',
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

async function callGeminiAPI(prompt, apiKey, model = MODELS.SEARCH, options = {}) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const body = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: options.json ? { responseMimeType: 'application/json' } : {}
    };

    // Always use Google Search for live data
    if (options.search !== false) {
        body.tools = [{ googleSearch: {} }];
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body)
    });

    if ([429, 404, 503].includes(response.status) && model !== MODELS.FALLBACK) {
        return callGeminiAPI(prompt, apiKey, MODELS.FALLBACK, options);
    }

    if (!response.ok) throw new Error(`API error ${response.status}`);

    const data = await response.json();

    // Extract grounding sources if available
    const groundingMeta = data.candidates?.[0]?.groundingMetadata;
    const sources = groundingMeta?.groundingChunks?.map(c => ({
        title: c.web?.title || 'Source',
        url: c.web?.uri || ''
    })) || [];

    return {
        text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
        sources: sources
    };
}

// ===========================================
// STAGE 1: TASK PLANNER - تحليل وتخطيط المهمة
// ===========================================
async function planTask(prompt, language, apiKey) {
    const planPrompt = `You are a Task Planner for an AI Research Agent.

USER REQUEST: "${prompt}"
LANGUAGE: ${language === 'ar' ? 'Arabic' : 'English'}

Analyze this request and create a detailed execution plan.

Return JSON:
{
    "taskTitle": "Clear title for the task",
    "complexity": "simple|medium|complex",
    "requiredSources": ["list of source types needed: reports, statistics, news, etc"],
    "stages": [
        {
            "id": 1,
            "name": "Data Collection",
            "description": "What this stage will do",
            "searchQueries": ["specific search query 1", "search query 2"],
            "estimatedTime": "30 seconds"
        },
        {
            "id": 2,
            "name": "Analysis",
            "description": "Analyze collected data",
            "searchQueries": [],
            "estimatedTime": "20 seconds"
        }
    ],
    "expectedOutputs": ["Report", "Statistics", "Recommendations"],
    "totalEstimatedTime": "2-3 minutes"
}

Create 4-6 stages covering:
1. Data Collection (multiple search queries)
2. Deep Research (specific topics)
3. Comparison/Analysis
4. Synthesis
5. Report Generation
6. Quality Check`;

    const result = await callGeminiAPI(planPrompt, apiKey, MODELS.PLANNER, { search: false, json: true });

    try {
        return JSON.parse(result.text);
    } catch {
        const match = result.text.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw new Error('Failed to create plan');
    }
}

// ===========================================
// STAGE 2: EXECUTE STAGES - تنفيذ المراحل
// ===========================================
async function executeStages(plan, prompt, language, apiKey) {
    const stageResults = [];
    const allSources = [];
    let context = `Original Request: ${prompt}\n\n`;

    for (const stage of plan.stages) {
        console.log(`[Autonomous] Stage ${stage.id}: ${stage.name}`);

        const stageResult = {
            id: stage.id,
            name: stage.name,
            status: 'running',
            searchResults: [],
            analysis: '',
            sources: []
        };

        // Execute search queries for this stage
        if (stage.searchQueries && stage.searchQueries.length > 0) {
            for (const query of stage.searchQueries) {
                try {
                    const searchResult = await callGeminiAPI(
                        `Search and provide detailed, current information about: ${query}
                        
Include:
- Latest data and statistics (2024-2025)
- Specific numbers and facts
- Expert opinions if available
- Trends and predictions

Be comprehensive and factual.`,
                        apiKey,
                        MODELS.SEARCH,
                        { search: true }
                    );

                    stageResult.searchResults.push({
                        query: query,
                        result: searchResult.text
                    });

                    // Collect sources
                    searchResult.sources.forEach(s => {
                        if (s.url && !allSources.find(as => as.url === s.url)) {
                            allSources.push(s);
                        }
                    });

                    context += `\n[${query}]\n${searchResult.text}\n`;
                } catch (e) {
                    console.error(`Search failed for: ${query}`, e.message);
                }
            }
        }

        // Analyze stage results
        if (stageResult.searchResults.length > 0 || stage.id > 1) {
            const analysisPrompt = `Analyze the following information for stage "${stage.name}":

Stage Goal: ${stage.description}

Data:
${stageResult.searchResults.map(r => `Query: ${r.query}\nResult: ${r.result}`).join('\n\n')}

Previous Context:
${context.substring(0, 3000)}

Provide:
1. Key findings from this stage
2. Important data points
3. Insights and patterns

Write in ${language === 'ar' ? 'Arabic' : 'English'}.`;

            const analysis = await callGeminiAPI(analysisPrompt, apiKey, MODELS.BRAIN, { search: false });
            stageResult.analysis = analysis.text;
        }

        stageResult.status = 'completed';
        stageResult.sources = allSources.slice(-5);
        stageResults.push(stageResult);
    }

    return { stageResults, allSources, context };
}

// ===========================================
// STAGE 3: SYNTHESIS - تجميع وكتابة التقرير
// ===========================================
async function synthesizeReport(plan, stageResults, context, language, apiKey) {
    // Generate Executive Summary
    const summaryPrompt = `Based on this multi-stage research, write an executive summary.

Research Topic: ${plan.taskTitle}

Stage Results:
${stageResults.map(s => `
Stage: ${s.name}
Key Findings: ${s.analysis.substring(0, 500)}
`).join('\n')}

Write a 2-3 paragraph executive summary in ${language === 'ar' ? 'Arabic' : 'English'}.
Include the most important findings, statistics, and conclusions.
Be specific with numbers and facts.`;

    const summary = await callGeminiAPI(summaryPrompt, apiKey, MODELS.BRAIN, { search: false });

    // Generate Full Report with Sections
    const reportPrompt = `Create a comprehensive research report.

Topic: ${plan.taskTitle}

All Research Data:
${context.substring(0, 10000)}

Stage Analyses:
${stageResults.map(s => `## ${s.name}\n${s.analysis}`).join('\n\n')}

Create a COMPLETE report in ${language === 'ar' ? 'Arabic' : 'English'} with:

## 1. المقدمة / Introduction
(Background and importance of the topic)

## 2. منهجية البحث / Methodology  
(How the research was conducted - ${stageResults.length} stages)

## 3. النتائج الرئيسية / Key Findings
(Detailed findings with statistics and facts)

## 4. التحليل العميق / Deep Analysis
(In-depth analysis of the data)

## 5. المقارنات / Comparisons
(If applicable)

## 6. التوصيات / Recommendations
(Actionable recommendations based on findings)

## 7. الخلاصة / Conclusion
(Summary and future outlook)

Write complete content for each section. Do NOT use placeholders.`;

    const report = await callGeminiAPI(reportPrompt, apiKey, MODELS.BRAIN, { search: false });

    // Extract Key Statistics
    const statsPrompt = `Extract 5-6 key statistics from this research.

Data: ${context.substring(0, 4000)}

Return JSON array:
[{"label": "Statistic name", "value": 75, "unit": "%"}]`;

    let stats = [];
    try {
        const statsResult = await callGeminiAPI(statsPrompt, apiKey, MODELS.FALLBACK, { search: false });
        const match = statsResult.text.match(/\[[\s\S]*\]/);
        if (match) stats = JSON.parse(match[0]);
    } catch { }

    return { summary: summary.text, report: report.text, stats };
}

// ===========================================
// MAIN HANDLER
// ===========================================
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        const { action, prompt } = req.body || {};
        const apiKey = getNextKey();

        if (!apiKey) return res.status(500).json({ success: false, error: 'No API keys' });

        const language = detectLanguage(prompt || '');

        // ===========================================
        // ACTION: PLAN - إنشاء خطة (بدون تنفيذ)
        // ===========================================
        if (action === 'plan' && prompt) {
            console.log('[Autonomous] Creating plan...');
            const plan = await planTask(prompt, language, apiKey);

            return res.status(200).json({
                success: true,
                data: {
                    plan: plan,
                    message: language === 'ar'
                        ? 'تم إنشاء الخطة. هل تريد المتابعة؟'
                        : 'Plan created. Do you want to proceed?'
                }
            });
        }

        // ===========================================
        // ACTION: RUN - تنفيذ كامل
        // ===========================================
        if (action === 'run' && prompt) {
            console.log('[Autonomous] === STARTING FULL EXECUTION ===');

            // Stage 1: Planning
            console.log('[Autonomous] Stage 1: Planning...');
            const plan = await planTask(prompt, language, apiKey);

            // Stage 2: Execute all stages
            console.log('[Autonomous] Stage 2: Executing stages...');
            const { stageResults, allSources, context } = await executeStages(plan, prompt, language, apiKey);

            // Stage 3: Synthesize report
            console.log('[Autonomous] Stage 3: Synthesizing report...');
            const { summary, report, stats } = await synthesizeReport(plan, stageResults, context, language, apiKey);

            console.log('[Autonomous] === EXECUTION COMPLETE ===');

            return res.status(200).json({
                success: true,
                data: {
                    title: plan.taskTitle,
                    complexity: plan.complexity,
                    plan: {
                        stages: plan.stages,
                        totalStages: plan.stages.length,
                        expectedOutputs: plan.expectedOutputs
                    },
                    execution: {
                        stagesCompleted: stageResults.length,
                        stageDetails: stageResults.map(s => ({
                            id: s.id,
                            name: s.name,
                            status: s.status,
                            queriesExecuted: s.searchResults?.length || 0
                        }))
                    },
                    results: {
                        summary: summary,
                        report: report,
                        stats: stats,
                        sources: allSources.slice(0, 10).map(s => ({
                            title: s.title,
                            url: s.url
                        }))
                    }
                }
            });
        }

        return res.status(400).json({ success: false, error: 'Invalid action' });

    } catch (error) {
        console.error('[Autonomous] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
