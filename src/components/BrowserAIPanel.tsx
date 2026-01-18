/**
 * BrowserAIPanel Component
 * Panel for controlling Browser AI from Lukas frontend
 * Uses custom events to communicate with extension (no ID needed!)
 */

import React, { useState, useEffect, useCallback } from 'react';

interface StepUpdate {
    type: string;
    step?: number;
    maxSteps?: number;
    action?: string;
    result?: string;
    screenshot?: string;
    error?: string;
}

interface BrowserAIPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const BrowserAIPanel: React.FC<BrowserAIPanelProps> = ({ isOpen, onClose }) => {
    const [task, setTask] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [extensionConnected, setExtensionConnected] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [maxSteps, setMaxSteps] = useState(10);
    const [status, setStatus] = useState('جاهز');
    const [steps, setSteps] = useState<StepUpdate[]>([]);
    const [result, setResult] = useState<string | null>(null);
    const [latestScreenshot, setLatestScreenshot] = useState<string | null>(null);

    // Handle extension responses
    const handleExtensionResponse = useCallback((event: Event) => {
        const customEvent = event as CustomEvent;
        const data = customEvent.detail;
        console.log('[Lukas Panel] Received:', data);

        if (data.type === 'ready' || data.type === 'pong') {
            setExtensionConnected(true);
            setStatus('جاهز');
        }

        if (data.type === 'step') {
            setCurrentStep(data.step || 0);
            setSteps(prev => [...prev, data]);
            setStatus(data.action || 'جاري التنفيذ...');
            if (data.screenshot) {
                setLatestScreenshot(data.screenshot);
            }
        }

        if (data.type === 'complete') {
            setIsRunning(false);
            setStatus('✅ اكتمل');
            setResult(data.result);
            if (data.screenshot) {
                setLatestScreenshot(data.screenshot);
            }
        }

        if (data.type === 'error') {
            setIsRunning(false);
            setStatus(`❌ ${data.error}`);
        }
    }, []);

    // Setup event listener
    useEffect(() => {
        if (isOpen) {
            window.addEventListener('lukas-browser-ai-response', handleExtensionResponse);

            // Ping extension to check if installed
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('lukas-browser-ai-message', {
                    detail: { action: 'ping' }
                }));
            }, 100);

            // If no response in 2 seconds, extension not installed
            const timeout = setTimeout(() => {
                if (!extensionConnected) {
                    setStatus('الإضافة غير مثبتة');
                }
            }, 2000);

