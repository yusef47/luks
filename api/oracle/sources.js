// Oracle Data Sources - العيون
// يمسح الإنترنت ويجيب البيانات

// ═══════════════════════════════════════════════════════════════
//                         NEWS API
// ═══════════════════════════════════════════════════════════════

export async function fetchNews() {
    const NEWS_API_KEY = process.env.NEWS_API_KEY;

    // لو مفيش API key، نستخدم Gemini Search
    if (!NEWS_API_KEY) {
        return await fetchNewsViaGemini();
    }

    try {
        const response = await fetch(
            `https://newsapi.org/v2/top-headlines?language=en&pageSize=20&apiKey=${NEWS_API_KEY}`
        );
        const data = await response.json();

        if (data.articles) {
            return data.articles.map(a => ({
                title: a.title,
                description: a.description,
                source: a.source?.name,
                url: a.url,
                publishedAt: a.publishedAt
            }));
        }
        return [];
    } catch (e) {
        console.error('[Oracle] NewsAPI error:', e.message);
        return await fetchNewsViaGemini();
    }
}

async function fetchNewsViaGemini() {
    // Fallback: استخدم Gemini مع Google Search
    const GEMINI_KEY = process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) return [];

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
                body: JSON.stringify({
                    contents: [{
                        role: 'user', parts: [{
                            text:
                                `Search for the top 10 breaking news stories from the last 6 hours.
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
        console.error('[Oracle] Gemini news fallback error:', e.message);
        return [];
    }
}

// ═══════════════════════════════════════════════════════════════
//                       CRYPTO (CoinGecko)
// ═══════════════════════════════════════════════════════════════

export async function fetchCrypto() {
    try {
        const response = await fetch(
            'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&sparkline=false&price_change_percentage=1h,24h'
        );
        const data = await response.json();

        return data.map(coin => ({
            id: coin.id,
            symbol: coin.symbol.toUpperCase(),
            name: coin.name,
            price: coin.current_price,
            change1h: coin.price_change_percentage_1h_in_currency,
            change24h: coin.price_change_percentage_24h,
            marketCap: coin.market_cap
        }));
    } catch (e) {
        console.error('[Oracle] CoinGecko error:', e.message);
        return [];
    }
}

// ═══════════════════════════════════════════════════════════════
//                      EARTHQUAKES (USGS)
// ═══════════════════════════════════════════════════════════════

export async function fetchEarthquakes() {
    try {
        // زلازل آخر 24 ساعة magnitude > 4
        const response = await fetch(
            'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson'
        );
        const data = await response.json();

        return data.features?.map(eq => ({
            magnitude: eq.properties.mag,
            place: eq.properties.place,
            time: new Date(eq.properties.time).toISOString(),
            coordinates: {
                lat: eq.geometry.coordinates[1],
                lng: eq.geometry.coordinates[0],
                depth: eq.geometry.coordinates[2]
            },
            tsunami: eq.properties.tsunami === 1
        })) || [];
    } catch (e) {
        console.error('[Oracle] USGS error:', e.message);
        return [];
    }
}

// ═══════════════════════════════════════════════════════════════
//                      STOCKS (Yahoo Finance)
// ═══════════════════════════════════════════════════════════════

export async function fetchStocks() {
    const symbols = ['SPY', 'QQQ', 'NVDA', 'TSLA', 'AAPL', 'MSFT', 'GOOGL'];

    try {
        const results = await Promise.all(symbols.map(async (symbol) => {
            try {
                const response = await fetch(
                    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`
                );
                const data = await response.json();
                const quote = data.chart?.result?.[0];

                if (!quote) return null;

                const prices = quote.indicators?.quote?.[0];
                const meta = quote.meta;

                const previousClose = meta.previousClose || prices?.close?.[0];
                const currentPrice = meta.regularMarketPrice;
                const change = ((currentPrice - previousClose) / previousClose * 100);

                return {
                    symbol,
                    price: currentPrice,
                    change: change.toFixed(2),
                    previousClose
                };
            } catch {
                return null;
            }
        }));

        return results.filter(r => r !== null);
    } catch (e) {
        console.error('[Oracle] Stocks error:', e.message);
        return [];
    }
}

// ═══════════════════════════════════════════════════════════════
//                      SCAN ALL SOURCES
// ═══════════════════════════════════════════════════════════════

export async function scanAllSources() {
    console.log('[Oracle] Scanning all sources...');

    const [news, crypto, earthquakes, stocks] = await Promise.all([
        fetchNews(),
        fetchCrypto(),
        fetchEarthquakes(),
        fetchStocks()
    ]);

    console.log(`[Oracle] Found: ${news.length} news, ${crypto.length} crypto, ${earthquakes.length} earthquakes, ${stocks.length} stocks`);

    return { news, crypto, earthquakes, stocks, timestamp: new Date().toISOString() };
}
