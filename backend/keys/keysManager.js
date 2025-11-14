/**
 * Keys Manager - إدارة مفاتيح API بذكاء
 * يدير توزيع المفاتيح، تتبع الأخطاء، والتبديل التلقائي
 */

class KeysManager {
  constructor() {
    this.keys = {
      SearchAgent: {
        key: process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY,
        usageCount: 0,
        errorCount: 0,
        lastUsed: null,
        timeoutUntil: 0,
        status: 'active'
      },
      MapsAgent: {
        key: process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY,
        usageCount: 0,
        errorCount: 0,
        lastUsed: null,
        timeoutUntil: 0,
        status: 'active'
      },
      VisionAgent: {
        key: process.env.GEMINI_API_KEY_3 || process.env.GEMINI_API_KEY,
        usageCount: 0,
        errorCount: 0,
        lastUsed: null,
        timeoutUntil: 0,
        status: 'active'
      },
      VideoAgent: {
        key: process.env.GEMINI_API_KEY_4 || process.env.GEMINI_API_KEY,
        usageCount: 0,
        errorCount: 0,
        lastUsed: null,
        timeoutUntil: 0,
        status: 'active'
      },
      ImageGenerationAgent: {
        key: process.env.GEMINI_API_KEY_5 || process.env.GEMINI_API_KEY,
        usageCount: 0,
        errorCount: 0,
        lastUsed: null,
        timeoutUntil: 0,
        status: 'active'
      },
      default: {
        key: process.env.GEMINI_API_KEY,
        usageCount: 0,
        errorCount: 0,
        lastUsed: null,
        timeoutUntil: 0,
        status: 'active'
      }
    };

    // التحقق من وجود مفاتيح
    if (!this.keys.default.key) {
      throw new Error('❌ GEMINI_API_KEY environment variable not set');
    }

    console.log('✅ Keys Manager initialized with', Object.keys(this.keys).length, 'keys');
  }

  /**
   * الحصول على أفضل مفتاح متاح
   */
  getBestKey(agent = 'default') {
    const now = Date.now();
    
    // تحقق من المفتاح المفضل أولاً
    if (this.keys[agent]) {
      const keyData = this.keys[agent];
      
      // إذا كان المفتاح نشطاً وليس في timeout
      if (keyData.status === 'active' && now > keyData.timeoutUntil) {
        return keyData.key;
      }
    }

    // ابحث عن أفضل مفتاح متاح
    let bestKey = null;
    let bestScore = Infinity;

    for (const [name, keyData] of Object.entries(this.keys)) {
      // تخطي المفاتيح في timeout
      if (now < keyData.timeoutUntil) continue;

      // احسب النقاط (أقل = أفضل)
      const score = keyData.errorCount * 100 + keyData.usageCount;

      if (score < bestScore) {
        bestScore = score;
        bestKey = keyData.key;
      }
    }

    return bestKey || this.keys.default.key;
  }

  /**
   * تسجيل استخدام مفتاح
   */
  recordUsage(agent = 'default') {
    if (this.keys[agent]) {
      this.keys[agent].usageCount++;
      this.keys[agent].lastUsed = new Date();
    }
  }

  /**
   * تسجيل خطأ ومعالجة التبديل التلقائي
   */
  recordError(agent = 'default', errorCode = null) {
    if (!this.keys[agent]) return;

    const keyData = this.keys[agent];
    keyData.errorCount++;

    console.error(`❌ Error for ${agent}: Code ${errorCode}, Failures: ${keyData.errorCount}`);

    // إذا كان الخطأ 429 أو 503، ضع المفتاح في timeout
    if (errorCode === 429 || errorCode === 503) {
      const timeoutDuration = 60000; // دقيقة واحدة
      keyData.timeoutUntil = Date.now() + timeoutDuration;
      keyData.status = 'timeout';
      
      console.warn(`⏱️ ${agent} key in timeout for ${timeoutDuration / 1000}s`);
    }

    // إذا كان هناك أخطاء كثيرة، ضع المفتاح في cooldown
    if (keyData.errorCount > 5) {
      keyData.status = 'blocked';
      console.error(`🚫 ${agent} key blocked due to too many errors`);
    }
  }

  /**
   * إعادة تعيين الأخطاء بعد فترة زمنية
   */
  resetErrors(agent = 'default') {
    if (this.keys[agent]) {
      this.keys[agent].errorCount = 0;
      this.keys[agent].status = 'active';
      this.keys[agent].timeoutUntil = 0;
      console.log(`✅ Reset errors for ${agent}`);
    }
  }

  /**
   * الحصول على حالة جميع المفاتيح
   */
  getStatus() {
    const status = {};
    const now = Date.now();

    for (const [agent, keyData] of Object.entries(this.keys)) {
      const isInTimeout = now < keyData.timeoutUntil;
      
      status[agent] = {
        status: isInTimeout ? '⏱️ Timeout' : keyData.status === 'active' ? '✅ Active' : '🚫 Blocked',
        usageCount: keyData.usageCount,
        errorCount: keyData.errorCount,
        lastUsed: keyData.lastUsed,
        timeoutUntil: isInTimeout ? new Date(keyData.timeoutUntil) : null,
        healthScore: this.calculateHealthScore(keyData)
      };
    }

    return status;
  }

  /**
   * حساب درجة صحة المفتاح
   */
  calculateHealthScore(keyData) {
    let score = 100;
    score -= keyData.errorCount * 10;
    score -= (keyData.usageCount % 100) * 0.1;
    return Math.max(0, Math.min(100, score));
  }

  /**
   * إضافة Rate Limiting
   */
  checkRateLimit(agent = 'default') {
    const keyData = this.keys[agent];
    if (!keyData) return false;

    // حد أقصى 60 طلب/دقيقة
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // في الإنتاج، يتم تتبع الطلبات في قاعدة بيانات
    // هنا نستخدم تقدير بسيط
    return keyData.usageCount > 60;
  }

  /**
   * Backoff Retry System
   */
  getRetryDelay(errorCount) {
    // exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = Math.min(30000, Math.pow(2, errorCount) * 1000);
    return delay;
  }

  /**
   * Load Balancing - اختر المفتاح الأقل استخداماً
   */
  getLoadBalancedKey() {
    let bestKey = null;
    let minUsage = Infinity;

    for (const [name, keyData] of Object.entries(this.keys)) {
      if (keyData.status === 'active' && keyData.usageCount < minUsage) {
        minUsage = keyData.usageCount;
        bestKey = keyData.key;
      }
    }

    return bestKey || this.keys.default.key;
  }

  /**
   * إعادة تعيين جميع الإحصائيات (للاختبار فقط)
   */
  resetAll() {
    for (const agent of Object.keys(this.keys)) {
      this.keys[agent].usageCount = 0;
      this.keys[agent].errorCount = 0;
      this.keys[agent].status = 'active';
      this.keys[agent].timeoutUntil = 0;
    }
    console.log('✅ All keys reset');
  }
}

// تصدير instance واحد (Singleton)
module.exports = new KeysManager();
