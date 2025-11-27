/**
 * Gemini Client - موحد مع Key Rotation
 * يتعامل مع كل الـ API calls ويعمل retry تلقائي
 */

import { GoogleGenAI } from "@google/genai";

// Helper to get env vars
const getEnv = (key: string): string | undefined => {
  // Try Vite env first
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    return (import.meta as any).env[key];
  }
  // Try Node env
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

// جميع المفاتيح المتاحة
const API_KEYS = [
  getEnv('VITE_GEMINI_API_KEY_1'),
  getEnv('VITE_GEMINI_API_KEY_2'),
  getEnv('VITE_GEMINI_API_KEY_3'),
  getEnv('VITE_GEMINI_API_KEY_4'),
  getEnv('VITE_GEMINI_API_KEY_5'),
  getEnv('VITE_GEMINI_API_KEY_6'),
  getEnv('VITE_GEMINI_API_KEY_7'),
  getEnv('VITE_GEMINI_API_KEY_8'),
  getEnv('VITE_GEMINI_API_KEY_9'),
  getEnv('VITE_GEMINI_API_KEY_10'),
  getEnv('VITE_GEMINI_API_KEY_11'),
  getEnv('VITE_GEMINI_API_KEY_12'),
  getEnv('VITE_GEMINI_API_KEY_13'),
  getEnv('VITE_API_KEY'),
  getEnv('GEMINI_API_KEY_1'),
  getEnv('GEMINI_API_KEY_2'),
  getEnv('GEMINI_API_KEY_3'),
  getEnv('GEMINI_API_KEY_4'),
  getEnv('GEMINI_API_KEY_5'),
  getEnv('GEMINI_API_KEY_6'),
  getEnv('GEMINI_API_KEY_7'),
  getEnv('GEMINI_API_KEY_8'),
  getEnv('GEMINI_API_KEY_9'),
  getEnv('GEMINI_API_KEY_10'),
  getEnv('GEMINI_API_KEY_11'),
  getEnv('GEMINI_API_KEY_12'),
  getEnv('GEMINI_API_KEY_13'),
  getEnv('API_KEY')
].filter(Boolean) as string[];

// إزالة المكررات
const UNIQUE_KEYS = [...new Set(API_KEYS)];

console.log(`🔑 Gemini Client initialized with ${UNIQUE_KEYS.length} unique API keys`);

// حالة كل مفتاح
interface KeyStats {
  failures: number;
  successes: number;
  lastUsed: number;
  blacklistedUntil: number;
  totalRequests: number;
}

const keyStats: Map<string, KeyStats> = new Map();

// تهيئة إحصائيات المفاتيح
UNIQUE_KEYS.forEach(key => {
  keyStats.set(key, {
    failures: 0,
    successes: 0,
    lastUsed: 0,
    blacklistedUntil: 0,
    totalRequests: 0
  });
});

// مؤشر المفتاح الحالي (Round Robin)
let currentKeyIndex = 0;

/**
 * احصل على المفتاح التالي المتاح
 */
function getNextAvailableKey(): string | null {
  const now = Date.now();
  const startIndex = currentKeyIndex;
  
  // جرب كل المفاتيح
  for (let i = 0; i < UNIQUE_KEYS.length; i++) {
    const index = (startIndex + i) % UNIQUE_KEYS.length;
    const key = UNIQUE_KEYS[index];
    const stats = keyStats.get(key)!;
    
    // تحقق من الـ blacklist
    if (stats.blacklistedUntil > now) {
      continue; // هذا المفتاح محظور مؤقتاً
    }
    
    // وجدنا مفتاح متاح
    currentKeyIndex = (index + 1) % UNIQUE_KEYS.length; // للمرة الجاية
    return key;
  }
  
  // كل المفاتيح محظورة - أعد تعيين الكل
  console.warn('⚠️ All keys are blacklisted! Resetting all...');
  UNIQUE_KEYS.forEach(key => {
    const stats = keyStats.get(key)!;
    stats.blacklistedUntil = 0;
    stats.failures = 0;
  });
  
  return UNIQUE_KEYS[0];
}

/**
 * سجل نجاح
 */
function recordSuccess(key: string) {
  const stats = keyStats.get(key);
  if (stats) {
    stats.successes++;
    stats.totalRequests++;
    stats.lastUsed = Date.now();
    stats.failures = Math.max(0, stats.failures - 1); // تقليل الفشل تدريجياً
  }
}

