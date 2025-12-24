// Lukas Oracle - Main API Endpoint
// 🔮 The autonomous AI that sees patterns humans miss

import { scanAllSources } from './sources.js';
import { findSignificantEvents, analyzeEvents, draftTweet } from './brain.js';
import { publishToTwitter, logTweetOnly } from './twitter.js';

// ═══════════════════════════════════════════════════════════════
//                      FULL ORACLE CYCLE
// ═══════════════════════════════════════════════════════════════

async function runOracleCycle() {
    console.log('═══════════════════════════════════════════');
    console.log('🔮 LUKAS ORACLE - CYCLE STARTED');
    console.log('Time:', new Date().toISOString());
    console.log('═══════════════════════════════════════════');

    try {
        // 1. SCAN - مسح المصادر
        console.log('\n📡 PHASE 1: SCANNING SOURCES...');
        const data = await scanAllSources();

        // 2. FILTER - تصفية المهم
        console.log('\n🔍 PHASE 2: FINDING SIGNIFICANT EVENTS...');
        const events = findSignificantEvents(data);

        if (events.length === 0) {
            console.log('💤 No significant events found. Oracle goes back to sleep.');
            return {
                success: true,
                action: 'SLEEP',
                message: 'No significant events detected',
                timestamp: new Date().toISOString()
            };
        }

        console.log(`Found ${events.length} significant events`);

        // 3. ANALYZE - تحليل
        console.log('\n🧠 PHASE 3: ANALYZING EVENTS...');
        const analysis = await analyzeEvents(events);

        if (!analysis) {
            console.log('⚠️ Analysis failed. Skipping this cycle.');
            return {
                success: false,
                action: 'SKIP',
                error: 'Analysis failed'
            };
        }

        // 4. DRAFT - صياغة التغريدة
        console.log('\n✍️ PHASE 4: DRAFTING TWEET...');
        const tweet = await draftTweet(analysis);

        if (!tweet) {
            console.log('⚠️ Tweet drafting failed. Skipping this cycle.');
            return {
                success: false,
                action: 'SKIP',
                error: 'Tweet drafting failed'
            };
        }

        console.log('\n📝 DRAFTED TWEET:');
        console.log('─────────────────────────────────────────');
        console.log(tweet);
        console.log('─────────────────────────────────────────');

        // 5. POST - نشر
        console.log('\n📱 PHASE 5: PUBLISHING TO TWITTER...');

        // Check if Twitter credentials are available
        const hasTwitter = process.env.TWITTER_USERNAME && process.env.TWITTER_PASSWORD;

        let result;
        if (hasTwitter) {
            result = await publishToTwitter(tweet);
        } else {
            console.log('⚠️ Twitter credentials not found. Logging only.');
            result = await logTweetOnly(tweet);
        }

        console.log('\n═══════════════════════════════════════════');
        console.log('🔮 ORACLE CYCLE COMPLETE');
        console.log('═══════════════════════════════════════════');

        return {
            success: true,
            action: 'POSTED',
            tweet,
            analysis: analysis.insight,
            events: events.slice(0, 3).map(e => ({ type: e.type, priority: e.priority })),
            twitterResult: result,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('❌ ORACLE ERROR:', error.message);
        return {
            success: false,
            action: 'ERROR',
            error: error.message
        };
    }
}

// ═══════════════════════════════════════════════════════════════
//                         API HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action, secret } = req.query;

    // Optional: Secret key protection
    const ORACLE_SECRET = process.env.ORACLE_SECRET || 'lukas-oracle-2024';
    if (secret && secret !== ORACLE_SECRET) {
        return res.status(403).json({ error: 'Invalid secret' });
    }

    try {
        switch (action) {
            case 'scan':
                // Just scan, don't post
                const data = await scanAllSources();
                return res.status(200).json({ success: true, data });

            case 'analyze':
                // Scan and analyze, don't post
                const scanData = await scanAllSources();
                const events = findSignificantEvents(scanData);
                const analysis = await analyzeEvents(events);
                return res.status(200).json({
                    success: true,
                    events: events.slice(0, 5),
                    analysis
                });

            case 'draft':
                // Full cycle without posting
                const draftData = await scanAllSources();
                const draftEvents = findSignificantEvents(draftData);
                const draftAnalysis = await analyzeEvents(draftEvents);
                const draftTweetText = await draftTweet(draftAnalysis);
                return res.status(200).json({
                    success: true,
                    tweet: draftTweetText,
                    analysis: draftAnalysis?.insight,
                    events: draftEvents.slice(0, 3)
                });

            case 'cycle':
            case 'post':
            default:
                // Full cycle with posting
                const result = await runOracleCycle();
                return res.status(result.success ? 200 : 500).json(result);
        }

    } catch (error) {
        console.error('[Oracle API] Error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
