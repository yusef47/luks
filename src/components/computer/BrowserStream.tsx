/**
 * BrowserStream Component
 * Displays live stream from the Lukas Worker (Browser Automation)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Monitor, Wifi, WifiOff, Loader2, CheckCircle2, ExternalLink, Play, RefreshCw, Globe } from 'lucide-react';

interface BrowserStreamProps {
    isActive: boolean;
    onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
}

export const BrowserStream: React.FC<BrowserStreamProps> = ({ isActive, onStatusChange }) => {
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [lastAction, setLastAction] = useState<string>('');
    const [testUrl, setTestUrl] = useState('https://www.google.com');

    // Check worker status
    const checkWorker = useCallback(async () => {
        setStatus('connecting');
        onStatusChange?.('connecting');

        try {
            const res = await fetch('/api/browser-bridge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'status' })
            });

            const data = await res.json();

            if (data.success && data.connected) {
                setStatus('connected');
                onStatusChange?.('connected');
            } else {
                setStatus('disconnected');
                onStatusChange?.('disconnected');
            }
        } catch (error) {
            setStatus('error');
            onStatusChange?.('error');
        }
    }, [onStatusChange]);

    useEffect(() => {
        if (!isActive) {
            setStatus('disconnected');
            return;
        }
        checkWorker();
    }, [isActive, checkWorker]);

    // Navigate to URL and take screenshot
    const navigateAndCapture = async (url: string) => {
        setIsLoading(true);
        setLastAction(`جاري الذهاب إلى ${url}...`);

        try {
            const gotoRes = await fetch('/api/browser-bridge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'goto', params: { url } })
            });
            const gotoData = await gotoRes.json();

            if (gotoData.success) {
                setLastAction(`تم فتح: ${gotoData.title || url}`);

                const ssRes = await fetch('/api/browser-bridge', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'screenshot', params: {} })
                });
                const ssData = await ssRes.json();

                if (ssData.success && ssData.image) {
                    setScreenshot(ssData.image);
                }
            } else {
                setLastAction(`خطأ: ${gotoData.error}`);
            }
        } catch (error: any) {
            setLastAction(`خطأ: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Refresh screenshot
    const refreshScreenshot = async () => {
        setIsLoading(true);
        try {
            const ssRes = await fetch('/api/browser-bridge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'screenshot', params: {} })
            });
            const ssData = await ssRes.json();

            if (ssData.success && ssData.image) {
                setScreenshot(ssData.image);
                setLastAction('تم تحديث الصورة');
            }
        } catch (error: any) {
            setLastAction(`خطأ: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-black rounded-lg overflow-hidden">
            {/* Status Bar */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-gray-700">
                <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-400">Lukas Browser</span>
                </div>
                <div className="flex items-center gap-2">
                    {status === 'connected' ? (
                        <>
                            <Wifi className="w-4 h-4 text-green-500" />
                            <span className="text-xs text-green-500">متصل</span>
                        </>
                    ) : status === 'connecting' ? (
                        <>
                            <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
                            <span className="text-xs text-yellow-500">جاري الفحص...</span>
                        </>
                    ) : (
                        <>
                            <WifiOff className="w-4 h-4 text-gray-500" />
                            <span className="text-xs text-gray-500">غير متصل</span>
                        </>
                    )}
                </div>
            </div>

            {/* URL Input Bar */}
            {status === 'connected' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border-b border-gray-700">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={testUrl}
                        onChange={(e) => setTestUrl(e.target.value)}
                        placeholder="أدخل رابط..."
                        className="flex-1 bg-gray-700 text-white text-sm px-2 py-1 rounded border border-gray-600 focus:border-blue-500 outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && navigateAndCapture(testUrl)}
                    />
                    <button
                        onClick={() => navigateAndCapture(testUrl)}
                        disabled={isLoading}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        اذهب
                    </button>
                    {screenshot && (
                        <button
                            onClick={refreshScreenshot}
                            disabled={isLoading}
                            className="p-1 text-gray-400 hover:text-white transition-colors"
                            title="تحديث"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    )}
                </div>
            )}

            {/* Content */}
            <div className="flex-1 flex items-center justify-center bg-gray-950 relative overflow-auto">
                {screenshot ? (
                    <img
                        src={`data:image/png;base64,${screenshot}`}
                        alt="Browser Screenshot"
                        className="max-w-full max-h-full object-contain"
                    />
                ) : status === 'connected' ? (
                    <div className="flex flex-col items-center gap-4 text-center p-6">
                        <CheckCircle2 className="w-16 h-16 text-green-500" />
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2">العضلات جاهزة! 🦾</h3>
                            <p className="text-sm text-gray-400 mb-4">
                                أدخل رابط في الأعلى واضغط &quot;اذهب&quot; لترى المتصفح يعمل
                            </p>
                        </div>
                    </div>
                ) : status === 'connecting' ? (
                    <div className="flex flex-col items-center gap-3 text-gray-500">
                        <Loader2 className="w-10 h-10 animate-spin" />
                        <span>جاري فحص الاتصال...</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3 text-gray-600 p-6 text-center">
                        <Monitor className="w-12 h-12" />
                        <span>الـ Worker غير متصل</span>
                        <a
                            href="https://yusef75-lukas-worker.hf.space"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition-colors mt-2"
                        >
                            <ExternalLink className="w-3 h-3" />
                            فحص الـ Worker
                        </a>
                    </div>
                )}
            </div>

            {/* Status Footer */}
            {lastAction && (
                <div className="px-3 py-1.5 bg-gray-900 border-t border-gray-700">
                    <span className="text-xs text-gray-400">{lastAction}</span>
                </div>
            )}
        </div>
    );
};

export default BrowserStream;
