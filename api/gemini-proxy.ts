/**
 * Gemini API Proxy - Backend
 * يتعامل مع الـ API keys بشكل آمن من الـ backend فقط
 * لا تظهر الـ keys في الـ client-side code
 */

import { GoogleGenAI } from "@google/genai";

// ============================================
// API Keys - من environment variables فقط
// ============================================

// Get API keys from environment variables
// In production (Vercel), use VITE_ prefix
// In development, use direct names
const ALL_API_KEYS = [
    // Try VITE_ prefix first (Vercel)
    process.env.VITE_GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY_1,
    process.env.VITE_GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_2,
    process.env.VITE_GEMINI_API_KEY_3 || process.env.GEMINI_API_KEY_3,
    process.env.VITE_GEMINI_API_KEY_4 || process.env.GEMINI_API_KEY_4,
    process.env.VITE_GEMINI_API_KEY_5 || process.env.GEMINI_API_KEY_5,
    process.env.VITE_GEMINI_API_KEY_6 || process.env.GEMINI_API_KEY_6,
    process.env.VITE_GEMINI_API_KEY_7 || process.env.GEMINI_API_KEY_7,
    process.env.VITE_GEMINI_API_KEY_8 || process.env.GEMINI_API_KEY_8,
    process.env.VITE_GEMINI_API_KEY_9 || process.env.GEMINI_API_KEY_9,
    process.env.VITE_GEMINI_API_KEY_10 || process.env.GEMINI_API_KEY_10,
    process.env.VITE_GEMINI_API_KEY_11 || process.env.GEMINI_API_KEY_11,
    process.env.VITE_GEMINI_API_KEY_12 || process.env.GEMINI_API_KEY_12,
    process.env.VITE_GEMINI_API_KEY_13 || process.env.GEMINI_API_KEY_13,
    process.env.VITE_API_KEY || process.env.API_KEY
].filter(Boolean) as string[];

const UNIQUE_KEYS = [...new Set(ALL_API_KEYS)];

console.log(`🔑 Gemini Proxy: ${UNIQUE_KEYS.length} API keys available`);

if (UNIQUE_KEYS.length === 0) {
    console.error("⚠️ No API keys found! Check your environment variables");
    console.error("Available env vars:", Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('API')));
}

// ============================================
// Key Rotation Logic
// ============================================

interface KeyStats {
    failures: number;
    successes: number;
    blacklistedUntil: number;
}

const keyStats = new Map<string, KeyStats>();
UNIQUE_KEYS.forEach(key => {
    keyStats.set(key, { failures: 0, successes: 0, blacklistedUntil: 0 });
});

let currentKeyIndex = 0;

const getNextKey = (): string => {
    const now = Date.now();
    const startIndex = currentKeyIndex;
    
    for (let i = 0; i < UNIQUE_KEYS.length; i++) {
        const index = (startIndex + i) % UNIQUE_KEYS.length;
        const key = UNIQUE_KEYS[index];
        const stats = keyStats.get(key)!;
        
        if (stats.blacklistedUntil <= now) {
            currentKeyIndex = (index + 1) % UNIQUE_KEYS.length;
            return key;
        }
    }
    
    // All blacklisted - reset
    console.warn('⚠️ All keys blacklisted! Resetting...');
    UNIQUE_KEYS.forEach(key => {
        const stats = keyStats.get(key)!;
        stats.blacklistedUntil = 0;
        stats.failures = 0;
    });
    
    return UNIQUE_KEYS[0];
};

const recordSuccess = (key: string) => {
    const stats = keyStats.get(key);
    if (stats) {
        stats.successes++;
        stats.failures = Math.max(0, stats.failures - 1);
    }
};

const recordFailure = (key: string, errorCode: number) => {
    const stats = keyStats.get(key);
    if (stats) {
        stats.failures++;
        
        if (errorCode === 429 || errorCode === 503) {
            const blacklistDuration = Math.min(stats.failures * 15000, 60000);
            stats.blacklistedUntil = Date.now() + blacklistDuration;
            console.log(`⏱️ Key blacklisted for ${blacklistDuration/1000}s`);
        }
    }
};

// ============================================
// Main API Call Function
// ============================================

export interface GeminiRequest {
    model: string;
    prompt: string;
    schema?: any;
}

export interface GeminiResponse {
    success: boolean;
    data?: any;
    error?: string;
}

export const callGeminiAPI = async (request: GeminiRequest): Promise<GeminiResponse> => {
    console.log(`🔐 callGeminiAPI called with model: ${request.model}`);
    console.log(`📊 Available keys: ${UNIQUE_KEYS.length}`);
    
    if (UNIQUE_KEYS.length === 0) {
        console.error('❌ No API keys available!');
        return {
            success: false,
            error: 'No API keys configured'
        };
    }
    
    let lastError: any;
    const triedKeys = new Set<string>();
    
    for (let attempt = 0; attempt < UNIQUE_KEYS.length; attempt++) {
        const key = getNextKey();
        
        if (triedKeys.has(key) && triedKeys.size < UNIQUE_KEYS.length) {
            continue;
        }
        triedKeys.add(key);
        
        try {
            console.log(`🔑 Attempting with key ${attempt + 1}/${UNIQUE_KEYS.length}`);
            const ai = new GoogleGenAI({ apiKey: key }) as any;
            const model = ai.getGenerativeModel({ model: request.model });
            
            // Properly format the request
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: request.prompt }] }]
            });
            
            const responseText = result.response.text();
            
            recordSuccess(key);
            console.log(`✅ Success! Response length: ${responseText.length}`);
            
            return {
                success: true,
                data: responseText
            };
        } catch (error: any) {
            const errorCode = error?.status || error?.code || 500;
            recordFailure(key, errorCode);
            lastError = error;
            
            console.log(`🔄 Key failed (${errorCode}), trying another... (${attempt + 1}/${UNIQUE_KEYS.length})`);
            console.error(`Error details:`, error.message);
            
            if (errorCode !== 429 && errorCode !== 503) {
                throw error;
            }
        }
    }
    
    console.error('❌ All keys exhausted');
    return {
        success: false,
        error: lastError?.message || 'All API keys exhausted'
    };
};

// ============================================
// Export for use in Express routes
// ============================================

export default {
    callGeminiAPI,
    getKeyStats: () => {
        const stats: any = {};
        keyStats.forEach((value, key) => {
            stats[key.substring(0, 10) + '...'] = value;
        });
        return stats;
    }
};
