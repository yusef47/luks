// Simple test endpoint - minimal version
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    try {
        // Check for API keys
        const keys = [];
        for (let i = 1; i <= 13; i++) {
            const keyName = `GEMINI_API_KEY_${i}`;
            const key = process.env[keyName];
            if (key && key.trim().length > 0) {
                keys.push(keyName + ': ' + key.substring(0, 8) + '...');
            }
        }
        if (process.env.GEMINI_API_KEY) {
            keys.push('GEMINI_API_KEY: ' + process.env.GEMINI_API_KEY.substring(0, 8) + '...');
        }

        res.status(200).json({
            success: true,
            message: 'API Test Endpoint',
            keysFound: keys.length,
            keys: keys,
            nodeVersion: process.version,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
};
