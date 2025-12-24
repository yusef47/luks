// Oracle Brain - العقل
// يحلل البيانات ويقرر ويصيغ التغريدات

// ═══════════════════════════════════════════════════════════════
//                      DECISION ENGINE
// ═══════════════════════════════════════════════════════════════

const BREAKING_KEYWORDS = [
    'breaking', 'urgent', 'just in', 'flash',
    'war', 'crash', 'hack', 'explosion', 'attack',
    'assassination', 'resign', 'arrest', 'killed',
    'missile', 'nuclear', 'emergency', 'crisis'
];

const THRESHOLDS = {
    CRYPTO_CHANGE: 5,      // % تغيير في الكريبتو
    STOCK_CHANGE: 3,       // % تغيير في الأسهم
    EARTHQUAKE_MAG: 5.0    // قوة الزلزال
};

export function findSignificantEvents(data) {
    const events = [];

    // 1. أخبار عاجلة
    if (data.news) {
        for (const article of data.news) {
            const text = `${article.title} ${article.description || ''}`.toLowerCase();
            const isBreaking = BREAKING_KEYWORDS.some(kw => text.includes(kw));

            if (isBreaking) {
                events.push({
                    type: 'NEWS',
                    priority: 'HIGH',
                    title: article.title,
                    source: article.source,
                    raw: article
                });
            }
        }
    }

    // 2. تحركات كريبتو كبيرة
    if (data.crypto) {
        for (const coin of data.crypto) {
            const change = Math.abs(coin.change1h || 0);
            if (change >= THRESHOLDS.CRYPTO_CHANGE) {
                events.push({
                    type: 'CRYPTO',
                    priority: change >= 10 ? 'HIGH' : 'MEDIUM',
                    symbol: coin.symbol,
                    price: coin.price,
                    change: coin.change1h,
                    raw: coin
                });
            }
        }
    }

    // 3. زلازل كبيرة
    if (data.earthquakes) {
        for (const eq of data.earthquakes) {
            if (eq.magnitude >= THRESHOLDS.EARTHQUAKE_MAG) {
                events.push({
                    type: 'EARTHQUAKE',
                    priority: eq.magnitude >= 6 ? 'HIGH' : 'MEDIUM',
                    magnitude: eq.magnitude,
                    place: eq.place,
                    coordinates: eq.coordinates,
                    tsunami: eq.tsunami,
                    raw: eq
                });
            }
        }
    }

    // 4. تحركات أسهم كبيرة
    if (data.stocks) {
        for (const stock of data.stocks) {
            const change = Math.abs(parseFloat(stock.change) || 0);
            if (change >= THRESHOLDS.STOCK_CHANGE) {
                events.push({
                    type: 'STOCK',
                    priority: change >= 5 ? 'HIGH' : 'MEDIUM',
                    symbol: stock.symbol,
                    price: stock.price,
                    change: stock.change,
                    raw: stock
                });
            }
        }
    }

    // Sort by priority
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    events.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return events;
}

// ═══════════════════════════════════════════════════════════════
//                         ANALYZER
// ═══════════════════════════════════════════════════════════════

