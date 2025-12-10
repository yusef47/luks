// File Processing API - Extract text from PDFs, Word, Excel
const MODELS = {
    PRIMARY: 'gemini-2.5-flash',
    FALLBACK: 'gemini-2.5-flash-lite'
};

function getAPIKeys() {
    const keys = [];
    for (let i = 1; i <= 13; i++) {
        const key = process.env[`GEMINI_API_KEY_${i}`];
        if (key && key.trim().length > 0) keys.push(key.trim());
    }
    if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY.trim());
    return keys;
}

function getNextKey() {
    const keys = getAPIKeys();
    if (keys.length === 0) return null;
    return keys[Math.floor(Math.random() * keys.length)];
}

// Process file with Gemini Vision (for images and documents)
async function processWithGemini(fileContent, mimeType, prompt, apiKey, model = MODELS.PRIMARY) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    console.log(`[FileProcess] Using ${model} with ${mimeType}...`);

    const requestBody = {
        contents: [{
            role: 'user',
            parts: [
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: fileContent // base64
                    }
                },
                {
                    text: prompt
                }
            ]
        }]
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
        },
        body: JSON.stringify(requestBody)
    });

    if ([429, 404, 503].includes(response.status) && model === MODELS.PRIMARY) {
        console.log(`[FileProcess] Fallback to ${MODELS.FALLBACK}...`);
        return processWithGemini(fileContent, mimeType, prompt, apiKey, MODELS.FALLBACK);
    }

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini error ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        const { fileContent, mimeType, fileName, prompt } = req.body || {};

        if (!fileContent) {
            return res.status(400).json({ success: false, error: 'No file content provided' });
        }

        const apiKey = getNextKey();
        if (!apiKey) {
            return res.status(500).json({ success: false, error: 'No API keys available' });
        }

        console.log(`[FileProcess] Processing ${fileName} (${mimeType})...`);

        // Determine prompt based on file type
        let filePrompt = prompt || '';

        if (!filePrompt) {
            if (mimeType.startsWith('image/')) {
                filePrompt = 'Analyze this image in detail. Describe what you see, extract any text, and provide insights.';
            } else if (mimeType.includes('pdf')) {
                filePrompt = 'Read and extract all the text content from this PDF document. Summarize the main points.';
            } else if (mimeType.includes('word') || mimeType.includes('document')) {
                filePrompt = 'Read and extract all the text content from this Word document. Summarize the main points.';
            } else if (mimeType.includes('sheet') || mimeType.includes('excel')) {
                filePrompt = 'Analyze this spreadsheet. Describe the data, structure, and provide insights on the numbers.';
            } else {
                filePrompt = 'Analyze this file and describe its contents in detail.';
            }
        }

        const result = await processWithGemini(fileContent, mimeType, filePrompt, apiKey);

        console.log(`[FileProcess] Successfully processed ${fileName}`);

        return res.status(200).json({
            success: true,
            data: {
                extractedText: result,
                fileName: fileName,
                mimeType: mimeType
            }
        });

    } catch (error) {
        console.error('[FileProcess] Error:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
}
