/**
 * BrowserStream Component
 * Displays live stream from the Lukas Worker (Browser Automation)
 */

import React, { useState, useEffect } from 'react';
import { Monitor, Wifi, WifiOff, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';

interface BrowserStreamProps {
    isActive: boolean;
    onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
}

export const BrowserStream: React.FC<BrowserStreamProps> = ({ isActive, onStatusChange }) => {
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
    const [workerInfo, setWorkerInfo] = useState<any>(null);

    useEffect(() => {
        if (!isActive) {
            setStatus('disconnected');
            return;
        }

        // Check worker status via bridge API
        const checkWorker = async () => {
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
                    setWorkerInfo(data);
                    onStatusChange?.('connected');
                } else {
                    setStatus('disconnected');
                    onStatusChange?.('disconnected');
                }
            } catch (error) {
                setStatus('error');
                onStatusChange?.('error');
            }
        };

        checkWorker();
        const interval = setInterval(checkWorker, 30000); // Check every 30 seconds

        return () => clearInterval(interval);
    }, [isActive, onStatusChange]);

    return (
        <div className="w-full h-full flex flex-col bg-black rounded-lg overflow-hidden">
            {/* Status Bar */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-gray-700">
                <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-400">Lukas Browser Worker</span>
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

            {/* Content */}
            <div className="flex-1 flex items-center justify-center bg-gray-950 relative">
                {status === 'connected' ? (
                    <div className="flex flex-col items-center gap-4 text-center p-6">
                        <CheckCircle2 className="w-16 h-16 text-green-500" />
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2">العضلات جاهزة! 🦾</h3>
                            <p className="text-sm text-gray-400 mb-4">
                                الـ Browser Worker متصل وجاهز لتنفيذ مهام التصفح
                            </p>
                        </div>
                        <a
                            href="https://yusef75-lukas-worker.hf.space"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            فتح Worker Dashboard
                        </a>
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
                        <span className="text-xs text-gray-700">
                            تأكد من أن Worker على Hugging Face شغال
                        </span>
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
        </div>
    );
};

export default BrowserStream;

