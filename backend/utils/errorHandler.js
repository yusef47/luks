/**
 * Error Handler - معالجة الأخطاء المركزية
 * يوحد طريقة معالجة الأخطاء في جميع الخدمات
 */

class ErrorHandler {
  /**
   * معالجة أخطاء API
   */
  static handleAPIError(error, context = {}) {
    const errorCode = error?.status || error?.code;
    const errorMessage = error?.message || 'Unknown error';

    console.error(`❌ API Error [${errorCode}]: ${errorMessage}`, context);

    // تصنيف الخطأ
    const errorType = this.classifyError(errorCode);

    return {
      code: errorCode,
      message: errorMessage,
      type: errorType,
      context,
      timestamp: new Date(),
      shouldRetry: this.shouldRetry(errorCode),
      retryDelay: this.getRetryDelay(errorCode)
    };
  }

  /**
   * تصنيف نوع الخطأ
   */
  static classifyError(code) {
    if (code === 429) return 'RATE_LIMIT';
    if (code === 503) return 'SERVICE_UNAVAILABLE';
    if (code === 401) return 'UNAUTHORIZED';
    if (code === 403) return 'FORBIDDEN';
    if (code === 404) return 'NOT_FOUND';
    if (code >= 500) return 'SERVER_ERROR';
    if (code >= 400) return 'CLIENT_ERROR';
    return 'UNKNOWN_ERROR';
  }

  /**
   * تحديد ما إذا كان يجب إعادة المحاولة
   */
  static shouldRetry(code) {
    const retryableCodes = [429, 503, 500, 502, 504];
    return retryableCodes.includes(code);
  }

  /**
   * الحصول على تأخير إعادة المحاولة (بالميلي ثانية)
   */
  static getRetryDelay(code) {
    if (code === 429) return 60000; // دقيقة واحدة
    if (code === 503) return 30000; // 30 ثانية
    if (code >= 500) return 5000;   // 5 ثواني
    return 1000;                     // ثانية واحدة
  }

  /**
   * معالجة أخطاء JSON parsing
   */
  static handleJSONError(error, context = {}) {
    console.error('❌ JSON Parse Error:', error.message, context);

    return {
      code: 'JSON_PARSE_ERROR',
      message: 'Failed to parse JSON response',
      type: 'PARSING_ERROR',
      context,
      timestamp: new Date(),
      shouldRetry: true,
      retryDelay: 1000
    };
  }

  /**
   * معالجة أخطاء قاعدة البيانات
   */
  static handleDatabaseError(error, context = {}) {
    console.error('❌ Database Error:', error.message, context);

    return {
      code: 'DATABASE_ERROR',
      message: 'Database operation failed',
      type: 'DATABASE_ERROR',
      context,
      timestamp: new Date(),
      shouldRetry: false
    };
  }

  /**
   * معالجة أخطاء التحقق من الصحة
   */
  static handleValidationError(errors, context = {}) {
    console.error('❌ Validation Error:', errors, context);

    return {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      type: 'VALIDATION_ERROR',
      errors,
      context,
      timestamp: new Date(),
      shouldRetry: false
    };
  }

  /**
   * إنشاء استجابة خطأ موحدة للـ API
   */
  static createErrorResponse(error, statusCode = 500) {
    return {
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred',
        type: error.type || 'UNKNOWN_ERROR',
        timestamp: error.timestamp || new Date()
      }
    };
  }

  /**
   * تسجيل الخطأ مع السياق الكامل
   */
  static logError(error, context = {}) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      error: {
        code: error.code,
        message: error.message,
        type: error.type
      },
      context,
      stack: error.stack
    };

    console.error('📋 Error Log:', JSON.stringify(errorLog, null, 2));
    return errorLog;
  }
}

module.exports = ErrorHandler;
