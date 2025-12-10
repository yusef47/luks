// Daily Feed API - Combined subscribe and generate
// Handles: subscribe, unsubscribe, generate report, send email

const MODELS = {
    PRIMARY: 'gemini-2.5-flash',
    FALLBACK_1: 'gemini-2.5-flash-lite',
    FALLBACK_2: 'gemini-robotics-er-1.5-preview'
};

const ALL_MODELS = [MODELS.PRIMARY, MODELS.FALLBACK_1, MODELS.FALLBACK_2];

function getAPIKeys() {
    const keys = [];
    for (let i = 1; i <= 13; i++) {
        const key = process.env[`GEMINI_API_KEY_${i}`];
        if (key && key.trim().length > 0) keys.push(key.trim());
    }
    if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY.trim());
    return keys.sort(() => Math.random() - 0.5);
}

// Smart API call with fallback - tries ALL keys and ALL models
async function callGeminiWithSearch(prompt, maxRetries = 30) {
    const keys = getAPIKeys();
    console.log(`[DailyFeed] Found ${keys.length} API keys`);

    if (keys.length === 0) throw new Error('No API keys configured');

    let lastError = null;
    let attempts = 0;

    // Try each model
    for (const model of ALL_MODELS) {
        // Try each key for this model
        for (const apiKey of keys) {
            if (attempts >= maxRetries) {
                console.log(`[DailyFeed] Reached max retries (${maxRetries})`);
                break;
            }
            attempts++;

            try {
                console.log(`[DailyFeed] Attempt ${attempts}/${maxRetries}: ${model} with key ...${apiKey.slice(-6)}`);

                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        tools: [{ googleSearch: {} }]
                    })
                });

                if (response.status === 429) {
                    console.log(`[DailyFeed] Key rate limited, trying next...`);
                    lastError = new Error('Rate limit');
                    continue; // Try next key
                }

                if (response.status === 404) {
                    console.log(`[DailyFeed] Model ${model} not found, trying next model...`);
                    lastError = new Error('Model not found');
                    break; // Skip to next model
                }

                if (!response.ok) {
                    const errText = await response.text();
                    console.log(`[DailyFeed] Error ${response.status}: ${errText.substring(0, 100)}`);
                    lastError = new Error(`Error ${response.status}`);
                    continue;
                }

                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

                if (!text) {
                    console.log(`[DailyFeed] Empty response, trying next...`);
                    lastError = new Error('Empty response');
                    continue;
                }

                console.log(`[DailyFeed] SUCCESS on attempt ${attempts} with ${model}!`);
                return text;

            } catch (e) {
                console.log(`[DailyFeed] Exception: ${e.message}`);
                lastError = e;
                continue;
            }
        }
    }

    console.log(`[DailyFeed] All ${attempts} attempts failed. Last error: ${lastError?.message}`);
    throw lastError || new Error('All API attempts failed');
}

// Send email using Resend
async function sendEmail(to, subject, htmlContent) {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: 'Lukas AI <onboarding@resend.dev>',
            to: [to],
            subject: subject,
            html: htmlContent
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Email failed: ${error}`);
    }
    return await response.json();
}

// Generate the daily report
async function generateReport(topics, language = 'ar') {
    const today = new Date().toLocaleDateString('ar-EG', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const prompt = `أنت لوكاس، مساعد ذكاء اصطناعي متخصص في التقارير الإخبارية.

📅 التاريخ: ${today}

🎯 ابحث عن أحدث الأخبار في: ${topics}

📋 المطلوب:
- أهم 5-10 أخبار من آخر 24-48 ساعة
- تحليل موجز لكل خبر
- اللغة: ${language === 'ar' ? 'العربية' : 'English'}

⚠️ لا تذكر Google أو Gemini.`;

    return await callGeminiWithSearch(prompt);
}

// Build email HTML
function buildEmailHtml(report, topics, date) {
    return `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;background:#1a1a2e;margin:0;padding:20px;">
<div style="max-width:700px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;">
<div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:40px 30px;text-align:center;">
<h1 style="color:white;margin:0;">🧠 Lukas</h1>
<p style="color:rgba(255,255,255,0.9);margin:10px 0 0;">نشرتك الذكية اليومية - ${date}</p>
</div>
<div style="padding:20px 30px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
<p style="margin:0;color:#64748b;">🎯 <strong>المواضيع:</strong> ${topics}</p>
</div>
<div style="padding:30px;color:#334155;line-height:1.8;white-space:pre-wrap;">${report}</div>
<div style="background:#1e293b;padding:30px;text-align:center;">
<p style="color:#94a3b8;margin:0;">تم إنشاء هذا التقرير بواسطة لوكاس AI</p>
</div>
</div></body></html>`;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action } = req.query;
    const body = req.body || {};

    try {
        // Generate and/or send report
        if (action === 'generate' || req.method === 'POST') {
            const { email, topics, language = 'ar', preview = false } = body;

            if (!topics) {
                return res.status(400).json({ success: false, error: 'المواضيع مطلوبة' });
            }

            const report = await generateReport(topics, language);
            const today = new Date().toLocaleDateString('ar-EG', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });

            if (preview || !email) {
                return res.status(200).json({ success: true, data: { report, date: today, topics } });
            }

            const htmlContent = buildEmailHtml(report, topics, today);
            await sendEmail(email, `🧠 نشرة لوكاس اليومية - ${today}`, htmlContent);

            return res.status(200).json({
                success: true,
                message: 'تم إرسال النشرة بنجاح!',
                data: { report, date: today, emailSent: true }
            });
        }

        return res.status(400).json({ success: false, error: 'Invalid action' });

    } catch (error) {
        console.error('[DailyFeed] Error:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
}
