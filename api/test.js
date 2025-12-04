// Simple test endpoint to verify API keys are loaded
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // Check for API keys
        const keys = [];
        for (let i = 1; i <= 13; i++) {
            const key = process.env[`GEMINI_API_KEY_${i}`];
            if (key && key.trim().length > 0) {
                keys.push(`GEMINI_API_KEY_${i}: ${key.substring(0, 10)}...`);
            }
        }
        if (process.env.GEMINI_API_KEY) {
            keys.push(`GEMINI_API_KEY: ${process.env.GEMINI_API_KEY.substring(0, 10)}...`);
        }

        // Test Gemini API with first key
        let geminiTest = 'Not tested';
        if (keys.length > 0) {
            const testKey = process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY;
            if (testKey) {
                try {
                    const response = await fetch(
                        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-goog-api-key': testKey.trim()
                            },
                            body: JSON.stringify({
                                contents: [{ role: 'user', parts: [{ text: 'Say hello in one word' }] }]
                            })
                        }
                    );

                    if (response.ok) {
                        const data = await response.json();
                        geminiTest = `SUCCESS: ${data.candidates?.[0]?.content?.parts?.[0]?.text || 'Got response'}`;
                    } else {
                        const errorText = await response.text();
                        geminiTest = `FAILED (${response.status}): ${errorText.substring(0, 200)}`;
                    }
                } catch (e) {
                    geminiTest = `ERROR: ${e.message}`;
                }
            }
        }

        res.status(200).json({
            success: true,
            message: 'API Test Endpoint',
            keysFound: keys.length,
            keys: keys,
            geminiTest: geminiTest,
            nodeVersion: process.version,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
