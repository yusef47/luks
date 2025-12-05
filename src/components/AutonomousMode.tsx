import React, { useState } from 'react';

interface AutonomousModeProps {
    isOpen: boolean;
    onClose: () => void;
    language: 'ar' | 'en';
}

interface ChartData {
    type: 'bar' | 'horizontal' | 'ranking';
    title: string;
    data: { label: string; value: number; rank?: number }[];
    unit: string;
    color: string;
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
        charts: ChartData[];
        sources: Source[];
    };
    execution: {
        executionTime: string;
    };
}

const BACKEND_URL = '/api';

// Beautiful CSS Chart Components
const BarChart: React.FC<{ chart: ChartData; isArabic: boolean }> = ({ chart, isArabic }) => {
    const maxValue = Math.max(...chart.data.map(d => d.value));

    return (
        <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#fff', marginBottom: '16px', fontSize: '15px' }}>
                📊 {chart.title}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {chart.data.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '100px',
                            fontSize: '12px',
                            color: '#a1a1aa',
                            textAlign: isArabic ? 'right' : 'left',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {item.label}
                        </div>
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: '4px', height: '24px', overflow: 'hidden' }}>
                            <div style={{
                                width: `${(item.value / maxValue) * 100}%`,
                                height: '100%',
                                background: `linear-gradient(90deg, ${chart.color}, ${chart.color}dd)`,
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                paddingRight: '8px',
                                transition: 'width 0.5s ease',
                                minWidth: '40px'
                            }}>
                                <span style={{ fontSize: '11px', color: '#fff', fontWeight: '600' }}>
                                    {item.value}{chart.unit}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const RankingChart: React.FC<{ chart: ChartData; isArabic: boolean }> = ({ chart, isArabic }) => {
    const colors = ['#fbbf24', '#94a3b8', '#cd7c2a', '#6366f1', '#22c55e', '#ef4444'];

    return (
        <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#fff', marginBottom: '16px', fontSize: '15px' }}>
                🏆 {chart.title}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {chart.data.map((item, i) => (
                    <div key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: `linear-gradient(90deg, ${colors[i]}22, transparent)`,
                        padding: '10px 14px',
                        borderRadius: '8px',
                        borderLeft: `4px solid ${colors[i]}`
                    }}>
                        <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: colors[i],
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: i < 3 ? '#000' : '#fff'
                        }}>
                            {item.rank || i + 1}
                        </div>
                        <span style={{ color: '#fff', fontSize: '14px', flex: 1 }}>{item.label}</span>
                        {i === 0 && <span style={{ fontSize: '16px' }}>👑</span>}
                    </div>
                ))}
            </div>
        </div>
    );
};

const StatsCards: React.FC<{ stats: { label: string; value: number; unit: string }[]; isArabic: boolean }> = ({ stats, isArabic }) => {
    const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444'];

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '12px',
            marginBottom: '20px'
        }}>
            {stats.map((stat, i) => (
                <div key={i} style={{
                    background: `linear-gradient(135deg, ${colors[i % colors.length]}22, ${colors[i % colors.length]}11)`,
                    border: `1px solid ${colors[i % colors.length]}44`,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center'
                }}>
                    <div style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: colors[i % colors.length],
                        marginBottom: '4px'
                    }}>
                        {stat.value}{stat.unit}
                    </div>
                    <div style={{ fontSize: '11px', color: '#a1a1aa' }}>
                        {stat.label}
                    </div>
                </div>
            ))}
        </div>
    );
};

