// Oracle API - Lukas Oracle with Gemini Fallback
// Vercel Serverless Function

// ═══════════════════════════════════════════════════════════════
//                      DEDUPLICATION SYSTEM
// ═══════════════════════════════════════════════════════════════

// Simple hash function for events
function hashEvent(event) {
    const str = JSON.stringify({
        type: event.type,
        // For earthquakes, use coordinates
        lat: event.lat,
        lng: event.lng,
        magnitude: event.magnitude,
        // For crypto, use symbol and rough price
        symbol: event.symbol,
        priceRange: event.price ? Math.floor(event.price / 100) * 100 : null,
        // For news, use title
        title: event.title?.substring(0, 50)
    });
    // Simple hash
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'evt_' + Math.abs(hash).toString(36);
}

// Store for posted events (using Upstash Redis if available)
async function getPostedEvents() {
    const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
    const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!UPSTASH_URL || !UPSTASH_TOKEN) {
        console.log('[Oracle] No Upstash configured, skipping dedup');
        return new Set();
    }

    try {
        const response = await fetch(`${UPSTASH_URL}/get/oracle_posted_events`, {
            headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
        });
        const data = await response.json();
        if (data.result) {
            return new Set(JSON.parse(data.result));
        }
    } catch (e) {
        console.log('[Oracle] Failed to get posted events:', e.message);
    }
    return new Set();
}

async function savePostedEvent(eventHash) {
    const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
    const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!UPSTASH_URL || !UPSTASH_TOKEN) return;

    try {
        // Get current events
        const posted = await getPostedEvents();
        posted.add(eventHash);

        // Keep only last 100 events to avoid unlimited growth
        const eventsArray = [...posted].slice(-100);

        // Save back
        await fetch(`${UPSTASH_URL}/set/oracle_posted_events`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${UPSTASH_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventsArray)
        });
        console.log('[Oracle] Saved event hash:', eventHash);
    } catch (e) {
        console.log('[Oracle] Failed to save posted event:', e.message);
    }
}

async function filterNewEvents(events) {
    const posted = await getPostedEvents();
    const newEvents = [];

    for (const event of events) {
        const hash = hashEvent(event);
        if (!posted.has(hash)) {
            event._hash = hash; // Store hash for later
            newEvents.push(event);
        } else {
            console.log('[Oracle] Skipping duplicate event:', hash);
        }
    }

    return newEvents;
}

// ═══════════════════════════════════════════════════════════════
//                      GEMINI FALLBACK SYSTEM
// ═══════════════════════════════════════════════════════════════

const MODELS = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];

function getGeminiKeys() {
    const keys = [];
    for (let i = 1; i <= 13; i++) {
        const key = process.env[`GEMINI_API_KEY_${i}`];
        if (key && key.trim()) keys.push(key.trim());
    }
    if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY.trim());
    // Shuffle keys
    return keys.sort(() => Math.random() - 0.5);
}

async function callGemini(prompt, options = {}) {
    const keys = getGeminiKeys();
    const { useSearch = false, maxTokens = 200, temperature = 0.9 } = options;

    if (keys.length === 0) {
        console.error('[Oracle] No Gemini API keys found');
        return null;
    }

    console.log(`[Oracle] Trying ${keys.length} keys with ${MODELS.length} models...`);

    // Try each model
    for (const model of MODELS) {
        // Try each key
        for (const key of keys) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

                const body = {
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { maxOutputTokens: maxTokens, temperature }
                };

                if (useSearch) {
                    body.tools = [{ googleSearch: {} }];
                }

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
                    body: JSON.stringify(body)
                });

                if (response.status === 429) {
                    console.log(`[Oracle] Key rate limited, trying next...`);
                    continue;
                }

                if (response.status === 404) {
                    console.log(`[Oracle] Model ${model} not found, trying next...`);
                    break; // Skip to next model
                }

                if (!response.ok) {
                    console.log(`[Oracle] Error ${response.status}, trying next...`);
                    continue;
                }

                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

                if (text) {
                    console.log(`[Oracle] Success with ${model}!`);
                    return text;
                }
            } catch (e) {
                console.log(`[Oracle] Exception: ${e.message}`);
                continue;
            }
        }
    }

    console.error('[Oracle] All keys/models exhausted');
    return null;
}

// ═══════════════════════════════════════════════════════════════
//                      DATA SOURCES
// ═══════════════════════════════════════════════════════════════

