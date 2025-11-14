/**
 * Logger - نظام التسجيل المركزي
 * يسجل الأخطاء والطلبات والتحليلات
 */

const pino = require('pino');
const fs = require('fs');
const path = require('path');

// إنشاء مجلد السجلات
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// إنشاء logger
const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
      }
    }
  },
  pino.destination(path.join(logsDir, 'app.log'))
);

// تسجيل الطلبات
const logRequest = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  });
  
  next();
};

// تسجيل الأخطاء
const logError = (error, context = {}) => {
  logger.error({
    error: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

// تسجيل التحليلات
const logAnalytics = (event, data = {}) => {
  logger.info({
    event,
    data,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  logger,
  logRequest,
  logError,
  logAnalytics
};
