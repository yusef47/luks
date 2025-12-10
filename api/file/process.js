// File Processing API - Extract text from PDFs, Word, Excel
const MODELS = {
    PRIMARY: 'gemini-2.5-flash',
    FALLBACK: 'gemini-2.5-flash-lite'
};

// Vercel has a 4.5MB body limit
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB to be safe

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

    console.log(`[FileProcess] Using ${model} with ${mimeType}, content size: ${fileContent.length} chars`);

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
        }],
        // Add safety settings to avoid blocks
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
    };

    try {
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
            console.error(`[FileProcess] Gemini error ${response.status}:`, errorText.substring(0, 500));
            throw new Error(`Gemini error ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log(`[FileProcess] Got response, length: ${text.length}`);
        return text;
    } catch (error) {
        console.error(`[FileProcess] API call failed:`, error.message);
        throw error;
    }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        const { fileContent, mimeType, fileName, prompt } = req.body || {};

        console.log(`[FileProcess] Request received for: ${fileName} (${mimeType})`);

        if (!fileContent) {
            console.log('[FileProcess] No file content in request');
            return res.status(400).json({ success: false, error: 'No file content provided' });
        }

        // Check file size
        const fileSizeInBytes = (fileContent.length * 3) / 4; // Approximate original size from base64
        console.log(`[FileProcess] File size approx: ${(fileSizeInBytes / 1024 / 1024).toFixed(2)} MB`);

        if (fileSizeInBytes > MAX_FILE_SIZE) {
            console.log('[FileProcess] File too large');
            return res.status(400).json({
                success: false,
                error: `الملف كبير جداً (${(fileSizeInBytes / 1024 / 1024).toFixed(1)} MB). الحد الأقصى هو 3 MB.`
            });
        }

        const apiKey = getNextKey();
        if (!apiKey) {
            return res.status(500).json({ success: false, error: 'No API keys available' });
        }

        console.log(`[FileProcess] Processing ${fileName}...`);

        // Determine prompt based on file type
        let filePrompt = prompt || '';

        if (!filePrompt) {
            if (mimeType?.startsWith('image/')) {
                filePrompt = 'حلل هذه الصورة بالتفصيل. اوصف ما تراه واستخرج أي نص واعط رؤى مفيدة.';
            } else if (mimeType?.includes('pdf')) {
                filePrompt = 'اقرأ واستخرج كل المحتوى النصي من هذا الملف PDF. إذا كان يحتوي على جداول، اعرضها بشكل منظم.';
            } else if (mimeType?.includes('word') || mimeType?.includes('document')) {
                filePrompt = 'اقرأ واستخرج كل المحتوى من هذا المستند Word. لخص النقاط الرئيسية.';
            } else if (mimeType?.includes('sheet') || mimeType?.includes('excel')) {
                filePrompt = 'حلل جدول البيانات هذا. اوصف الهيكل والبيانات وقدم رؤى.';
            } else {
                filePrompt = 'حلل هذا الملف واوصف محتواه بالتفصيل.';
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
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to process file'
        });
    }
}

