// Daily Feed Generate & Send API
// Generates personalized news report and sends via email

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

// Smart API call with fallback
async function callGeminiWithSearch(prompt, maxRetries = 9) {
    const keys = getAPIKeys();
    if (keys.length === 0) throw new Error('No API keys');

    let lastError = null;
    let attempts = 0;

    for (const model of ALL_MODELS) {
        for (const apiKey of keys) {
            if (attempts >= maxRetries) break;
            attempts++;

            try {
                console.log(`[DailyFeed] Attempt ${attempts}: ${model}`);

                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        tools: [{ googleSearch: {} }]
                    })
                });

                if (response.status === 429) { lastError = new Error('Rate limit'); continue; }
                if (response.status === 404) { lastError = new Error('Model not found'); break; }
                if (!response.ok) { lastError = new Error(`Error ${response.status}`); continue; }

                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (!text) { lastError = new Error('Empty'); continue; }

                console.log(`[DailyFeed] SUCCESS on attempt ${attempts}!`);
                return text;

            } catch (e) { lastError = e; continue; }
        }
    }
    throw lastError || new Error('All attempts failed');
}

// Send email using Resend
async function sendEmail(to, subject, htmlContent) {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY not configured');
    }

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
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const prompt = `أنت لوكاس (Lukas)، مساعد ذكاء اصطناعي متخصص في إعداد التقارير الإخبارية اليومية.

📅 التاريخ: ${today}

🎯 المهمة: ابحث عن أحدث الأخبار والتطورات المتعلقة بالمواضيع التالية:
${topics}

📋 المطلوب:
1. ابحث عن أحدث الأخبار في هذه المواضيع (آخر 24-48 ساعة)
2. لخص أهم 5-10 أخبار
3. قدم تحليلاً موجزاً لكل خبر
4. اذكر المصادر

📝 تنسيق التقرير:
- استخدم عناوين واضحة
- نقاط مختصرة ومفيدة
- أضف إيموجي مناسبة
- اللغة: ${language === 'ar' ? 'العربية' : 'English'}

⚠️ قواعد صارمة:
- لا تذكر Google أو Gemini
- قل أنك "لوكاس" فقط
- كن دقيقاً ومحايداً

ابدأ التقرير الآن:`;

    return await callGeminiWithSearch(prompt);
}

// Convert markdown to HTML for email
function markdownToHtml(markdown) {
    let html = markdown
        // Headers
        .replace(/^### (.*$)/gim, '<h3 style="color: #6366f1; margin-top: 20px;">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 style="color: #4f46e5; margin-top: 25px;">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 style="color: #3730a3; margin-top: 30px;">$1</h1>')
        // Bold and italic
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Lists
        .replace(/^\- (.*$)/gim, '<li style="margin: 5px 0;">$1</li>')
        .replace(/^\* (.*$)/gim, '<li style="margin: 5px 0;">$1</li>')
        // Paragraphs
        .replace(/\n\n/g, '</p><p style="margin: 15px 0; line-height: 1.8;">')
        // Line breaks
        .replace(/\n/g, '<br>');

    return `<p style="margin: 15px 0; line-height: 1.8;">${html}</p>`;
}

// Build email HTML template
function buildEmailHtml(report, topics, date) {
    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); margin: 0; padding: 20px;">
    <div style="max-width: 700px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 32px;">🧠 Lukas</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 18px;">نشرتك الذكية اليومية</p>
            <p style="color: rgba(255,255,255,0.7); margin: 5px 0 0; font-size: 14px;">📅 ${date}</p>
        </div>
        
        <!-- Topics -->
        <div style="background: #f8fafc; padding: 20px 30px; border-bottom: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #64748b; font-size: 14px;">
                🎯 <strong>المواضيع:</strong> ${topics}
            </p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px; color: #334155; font-size: 16px;">
            ${markdownToHtml(report)}
        </div>
        
        <!-- Footer -->
        <div style="background: #1e293b; padding: 30px; text-align: center;">
            <p style="color: #94a3b8; margin: 0 0 15px; font-size: 14px;">
                تم إنشاء هذا التقرير بواسطة لوكاس AI
            </p>
            <p style="color: #64748b; margin: 0; font-size: 12px;">
                لإلغاء الاشتراك، قم بتسجيل الدخول وتعديل إعداداتك
            </p>
        </div>
        
    </div>
</body>
</html>
`;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        const { email, topics, language = 'ar', preview = false } = req.body || {};

        if (!topics) {
            return res.status(400).json({ success: false, error: 'المواضيع مطلوبة' });
        }

        console.log(`[DailyFeed] Generating report for: ${email || 'preview'}`);
        console.log(`[DailyFeed] Topics: ${topics}`);

        // Generate the report
        const report = await generateReport(topics, language);

        const today = new Date().toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // If preview mode, just return the report
        if (preview || !email) {
            return res.status(200).json({
                success: true,
                data: {
                    report,
                    date: today,
                    topics
                }
            });
        }

        // Build and send email
        const htmlContent = buildEmailHtml(report, topics, today);
        const subject = `🧠 نشرة لوكاس اليومية - ${today}`;

        await sendEmail(email, subject, htmlContent);

        console.log(`[DailyFeed] Email sent to: ${email}`);

        return res.status(200).json({
            success: true,
            message: 'تم إرسال النشرة بنجاح!',
            data: {
                report,
                date: today,
                emailSent: true
            }
        });

    } catch (error) {
        console.error('[DailyFeed] Error:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
}
