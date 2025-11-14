/**
 * KeysDashboard Component
 * لوحة تحكم لعرض حالة المفاتيح
 */

import React, { useState, useEffect } from 'react';
import apiClient from '../api';

interface KeyStatus {
  status: string;
  usageCount: number;
  errorCount: number;
  lastUsed: string | null;
  timeoutUntil: string | null;
  healthScore: number;
}

export function KeysDashboard() {
  const [keysStatus, setKeysStatus] = useState<Record<string, KeyStatus> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchKeysStatus = async () => {
      try {
        setLoading(true);
        const status = await apiClient.getKeysStatus();
        setKeysStatus(status);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch keys status');
        console.error('❌ Error fetching keys status:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchKeysStatus();
    const interval = setInterval(fetchKeysStatus, 5000); // تحديث كل 5 ثواني

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="text-center p-4">جاري التحميل...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">❌ {error}</div>;
  }

  if (!keysStatus) {
    return <div className="text-center p-4">لا توجد بيانات</div>;
  }

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg">
      <h2 className="text-2xl font-bold mb-6">🔑 لوحة تحكم المفاتيح</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(keysStatus).map(([agent, keyData]: [string, any]) => (
          <div
            key={agent}
            className="bg-gray-800 p-4 rounded-lg border-l-4"
            style={{
              borderColor: keyData.healthScore > 70 ? '#10b981' : keyData.healthScore > 40 ? '#f59e0b' : '#ef4444'
            }}
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-lg">{agent}</h3>
              <span className="text-sm">{keyData.status}</span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>الاستخدام:</span>
                <span className="font-mono">{keyData.usageCount}</span>
              </div>
              
              <div className="flex justify-between">
                <span>الأخطاء:</span>
                <span className={keyData.errorCount > 0 ? 'text-red-400' : 'text-green-400'}>
                  {keyData.errorCount}
                </span>
              </div>

              <div className="flex justify-between">
                <span>الصحة:</span>
                <div className="w-24 bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${keyData.healthScore}%`,
                      backgroundColor: keyData.healthScore > 70 ? '#10b981' : keyData.healthScore > 40 ? '#f59e0b' : '#ef4444'
                    }}
                  />
                </div>
              </div>

              {keyData.lastUsed && (
                <div className="flex justify-between text-xs text-gray-400">
                  <span>آخر استخدام:</span>
                  <span>{new Date(keyData.lastUsed).toLocaleTimeString('ar-EG')}</span>
                </div>
              )}

              {keyData.timeoutUntil && (
                <div className="flex justify-between text-xs text-yellow-400">
                  <span>Timeout حتى:</span>
                  <span>{new Date(keyData.timeoutUntil).toLocaleTimeString('ar-EG')}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default KeysDashboard;
