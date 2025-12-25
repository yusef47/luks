// Oracle API - Lukas Oracle with Gemini Fallback
// Vercel Serverless Function

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
    try {
        const result = await callGemini(
            `Search for the top 5 breaking news stories from the last 6 hours.
             Return ONLY a JSON array with format:
             [{"title": "...", "description": "...", "source": "..."}]
             No markdown, no explanation.`,
            { useSearch: true, maxTokens: 500 }
        );

        if (!result) return [];
        return JSON.parse(result.replace(/```json?|```/g, '').trim());
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

async function draftTweet(events) {
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

RESPOND WITH ONLY THE TWEET TEXT, nothing else.`;

    let tweet = await callGemini(prompt, { maxTokens: 100, temperature: 1.0 });

    if (tweet) {
        // Clean up the tweet
        tweet = tweet.replace(/^["']|["']$/g, '').trim();
        if (tweet.length > 280) tweet = tweet.substring(0, 277) + '...';
    }

    return tweet;
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

        // Find significant events
        const events = findSignificantEvents(data);
        console.log(`[Oracle] 🔍 Found ${events.length} significant events`);

        if (action === 'analyze') {
            return res.status(200).json({ success: true, events, data });
        }

        if (events.length === 0) {
            console.log('[Oracle] 💤 No significant events. Going back to sleep.');
            return res.status(200).json({
                success: true,
                action: 'SLEEP',
                message: 'No significant events. Oracle goes back to sleep.',
                data
            });
        }

        // Draft tweet
        console.log('[Oracle] ✍️ Drafting tweet...');
        const tweet = await draftTweet(events);

        if (action === 'draft') {
            return res.status(200).json({ success: true, tweet, events });
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
