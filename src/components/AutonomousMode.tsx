import React, { useState, useRef } from 'react';

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
    sections: string;
    sources: string[];
    stats: { label: string; value: number; unit: string }[];
}

const BACKEND_URL = '/api';

const AutonomousMode: React.FC<AutonomousModeProps> = ({ isOpen, onClose, language }) => {
    const [prompt, setPrompt] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [result, setResult] = useState<TaskResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'summary' | 'report' | 'sources' | 'stats'>('summary');
    const reportRef = useRef<HTMLDivElement>(null);

    const isArabic = language === 'ar';

    const handleRunTask = async () => {
        if (!prompt.trim()) return;

        setIsRunning(true);
        setProgress(0);
        setStatusMessage(isArabic ? '🔄 جاري إنشاء الخطة...' : '🔄 Creating plan...');
        setResult(null);
        setError(null);

        try {
            const messages = isArabic
                ? ['🔍 جاري البحث...', '📊 جاري تحليل البيانات...', '📝 جاري كتابة التقرير...', '✨ اللمسات الأخيرة...']
                : ['🔍 Researching...', '📊 Analyzing data...', '📝 Writing report...', '✨ Final touches...'];

            let msgIndex = 0;
            const progressInterval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) return prev;
                    if (prev > msgIndex * 20 && msgIndex < messages.length - 1) {
                        setStatusMessage(messages[++msgIndex]);
                    }
                    return Math.min(prev + Math.random() * 8 + 3, 90);
                });
            }, 1500);

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
                setActiveTab('summary');
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
        const text = `${result?.title}\n\n${result?.summary}\n\n${result?.sections}\n\n${isArabic ? 'المصادر:' : 'Sources:'}\n${result?.sources?.join('\n')}`;
        navigator.clipboard.writeText(text);
        alert(isArabic ? 'تم نسخ التقرير!' : 'Report copied!');
    };

    const handleDownloadPDF = () => {
        // Create printable content
        const content = `
            <html>
            <head>
                <meta charset="utf-8">
                <title>${result?.title}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; direction: ${isArabic ? 'rtl' : 'ltr'}; line-height: 1.8; }
                    h1 { color: #1a1a2e; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
                    h2 { color: #374151; margin-top: 30px; }
                    .summary { background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e; }
                    .sources { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
                    .source { color: #6b7280; font-size: 14px; margin: 5px 0; }
                    .stats { display: flex; gap: 20px; flex-wrap: wrap; margin: 20px 0; }
                    .stat { background: #f3f4f6; padding: 15px 25px; border-radius: 8px; text-align: center; }
                    .stat-value { font-size: 24px; font-weight: bold; color: #6366f1; }
                    .stat-label { font-size: 12px; color: #6b7280; }
                </style>
            </head>
            <body>
                <h1>📊 ${result?.title}</h1>
                
                <div class="summary">
                    <h2>${isArabic ? '📝 الملخص التنفيذي' : '📝 Executive Summary'}</h2>
                    <p>${result?.summary}</p>
                </div>

                ${result?.stats && result.stats.length > 0 ? `
                <div class="stats">
                    ${result.stats.map(s => `
                        <div class="stat">
                            <div class="stat-value">${s.value}${s.unit}</div>
                            <div class="stat-label">${s.label}</div>
                        </div>
                    `).join('')}
                </div>
                ` : ''}

                <div class="sections">
                    ${result?.sections?.replace(/##/g, '<h2>').replace(/\n/g, '<br>')}
                </div>

                <div class="sources">
                    <h2>${isArabic ? '📚 المصادر' : '📚 Sources'}</h2>
                    ${result?.sources?.map(s => `<div class="source">${s}</div>`).join('') || ''}
                </div>

                <footer style="margin-top: 40px; text-align: center; color: #9ca3af; font-size: 12px;">
                    ${isArabic ? 'تم إنشاء هذا التقرير بواسطة لوكاس AI' : 'Report generated by Lukas AI'} - ${new Date().toLocaleDateString()}
                </footer>
            </body>
            </html>
        `;

        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (win) {
            win.onload = () => {
                win.print();
            };
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

    const tabStyle = (isActive: boolean) => ({
        padding: '10px 20px',
        borderRadius: '8px',
        border: 'none',
        background: isActive ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
        color: isActive ? '#fff' : '#a1a1aa',
        cursor: 'pointer',
        fontSize: '14px',
        transition: 'all 0.2s'
    });

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
                width: '95%',
                maxWidth: '900px',
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
                                {isArabic ? 'بحث شامل → تقرير احترافي' : 'Research → Professional Report'}
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
                                    ? '📝 اكتب طلبك بالتفصيل. لوكاس هيبحث، يحلل، ويجهزلك تقرير شامل مع المصادر.'
                                    : '📝 Describe your request. Lukas will research, analyze, and prepare a report with sources.'
                                }
                            </p>

                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                disabled={isRunning}
                                placeholder={isArabic
                                    ? 'مثال: تحليل سوق العقارات في مصر 2024 مع مقارنة بالإمارات وتوقعات الأسعار'
                                    : 'Example: Analysis of Egypt real estate market 2024 with UAE comparison'
                                }
                                style={{
                                    width: '100%',
                                    minHeight: '100px',
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
                                            transition: 'width 0.5s ease'
                                        }} />
                                    </div>
                                    <p style={{ color: '#71717a', fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>
                                        {isArabic ? '⏳ قد يستغرق 1-3 دقائق...' : '⏳ May take 1-3 minutes...'}
                                    </p>
                                </div>
                            )}

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
                                    cursor: isRunning || !prompt.trim() ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {isRunning ? (
                                    <>🔄 {isArabic ? 'جاري التنفيذ...' : 'Running...'}</>
                                ) : (
                                    <>🚀 {isArabic ? 'ابدأ البحث' : 'Start Research'}</>
                                )}
                            </button>
                        </>
                    )}

                    {/* Results Section */}
                    {result && (
                        <div ref={reportRef}>
                            {/* Title & Actions */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                                <h3 style={{ color: '#22c55e', margin: 0, fontSize: '18px' }}>
                                    ✅ {result.title}
                                </h3>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={handleReset} style={{
                                        padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
                                        background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: '13px'
                                    }}>
                                        🔄 {isArabic ? 'جديد' : 'New'}
                                    </button>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                <button onClick={() => setActiveTab('summary')} style={tabStyle(activeTab === 'summary')}>
                                    📝 {isArabic ? 'الملخص' : 'Summary'}
                                </button>
                                <button onClick={() => setActiveTab('report')} style={tabStyle(activeTab === 'report')}>
                                    📄 {isArabic ? 'التقرير' : 'Report'}
                                </button>
                                <button onClick={() => setActiveTab('stats')} style={tabStyle(activeTab === 'stats')}>
                                    📊 {isArabic ? 'الإحصائيات' : 'Stats'}
                                </button>
                                <button onClick={() => setActiveTab('sources')} style={tabStyle(activeTab === 'sources')}>
                                    📚 {isArabic ? 'المصادر' : 'Sources'}
                                </button>
                            </div>

                            {/* Tab Content */}
                            {activeTab === 'summary' && (
                                <div style={{
                                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.1))',
                                    borderRadius: '16px',
                                    padding: '20px',
                                    border: '1px solid rgba(34, 197, 94, 0.2)'
                                }}>
                                    <h4 style={{ color: '#22c55e', marginTop: 0 }}>
                                        📝 {isArabic ? 'الملخص التنفيذي' : 'Executive Summary'}
                                    </h4>
                                    <p style={{ color: '#e5e5e5', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                                        {result.summary}
                                    </p>
                                </div>
                            )}

                            {activeTab === 'report' && (
                                <div style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '16px',
                                    padding: '20px',
                                    maxHeight: '400px',
                                    overflowY: 'auto'
                                }}>
                                    <div style={{ color: '#d4d4d4', lineHeight: '1.8', whiteSpace: 'pre-wrap', fontSize: '14px' }}>
                                        {result.sections}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'stats' && (
                                <div style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '16px',
                                    padding: '20px'
                                }}>
                                    <h4 style={{ color: '#fff', marginTop: 0 }}>
                                        📊 {isArabic ? 'إحصائيات رئيسية' : 'Key Statistics'}
                                    </h4>
                                    {result.stats && result.stats.length > 0 ? (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                                            {result.stats.map((stat, i) => (
                                                <div key={i} style={{
                                                    background: 'rgba(99, 102, 241, 0.1)',
                                                    borderRadius: '12px',
                                                    padding: '20px',
                                                    textAlign: 'center',
                                                    border: '1px solid rgba(99, 102, 241, 0.2)'
                                                }}>
                                                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#6366f1' }}>
                                                        {stat.value}{stat.unit}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '8px' }}>
                                                        {stat.label}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p style={{ color: '#71717a', textAlign: 'center' }}>
                                            {isArabic ? 'لا توجد إحصائيات متاحة' : 'No statistics available'}
                                        </p>
                                    )}
                                </div>
                            )}

                            {activeTab === 'sources' && (
                                <div style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '16px',
                                    padding: '20px'
                                }}>
                                    <h4 style={{ color: '#fff', marginTop: 0 }}>
                                        📚 {isArabic ? 'المصادر والمراجع' : 'Sources & References'}
                                    </h4>
                                    {result.sources && result.sources.length > 0 ? (
                                        <ul style={{ margin: 0, paddingLeft: isArabic ? 0 : '20px', paddingRight: isArabic ? '20px' : 0 }}>
                                            {result.sources.map((source, i) => (
                                                <li key={i} style={{ color: '#a1a1aa', marginBottom: '10px', fontSize: '14px' }}>
                                                    {source.replace('[Source:', '').replace(']', '')}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p style={{ color: '#71717a' }}>
                                            {isArabic ? 'لا توجد مصادر متاحة' : 'No sources available'}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
                                <button onClick={handleCopyReport} style={{
                                    flex: 1, minWidth: '150px', padding: '14px', borderRadius: '10px', border: 'none',
                                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                    color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '500'
                                }}>
                                    📋 {isArabic ? 'نسخ التقرير' : 'Copy Report'}
                                </button>
                                <button onClick={handleDownloadPDF} style={{
                                    flex: 1, minWidth: '150px', padding: '14px', borderRadius: '10px', border: 'none',
                                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                    color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '500'
                                }}>
                                    📄 {isArabic ? 'طباعة/PDF' : 'Print/PDF'}
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
