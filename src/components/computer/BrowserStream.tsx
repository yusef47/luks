/**
 * BrowserStream Component
 * Displays live stream from the Lukas Worker (Browser Automation)
 * With interactive controls: click, scroll, type, navigation
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Monitor, Wifi, WifiOff, Loader2, CheckCircle2, ExternalLink,
    Play, RefreshCw, Globe, ArrowLeft, ArrowRight, RotateCcw,
    ArrowUp, ArrowDown, MousePointer, Type, X, Home
} from 'lucide-react';

interface BrowserStreamProps {
    isActive: boolean;
    onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
    aiScreenshot?: string | null;
}

export const BrowserStream: React.FC<BrowserStreamProps> = ({ isActive, onStatusChange, aiScreenshot = null }) => {
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [lastAction, setLastAction] = useState<string>('');
    const [testUrl, setTestUrl] = useState('https://www.google.com');
    const [clickMode, setClickMode] = useState(false);
    const [typeText, setTypeText] = useState('');
    const [showTypeInput, setShowTypeInput] = useState(false);
    const imageRef = useRef<HTMLImageElement>(null);

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

    // Use AI screenshot when it arrives
    useEffect(() => {
        if (aiScreenshot) {
            console.log('[BrowserStream] 📸 Received AI screenshot, displaying...');
            setScreenshot(aiScreenshot);
            setStatus('connected');
            onStatusChange?.('connected');
            setLastAction('🤖 لوكاس قام بالبحث - هذه النتيجة');
        }
    }, [aiScreenshot, onStatusChange]);

    // Execute browser action
    const executeAction = async (action: string, params: any = {}) => {
        setIsLoading(true);
        setLastAction(`جاري تنفيذ: ${action}...`);

        try {
            const res = await fetch('/api/browser-bridge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, params })
            });
            const data = await res.json();

            if (data.success) {
                setLastAction(`تم: ${action}`);
                // Refresh screenshot after action
                await refreshScreenshot();
            } else {
                setLastAction(`خطأ: ${data.error}`);
            }
            return data;
        } catch (error: any) {
            setLastAction(`خطأ: ${error.message}`);
            return { success: false, error: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    // Navigate to URL or search
    const navigateToUrl = async (input: string) => {
        let finalUrl = input.trim();

        // Check if it's a valid URL pattern
        const urlPattern = /^(https?:\/\/|www\.)/i;
        const domainPattern = /^[\w-]+\.(com|net|org|io|app|dev|co|gov|edu|info|biz|me)/i;

        if (urlPattern.test(finalUrl)) {
            // Already a URL with protocol
            if (finalUrl.startsWith('www.')) {
                finalUrl = 'https://' + finalUrl;
            }
        } else if (domainPattern.test(finalUrl)) {
            // Looks like a domain
            finalUrl = 'https://' + finalUrl;
        } else {
            // It's a search query - convert to Google search
            finalUrl = `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}&hl=ar`;
            setLastAction(`🔍 جاري البحث عن: ${input}`);
        }
        await executeAction('goto', { url: finalUrl });
    };

    // Refresh screenshot
    const refreshScreenshot = async () => {
        try {
            const res = await fetch('/api/browser-bridge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'screenshot', params: {} })
            });
            const data = await res.json();

            if (data.success && data.image) {
                setScreenshot(data.image);
            }
        } catch (error) {
            console.error('Screenshot error:', error);
        }
    };

    // Handle click on image
    const handleImageClick = async (e: React.MouseEvent<HTMLImageElement>) => {
        if (!clickMode || !imageRef.current) return;

        const rect = imageRef.current.getBoundingClientRect();
        const x = Math.round((e.clientX - rect.left) / rect.width * 1920);
        const y = Math.round((e.clientY - rect.top) / rect.height * 1080);

        setClickMode(false);
        await executeAction('click', { x, y });
    };

    // Scroll
    const scroll = async (direction: 'up' | 'down') => {
        const delta = direction === 'down' ? 500 : -500;
        await executeAction('scroll', { deltaY: delta });
    };

    // Type text
    const typeTextAction = async () => {
        if (!typeText.trim()) return;
        await executeAction('type', { text: typeText });
        setTypeText('');
        setShowTypeInput(false);
    };

    // Navigation
    const goBack = () => executeAction('execute', { method: 'goBack', args: [] });
    const goForward = () => executeAction('execute', { method: 'goForward', args: [] });
    const goHome = () => navigateToUrl('https://www.google.com');

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

            {/* URL Bar + Controls */}
            {status === 'connected' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border-b border-gray-700">
                    {/* Navigation Buttons */}
                    <button onClick={goBack} disabled={isLoading} className="p-1.5 hover:bg-gray-700 rounded transition-colors" title="رجوع">
                        <ArrowLeft className="w-4 h-4 text-gray-400" />
                    </button>
                    <button onClick={goForward} disabled={isLoading} className="p-1.5 hover:bg-gray-700 rounded transition-colors" title="تقدم">
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                    </button>
                    <button onClick={() => refreshScreenshot()} disabled={isLoading} className="p-1.5 hover:bg-gray-700 rounded transition-colors" title="تحديث">
                        <RotateCcw className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={goHome} disabled={isLoading} className="p-1.5 hover:bg-gray-700 rounded transition-colors" title="الرئيسية">
                        <Home className="w-4 h-4 text-gray-400" />
                    </button>

                    {/* URL Input */}
                    <div className="flex-1 flex items-center gap-1 bg-gray-700 rounded px-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={testUrl}
                            onChange={(e) => setTestUrl(e.target.value)}
                            placeholder="أدخل رابط..."
                            className="flex-1 bg-transparent text-white text-sm py-1 outline-none"
                            onKeyDown={(e) => e.key === 'Enter' && navigateToUrl(testUrl)}
                        />
                    </div>
                    <button
                        onClick={() => navigateToUrl(testUrl)}
                        disabled={isLoading}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        اذهب
                    </button>
                </div>
            )}

            {/* Interactive Controls Bar */}
            {status === 'connected' && screenshot && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-850 border-b border-gray-700 bg-opacity-50" style={{ backgroundColor: 'rgb(30, 30, 35)' }}>
                    <span className="text-xs text-gray-500 ml-2">أدوات:</span>

                    {/* Click Mode */}
                    <button
                        onClick={() => setClickMode(!clickMode)}
                        className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${clickMode ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                        title="اضغط ثم انقر على الشاشة"
                    >
                        <MousePointer className="w-3 h-3" />
                        نقر
                    </button>

                    {/* Scroll Buttons */}
                    <button
                        onClick={() => scroll('up')}
                        disabled={isLoading}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 rounded transition-colors"
                        title="تمرير للأعلى"
                    >
                        <ArrowUp className="w-3 h-3" />
                        ↑
                    </button>
                    <button
                        onClick={() => scroll('down')}
                        disabled={isLoading}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 rounded transition-colors"
                        title="تمرير للأسفل"
                    >
                        <ArrowDown className="w-3 h-3" />
                        ↓
                    </button>

                    {/* Type Text */}
                    {!showTypeInput ? (
                        <button
                            onClick={() => setShowTypeInput(true)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 rounded transition-colors"
                            title="كتابة نص"
                        >
                            <Type className="w-3 h-3" />
                            كتابة
                        </button>
                    ) : (
                        <div className="flex items-center gap-1">
                            <input
                                type="text"
                                value={typeText}
                                onChange={(e) => setTypeText(e.target.value)}
                                placeholder="اكتب هنا..."
                                className="w-32 bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600 focus:border-blue-500 outline-none"
                                onKeyDown={(e) => e.key === 'Enter' && typeTextAction()}
                                autoFocus
                            />
                            <button onClick={typeTextAction} className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded">
                                <Play className="w-3 h-3" />
                            </button>
                            <button onClick={() => setShowTypeInput(false)} className="p-1 hover:bg-gray-600 text-gray-400 rounded">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    )}

                    {clickMode && (
                        <span className="text-xs text-blue-400 mr-auto">👆 انقر على الشاشة</span>
                    )}
                </div>
            )}

            {/* Content */}
            <div className="flex-1 flex items-center justify-center bg-gray-950 relative overflow-auto">
                {screenshot ? (
                    <img
                        ref={imageRef}
                        src={`data:image/png;base64,${screenshot}`}
                        alt="Browser Screenshot"
                        className={`max-w-full max-h-full object-contain ${clickMode ? 'cursor-crosshair' : ''}`}
                        onClick={handleImageClick}
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