async function fetchNews() {
    // Try NewsAPI first (free tier: 100 requests/day)
    const NEWS_API_KEY = process.env.NEWS_API_KEY;

    if (NEWS_API_KEY) {
        try {
            console.log('[Oracle] Fetching news from NewsAPI...');
            const response = await fetch(
                `https://newsapi.org/v2/top-headlines?language=en&pageSize=10&apiKey=${NEWS_API_KEY}`
            );
            const data = await response.json();

            if (data.articles && data.articles.length > 0) {
                console.log(`[Oracle] Got ${data.articles.length} news from NewsAPI`);
                return data.articles.map(a => ({
                    title: a.title,
                    description: a.description || '',
                    source: a.source?.name || 'Unknown',
                    url: a.url,
                    publishedAt: a.publishedAt
                }));
            }
        } catch (e) {
            console.error('[Oracle] NewsAPI error:', e.message);
        }
    }

    // Fallback to Gemini with Google Search
    console.log('[Oracle] Falling back to Gemini for news...');
    try {
        const result = await callGemini(
            `Search for the top 5 breaking news stories happening RIGHT NOW.
             Focus on: politics, economics, technology, disasters, conflicts.
             Return ONLY a JSON array: [{"title": "...", "description": "...", "source": "..."}]`,
            { useSearch: true, maxTokens: 600 }
        );

        if (!result) return [];
        const parsed = JSON.parse(result.replace(/```json?|```/g, '').trim());
        console.log(`[Oracle] Got ${parsed.length} news from Gemini`);
        return parsed;
    } catch (e) {
        console.error('[Oracle] Gemini news error:', e.message);
        return [];
    }
}

async function fetchCrypto() {
    try {
        const response = await fetch(
            'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=5&sparkline=false&price_change_percentage=1h,24h'
        );
        const data = await response.json();
        return data.map(coin => ({
            symbol: coin.symbol.toUpperCase(),
            name: coin.name,
            price: coin.current_price,
            change1h: coin.price_change_percentage_1h_in_currency,
            change24h: coin.price_change_percentage_24h
        }));
    } catch (e) {
        console.error('[Oracle] Crypto error:', e.message);
        return [];
    }
}

async function fetchEarthquakes() {
    try {
        const response = await fetch(
            'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson'
        );
        const data = await response.json();
        return data.features?.slice(0, 5).map(eq => ({
            magnitude: eq.properties.mag,
            place: eq.properties.place,
            lat: eq.geometry.coordinates[1]?.toFixed(4),
            lng: eq.geometry.coordinates[0]?.toFixed(4)
        })) || [];
    } catch (e) {
        console.error('[Oracle] Earthquakes error:', e.message);
        return [];
    }
}

// ═══════════════════════════════════════════════════════════════
//                      BRAIN - DECISION & DRAFT
// ═══════════════════════════════════════════════════════════════

// More keywords for news detection
const BREAKING_KEYWORDS = [
    'breaking', 'urgent', 'war', 'crash', 'hack', 'attack', 'killed', 'missile', 'crisis',
    'explosion', 'shooting', 'earthquake', 'flood', 'fire', 'trump', 'biden', 'putin',
    'election', 'market', 'stock', 'bitcoin', 'crypto', 'arrest', 'dead', 'death',
    'terror', 'bomb', 'nuclear', 'sanctions', 'oil', 'gas', 'inflation', 'recession'
];

function findSignificantEvents(data, forceAll = false) {
    const events = [];

    // All news (if forceAll) or breaking news
    for (const article of (data.news || [])) {
        const text = `${article.title} ${article.description || ''}`.toLowerCase();
        const isBreaking = BREAKING_KEYWORDS.some(kw => text.includes(kw));
        if (forceAll || isBreaking) {
            events.push({ type: 'NEWS', title: article.title, source: article.source });
        }
    }

    // Crypto moves > 2% (lowered from 3%)
    for (const coin of (data.crypto || [])) {
        const change = Math.abs(coin.change1h || 0);
        if (forceAll || change >= 2) {
            events.push({ type: 'CRYPTO', symbol: coin.symbol, price: coin.price, change: coin.change1h });
        }
    }

    // Earthquakes > 4.5 (lowered from 5.0)
    for (const eq of (data.earthquakes || [])) {
        if (forceAll || eq.magnitude >= 4.5) {
            events.push({ type: 'EARTHQUAKE', magnitude: eq.magnitude, place: eq.place, lat: eq.lat, lng: eq.lng });
        }
    }

    return events;
}

// ═══════════════════════════════════════════════════════════════
//                      CORRELATION ENGINE
// ═══════════════════════════════════════════════════════════════

