/**
 * BrowserStream Component
 * Displays live stream from the Lukas Worker (Browser Automation)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Monitor, Wifi, WifiOff, Loader2 } from 'lucide-react';

interface BrowserStreamProps {
    isActive: boolean;
    onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
}

export const BrowserStream: React.FC<BrowserStreamProps> = ({ isActive, onStatusChange }) => {
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
    const [currentFrame, setCurrentFrame] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        if (!isActive) {
            // Cleanup when not active
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            setStatus('disconnected');
            setCurrentFrame(null);
            return;
        }

        // Start SSE connection to stream endpoint
        setStatus('connecting');
        onStatusChange?.('connecting');

        const eventSource = new EventSource('/api/browser-stream');
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                switch (data.type) {
                    case 'connected':
                        setStatus('connected');
                        onStatusChange?.('connected');
                        break;

                    case 'frame':
                        setCurrentFrame(data.image);
                        break;

                    case 'error':
                        setStatus('error');
                        setErrorMessage(data.message);
                        onStatusChange?.('error');
                        break;

                    case 'disconnected':
                        setStatus('disconnected');
                        onStatusChange?.('disconnected');
                        break;
                }
            } catch (e) {
                console.error('[BrowserStream] Parse error:', e);
            }
        };

        eventSource.onerror = () => {
            setStatus('error');
            setErrorMessage('فقدان الاتصال بالسيرفر');
            onStatusChange?.('error');
        };

        return () => {
            eventSource.close();
            eventSourceRef.current = null;
        };
    }, [isActive, onStatusChange]);

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
                            <span className="text-xs text-yellow-500">جاري الاتصال...</span>
                        </>
                    ) : (
                        <>
                            <WifiOff className="w-4 h-4 text-gray-500" />
                            <span className="text-xs text-gray-500">غير متصل</span>
                        </>
                    )}
                </div>
            </div>

            {/* Stream Display */}
            <div className="flex-1 flex items-center justify-center bg-gray-950 relative">
                {currentFrame ? (
                    <img
                        src={`data:image/jpeg;base64,${currentFrame}`}
                        alt="Live Browser Stream"
                        className="max-w-full max-h-full object-contain"
                    />
                ) : status === 'connecting' ? (
                    <div className="flex flex-col items-center gap-3 text-gray-500">
                        <Loader2 className="w-10 h-10 animate-spin" />
                        <span>جاري الاتصال بالمتصفح...</span>
                    </div>
                ) : status === 'error' ? (
                    <div className="flex flex-col items-center gap-3 text-red-400">
                        <WifiOff className="w-10 h-10" />
                        <span>{errorMessage || 'خطأ في الاتصال'}</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3 text-gray-600">
                        <Monitor className="w-12 h-12" />
                        <span>المتصفح غير نشط</span>
                        <span className="text-xs text-gray-700">سيظهر هنا البث المباشر عندما يبدأ لوكاس بتصفح الإنترنت</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BrowserStream;
