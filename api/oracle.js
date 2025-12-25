// Oracle API - Simple Entry Point
// Vercel Serverless Function

// ═══════════════════════════════════════════════════════════════
//                      DATA SOURCES
// ═══════════════════════════════════════════════════════════════

async function fetchNews() {
    try {
        const GEMINI_KEY = process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY;
        if (!GEMINI_KEY) return [];

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
                body: JSON.stringify({
                    contents: [{
                        role: 'user', parts: [{
                            text:
                                `Search for the top 5 breaking news stories from the last 6 hours.
                         Return ONLY a JSON array with format:
                         [{"title": "...", "description": "...", "source": "..."}]
                         No markdown, no explanation.`
                        }]
                    }],
                    tools: [{ googleSearch: {} }]
                })
            }
        );
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        return JSON.parse(text.replace(/```json?|```/g, '').trim());
    } catch (e) {
        console.error('[Oracle] News error:', e.message);
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

const BREAKING_KEYWORDS = ['breaking', 'urgent', 'war', 'crash', 'hack', 'attack', 'killed', 'missile', 'crisis'];

function findSignificantEvents(data) {
    const events = [];

    // Breaking news
    for (const article of (data.news || [])) {
        const text = `${article.title} ${article.description || ''}`.toLowerCase();
        if (BREAKING_KEYWORDS.some(kw => text.includes(kw))) {
            events.push({ type: 'NEWS', title: article.title, source: article.source });
        }
    }

    // Crypto moves > 3%
    for (const coin of (data.crypto || [])) {
        if (Math.abs(coin.change1h || 0) >= 3) {
            events.push({ type: 'CRYPTO', symbol: coin.symbol, price: coin.price, change: coin.change1h });
        }
    }

    // Earthquakes > 5.0
    for (const eq of (data.earthquakes || [])) {
        if (eq.magnitude >= 5.0) {
            events.push({ type: 'EARTHQUAKE', magnitude: eq.magnitude, place: eq.place, lat: eq.lat, lng: eq.lng });
        }
    }

    return events;
}

async function draftTweet(events, data) {
    const GEMINI_KEY = process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) {
        console.log('[Oracle] No Gemini key for drafting');
        return createFallbackTweet(events);
    }
    if (events.length === 0) return null;

    const eventsSummary = events.slice(0, 3).map((e, i) => {
        if (e.type === 'NEWS') return `${i + 1}. NEWS: ${e.title}`;
        if (e.type === 'CRYPTO') return `${i + 1}. CRYPTO: $${e.symbol} moved ${e.change > 0 ? '+' : ''}${e.change?.toFixed(1)}% (now $${e.price?.toLocaleString()})`;
        if (e.type === 'EARTHQUAKE') return `${i + 1}. EARTHQUAKE: Magnitude ${e.magnitude} at ${e.place} (${e.lat}°, ${e.lng}°)`;
        return `${i + 1}. ${JSON.stringify(e)}`;
    }).join('\n');

    const prompt = `You are LUKAS ORACLE, a cryptic AI that posts predictions on Twitter.

EVENTS:
${eventsSummary}

WRITE A TWEET (max 280 characters):
- Be cryptic and mysterious
- Use specific numbers/coordinates
- NEVER say "I think" or "maybe"  
- Sound like you have classified information
- End with something ominous
- No hashtags except $BTC, $ETH, stock tickers
- No emojis

RESPOND WITH ONLY THE TWEET TEXT.`;

    try {
        console.log('[Oracle] Calling Gemini to draft tweet...');
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { maxOutputTokens: 100, temperature: 1.0 }
                })
            }
        );
        const result = await response.json();
        console.log('[Oracle] Gemini response status:', response.status);

        let tweet = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!tweet) {
            console.log('[Oracle] Gemini returned empty, using fallback');
            return createFallbackTweet(events);
        }

        if (tweet.length > 280) tweet = tweet.substring(0, 277) + '...';
        console.log('[Oracle] Tweet drafted:', tweet.substring(0, 50) + '...');
        return tweet;
    } catch (e) {
        console.error('[Oracle] Draft error:', e.message);
        return createFallbackTweet(events);
    }
}

function createFallbackTweet(events) {
    const event = events[0];
    if (!event) return null;

    if (event.type === 'EARTHQUAKE') {
        return `Seismic activity detected.
Coordinates: ${event.lat}°N, ${event.lng}°E
Magnitude: ${event.magnitude}
${event.place}
The earth speaks. Few listen.`;
    }
    if (event.type === 'CRYPTO') {
        return `$${event.symbol} ${event.change > 0 ? '+' : ''}${event.change?.toFixed(1)}%.
Price: $${event.price?.toLocaleString()}
The whales are moving.
Are you?`;
    }
    if (event.type === 'NEWS') {
        return `Signal detected.
${event.title?.substring(0, 100)}
Watch what happens next.`;
    }
    return null;
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

    console.log('[Oracle] Action:', action || 'cycle');

    try {
        // Scan all sources
        console.log('[Oracle] Scanning sources...');
        const [news, crypto, earthquakes] = await Promise.all([
            fetchNews(),
            fetchCrypto(),
            fetchEarthquakes()
        ]);

        const data = { news, crypto, earthquakes, timestamp: new Date().toISOString() };

        if (action === 'scan') {
            return res.status(200).json({ success: true, data });
        }

        // Find significant events
        const events = findSignificantEvents(data);
        console.log(`[Oracle] Found ${events.length} significant events`);

        if (action === 'analyze') {
            return res.status(200).json({ success: true, events, data });
        }

        if (events.length === 0) {
            return res.status(200).json({
                success: true,
                action: 'SLEEP',
                message: 'No significant events. Oracle goes back to sleep.',
                data
            });
        }

        // Draft tweet
        const tweet = await draftTweet(events, data);

        if (action === 'draft') {
            return res.status(200).json({ success: true, tweet, events });
        }

        // Full cycle - log the tweet (Twitter posting disabled for now)
        console.log('═══════════════════════════════════════════');
        console.log('🔮 LUKAS ORACLE WOULD TWEET:');
        console.log(tweet);
        console.log('═══════════════════════════════════════════');

        return res.status(200).json({
            success: true,
            action: 'DRAFTED',
            tweet,
            events,
            message: 'Tweet drafted. Twitter posting not enabled yet.',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Oracle] Error:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
}