/**
 * سجل فشل
 */
function recordFailure(key: string, errorCode: number) {
  const stats = keyStats.get(key);
  if (stats) {
    stats.failures++;
    stats.totalRequests++;
    stats.lastUsed = Date.now();
    
    // 429 = Rate Limit, 503 = Service Unavailable
    if (errorCode === 429 || errorCode === 503) {
      // حظر المفتاح لفترة تزداد مع كل فشل
      const blacklistDuration = Math.min(stats.failures * 10000, 60000); // max 60 seconds
      stats.blacklistedUntil = Date.now() + blacklistDuration;
      console.log(`⏱️ Key blacklisted for ${blacklistDuration/1000}s`);
    }
  }
}

/**
 * إنشاء GoogleGenAI instance جديد
 */
function createAI(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

/**
 * تنفيذ طلب مع retry تلقائي
 */
export async function executeWithRetry<T>(
  operation: (ai: GoogleGenAI) => Promise<T>,
  maxRetries: number = 5
): Promise<T> {
  let lastError: any;
  const triedKeys = new Set<string>();
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const key = getNextAvailableKey();
    
    if (!key) {
      throw new Error('No API keys available');
    }
    
    // تجنب تكرار نفس المفتاح
    if (triedKeys.has(key) && triedKeys.size < UNIQUE_KEYS.length) {
      continue;
    }
    triedKeys.add(key);
    
    try {
      const ai = createAI(key);
      const result = await operation(ai);
      recordSuccess(key);
      return result;
    } catch (error: any) {
      const errorCode = error?.status || error?.code || 
        (error?.message?.includes('429') ? 429 : 
         error?.message?.includes('503') ? 503 : 500);
      
      recordFailure(key, errorCode);
      lastError = error;
      
      // إذا كان 429، جرب مفتاح تاني فوراً
      if (errorCode === 429 || errorCode === 503) {
        console.log(`🔄 Key exhausted, trying another... (attempt ${attempt + 1}/${maxRetries})`);
        continue;
      }
      
      // أخطاء تانية، وقف
      throw error;
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

/**
 * تنفيذ طلب streaming مع retry
 */
export async function* executeStreamWithRetry(
  operation: (ai: GoogleGenAI) => AsyncIterable<any>,
  maxRetries: number = 5
): AsyncGenerator<any> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const key = getNextAvailableKey();
    
    if (!key) {
      throw new Error('No API keys available');
    }
    
    try {
      const ai = createAI(key);
      const stream = operation(ai);
      
      for await (const chunk of stream) {
        yield chunk;
      }
      
      recordSuccess(key);
      return; // نجح
    } catch (error: any) {
      const errorCode = error?.status || error?.code || 500;
      recordFailure(key, errorCode);
      lastError = error;
      
      if (errorCode === 429 || errorCode === 503) {
        console.log(`🔄 Stream: Key exhausted, trying another... (attempt ${attempt + 1}/${maxRetries})`);
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError || new Error('All stream retry attempts failed');
}

/**
 * الحصول على AI instance مباشرة (للاستخدام البسيط)
 */
export function getAI(): GoogleGenAI {
  const key = getNextAvailableKey();
  if (!key) {
    throw new Error('No API keys available');
  }
  return createAI(key);
}

/**
 * حالة المفاتيح
 */
export function getKeysStatus() {
  const status: any[] = [];
  const now = Date.now();
  
  UNIQUE_KEYS.forEach((key, index) => {
    const stats = keyStats.get(key)!;
    const isBlacklisted = stats.blacklistedUntil > now;
    
    status.push({
      index: index + 1,
      status: isBlacklisted ? '⏱️ Cooling' : stats.failures > 2 ? '⚠️ Degraded' : '✅ Ready',
      successes: stats.successes,
      failures: stats.failures,
      totalRequests: stats.totalRequests,
      cooldownRemaining: isBlacklisted ? Math.ceil((stats.blacklistedUntil - now) / 1000) : 0
    });
  });
  
  return {
    totalKeys: UNIQUE_KEYS.length,
    readyKeys: status.filter(s => s.status === '✅ Ready').length,
    coolingKeys: status.filter(s => s.status === '⏱️ Cooling').length,
    keys: status
  };
}

export default {
  executeWithRetry,
  executeStreamWithRetry,
  getAI,
  getKeysStatus
};