// Knowledge base for correlations
const CORRELATIONS = {
    // Shipping/Ports
    'port': ['shipping costs', 'supply chain', 'commodity prices', 'delays'],
    'shanghai': ['manufacturing', 'electronics', 'exports', 'global trade'],
    'rotterdam': ['european imports', 'oil prices', 'natural gas'],
    'suez': ['shipping routes', 'oil tankers', 'global trade'],

    // Energy
    'oil': ['gas prices', 'inflation', 'transportation costs', 'airlines'],
    'opec': ['oil prices', 'production cuts', 'energy markets'],
    'natural gas': ['heating costs', 'electricity prices', 'industrial'],

    // Tech
    'semiconductor': ['chip shortage', 'electronics prices', 'auto industry', 'nvidia'],
    'ai': ['tech stocks', 'nvda', 'cloud computing', 'data centers'],

    // Geopolitical
    'china': ['manufacturing', 'exports', 'rare earth', 'technology'],
    'russia': ['oil', 'gas', 'wheat', 'fertilizers'],
    'iran': ['oil prices', 'middle east', 'sanctions'],
    'israel': ['oil prices', 'defense stocks', 'geopolitics']
};

async function findCorrelations(events) {
    if (events.length < 2) return null;

    // Build context from all events
    const eventsSummary = events.slice(0, 5).map(e => {
        if (e.type === 'NEWS') return `NEWS: ${e.title}`;
        if (e.type === 'CRYPTO') return `CRYPTO: $${e.symbol} ${e.change > 0 ? '+' : ''}${e.change?.toFixed(1)}%`;
        if (e.type === 'EARTHQUAKE') return `EARTHQUAKE: M${e.magnitude} at ${e.place}`;
        return JSON.stringify(e);
    }).join('\n');

    // Ask Gemini to find correlations
    const prompt = `You are an intelligence analyst. Find hidden connections between these events:

${eventsSummary}

If you find a correlation (cause-effect, geographic link, market impact), explain it in ONE sentence.
If no meaningful correlation exists, respond with: NONE

Example: "Shanghai port delays will impact semiconductor supply chains, affecting $NVDA and $AMD stock prices."`;

    const correlation = await callGemini(prompt, { maxTokens: 100, temperature: 0.7 });

    if (correlation && !correlation.includes('NONE')) {
        console.log('[Oracle] Found correlation:', correlation.substring(0, 50) + '...');
        return correlation.trim();
    }

    return null;
}

