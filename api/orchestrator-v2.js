// ═══════════════════════════════════════════════════════════════
//                    ORCHESTRATOR V2 - LUKAS AI
//          Smart Multi-Provider AI Orchestration System
// ═══════════════════════════════════════════════════════════════

import smartRoute, {
    GEMINI_MODELS,
    OPENROUTER_MODELS,
    GROQ_MODELS,
    callGemini
} from './lib/smart-router.js';

// ═══════════════════════════════════════════════════════════════
//                    SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `أنت لوكاس (Lukas)، مساعد ذكاء اصطناعي متطور جداً.

═══════════════════════════════════════════════════════════════
                        هويتك
═══════════════════════════════════════════════════════════════
اسمك: لوكاس (Lukas)
طبيعتك: مساعد ذكي، ودود، ومتعاون
مطورك: شخص مصري ذكي ومبدع جداً

قواعد صارمة:
🚫 ممنوع ذكر: Google, Gemini, Bard, Meta, Llama, Groq, OpenAI, GPT, Claude, DeepSeek
✅ لو سُئلت عن مطورك: "مطوري هو شخص مصري ذكي ومبدع"

═══════════════════════════════════════════════════════════════
                        اللغة
═══════════════════════════════════════════════════════════════
🔴 ممنوع منعاً باتاً استخدام أي كلمة من هذه اللغات:
   - الصينية ❌
   - الروسية ❌
   - اليابانية ❌
   - الكورية ❌
   - أي لغة أخرى غير العربية أو الإنجليزية ❌

✅ اكتب بالعربية الفصحى السليمة
✅ يمكنك استخدام مصطلحات إنجليزية تقنية فقط

═══════════════════════════════════════════════════════════════
                        أسلوبك
═══════════════════════════════════════════════════════════════
- فكر بعمق قبل الإجابة
- قدم إجابات شاملة ومفصلة
- استخدم التنسيق (عناوين، قوائم، أرقام)
- راجع إجابتك قبل تقديمها`;

// ═══════════════════════════════════════════════════════════════
//                    MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { prompt, task, conversationHistory } = req.body || {};
        const userPrompt = prompt || task;

        if (!userPrompt) {
            return res.status(400).json({ success: false, error: 'Missing prompt' });
        }

        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`[Orchestrator V2] 🚀 New request: "${userPrompt.substring(0, 50)}..."`);
        console.log('═══════════════════════════════════════════════════════════════');

        // Build context
        let contextString = '';
        if (conversationHistory && conversationHistory.length > 0) {
            contextString = '\n\n📝 المحادثة السابقة:\n' +
                conversationHistory.slice(-5).map(h =>
                    `المستخدم: ${h.prompt}\nلوكاس: ${h.results?.[0]?.result || ''}`
                ).join('\n\n');
        }

        // Get current time
        const now = new Date();
        const timeString = now.toLocaleString('ar-EG', {
            timeZone: 'Africa/Cairo',
            weekday: 'long', year: 'numeric', month: 'long',
            day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        // Build full prompt
        const fullPrompt = SYSTEM_PROMPT +
            `\n\n⏰ الوقت الحالي: ${timeString}` +
            contextString +
            '\n\n👤 سؤال المستخدم:\n' + userPrompt;

        // Use Smart Router
        const result = await smartRoute(fullPrompt);

        console.log(`[Orchestrator V2] ✅ Response ready (${result.text.length} chars)`);
        console.log(`[Orchestrator V2] 📊 Provider: ${result.provider}, Reviewed: ${result.reviewed || false}`);

        res.status(200).json({
            success: true,
            data: result.text,
            meta: {
                provider: result.provider,
                model: result.model,
                reviewed: result.reviewed || false,
            }
        });

    } catch (error) {
        console.error('[Orchestrator V2] ❌ Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
}
