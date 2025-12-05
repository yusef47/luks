import React, { useState } from 'react';

interface AutonomousModeProps {
    isOpen: boolean;
    onClose: () => void;
    language: 'ar' | 'en';
}

interface Source {
    title: string;
    url: string;
}

interface TaskResult {
    title: string;
    results: {
        summary: string;
        report: string;
        stats: { label: string; value: number; unit: string }[];
        sources: Source[];
    };
    execution: {
        executionTime: string;
    };
}

const BACKEND_URL = '/api';

const AutonomousMode: React.FC<AutonomousModeProps> = ({ isOpen, onClose, language }) => {
    const [prompt, setPrompt] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [result, setResult] = useState<TaskResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'summary' | 'report' | 'sources'>('summary');

    const isArabic = language === 'ar';

    const handleStart = async () => {
        if (!prompt.trim()) return;

        setIsRunning(true);
        setProgress(0);
        setError(null);
        setResult(null);
        setStatusMessage(isArabic ? '🔍 جاري البحث والتحليل...' : '🔍 Researching and analyzing...');

        // Progress animation
        const progressInterval = setInterval(() => {
            setProgress(prev => Math.min(prev + Math.random() * 15 + 5, 90));
        }, 500);

        try {
            const response = await fetch(`${BACKEND_URL}/autonomous`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'run', prompt })
            });

            clearInterval(progressInterval);

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Unknown error');
            }

            setProgress(100);
            setResult(data.data);
            setStatusMessage(isArabic ? '✅ تم!' : '✅ Done!');
            setActiveTab('summary');

        } catch (err: any) {
            setError(err.message);
            setStatusMessage('');
        } finally {
            clearInterval(progressInterval);
            setIsRunning(false);
        }
    };

    const handleReset = () => {
        setPrompt('');
        setResult(null);
        setProgress(0);
        setStatusMessage('');
        setError(null);
    };

    const handleCopy = () => {
        if (!result) return;
        const text = `${result.title}\n\n${result.results.report}\n\nSources:\n${result.results.sources.map(s => `- ${s.title}: ${s.url}`).join('\n')}`;
        navigator.clipboard.writeText(text);
        alert(isArabic ? 'تم النسخ!' : 'Copied!');
    };

    const handlePrint = () => {
        const content = `
            <html>
            <head>
                <meta charset="utf-8">
                <title>${result?.title}</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; direction: ${isArabic ? 'rtl' : 'ltr'}; line-height: 1.8; max-width: 800px; margin: 0 auto; }
                    h1 { color: #1a1a2e; border-bottom: 3px solid #6366f1; padding-bottom: 15px; }
                    h2 { color: #374151; margin-top: 25px; }
                    .sources { margin-top: 30px; padding: 15px; background: #f3f4f6; border-radius: 8px; }
                    .source { margin: 8px 0; }
                    .source a { color: #6366f1; }
                </style>
            </head>
            <body>
                <h1>📊 ${result?.title}</h1>
                <div>${result?.results.report.replace(/##/g, '<h2>').replace(/\n/g, '<br>')}</div>
                <div class="sources">
                    <h2>${isArabic ? '📚 المصادر' : '📚 Sources'}</h2>
                    ${result?.results.sources.map(s => `<div class="source">• <a href="${s.url}">${s.title}</a></div>`).join('')}
                </div>
                <footer style="margin-top: 40px; text-align: center; color: #9ca3af; font-size: 12px;">
                    ${isArabic ? 'تقرير من لوكاس AI' : 'Report by Lukas AI'} - ${new Date().toLocaleDateString()}
                </footer>
            </body>
            </html>
        `;
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(content);
            win.document.close();
            setTimeout(() => win.print(), 300);
        }
    };

    if (!isOpen) return null;

    const tabStyle = (active: boolean) => ({
        padding: '10px 20px',
        borderRadius: '8px',
        border: 'none',
        background: active ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
        color: active ? '#fff' : '#888',
        cursor: 'pointer',
        fontSize: '14px'
    });

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(10px)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            direction: isArabic ? 'rtl' : 'ltr'
        }}>
            <div style={{
                background: 'linear-gradient(145deg, #0f0f1a, #1a1a2e)',
                borderRadius: '20px',
                width: '92%',
                maxWidth: '850px',
                maxHeight: '90vh',
                overflow: 'hidden',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '18px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '28px' }}>🧠</span>
                        <div>
                            <h2 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>
                                {isArabic ? 'الوكيل المستقل' : 'Autonomous Agent'}
                            </h2>
                            <p style={{ margin: 0, color: '#888', fontSize: '12px' }}>
                                {isArabic ? 'بحث حقيقي + تقرير شامل' : 'Real search + Comprehensive report'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isRunning}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            width: '34px', height: '34px',
                            borderRadius: '50%',
                            color: '#fff',
                            cursor: isRunning ? 'not-allowed' : 'pointer',
                            opacity: isRunning ? 0.5 : 1
                        }}
                    >✕</button>
                </div>

                <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(90vh - 80px)' }}>

                    {/* Input Phase */}
                    {!result && (
                        <>
                            <div style={{
                                background: 'rgba(99, 102, 241, 0.1)',
                                borderRadius: '10px',
                                padding: '14px',
                                marginBottom: '16px',
                                border: '1px solid rgba(99, 102, 241, 0.2)'
                            }}>
                                <p style={{ color: '#a5b4fc', margin: 0, fontSize: '13px' }}>
                                    💡 {isArabic
                                        ? 'اكتب سؤالك وسيبحث لوكاس في الإنترنت ويجهز تقرير مع المصادر.'
                                        : 'Write your question and Lukas will search the web and prepare a report with sources.'
                                    }
                                </p>
                            </div>

                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                disabled={isRunning}
                                placeholder={isArabic
                                    ? 'مثال: أفضل 10 وظائف AI في 2025 مع الرواتب والمهارات المطلوبة'
                                    : 'Example: Top 10 AI jobs in 2025 with salaries and required skills'
                                }
                                style={{
                                    width: '100%',
                                    minHeight: '100px',
                                    padding: '14px',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(0,0,0,0.3)',
                                    color: '#fff',
                                    fontSize: '15px',
                                    resize: 'vertical',
                                    direction: isArabic ? 'rtl' : 'ltr',
                                    opacity: isRunning ? 0.6 : 1
                                }}
                            />

                            {/* Progress */}
                            {isRunning && (
                                <div style={{ marginTop: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: '#6366f1', fontSize: '14px' }}>{statusMessage}</span>
                                        <span style={{ color: '#fff', fontSize: '14px' }}>{Math.round(progress)}%</span>
                                    </div>
                                    <div style={{
                                        height: '6px',
                                        background: 'rgba(255,255,255,0.1)',
                                        borderRadius: '3px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${progress}%`,
                                            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                            transition: 'width 0.3s'
                                        }} />
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div style={{
                                    marginTop: '16px',
                                    padding: '12px',
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(239, 68, 68, 0.3)'
                                }}>
                                    <p style={{ color: '#ef4444', margin: 0, fontSize: '14px' }}>❌ {error}</p>
                                </div>
                            )}

                            <button
                                onClick={handleStart}
                                disabled={isRunning || !prompt.trim()}
                                style={{
                                    marginTop: '20px',
                                    width: '100%',
                                    padding: '14px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: isRunning || !prompt.trim()
                                        ? '#4b5563'
                                        : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    color: '#fff',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    cursor: isRunning || !prompt.trim() ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {isRunning
                                    ? (isArabic ? '⏳ جاري العمل...' : '⏳ Working...')
                                    : (isArabic ? '🚀 ابدأ البحث' : '🚀 Start Research')
                                }
                            </button>
                        </>
                    )}

                    {/* Results */}
                    {result && (
                        <>
                            {/* Header */}
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.1))',
                                borderRadius: '12px',
                                padding: '16px',
                                marginBottom: '16px',
                                border: '1px solid rgba(34, 197, 94, 0.2)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '10px'
                            }}>
                                <div>
                                    <h3 style={{ color: '#22c55e', margin: 0, fontSize: '16px' }}>✅ {result.title}</h3>
                                    <p style={{ color: '#86efac', margin: '4px 0 0', fontSize: '12px' }}>
                                        ⏱️ {result.execution.executionTime} | 📚 {result.results.sources.length} {isArabic ? 'مصادر' : 'sources'}
                                    </p>
                                </div>
                                <button onClick={handleReset} style={{
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    background: 'transparent',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                }}>
                                    🔄 {isArabic ? 'جديد' : 'New'}
                                </button>
                            </div>

                            {/* Tabs */}
                            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
                                <button onClick={() => setActiveTab('summary')} style={tabStyle(activeTab === 'summary')}>
                                    📝 {isArabic ? 'الملخص' : 'Summary'}
                                </button>
                                <button onClick={() => setActiveTab('report')} style={tabStyle(activeTab === 'report')}>
                                    📄 {isArabic ? 'التقرير' : 'Report'}
                                </button>
                                <button onClick={() => setActiveTab('sources')} style={tabStyle(activeTab === 'sources')}>
                                    🔗 {isArabic ? 'المصادر' : 'Sources'}
                                </button>
                            </div>

                            {/* Tab Content */}
                            <div style={{
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '12px',
                                padding: '20px',
                                maxHeight: '350px',
                                overflowY: 'auto'
                            }}>
                                {activeTab === 'summary' && (
                                    <p style={{ color: '#e5e5e5', lineHeight: '1.8', margin: 0, whiteSpace: 'pre-wrap' }}>
                                        {result.results.summary}
                                    </p>
                                )}

                                {activeTab === 'report' && (
                                    <div style={{ color: '#d4d4d4', lineHeight: '1.8', whiteSpace: 'pre-wrap', fontSize: '14px' }}>
                                        {result.results.report}
                                    </div>
                                )}

                                {activeTab === 'sources' && (
                                    <>
                                        {result.results.sources.length > 0 ? (
                                            result.results.sources.map((s, i) => (
                                                <div key={i} style={{
                                                    background: 'rgba(255,255,255,0.05)',
                                                    borderRadius: '8px',
                                                    padding: '12px',
                                                    marginBottom: '8px'
                                                }}>
                                                    <div style={{ color: '#fff', fontSize: '14px' }}>{s.title}</div>
                                                    {s.url && (
                                                        <a href={s.url} target="_blank" rel="noopener noreferrer"
                                                            style={{ color: '#818cf8', fontSize: '12px' }}>
                                                            {s.url.substring(0, 60)}...
                                                        </a>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p style={{ color: '#666' }}>{isArabic ? 'لا توجد مصادر' : 'No sources'}</p>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                                <button onClick={handleCopy} style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}>
                                    📋 {isArabic ? 'نسخ' : 'Copy'}
                                </button>
                                <button onClick={handlePrint} style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}>
                                    📄 {isArabic ? 'طباعة' : 'Print'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AutonomousMode;