async function draftTweet(events) {
    if (events.length === 0) return null;

    // Create template-based tweet first (guaranteed to be complete)
    const mainEvent = events[0];
    let templateTweet = '';

    if (mainEvent.type === 'EARTHQUAKE') {
        // For multiple earthquakes, list them all
        const quakes = events.filter(e => e.type === 'EARTHQUAKE');
        if (quakes.length >= 2) {
            templateTweet = `Seismic pattern detected.
${quakes.slice(0, 3).map(q => `${q.lat}°, ${q.lng}° - ${q.place.split(',')[0]}`).join('\n')}
${quakes.length} tremors. ${Math.floor(Math.random() * 12) + 6} hours.
The plates are speaking.`;
        } else {
            templateTweet = `Seismic event confirmed.
Coordinates: ${mainEvent.lat}°, ${mainEvent.lng}°
Location: ${mainEvent.place}
Magnitude: ${mainEvent.magnitude}
Aftershocks likely. Monitor advised.`;
        }
    } else if (mainEvent.type === 'CRYPTO') {
        const direction = mainEvent.change > 0 ? 'surge' : 'drop';
        templateTweet = `$${mainEvent.symbol} ${direction} detected.
${mainEvent.change > 0 ? '+' : ''}${mainEvent.change?.toFixed(2)}% movement.
Current: $${mainEvent.price?.toLocaleString()}
Whale wallets active.
The charts don't lie.`;
    } else if (mainEvent.type === 'NEWS') {
        templateTweet = `Signal intercepted.
"${mainEvent.title.substring(0, 100)}"
Source: ${mainEvent.source || 'classified'}
Implications developing.
Watch this space.`;
    }

    // Ensure the template tweet is under 280 chars
    if (templateTweet.length > 280) {
        templateTweet = templateTweet.substring(0, 277) + '...';
    }

    // Find correlations between events
    const correlation = await findCorrelations(events);

    // Try Gemini for a more creative version with correlation
    const eventsSummary = events.slice(0, 3).map(e => {
        if (e.type === 'NEWS') return `NEWS: ${e.title}`;
        if (e.type === 'CRYPTO') return `CRYPTO: $${e.symbol} ${e.change > 0 ? '+' : ''}${e.change?.toFixed(1)}%`;
        if (e.type === 'EARTHQUAKE') return `EARTHQUAKE: M${e.magnitude} at ${e.lat}°, ${e.lng}° (${e.place})`;
        return JSON.stringify(e);
    }).join(' | ');

    let prompt = `Write a cryptic tweet about: ${eventsSummary}. Include exact numbers/coordinates. Max 250 chars. No emojis. Be mysterious.`;

    // Add correlation insight if found
    if (correlation) {
        prompt = `Write a cryptic tweet connecting these events: ${eventsSummary}. 
INSIGHT: ${correlation}
Include this insight cryptically. Max 250 chars. No emojis. Sound like you have classified intel.`;
    }

    let geminiTweet = await callGemini(prompt, { maxTokens: 120, temperature: 0.9 });

    // Check if Gemini tweet is complete and usable
    if (geminiTweet) {
        geminiTweet = geminiTweet.replace(/^["']|["']$/g, '').trim();
        geminiTweet = geminiTweet.replace(/^(Here'?s?( the)? tweet:?|Tweet:?|My tweet:?)\s*/i, '').trim();

        // Check if incomplete (ends mid-sentence or too short)
        const isIncomplete =
            geminiTweet.length < 50 ||
            geminiTweet.endsWith('-') ||
            geminiTweet.endsWith('at') ||
            geminiTweet.endsWith('the') ||
            geminiTweet.endsWith('a') ||
            geminiTweet.endsWith('...') && geminiTweet.length < 100 ||
            !geminiTweet.includes('.') && !geminiTweet.includes('\n');

        if (!isIncomplete && geminiTweet.length >= 50 && geminiTweet.length <= 280) {
            console.log('[Oracle] Using Gemini tweet');
            return geminiTweet;
        }
    }

    // Use template tweet as fallback
    console.log('[Oracle] Using template tweet');
    return templateTweet;
}

// ═══════════════════════════════════════════════════════════════
//                      API HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action } = req.query;

    console.log('[Oracle] ═══════════════════════════════════════════');
    console.log('[Oracle] 🔮 LUKAS ORACLE - Action:', action || 'cycle');
    console.log('[Oracle] Time:', new Date().toISOString());

    try {
        // Scan all sources
        console.log('[Oracle] 📡 Scanning sources...');
        const [news, crypto, earthquakes] = await Promise.all([
            fetchNews(),
            fetchCrypto(),
            fetchEarthquakes()
        ]);

        const data = { news, crypto, earthquakes, timestamp: new Date().toISOString() };
        console.log(`[Oracle] Found: ${news.length} news, ${crypto.length} crypto, ${earthquakes.length} earthquakes`);

        if (action === 'scan') {
            return res.status(200).json({ success: true, data });
        }

        // For 'all' action, show all events without filtering
        const forceAll = action === 'all';

        // Find significant events
        let events = findSignificantEvents(data, forceAll);
        console.log(`[Oracle] 🔍 Found ${events.length} significant events (forceAll: ${forceAll})`);

        if (action === 'analyze' || action === 'all') {
            return res.status(200).json({ success: true, events, data, forceAll });
        }

        // Filter out already posted events (deduplication)
        const originalCount = events.length;
        events = await filterNewEvents(events);
        console.log(`[Oracle] 🔄 After dedup: ${events.length} new events (skipped ${originalCount - events.length} duplicates)`);

        if (events.length === 0) {
            console.log('[Oracle] 💤 No new events. Going back to sleep.');
            return res.status(200).json({
                success: true,
                action: 'SLEEP',
                message: 'No new events (all already posted). Oracle goes back to sleep.',
                skippedDuplicates: originalCount,
                data
            });
        }

        // Draft tweet
        console.log('[Oracle] ✍️ Drafting tweet...');
        const tweet = await draftTweet(events);

        if (action === 'draft') {
            return res.status(200).json({ success: true, tweet, events });
        }

        // Save posted event hash (first event)
        if (events[0]?._hash) {
            await savePostedEvent(events[0]._hash);
        }

        // Full cycle - log the tweet
        console.log('[Oracle] ═══════════════════════════════════════════');
        console.log('[Oracle] 🔮 TWEET DRAFTED:');
        console.log(tweet || '(no tweet generated)');
        console.log('[Oracle] ═══════════════════════════════════════════');

        return res.status(200).json({
            success: true,
            action: 'DRAFTED',
            tweet: tweet || null,
            events,
            message: tweet ? 'Tweet drafted successfully!' : 'Failed to draft tweet.',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Oracle] ❌ Error:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
}
