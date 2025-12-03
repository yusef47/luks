/**
 * Frontend API Client
 * جميع استدعاءات API من الواجهة الأمامية
 */

// Use /api for Vercel Functions, fallback to localhost for development
const API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:5000/api' 
  : '/api';

export const apiClient = {
  /**
   * تصنيف النية
   */
  async classifyIntent(message: string) {
    const response = await fetch(`${API_URL}/classify-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    return response.json();
  },

  /**
   * تقييم النتيجة
   */
  async evaluateResult(userRequest: string, agentResponse: string, agent: string) {
    const response = await fetch(`${API_URL}/evaluate-result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userRequest, agentResponse, agent })
    });
    return response.json();
  },

  /**
   * الحصول على حالة المفاتيح
   */
  async getKeysStatus() {
    const response = await fetch(`${API_URL}/keys-status`);
    return response.json();
  },

  /**
   * الحصول على صحة الخادم
   */
  async getHealth() {
    const response = await fetch(`${API_URL}/health`);
    return response.json();
  }
};

export default apiClient;
