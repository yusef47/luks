/**
 * Smart Key Rotation - نظام ذكي لتدوير المفاتيح
 * يختار مفاتيح عشوائية ويستمر في المحاولة بدون إظهار الأخطاء
 */

import dotenv from 'dotenv';

dotenv.config();

class SmartKeyRotation {
  constructor() {
    // جميع المفاتيح المتاحة
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

    // تتبع حالة كل مفتاح
    this.keyStats = {};
    this.keys.forEach((key, index) => {
      this.keyStats[key] = {
        index,
        failures: 0,
        successes: 0,
        lastUsed: null,
        lastError: null,
        consecutiveFailures: 0,
        isBlacklisted: false,
        blacklistUntil: 0
      };
    });

    this.currentKeyIndex = Math.floor(Math.random() * this.keys.length);
    console.log(`✅ Smart Key Rotation initialized with ${this.keys.length} keys`);
  }

  /**
   * احصل على مفتاح عشوائي متاح
   */
  getRandomAvailableKey() {
    const now = Date.now();
    const availableKeys = this.keys.filter(key => {
      const stats = this.keyStats[key];
      
      // تحقق من الـ blacklist
      if (stats.isBlacklisted && now < stats.blacklistUntil) {
        return false;
      }
      
      // أزل من الـ blacklist إذا انتهت المدة
      if (stats.isBlacklisted && now >= stats.blacklistUntil) {
        stats.isBlacklisted = false;
        stats.consecutiveFailures = 0;
      }
      
      return true;
    });

    if (availableKeys.length === 0) {
      console.warn('⚠️ All keys are blacklisted! Resetting...');
      this.resetAllBlacklists();
      return this.keys[Math.floor(Math.random() * this.keys.length)];
    }

    // اختر مفتاح عشوائي من المتاحة
    const randomKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];
    return randomKey;
  }

  /**
   * احصل على المفتاح التالي (مع عشوائية)
   */
  getNextKey() {
    // 70% احتمالية اختيار مفتاح عشوائي، 30% احتمالية اختيار التالي
    if (Math.random() < 0.7) {
      return this.getRandomAvailableKey();
    }

    // اختر المفتاح التالي
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
    const nextKey = this.keys[this.currentKeyIndex];
    
    // إذا كان مسود، اختر عشوائي
    if (this.keyStats[nextKey].isBlacklisted) {
      return this.getRandomAvailableKey();
    }

    return nextKey;
  }

  /**
   * سجل نجاح
   */
  recordSuccess(key) {
    if (this.keyStats[key]) {
      this.keyStats[key].successes++;
      this.keyStats[key].lastUsed = new Date().toISOString();
      this.keyStats[key].failures = Math.max(0, this.keyStats[key].failures - 1);
      this.keyStats[key].consecutiveFailures = 0;
      console.log(`✅ Success with key ${this.keyStats[key].index + 1}`);
    }
  }

  /**
   * سجل فشل
   */
  recordFailure(key, errorCode = null) {
    if (this.keyStats[key]) {
      this.keyStats[key].failures++;
      this.keyStats[key].lastUsed = new Date().toISOString();
      this.keyStats[key].lastError = errorCode;
      this.keyStats[key].consecutiveFailures++;

      console.log(`❌ Failure with key ${this.keyStats[key].index + 1} (consecutive: ${this.keyStats[key].consecutiveFailures})`);

      // إذا كان 3 أخطاء متتالية، اسود المفتاح مؤقتاً
      if (this.keyStats[key].consecutiveFailures >= 3) {
        const blacklistDuration = Math.pow(2, Math.min(this.keyStats[key].consecutiveFailures - 3, 5)) * 10000; // 10s, 20s, 40s, ...
        this.keyStats[key].isBlacklisted = true;
        this.keyStats[key].blacklistUntil = Date.now() + blacklistDuration;
        console.log(`⏱️ Key ${this.keyStats[key].index + 1} blacklisted for ${blacklistDuration}ms`);
      }
    }
  }

  /**
   * أعد تعيين جميع الـ blacklists
   */
  resetAllBlacklists() {
    this.keys.forEach(key => {
      this.keyStats[key].isBlacklisted = false;
      this.keyStats[key].blacklistUntil = 0;
      this.keyStats[key].consecutiveFailures = 0;
    });
    console.log('🔄 All blacklists reset');
  }

  /**
   * احصل على حالة جميع المفاتيح
   */
  getStatus() {
    const status = {};
    this.keys.forEach((key, index) => {
      const stats = this.keyStats[key];
      status[`key_${index + 1}`] = {
        status: stats.isBlacklisted ? '⏱️ Blacklisted' : stats.consecutiveFailures > 0 ? '⚠️ Degraded' : '✅ Healthy',
        successes: stats.successes,
        failures: stats.failures,
        consecutiveFailures: stats.consecutiveFailures,
        lastUsed: stats.lastUsed,
        blacklistedUntil: stats.isBlacklisted ? new Date(stats.blacklistUntil).toISOString() : null
      };
    });
    return status;
  }

  /**
   * احصل على ملخص الحالة
   */
  getSummary() {
    let healthyKeys = 0;
    let degradedKeys = 0;
    let blacklistedKeys = 0;

    this.keys.forEach(key => {
      const stats = this.keyStats[key];
      if (stats.isBlacklisted) {
        blacklistedKeys++;
      } else if (stats.consecutiveFailures > 0) {
        degradedKeys++;
      } else {
        healthyKeys++;
      }
    });

    return {
      totalKeys: this.keys.length,
      healthyKeys,
      degradedKeys,
      blacklistedKeys,
      timestamp: new Date().toISOString()
    };
  }
}

// إنشاء instance واحد
const smartKeyRotation = new SmartKeyRotation();

export default smartKeyRotation;