export async function analyzeEvents(events) {
    if (events.length === 0) return null;

    const GEMINI_KEY = process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) {
        console.error('[Oracle] No Gemini API key for analysis');
        return null;
    }

    // اختار أهم 3 أحداث
    const topEvents = events.slice(0, 3);
    const eventsSummary = topEvents.map((e, i) => {
        switch (e.type) {
            case 'NEWS':
                return `${i + 1}. NEWS: ${e.title}`;
            case 'CRYPTO':
                return `${i + 1}. CRYPTO: $${e.symbol} moved ${e.change > 0 ? '+' : ''}${e.change?.toFixed(1)}% (now $${e.price?.toLocaleString()})`;
            case 'EARTHQUAKE':
                return `${i + 1}. EARTHQUAKE: Magnitude ${e.magnitude} at ${e.place} (${e.coordinates?.lat?.toFixed(4)}°, ${e.coordinates?.lng?.toFixed(4)}°)`;
            case 'STOCK':
                return `${i + 1}. STOCK: $${e.symbol} moved ${e.change > 0 ? '+' : ''}${e.change}% (now $${e.price?.toFixed(2)})`;
            default:
                return `${i + 1}. ${e.type}: ${JSON.stringify(e)}`;
        }
    }).join('\n');

    const prompt = `You are LUKAS, a cryptic oracle AI that sees patterns humans miss.

EVENTS DETECTED:
${eventsSummary}

TASK: Analyze these events. Find hidden connections or predict consequences.

OUTPUT REQUIREMENTS:
- One insight or prediction (2-3 sentences max)
- Be cryptic and confident
- Use specific numbers/coordinates when relevant
- Never say "I think" or "maybe"
- Sound like you have classified information

RESPOND WITH ONLY THE INSIGHT, nothing else.`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { maxOutputTokens: 200, temperature: 0.9 }
                })
            }
        );

        const data = await response.json();
        const insight = data.candidates?.[0]?.content?.parts?.[0]?.text;

        return {
            events: topEvents,
            insight: insight?.trim() || null
        };
    } catch (e) {
        console.error('[Oracle] Analysis error:', e.message);
        return { events: topEvents, insight: null };
    }
}

// ═══════════════════════════════════════════════════════════════
//                       PERSONA WRITER
// ═══════════════════════════════════════════════════════════════

const TWEET_TEMPLATES = {
    CRYPTO: [
        `$[SYMBOL] [DIRECTION] [CHANGE]% in [TIME].
[INSIGHT]
The charts don't lie. The whales move first.`,
        `$[SYMBOL] at $[PRICE].
[INSIGHT]
History doesn't repeat. It rhymes.`
    ],
    EARTHQUAKE: [
        `Seismic activity detected.
Coordinates: [LAT]°N, [LNG]°E
Magnitude: [MAG]
[PLACE]
Infrastructure ripple: 48-72 hours.`,
        `[MAG] magnitude. [PLACE].
[INSIGHT]
The earth speaks. Few listen.`
    ],
    NEWS: [
        `[HEADLINE]
[INSIGHT]
Watch what happens next.`,
        `Breaking signal detected.
[HEADLINE]
[INSIGHT]`
    ],
    STOCK: [
        `$[SYMBOL] [DIRECTION] [CHANGE]%.
[INSIGHT]
Smart money moved first.`,
        `$[SYMBOL] at $[PRICE].
[INSIGHT]
The market whispers before it screams.`
    ]
};

export async function draftTweet(analysis) {
    if (!analysis || !analysis.events || analysis.events.length === 0) {
        return null;
    }

    const GEMINI_KEY = process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) return null;

    const mainEvent = analysis.events[0];
    const insight = analysis.insight || '';

    const prompt = `You are LUKAS ORACLE, a cryptic AI that posts predictions on Twitter.

EVENT: ${JSON.stringify(mainEvent)}
ANALYSIS: ${insight}

WRITE A TWEET (max 280 characters) following these rules:
1. Be cryptic and mysterious
2. Use specific numbers, coordinates, or percentages
3. NEVER say "I think", "maybe", "could be"
4. Sound like you have insider/classified information
5. End with something ominous or thought-provoking
6. Use line breaks for dramatic effect
7. No hashtags except $BTC, $ETH, stock tickers
8. No emojis

RESPOND WITH ONLY THE TWEET TEXT, nothing else.`;

    try {
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

        const data = await response.json();
        let tweet = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        // تأكد إن التغريدة مش أكتر من 280 حرف
        if (tweet && tweet.length > 280) {
            tweet = tweet.substring(0, 277) + '...';
        }

        return tweet;
    } catch (e) {
        console.error('[Oracle] Draft error:', e.message);
        return null;
    }
}
