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

    // Try Gemini for a more creative version
    const eventsSummary = events.slice(0, 3).map(e => {
        if (e.type === 'NEWS') return `NEWS: ${e.title}`;
        if (e.type === 'CRYPTO') return `CRYPTO: $${e.symbol} ${e.change > 0 ? '+' : ''}${e.change?.toFixed(1)}%`;
        if (e.type === 'EARTHQUAKE') return `EARTHQUAKE: M${e.magnitude} at ${e.lat}°, ${e.lng}° (${e.place})`;
        return JSON.stringify(e);
    }).join(' | ');

    const prompt = `Write a single cryptic tweet about: ${eventsSummary}. Include exact coordinates. Max 250 chars. No emojis. Be mysterious.`;

    let geminiTweet = await callGemini(prompt, { maxTokens: 100, temperature: 0.9 });

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
