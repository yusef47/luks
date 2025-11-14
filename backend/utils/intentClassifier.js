/**
 * Intent Classifier - تصنيف النوايا محلياً
 * يقلل استخدام API ويسرع الاستجابة
 */

class IntentClassifier {
  constructor() {
    this.keywords = {
      SearchAgent: [
        'search', 'find', 'look', 'what', 'who', 'where', 'when', 'how', 'tell', 'explain',
        'information', 'news', 'facts', 'research', 'google', 'web',
        'ابحث', 'ابحث عن', 'أخبار', 'معلومات', 'بحث', 'اعرف'
      ],
      MapsAgent: [
        'map', 'location', 'place', 'direction', 'near', 'distance', 'cafe', 'restaurant',
        'hotel', 'address', 'navigate', 'route', 'where is',
        'خريطة', 'مكان', 'قريب', 'اتجاه', 'عنوان', 'موقع'
      ],
      ImageGenerationAgent: [
        'create', 'generate', 'draw', 'image', 'picture', 'photo', 'design', 'make',
        'paint', 'art', 'illustration',
        'أنشئ', 'صورة', 'رسم', 'رسمة', 'تصميم', 'صور'
      ],
      VisionAgent: [
        'analyze', 'describe', 'image', 'picture', 'photo', 'see', 'look', 'view',
        'what is in', 'identify', 'recognize',
        'حلل', 'صورة', 'وصف', 'شوف', 'اعرف', 'تحليل'
      ],
      SheetsAgent: [
        'organize', 'table', 'data', 'format', 'sheet', 'excel', 'spreadsheet',
        'list', 'arrange', 'sort',
        'نظم', 'جدول', 'بيانات', 'تنسيق', 'قائمة'
      ],
      EmailAgent: [
        'send', 'email', 'mail', 'message', 'write', 'compose', 'contact',
        'أرسل', 'بريد', 'رسالة', 'اكتب'
      ],
      CodeAgent: [
        'code', 'program', 'write', 'function', 'script', 'javascript', 'python',
        'debug', 'fix', 'develop',
        'كود', 'برنامج', 'اكتب', 'برمجة', 'حل'
      ]
    };
  }

  /**
   * تصنيف النية من الرسالة
   */
  classify(message) {
    const lowerMessage = message.toLowerCase();
    const scores = {};

    // احسب النقاط لكل وكيل
    for (const [agent, agentKeywords] of Object.entries(this.keywords)) {
      const matches = agentKeywords.filter(kw => lowerMessage.includes(kw));
      scores[agent] = matches.length;
    }

    // ابحث عن الوكيل الأفضل
    let bestAgent = 'SearchAgent';
    let bestScore = 0;

    for (const [agent, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestAgent = agent;
      }
    }

    // احسب الثقة
    const confidence = bestScore > 0 ? Math.min(0.95, 0.5 + bestScore * 0.15) : 0.5;

    return {
      intent: message.substring(0, 100),
      agent: bestAgent,
      confidence,
      keywords: this.keywords[bestAgent].filter(kw => lowerMessage.includes(kw)),
      scores,
      timestamp: new Date()
    };
  }

  /**
   * تصنيف متقدم مع معالجة الحالات الخاصة
   */
  classifyAdvanced(message) {
    const basicClassification = this.classify(message);

    // معالجة حالات خاصة
    if (message.includes('error') || message.includes('خطأ')) {
      basicClassification.agent = 'CodeAgent';
      basicClassification.confidence = 0.8;
    }

    if (message.includes('list') || message.includes('قائمة')) {
      basicClassification.agent = 'SheetsAgent';
      basicClassification.confidence = 0.8;
    }

    return basicClassification;
  }

  /**
   * الحصول على جميع الوكلاء المحتملين (مرتبة حسب الاحتمالية)
   */
  getTopAgents(message, limit = 3) {
    const classification = this.classify(message);
    const scores = classification.scores;

    // رتب الوكلاء حسب النقاط
    const sorted = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([agent, score]) => ({
        agent,
        score,
        confidence: Math.min(0.95, 0.5 + score * 0.15)
      }));

    return sorted;
  }

  /**
   * إضافة كلمات مفتاحية مخصصة
   */
  addKeywords(agent, keywords) {
    if (!this.keywords[agent]) {
      this.keywords[agent] = [];
    }
    this.keywords[agent].push(...keywords);
    console.log(`✅ Added keywords for ${agent}`);
  }

  /**
   * الحصول على إحصائيات الكلمات المفتاحية
   */
  getStats() {
    const stats = {};
    for (const [agent, keywords] of Object.entries(this.keywords)) {
      stats[agent] = keywords.length;
    }
    return stats;
  }
}

module.exports = new IntentClassifier();
