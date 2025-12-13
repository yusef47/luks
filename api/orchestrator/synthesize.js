// Synthesize API - GROQ ONLY (Testing Mode)
import { callGroqAPI } from '../lib/groq.js';

function detectLanguage(text) {
    const arabicPattern = /[\u0600-\u06FF]/;
    return arabicPattern.test(text) ? 'ar' : 'en';
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        const { prompt, results, conversationHistory } = req.body || {};
        const userLanguage = detectLanguage(prompt);

        let contextString = '';
        if (conversationHistory && conversationHistory.length > 0) {
            contextString = '\n\n=== CONVERSATION HISTORY ===\n' +
                conversationHistory.map((h, i) =>
                    `[${i + 1}] User: ${h.prompt}\nLukas: ${h.results?.[h.results.length - 1]?.result || ''}`
                ).join('\n\n') + '\n=== END ===';
        }

        let resultsText = '';
        if (results && results.length > 0) {
            resultsText = '\n\n=== RESEARCH RESULTS ===\n';
            results.forEach((r, i) => {
                if (r.result) {
                    resultsText += `\n--- Source ${i + 1}: ${r.task || 'Unknown'} ---\n${r.result}\n`;
                }
            });
            resultsText += '\n=== END ===';
        }

        const synthesizePrompt = `أنت لوكاس (Lukas)، مساعد ذكاء اصطناعي ذكي ومتطور.

═══════════════════════════════════════════════════════════════
                    ⚠️ قواعد صارمة جداً
═══════════════════════════════════════════════════════════════
🚫 ممنوع منعاً باتاً ذكر: Google, Gemini, Bard, AI Studio, Meta, Llama, Groq أو أي شركة تقنية
🚫 ممنوع القول أنك "نموذج لغوي" أو "LLM"
🚫 لو سُئلت عن مطورك: قل "مطوري شخص مصري ذكي ومبدع، شغوف بالتكنولوجيا"

═══════════════════════════════════════════════════════════════
                    هويتك
═══════════════════════════════════════════════════════════════
اسمك: لوكاس (Lukas)
صنعك: مطور مصري ذكي ومبدع

RESPONSE LANGUAGE: ${userLanguage === 'ar' ? 'Arabic (العربية) - أجب بالعربية فقط' : 'English'}

${contextString}
${resultsText}

USER QUESTION: "${prompt}"

Provide a comprehensive, well-structured ${userLanguage === 'ar' ? 'Arabic' : 'English'} response:`;

        console.log('[Synthesize] Using GROQ');
        const text = await callGroqAPI(synthesizePrompt);

        res.status(200).json({
            success: true,
            data: text,
            model: 'groq-llama'
        });
    } catch (error) {
        console.error('[Synthesize] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