const AutonomousMode: React.FC<AutonomousModeProps> = ({ isOpen, onClose, language }) => {
    const [prompt, setPrompt] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [result, setResult] = useState<TaskResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'summary' | 'charts' | 'report' | 'sources'>('summary');

    const isArabic = language === 'ar';

    const handleStart = async () => {
        if (!prompt.trim()) return;

        setIsRunning(true);
        setProgress(0);
        setError(null);
        setResult(null);
        setStatusMessage(isArabic ? '🔍 جاري البحث...' : '🔍 Researching...');

        const progressInterval = setInterval(() => {
            setProgress(prev => Math.min(prev + Math.random() * 12 + 5, 90));
        }, 400);

        try {
            const response = await fetch(`${BACKEND_URL}/autonomous`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'run', prompt })
            });

            clearInterval(progressInterval);
            const data = await response.json();

            if (!data.success) throw new Error(data.error);

            setProgress(100);
            setResult(data.data);
            setStatusMessage(isArabic ? '✅ تم!' : '✅ Done!');
            setActiveTab(data.data.results.charts?.length > 0 ? 'charts' : 'summary');

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
        navigator.clipboard.writeText(result.results.report);
        alert(isArabic ? 'تم النسخ!' : 'Copied!');
    };

    const handlePrint = () => {
        const charts = result?.results.charts || [];
        const chartHtml = charts.map(c => `
            <div style="margin: 20px 0; padding: 15px; background: #f3f4f6; border-radius: 8px;">
                <h3>${c.title}</h3>
                <ul>${c.data.map(d => `<li>${d.label}: ${d.value}${c.unit}</li>`).join('')}</ul>
            </div>
        `).join('');

        const content = `
            <html>
            <head>
                <meta charset="utf-8">
                <title>${result?.title}</title>
                <style>
                    body { font-family: 'Segoe UI', Arial; padding: 40px; direction: ${isArabic ? 'rtl' : 'ltr'}; line-height: 1.8; max-width: 800px; margin: 0 auto; }
                    h1 { color: #1a1a2e; border-bottom: 3px solid #6366f1; }
                    h2 { color: #374151; margin-top: 25px; }
                    .sources { margin-top: 30px; padding: 15px; background: #f3f4f6; border-radius: 8px; }
                </style>
            </head>
            <body>
                <h1>📊 ${result?.title}</h1>
                ${chartHtml}
                <div>${result?.results.report.replace(/##/g, '<h2>').replace(/\n/g, '<br>')}</div>
                <div class="sources">
                    <h2>${isArabic ? '📚 المصادر' : '📚 Sources'}</h2>
                    ${result?.results.sources.map(s => `<div>• <a href="${s.url}">${s.title}</a></div>`).join('')}
                </div>
            </body>
            </html>
        `;
        const win = window.open('', '_blank');
        if (win) { win.document.write(content); win.document.close(); setTimeout(() => win.print(), 300); }
    };

    if (!isOpen) return null;

    const tabStyle = (active: boolean) => ({
        padding: '10px 16px',
        borderRadius: '8px',
        border: 'none',
        background: active ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3))' : 'rgba(255,255,255,0.05)',
        color: active ? '#fff' : '#888',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: active ? '600' : '400',
        transition: 'all 0.2s'
    });

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.92)',
            backdropFilter: 'blur(12px)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            direction: isArabic ? 'rtl' : 'ltr'
        }}>
            <div style={{
                background: 'linear-gradient(145deg, #0a0a12, #12121f)',
                borderRadius: '20px',
                width: '94%',
                maxWidth: '900px',
                maxHeight: '92vh',
                overflow: 'hidden',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                boxShadow: '0 30px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(99, 102, 241, 0.1)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '18px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.08))'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '42px', height: '42px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            borderRadius: '10px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '22px'
                        }}>🧠</div>
                        <div>
                            <h2 style={{ margin: 0, color: '#fff', fontSize: '17px' }}>
                                {isArabic ? 'الوكيل المستقل' : 'Autonomous Agent'}
                            </h2>
                            <p style={{ margin: 0, color: '#6b7280', fontSize: '11px' }}>
                                {isArabic ? 'بحث + تحليل + رسوم بيانية' : 'Research + Analysis + Charts'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} disabled={isRunning} style={{
                        background: 'rgba(255,255,255,0.08)', border: 'none',
                        width: '32px', height: '32px', borderRadius: '50%',
                        color: '#fff', cursor: isRunning ? 'not-allowed' : 'pointer',
                        opacity: isRunning ? 0.5 : 1
                    }}>✕</button>
                </div>

                <div style={{ padding: '20px 24px', overflowY: 'auto', maxHeight: 'calc(92vh - 80px)' }}>

                    {/* Input */}
                    {!result && (
                        <>
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.05))',
                                borderRadius: '12px',
                                padding: '14px 16px',
                                marginBottom: '16px',
                                border: '1px solid rgba(99, 102, 241, 0.2)'
                            }}>
                                <p style={{ color: '#a5b4fc', margin: 0, fontSize: '13px' }}>
                                    📊 {isArabic
                                        ? 'اكتب سؤالك وسيجهز لوكاس تقرير مع رسوم بيانية ومصادر'
                                        : 'Write your question and Lukas will prepare a report with charts and sources'
                                    }
                                </p>
                            </div>

                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                disabled={isRunning}
                                placeholder={isArabic
                                    ? 'مثال: قارن بين أفضل 5 لغات برمجة في 2025 من حيث الرواتب والطلب'
                                    : 'Example: Compare top 5 programming languages in 2025 by salary and demand'
                                }
                                style={{
                                    width: '100%', minHeight: '90px', padding: '14px',
                                    borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '14px',
                                    resize: 'vertical', direction: isArabic ? 'rtl' : 'ltr',
                                    opacity: isRunning ? 0.6 : 1
                                }}
                            />

                            {isRunning && (
                                <div style={{ marginTop: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{ color: '#818cf8', fontSize: '13px' }}>{statusMessage}</span>
                                        <span style={{ color: '#fff', fontSize: '13px' }}>{Math.round(progress)}%</span>
                                    </div>
                                    <div style={{ height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%', width: `${progress}%`,
                                            background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                                            transition: 'width 0.3s', borderRadius: '3px'
                                        }} />
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div style={{
                                    marginTop: '14px', padding: '12px',
                                    background: 'rgba(239, 68, 68, 0.12)', borderRadius: '8px',
                                    border: '1px solid rgba(239, 68, 68, 0.25)'
                                }}>
                                    <p style={{ color: '#ef4444', margin: 0, fontSize: '13px' }}>❌ {error}</p>
                                </div>
                            )}

                            <button
                                onClick={handleStart}
                                disabled={isRunning || !prompt.trim()}
                                style={{
                                    marginTop: '16px', width: '100%', padding: '14px',
                                    borderRadius: '12px', border: 'none',
                                    background: isRunning || !prompt.trim()
                                        ? '#3f3f46'
                                        : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    color: '#fff', fontSize: '15px', fontWeight: '600',
                                    cursor: isRunning || !prompt.trim() ? 'not-allowed' : 'pointer',
                                    boxShadow: isRunning || !prompt.trim() ? 'none' : '0 4px 20px rgba(99, 102, 241, 0.3)'
                                }}
                            >
                                {isRunning ? '⏳' : '🚀'} {isRunning
                                    ? (isArabic ? 'جاري العمل...' : 'Working...')
                                    : (isArabic ? 'ابدأ البحث' : 'Start Research')
                                }
                            </button>
                        </>
                    )}

                    {/* Results */}
                    {result && (
                        <>
                            {/* Success Header */}
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(22, 163, 74, 0.08))',
                                borderRadius: '12px', padding: '14px 16px', marginBottom: '16px',
                                border: '1px solid rgba(34, 197, 94, 0.25)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'
                            }}>
                                <div>
                                    <h3 style={{ color: '#22c55e', margin: 0, fontSize: '15px' }}>✅ {result.title}</h3>
                                    <p style={{ color: '#86efac', margin: '2px 0 0', fontSize: '11px' }}>
                                        ⏱️ {result.execution.executionTime} |
                                        📊 {result.results.charts?.length || 0} {isArabic ? 'رسم' : 'charts'} |
                                        📚 {result.results.sources.length} {isArabic ? 'مصادر' : 'sources'}
                                    </p>
                                </div>
                                <button onClick={handleReset} style={{
                                    padding: '6px 12px', borderRadius: '6px',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    background: 'rgba(255,255,255,0.05)', color: '#fff',
                                    cursor: 'pointer', fontSize: '12px'
                                }}>🔄 {isArabic ? 'جديد' : 'New'}</button>
                            </div>

                            {/* Tabs */}
                            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                                <button onClick={() => setActiveTab('charts')} style={tabStyle(activeTab === 'charts')}>
                                    📊 {isArabic ? 'الرسوم' : 'Charts'}
                                </button>
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
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: '12px', padding: '20px',
                                maxHeight: '380px', overflowY: 'auto',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                {activeTab === 'charts' && (
                                    <>
                                        {result.results.stats && result.results.stats.length > 0 && (
                                            <StatsCards stats={result.results.stats} isArabic={isArabic} />
                                        )}

                                        {result.results.charts && result.results.charts.length > 0 ? (
                                            result.results.charts.map((chart, i) => (
                                                chart.type === 'ranking'
                                                    ? <RankingChart key={i} chart={chart} isArabic={isArabic} />
                                                    : <BarChart key={i} chart={chart} isArabic={isArabic} />
                                            ))
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                                                <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>📊</span>
                                                {isArabic ? 'لم يتم استخراج بيانات رسومية من هذا البحث' : 'No chart data extracted from this research'}
                                            </div>
                                        )}
                                    </>
                                )}

                                {activeTab === 'summary' && (
                                    <p style={{ color: '#e5e5e5', lineHeight: '1.9', margin: 0, whiteSpace: 'pre-wrap', fontSize: '14px' }}>
                                        {result.results.summary}
                                    </p>
                                )}

                                {activeTab === 'report' && (
                                    <div style={{ color: '#d4d4d4', lineHeight: '1.8', whiteSpace: 'pre-wrap', fontSize: '13px' }}>
                                        {result.results.report}
                                    </div>
                                )}

                                {activeTab === 'sources' && (
                                    <>
                                        {result.results.sources.length > 0 ? (
                                            result.results.sources.map((s, i) => (
                                                <div key={i} style={{
                                                    background: 'rgba(255,255,255,0.04)',
                                                    borderRadius: '8px', padding: '12px', marginBottom: '8px',
                                                    borderLeft: '3px solid #6366f1'
                                                }}>
                                                    <div style={{ color: '#fff', fontSize: '13px', marginBottom: '4px' }}>{s.title}</div>
                                                    {s.url && (
                                                        <a href={s.url} target="_blank" rel="noopener noreferrer"
                                                            style={{ color: '#818cf8', fontSize: '11px', textDecoration: 'none' }}>
                                                            🔗 {s.url.substring(0, 50)}...
                                                        </a>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p style={{ color: '#6b7280', textAlign: 'center' }}>{isArabic ? 'لا توجد مصادر' : 'No sources'}</p>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                                <button onClick={handleCopy} style={{
                                    flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '500'
                                }}>📋 {isArabic ? 'نسخ' : 'Copy'}</button>
                                <button onClick={handlePrint} style={{
                                    flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                    color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '500'
                                }}>📄 {isArabic ? 'طباعة' : 'Print'}</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AutonomousMode;
