/**
 * Quota Manager - إدارة الكوتة
 * نظام ذكي لتجنب تجاوز الكوتة
 */

import dotenv from 'dotenv';

dotenv.config();

class QuotaManager {
  constructor() {
    // تتبع الطلبات لكل مفتاح
    this.keyQuotaUsage = {};
    this.keys = [
      process.env.GEMINI_API_KEY_1,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY_3,
      process.env.GEMINI_API_KEY_4,
      process.env.GEMINI_API_KEY_5,
      process.env.GEMINI_API_KEY_6,
      process.env.GEMINI_API_KEY_7,
      process.env.GEMINI_API_KEY_8,
      process.env.GEMINI_API_KEY_9,
      process.env.GEMINI_API_KEY_10,
      process.env.GEMINI_API_KEY_11,
      process.env.GEMINI_API_KEY_12,
      process.env.GEMINI_API_KEY_13,
      process.env.GEMINI_API_KEY
    ].filter(Boolean);

    // تهيئة الاستخدام
    this.keys.forEach(key => {
      this.keyQuotaUsage[key] = {
        requestsToday: 0,
        quotaLimit: 50, // Free Tier
        lastResetTime: Date.now(),
        isExhausted: false,
        exhaustedUntil: null
      };
    });

    // إعادة تعيين يومية
    this.startDailyReset();
    console.log(`✅ Quota Manager initialized with ${this.keys.length} keys`);
  }

  /**
   * ابدأ إعادة تعيين يومية
   */
  startDailyReset() {
    setInterval(() => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setDate(nextMidnight.getDate() + 1);
      nextMidnight.setHours(0, 0, 0, 0);

      const timeUntilMidnight = nextMidnight - now;

      setTimeout(() => {
        this.resetAllQuotas();
      }, timeUntilMidnight);
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * أعد تعيين جميع الكوتات
   */
  resetAllQuotas() {
    this.keys.forEach(key => {
      this.keyQuotaUsage[key] = {
        requestsToday: 0,
        quotaLimit: 50,
        lastResetTime: Date.now(),
        isExhausted: false,
        exhaustedUntil: null
      };
    });
    console.log('🔄 Daily quota reset completed');
  }

  /**
   * احصل على مفتاح بكوتة متاحة
   */
  getKeyWithAvailableQuota() {
    const now = Date.now();
    const availableKeys = this.keys.filter(key => {
      const quota = this.keyQuotaUsage[key];
      
      // تحقق من الـ exhausted
      if (quota.isExhausted) {
        // إذا انتهت مدة الـ exhaustion، أعد تعيين
        if (now > quota.exhaustedUntil) {
          quota.isExhausted = false;
          quota.requestsToday = 0;
          return true;
        }
        return false;
      }

      // تحقق من الكوتة
      return quota.requestsToday < quota.quotaLimit;
    });

    if (availableKeys.length === 0) {
      console.warn('⚠️ All keys quota exhausted!');
      return null;
    }

    // اختر المفتاح بأقل استخدام
    return availableKeys.reduce((best, current) => {
      const bestUsage = this.keyQuotaUsage[best].requestsToday;
      const currentUsage = this.keyQuotaUsage[current].requestsToday;
      return currentUsage < bestUsage ? current : best;
    });
  }

  /**
   * سجل استخدام
   */
  recordUsage(key) {
    if (this.keyQuotaUsage[key]) {
      this.keyQuotaUsage[key].requestsToday++;
      console.log(`📊 Key usage: ${this.keyQuotaUsage[key].requestsToday}/${this.keyQuotaUsage[key].quotaLimit}`);
    }
  }

  /**
   * سجل تجاوز كوتة
   */
  recordQuotaExhausted(key, retryAfterSeconds = 86400) {
    if (this.keyQuotaUsage[key]) {
      this.keyQuotaUsage[key].isExhausted = true;
      this.keyQuotaUsage[key].exhaustedUntil = Date.now() + (retryAfterSeconds * 1000);
      console.log(`⏱️ Key quota exhausted until ${new Date(this.keyQuotaUsage[key].exhaustedUntil).toISOString()}`);
    }
  }

  /**
   * احصل على حالة الكوتة
   */
  getQuotaStatus() {
    const status = {};
    this.keys.forEach((key, index) => {
      const quota = this.keyQuotaUsage[key];
      status[`key_${index + 1}`] = {
        requestsToday: quota.requestsToday,
        quotaLimit: quota.quotaLimit,
        remaining: quota.quotaLimit - quota.requestsToday,
        percentageUsed: Math.round((quota.requestsToday / quota.quotaLimit) * 100),
        isExhausted: quota.isExhausted,
        exhaustedUntil: quota.isExhausted ? new Date(quota.exhaustedUntil).toISOString() : null
      };
    });
    return status;
  }

  /**
   * احصل على ملخص الكوتة
   */
  getQuotaSummary() {
    let totalRequests = 0;
    let totalQuota = 0;
    let exhaustedKeys = 0;

    this.keys.forEach(key => {
      const quota = this.keyQuotaUsage[key];
      totalRequests += quota.requestsToday;
      totalQuota += quota.quotaLimit;
      if (quota.isExhausted) exhaustedKeys++;
    });

    return {
      totalRequests,
      totalQuota,
      remaining: totalQuota - totalRequests,
      percentageUsed: Math.round((totalRequests / totalQuota) * 100),
      exhaustedKeys,
      availableKeys: this.keys.length - exhaustedKeys,
      timestamp: new Date().toISOString()
    };
  }
}

// إنشاء instance واحد
const quotaManager = new QuotaManager();

export default quotaManager;
