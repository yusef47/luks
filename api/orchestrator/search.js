// Search API - Tavily Search (Primary) + Groq fallback
// NO GEMINI - User requested to remove all Google/Gemini dependencies

const GROQ_MODELS = ['qwen-2.5-32b', 'llama-3.3-70b-versatile'];

function getGroqKeys() {
    const keys = [];
    for (let i = 1; i <= 10; i++) {
        const key = process.env[`GROQ_API_KEY_${i}`];
        if (key && key.trim()) keys.push(key.trim());
    }
    return keys;
}

let groqIdx = 0;

async function searchWithTavily(query) {
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (!tavilyKey) {
        console.log('[Search] ⚠️ No Tavily API key found');
        return null;
    }

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

        if (!response.ok) {
            console.log(`[Search] ⚠️ Tavily returned ${response.status}`);
            return null;
        }

        const data = await response.json();

        // Return the direct answer if available
        if (data.answer) {
            let result = data.answer;

            // Add sources
            if (data.results && data.results.length > 0) {
                result += '\n\n**المصادر:**\n';
                data.results.slice(0, 3).forEach((r, i) => {
                    result += `${i + 1}. [${r.title}](${r.url})\n`;
                });
            }
            return result;
        }

        // Fallback to snippets if no answer
        if (data.results && data.results.length > 0) {
            let result = '';
            data.results.forEach((r, i) => {
                result += `**${i + 1}. ${r.title}**\n${r.content}\n\n`;
            });
            return result;
        }

        return null;
    } catch (error) {
        console.error('[Search] ❌ Tavily error:', error.message);
        return null;
    }
}

async function callGroq(prompt) {
    const keys = getGroqKeys();
    if (keys.length === 0) return null;

    for (const model of GROQ_MODELS) {
        for (let i = 0; i < 2; i++) {
            try {
                const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${keys[groqIdx++ % keys.length]}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 2000 })
                });
                if (res.ok) {
                    const d = await res.json();
                    if (d.choices?.[0]?.message?.content) return d.choices[0].message.content;
                }
            } catch (e) { }
        }
    }
    return null;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        const { query, task } = req.body || {};
        const searchQuery = query || task;
        if (!searchQuery) return res.status(400).json({ success: false, error: 'Missing query' });

        console.log('[Search] 🔍 Searching with Tavily...');
        let result = await searchWithTavily(searchQuery);

        if (!result) {
            console.log('[Search] ⚡ Tavily failed, trying Groq...');
            result = await callGroq(searchQuery);
        }

        if (!result) {
            result = /[\u0600-\u06FF]/.test(searchQuery) ? 'لم يتم العثور على نتائج' : 'No results found';
        }

        res.status(200).json({ success: true, result });
    } catch (error) {
        console.error('[Search] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
