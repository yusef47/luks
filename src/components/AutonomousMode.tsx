import React, { useState } from 'react';

interface AutonomousModeProps {
    isOpen: boolean;
    onClose: () => void;
    language: 'ar' | 'en';
}

interface TaskResult {
    title: string;
    steps: { id: number; task: string }[];
    stepsCompleted: number;
    summary: string;
    report: string;
}

const BACKEND_URL = '/api';

const AutonomousMode: React.FC<AutonomousModeProps> = ({ isOpen, onClose, language }) => {
    const [prompt, setPrompt] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [result, setResult] = useState<TaskResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const isArabic = language === 'ar';

    const handleRunTask = async () => {
        if (!prompt.trim()) return;

        setIsRunning(true);
        setProgress(0);
        setStatusMessage(isArabic ? '🔄 جاري إنشاء الخطة...' : '🔄 Creating plan...');
        setResult(null);
        setError(null);

        try {
            // Simulate progress updates
            const progressInterval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) return prev;
                    const increment = Math.random() * 10 + 5;
                    return Math.min(prev + increment, 90);
                });
            }, 2000);

            setStatusMessage(isArabic ? '🔍 جاري البحث والتحليل...' : '🔍 Researching and analyzing...');

            const response = await fetch(`${BACKEND_URL}/autonomous`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'run', prompt })
            });

            clearInterval(progressInterval);

            const data = await response.json();

            if (data.success) {
                setProgress(100);
                setStatusMessage(isArabic ? '✅ تم الانتهاء!' : '✅ Completed!');
                setResult(data.data);
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        } catch (err: any) {
            setError(err.message);
            setStatusMessage(isArabic ? '❌ حدث خطأ' : '❌ Error occurred');
        } finally {
            setIsRunning(false);
        }
    };

    const handleCopyReport = () => {
        if (result?.report) {
            navigator.clipboard.writeText(result.report);
            alert(isArabic ? 'تم نسخ التقرير!' : 'Report copied!');
        }
    };

    const handleReset = () => {
        setPrompt('');
        setResult(null);
        setProgress(0);
        setStatusMessage('');
        setError(null);
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            direction: isArabic ? 'rtl' : 'ltr'
        }}>
            <div style={{
                background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
                borderRadius: '24px',
                width: '90%',
                maxWidth: '800px',
                maxHeight: '90vh',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.1) 0%, rgba(234, 88, 12, 0.1) 100%)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '28px' }}>🧠</span>
                        <div>
                            <h2 style={{ margin: 0, color: '#fff', fontSize: '20px' }}>
                                {isArabic ? 'وضع الاستقلالية' : 'Autonomous Mode'}
                            </h2>
                            <p style={{ margin: 0, color: '#a1a1aa', fontSize: '13px' }}>
                                {isArabic ? 'مهمة معقدة → تقرير شامل' : 'Complex task → Comprehensive report'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isRunning}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            color: '#fff',
                            cursor: isRunning ? 'not-allowed' : 'pointer',
                            fontSize: '18px',
                            opacity: isRunning ? 0.5 : 1
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(90vh - 100px)' }}>

                    {/* Input Section */}
                    {!result && (
                        <>
                            <p style={{ color: '#d4d4d4', marginBottom: '16px', fontSize: '14px' }}>
                                {isArabic
                                    ? '📝 اكتب طلبك بالتفصيل. لوكاس هيبحث، يحلل، ويجهزلك تقرير شامل.'
                                    : '📝 Describe your request in detail. Lukas will research, analyze, and prepare a comprehensive report.'
                                }
                            </p>

                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                disabled={isRunning}
                                placeholder={isArabic
                                    ? 'مثال: عايز تحليل كامل لسوق العقارات في مصر 2024 مع مقارنة بالإمارات وتوقعات للأسعار...'
                                    : 'Example: Complete analysis of Egypt real estate market 2024 with UAE comparison and price predictions...'
                                }
                                style={{
                                    width: '100%',
                                    minHeight: '120px',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    background: 'rgba(0,0,0,0.3)',
                                    color: '#fff',
                                    fontSize: '15px',
                                    resize: 'vertical',
                                    direction: isArabic ? 'rtl' : 'ltr',
                                    opacity: isRunning ? 0.6 : 1
                                }}
                            />

                            {/* Progress Bar */}
                            {isRunning && (
                                <div style={{ marginTop: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: '#f59e0b', fontSize: '14px' }}>{statusMessage}</span>
                                        <span style={{ color: '#fff', fontSize: '14px' }}>{Math.round(progress)}%</span>
                                    </div>
                                    <div style={{
                                        height: '8px',
                                        background: 'rgba(255,255,255,0.1)',
                                        borderRadius: '4px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${progress}%`,
                                            background: 'linear-gradient(90deg, #f59e0b, #ea580c)',
                                            transition: 'width 0.5s ease',
                                            borderRadius: '4px'
                                        }} />
                                    </div>
                                    <p style={{ color: '#71717a', fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>
                                        {isArabic
                                            ? '⏳ قد يستغرق هذا 1-3 دقائق حسب تعقيد المهمة...'
                                            : '⏳ This may take 1-3 minutes depending on task complexity...'
                                        }
                                    </p>
                                </div>
                            )}

                            {/* Error */}
                            {error && (
                                <div style={{
                                    marginTop: '16px',
                                    padding: '12px 16px',
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(239, 68, 68, 0.3)'
                                }}>
                                    <p style={{ color: '#ef4444', margin: 0, fontSize: '14px' }}>❌ {error}</p>
                                </div>
                            )}

                            {/* Run Button */}
                            <button
                                onClick={handleRunTask}
                                disabled={isRunning || !prompt.trim()}
                                style={{
                                    marginTop: '20px',
                                    width: '100%',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: isRunning || !prompt.trim()
                                        ? '#4b5563'
                                        : 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                                    color: '#fff',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    cursor: isRunning || !prompt.trim() ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                {isRunning ? (
                                    <>🔄 {isArabic ? 'جاري التنفيذ...' : 'Running...'}</>
                                ) : (
                                    <>🚀 {isArabic ? 'ابدأ المهمة' : 'Start Task'}</>
                                )}
                            </button>
                        </>
                    )}

                    {/* Results Section */}
                    {result && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ color: '#22c55e', margin: 0 }}>
                                    ✅ {result.title}
                                </h3>
                                <button
                                    onClick={handleReset}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        background: 'transparent',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontSize: '13px'
                                    }}
                                >
                                    🔄 {isArabic ? 'مهمة جديدة' : 'New Task'}
                                </button>
                            </div>

                            {/* Summary */}
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.1))',
                                borderRadius: '16px',
                                padding: '20px',
                                marginBottom: '20px',
                                border: '1px solid rgba(34, 197, 94, 0.2)'
                            }}>
                                <h4 style={{ color: '#22c55e', marginBottom: '12px', marginTop: 0 }}>
                                    📝 {isArabic ? 'الملخص التنفيذي' : 'Executive Summary'}
                                </h4>
                                <p style={{ color: '#e5e5e5', lineHeight: '1.7', margin: 0, whiteSpace: 'pre-wrap' }}>
                                    {result.summary}
                                </p>
                            </div>

                            {/* Full Report */}
                            <div style={{
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '16px',
                                padding: '20px',
                                marginBottom: '20px'
                            }}>
                                <h4 style={{ color: '#fff', marginBottom: '12px', marginTop: 0 }}>
                                    📄 {isArabic ? 'التقرير الكامل' : 'Full Report'}
                                </h4>
                                <div style={{
                                    color: '#d4d4d4',
                                    lineHeight: '1.8',
                                    maxHeight: '400px',
                                    overflowY: 'auto',
                                    whiteSpace: 'pre-wrap',
                                    fontSize: '14px'
                                }}>
                                    {result.report}
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={handleCopyReport}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500'
                                    }}
                                >
                                    📋 {isArabic ? 'نسخ التقرير' : 'Copy Report'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AutonomousMode;