            return () => {
                window.removeEventListener('lukas-browser-ai-response', handleExtensionResponse);
                clearTimeout(timeout);
            };
        }
    }, [isOpen, handleExtensionResponse, extensionConnected]);

    const handleStart = () => {
        if (!task.trim() || !extensionConnected) return;

        setIsRunning(true);
        setCurrentStep(0);
        setSteps([]);
        setResult(null);
        setStatus('بدء التنفيذ...');

        // Send task to extension via custom event
        window.dispatchEvent(new CustomEvent('lukas-browser-ai-message', {
            detail: { action: 'startTask', task, maxSteps }
        }));
    };

    const handleStop = () => {
        window.dispatchEvent(new CustomEvent('lukas-browser-ai-message', {
            detail: { action: 'stopTask' }
        }));
        setIsRunning(false);
        setStatus('تم الإيقاف');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }} onClick={onClose}>
            <div className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🖥️</span>
                        <div>
                            <h2 className="text-lg font-bold">Browser AI</h2>
                            <p className="text-xs text-[var(--text-secondary-color)]">{status}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${extensionConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-xs text-[var(--text-secondary-color)]">
                            {extensionConnected ? 'متصل' : 'غير متصل'}
                        </span>
                        <button onClick={onClose} className="p-2 hover:bg-[var(--hover-bg-color)] rounded-lg">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="flex h-[70vh]">
                    {/* Left Panel - Controls */}
                    <div className="w-1/3 p-4 border-r border-[var(--border-color)] flex flex-col">
                        {/* Task Input */}
                        <div className="mb-4">
                            <label className="block text-sm text-[var(--text-secondary-color)] mb-2">المهمة:</label>
                            <textarea
                                value={task}
                                onChange={(e) => setTask(e.target.value)}
                                placeholder="ابحث عن أفضل فنادق دبي..."
                                className="w-full h-24 p-3 bg-[var(--bg-tertiary-color)] border border-[var(--border-color)] rounded-xl text-sm resize-none focus:outline-none focus:border-[var(--accent-color)]"
                                disabled={isRunning}
                            />
                        </div>

                        {/* Max Steps */}
                        <div className="mb-4">
                            <label className="block text-sm text-[var(--text-secondary-color)] mb-2">عدد الخطوات: {maxSteps}</label>
                            <input
                                type="range"
                                min="5"
                                max="20"
                                value={maxSteps}
                                onChange={(e) => setMaxSteps(parseInt(e.target.value))}
                                className="w-full accent-purple-500"
                                disabled={isRunning}
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-2 mb-4">
                            {!isRunning ? (
                                <button
                                    onClick={handleStart}
                                    disabled={!task.trim() || !extensionConnected}
                                    className="flex-1 py-2 px-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
                                >
                                    🚀 ابدأ
                                </button>
                            ) : (
                                <button
                                    onClick={handleStop}
                                    className="flex-1 py-2 px-4 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors"
                                >
                                    ⏹ إيقاف
                                </button>
                            )}
                        </div>

                        {/* Progress */}
                        {(isRunning || currentStep > 0) && (
                            <div className="mb-4">
                                <div className="flex justify-between text-xs text-[var(--text-secondary-color)] mb-1">
                                    <span>الخطوة {currentStep}/{maxSteps}</span>
                                    <span>{Math.round((currentStep / maxSteps) * 100)}%</span>
                                </div>
                                <div className="h-2 bg-[var(--bg-tertiary-color)] rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-300"
                                        style={{ width: `${(currentStep / maxSteps) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Steps Log */}
                        <div className="flex-1 overflow-y-auto">
                            <p className="text-xs text-[var(--text-secondary-color)] mb-2">سجل الخطوات:</p>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                                {steps.map((step, i) => (
                                    <div key={i} className="text-xs p-2 bg-[var(--bg-tertiary-color)] rounded-lg">
                                        <span className="text-[var(--accent-color)] font-bold">#{step.step}</span> {step.action}
                                    </div>
                                ))}
                                {steps.length === 0 && (
                                    <p className="text-xs text-[var(--text-secondary-color)] opacity-50">لا توجد خطوات بعد...</p>
                                )}
                            </div>
                        </div>

                        {/* Result */}
                        {result && (
                            <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-xl">
                                <p className="text-sm text-green-400">{result}</p>
                            </div>
                        )}

                        {/* Extension Not Installed Warning */}
                        {!extensionConnected && (
                            <div className="mt-4 p-3 bg-amber-500/20 border border-amber-500/30 rounded-xl">
                                <p className="text-sm text-amber-400 mb-2">⚠️ الإضافة غير مثبتة</p>
                                <a
                                    href="/lukas-browser-ai.zip"
                                    download
                                    className="text-xs text-[var(--accent-color)] underline hover:opacity-80"
                                >
                                    📥 تحميل الإضافة
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Right Panel - Screenshot Preview */}
                    <div className="flex-1 p-4 flex flex-col">
                        <p className="text-sm text-[var(--text-secondary-color)] mb-2">معاينة المتصفح:</p>
                        <div className="flex-1 bg-[var(--bg-tertiary-color)] rounded-xl overflow-hidden flex items-center justify-center">
                            {latestScreenshot ? (
                                <img
                                    src={`data:image/jpeg;base64,${latestScreenshot}`}
                                    alt="Browser Screenshot"
                                    className="max-w-full max-h-full object-contain rounded-lg"
                                />
                            ) : (
                                <div className="text-center text-[var(--text-secondary-color)]">
                                    <span className="text-6xl mb-4 block">🖥️</span>
                                    <p>ابدأ مهمة لرؤية المتصفح</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BrowserAIPanel;
