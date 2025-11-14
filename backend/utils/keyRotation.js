/**
 * Key Rotation System - الحل النهائي
 * نظام تدوير المفاتيح الذكي
 */

import dotenv from 'dotenv';

// تحميل متغيرات البيئة
dotenv.config();

class KeyRotationManager {
  constructor() {
    // جميع المفاتيح المتاحة - اقرأ جميع المفاتيح من 1-13
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
        inCooldown: false,
        cooldownUntil: 0,
        healthScore: 100
      };
    });

    this.currentKeyIndex = 0;
    console.log(`✅ Key Rotation Manager initialized with ${this.keys.length} keys`);
  }

  /**
   * احصل على أفضل مفتاح متاح
   */
  getBestKey() {
    const now = Date.now();
    const availableKeys = this.keys.filter(key => {
      const stats = this.keyStats[key];
      // تحقق من الـ cooldown
      if (stats.inCooldown && now < stats.cooldownUntil) {
        return false;
      }
      // أعد تعيين الـ cooldown إذا انتهى
      if (stats.inCooldown && now >= stats.cooldownUntil) {
        stats.inCooldown = false;
        stats.failures = 0;
      }
      return true;
    });

    if (availableKeys.length === 0) {
      console.warn('⚠️ All keys are in cooldown! Using first key anyway...');
      return this.keys[0];
    }

    // اختر المفتاح بأفضل health score
    const bestKey = availableKeys.reduce((best, current) => {
      const bestScore = this.keyStats[best].healthScore;
      const currentScore = this.keyStats[current].healthScore;
      return currentScore > bestScore ? current : best;
    });

    return bestKey;
  }

  /**
   * سجل نجاح
   */
  recordSuccess(key) {
    if (this.keyStats[key]) {
      this.keyStats[key].successes++;
      this.keyStats[key].lastUsed = new Date().toISOString();
      this.keyStats[key].failures = Math.max(0, this.keyStats[key].failures - 1);
      this.updateHealthScore(key);
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

      // إذا كان خطأ 503 أو 429، ضع المفتاح في cooldown
      if (errorCode === 503 || errorCode === 429) {
        const cooldownDuration = Math.pow(2, this.keyStats[key].failures) * 5000; // 5s, 10s, 20s, etc
        this.keyStats[key].inCooldown = true;
        this.keyStats[key].cooldownUntil = Date.now() + cooldownDuration;
        console.log(`⏱️ Key ${this.keyStats[key].index + 1} in cooldown for ${cooldownDuration}ms`);
      }

      this.updateHealthScore(key);
      console.log(`❌ Failure with key ${this.keyStats[key].index + 1} (failures: ${this.keyStats[key].failures})`);
    }
  }

  /**
   * حدّث درجة الصحة
   */
  updateHealthScore(key) {
    if (this.keyStats[key]) {
      const stats = this.keyStats[key];
      let score = 100;

      // انقص النقاط حسب الأخطاء
      score -= stats.failures * 15;

      // أضف نقاط للنجاحات
      score += Math.min(stats.successes * 2, 20);

      // إذا كان في cooldown، انقص النقاط
      if (stats.inCooldown) {
        score -= 50;
      }

      stats.healthScore = Math.max(0, Math.min(100, score));
    }
  }

  /**
   * احصل على حالة جميع المفاتيح
   */
  getStatus() {
    const status = {};
    this.keys.forEach((key, index) => {
      const stats = this.keyStats[key];
      status[`key_${index + 1}`] = {
        status: stats.inCooldown ? '⏱️ Cooldown' : stats.healthScore > 70 ? '✅ Healthy' : stats.healthScore > 40 ? '⚠️ Degraded' : '❌ Poor',
        healthScore: stats.healthScore,
        successes: stats.successes,
        failures: stats.failures,
        lastUsed: stats.lastUsed,
        cooldownUntil: stats.inCooldown ? new Date(stats.cooldownUntil).toISOString() : null
      };
    });
    return status;
  }

  /**
   * احصل على إحصائيات مفصلة
   */
  getDetailedStats() {
    return {
      totalKeys: this.keys.length,
      keys: this.getStatus(),
      bestKey: this.getBestKey(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * أعد تعيين جميع المفاتيح
   */
  resetAll() {
    this.keys.forEach(key => {
      this.keyStats[key] = {
        ...this.keyStats[key],
        failures: 0,
        successes: 0,
        inCooldown: false,
        cooldownUntil: 0,
        healthScore: 100
      };
    });
    console.log('🔄 All keys reset');
  }
}

// إنشاء instance واحد
const keyRotationManager = new KeyRotationManager();

export default keyRotationManager;
