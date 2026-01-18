/**
 * Browser AI API Endpoint
 * Receives screenshots from extension and returns AI actions
 * Uses Gemini Vision API directly
 */

// Get Gemini API keys
function getGeminiKeys() {
    const keys = [];
    for (let i = 1; i <= 10; i++) {
        const key = process.env[`GEMINI_API_KEY_${i}`];
        if (key && key.trim()) keys.push(key.trim());
    }
    if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY.trim());
    return keys;
}

let keyIndex = 0;

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { task, screenshot, url, title, pageText, previousSteps = [] } = req.body;

        if (!task || !screenshot) {
            return res.status(400).json({ error: 'Missing task or screenshot' });
        }

        console.log(`[BrowserAI] Task: "${task.substring(0, 50)}..."`);
        console.log(`[BrowserAI] URL: ${url}`);
        console.log(`[BrowserAI] Previous steps: ${previousSteps.length}`);

        // Build step history
        const stepHistory = previousSteps.map((s, i) =>
            `Step ${i + 1}: ${s.action} - ${s.description || ''}`
        ).join('\n');

        // Build prompt
        const prompt = `أنت وكيل متصفح ذكي يتحكم في متصفح المستخدم. يمكنك رؤية لقطة الشاشة الحالية.

المهمة: ${task}

الرابط الحالي: ${url || 'غير معروف'}
عنوان الصفحة: ${title || 'غير معروف'}

الخطوات السابقة:
${stepHistory || 'لا توجد خطوات سابقة'}

محتوى الصفحة (جزء):
${pageText?.substring(0, 1500) || 'غير متاح'}

بناءً على ما تراه في لقطة الشاشة، قرر الإجراء التالي لإكمال المهمة.

أجب بصيغة JSON التالية فقط:
{
    "observation": "وصف موجز لما تراه على الصفحة",
    "thinking": "تفكيرك حول ما يجب فعله",
    "action": {
        "type": "click" أو "type" أو "scroll" أو "goto" أو "wait" أو "pressKey" أو "done",
        "x": 500,
        "y": 300,
        "text": "النص للكتابة إذا كان الإجراء type",
        "url": "الرابط إذا كان الإجراء goto",
        "direction": "up أو down إذا كان scroll",
        "key": "Enter أو Tab إذا كان pressKey",
        "description": "وصف الإجراء بالعربية"
    },
    "taskComplete": false,
    "result": "اكتب النتيجة هنا فقط إذا كان taskComplete = true"
}

تعليمات مهمة:
- إذا رأيت نتائج البحث بالمعلومات المطلوبة، استخرجها واجعل taskComplete: true
- للنقر، قدّر إحداثيات x,y بناءً على موقع العنصر
- إذا رأيت مربع بحث، اكتب فيه
- إذا احتجت للتمرير لرؤية المزيد، استخدم scroll
- كن فعالاً - لا تأخذ خطوات غير ضرورية
- أجب بـ JSON فقط بدون أي نص إضافي`;

        // Call Gemini Vision
        const aiResponse = await callGeminiVision(prompt, screenshot);

        if (!aiResponse) {
            return res.status(500).json({ error: 'AI failed to respond' });
        }

        console.log(`[BrowserAI] AI response: ${aiResponse.action?.type} - ${aiResponse.action?.description}`);

        res.status(200).json(aiResponse);

    } catch (error) {
        console.error('[BrowserAI] Error:', error);
        res.status(500).json({ error: error.message });
    }
}

async function callGeminiVision(prompt, screenshotBase64) {
    const keys = getGeminiKeys();
    if (keys.length === 0) {
        console.error('[BrowserAI] No Gemini API keys');
        return null;
    }

    const models = [
        'gemini-2.5-flash-preview-05-20',
        'gemini-2.5-flash-lite-preview-06-17',
        'gemini-2.0-flash'
    ];

    for (const model of models) {
        // Try each key
        for (let attempt = 0; attempt < Math.min(3, keys.length); attempt++) {
            const apiKey = keys[(keyIndex++) % keys.length];

            try {
                console.log(`[BrowserAI] Trying Gemini ${model}...`);

                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [
                                    { text: prompt },
                                    {
                                        inline_data: {
                                            mime_type: 'image/jpeg',
                                            data: screenshotBase64
                                        }
                                    }
                                ]
                            }],
                            generationConfig: {
                                temperature: 0.4,
                                maxOutputTokens: 1000
                            }
                        })
                    }
                );

                const data = await response.json();

                if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    const content = data.candidates[0].content.parts[0].text;
                    // Extract JSON from response
                    const jsonMatch = content.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        console.log(`[BrowserAI] ✅ Gemini ${model} success`);
                        return JSON.parse(jsonMatch[0]);
                    }
                }

                if (data.error) {
                    console.log(`[BrowserAI] Gemini error: ${data.error.message}`);
                    if (data.error.code === 429) {
                        console.log('[BrowserAI] Rate limited, trying next key...');
                        continue;
                    }
                }
            } catch (error) {
                console.log(`[BrowserAI] Error: ${error.message}`);
                continue;
            }
        }
    }

    console.error('[BrowserAI] All Gemini models failed');
    return {
        observation: 'فشل التحليل',
        thinking: 'لم أتمكن من تحليل الصورة',
        action: { type: 'wait', description: 'انتظار - خطأ في التحليل' },
        taskComplete: false
    };
}
