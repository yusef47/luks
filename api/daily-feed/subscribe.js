// Daily Feed Subscribe API
// Saves user preferences for daily intelligence feed

// In-memory storage (replace with database in production)
const subscribers = new Map();

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // GET - List all subscribers (for cron job)
    if (req.method === 'GET') {
        const { secret } = req.query;

        // Simple secret to protect the endpoint
        if (secret !== process.env.CRON_SECRET && secret !== 'lukas-daily-feed') {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const allSubscribers = Array.from(subscribers.values());
        return res.status(200).json({ success: true, data: allSubscribers });
    }

    // POST - Subscribe
    if (req.method === 'POST') {
        try {
            const { email, topics, time, language = 'ar' } = req.body || {};

            if (!email || !email.includes('@')) {
                return res.status(400).json({ success: false, error: 'البريد الإلكتروني مطلوب' });
            }

            if (!topics || topics.trim().length === 0) {
                return res.status(400).json({ success: false, error: 'المواضيع مطلوبة' });
            }

            if (!time) {
                return res.status(400).json({ success: false, error: 'وقت الإرسال مطلوب' });
            }

            const subscription = {
                id: Date.now().toString(),
                email: email.toLowerCase().trim(),
                topics: topics.trim(),
                time, // Format: "08:00"
                language,
                createdAt: new Date().toISOString(),
                active: true
            };

            subscribers.set(email.toLowerCase(), subscription);

            console.log(`[DailyFeed] New subscriber: ${email} for topics: ${topics} at ${time}`);

            return res.status(200).json({
                success: true,
                message: 'تم الاشتراك بنجاح! ستصلك النشرة اليومية في الوقت المحدد.',
                data: subscription
            });

        } catch (error) {
            console.error('[DailyFeed] Subscribe error:', error.message);
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // DELETE - Unsubscribe
    if (req.method === 'DELETE') {
        try {
            const { email } = req.body || {};

            if (!email) {
                return res.status(400).json({ success: false, error: 'البريد الإلكتروني مطلوب' });
            }

            const deleted = subscribers.delete(email.toLowerCase());

            if (deleted) {
                console.log(`[DailyFeed] Unsubscribed: ${email}`);
                return res.status(200).json({ success: true, message: 'تم إلغاء الاشتراك بنجاح' });
            } else {
                return res.status(404).json({ success: false, error: 'البريد غير مسجل' });
            }

        } catch (error) {
            console.error('[DailyFeed] Unsubscribe error:', error.message);
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
}

// Export subscribers for use by other modules
export { subscribers };
