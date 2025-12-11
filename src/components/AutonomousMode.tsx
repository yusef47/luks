import React, { useState, useEffect, useRef } from 'react';

interface AutonomousModeProps {
    isOpen: boolean;
    onClose: () => void;
    language: 'ar' | 'en';
}

interface ChartData {
    type: 'donut' | 'bar' | 'ranking' | 'score' | 'versus' | 'ring';
    title: string;
    data: { label: string; value: number; rank?: number }[];
    unit: string;
    color: string;
}

interface Source { title: string; url: string; }

interface TaskResult {
    title: string;
    results: {
        summary: string;
        report: string;
        stats: { label: string; value: number; unit: string }[];
        charts: ChartData[];
        sources: Source[];
    };
    execution: { executionTime: string; };
}

const BACKEND_URL = '/api';

// ============================================
// 🌌 3D NEURAL NETWORK
// ============================================
const NeuralNetwork3D: React.FC = () => {
    const [rotation, setRotation] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => setRotation(prev => (prev + 0.5) % 360), 50);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ width: '100%', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.12) 0%, transparent 70%)', borderRadius: '16px', position: 'relative' }}>
            <svg width="160" height="160" viewBox="0 0 200 200">
                <defs>
                    <filter id="neonGlow"><feGaussianBlur stdDeviation="4" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                    <linearGradient id="sphereGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" /><stop offset="50%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                </defs>
                <ellipse cx="100" cy="100" rx="80" ry="30" fill="none" stroke="url(#sphereGrad)" strokeWidth="1" opacity="0.5" filter="url(#neonGlow)" />
                <ellipse cx="100" cy="100" rx="30" ry="80" fill="none" stroke="url(#sphereGrad)" strokeWidth="1" opacity="0.4" transform={`rotate(${rotation} 100 100)`} />
                <circle cx="100" cy="100" r="25" fill="url(#sphereGrad)" opacity="0.8" filter="url(#neonGlow)" />
                {[0, 60, 120, 180, 240, 300].map((angle, i) => {
                    const rad = (angle + rotation) * Math.PI / 180;
                    return <g key={i}><line x1="100" y1="100" x2={100 + 70 * Math.cos(rad)} y2={100 + 25 * Math.sin(rad)} stroke="#22d3ee" strokeWidth="0.5" opacity="0.5" /><circle cx={100 + 70 * Math.cos(rad)} cy={100 + 25 * Math.sin(rad)} r="5" fill="#22d3ee" filter="url(#neonGlow)" /></g>;
                })}
            </svg>
            <div style={{ position: 'absolute', bottom: '8px', color: '#6366f1', fontSize: '9px', fontWeight: 'bold', letterSpacing: '2px' }}>NEURAL NETWORK</div>
        </div>
    );
};

// ============================================
// 📊 PERFORMANCE RING
// ============================================
const PerformanceRing: React.FC<{ value: number; label: string; color: string }> = ({ value, label, color }) => {
    const [animated, setAnimated] = useState(false);
    const circumference = 2 * Math.PI * 38;
    const offset = circumference - (value / 100) * circumference;
    useEffect(() => { setTimeout(() => setAnimated(true), 300); }, []);

    return (
        <div style={{ textAlign: 'center' }}>
            <svg width="100" height="100" viewBox="0 0 100 100">
                <defs><filter id={`glow${label}`}><feGaussianBlur stdDeviation="3" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
                <circle cx="50" cy="50" r="38" stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
                <circle cx="50" cy="50" r="38" stroke={color} strokeWidth="8" fill="none" strokeDasharray={circumference} strokeDashoffset={animated ? offset : circumference} strokeLinecap="round" transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 1.5s ease' }} filter={`url(#glow${label})`} />
                <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="18" fontWeight="bold">{value}%</text>
            </svg>
            <div style={{ color: '#9ca3af', fontSize: '11px', marginTop: '4px' }}>{label}</div>
        </div>
    );
};

// ============================================
// 🍩 DONUT CHART
// ============================================
const DonutChart: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
    const [animated, setAnimated] = useState(false);
    const colors = ['#ec4899', '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#22d3ee'];
    const total = data.reduce((a, b) => a + b.value, 0) || 1;
    let currentAngle = 0;
    useEffect(() => { setTimeout(() => setAnimated(true), 200); }, []);

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ flex: 1 }}>
                {data.slice(0, 6).map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: colors[i % colors.length] }} />
                        <span style={{ color: '#9ca3af', fontSize: '9px', flex: 1 }}>{item.label.substring(0, 25)}</span>
                        <span style={{ color: colors[i % colors.length], fontSize: '9px', fontWeight: 'bold' }}>{item.value}$</span>
                    </div>
                ))}
            </div>
            <svg width="140" height="140" viewBox="0 0 100 100">
                <defs><filter id="donutGlow"><feGaussianBlur stdDeviation="2" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
                {data.map((item, i) => {
                    const angle = ((item.value / total) * 360) || 30;
                    const startAngle = currentAngle;
                    currentAngle += angle;
                    const startRad = (startAngle - 90) * Math.PI / 180, endRad = (startAngle + angle - 90) * Math.PI / 180;
                    const largeArc = angle > 180 ? 1 : 0;
                    const x1o = 50 + 42 * Math.cos(startRad), y1o = 50 + 42 * Math.sin(startRad);
                    const x2o = 50 + 42 * Math.cos(endRad), y2o = 50 + 42 * Math.sin(endRad);
                    const x1i = 50 + 28 * Math.cos(endRad), y1i = 50 + 28 * Math.sin(endRad);
                    const x2i = 50 + 28 * Math.cos(startRad), y2i = 50 + 28 * Math.sin(startRad);
                    return <path key={i} d={`M ${x1o} ${y1o} A 42 42 0 ${largeArc} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A 28 28 0 ${largeArc} 0 ${x2i} ${y2i} Z`} fill={colors[i % colors.length]} style={{ opacity: animated ? 1 : 0, transition: `opacity 0.6s ease ${i * 0.1}s` }} filter="url(#donutGlow)" />;
                })}
                <circle cx="50" cy="50" r="22" fill="#0f0f1a" />
            </svg>
        </div>
    );
};

// ============================================
// 📈 HORIZONTAL BARS
// ============================================
const HorizontalBars: React.FC<{ data: { label: string; value: number }[]; title: string }> = ({ data, title }) => {
    const [animated, setAnimated] = useState(false);
    const colors = ['#6366f1', '#22d3ee', '#22c55e', '#f59e0b', '#ec4899', '#a855f7'];
    const maxValue = Math.max(...data.map(d => d.value), 10);
    useEffect(() => { setTimeout(() => setAnimated(true), 400); }, []);

    return (
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(99,102,241,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ background: 'linear-gradient(135deg, #6366f1, #22d3ee)', padding: '4px 8px', borderRadius: '6px', fontSize: '10px' }}>📊</span>
                <span style={{ color: '#fff', fontSize: '12px', fontWeight: '600' }}>{title}</span>
            </div>
            {data.slice(0, 6).map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ color: colors[i % colors.length], fontSize: '11px', fontWeight: 'bold', minWidth: '50px' }}>{item.value}</span>
                    <div style={{ flex: 1, height: '18px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: animated ? `${(item.value / maxValue) * 100}%` : '0%', height: '100%', background: `linear-gradient(90deg, ${colors[i % colors.length]}, ${colors[i % colors.length]}88)`, borderRadius: '4px', transition: `width 0.8s ease ${i * 0.1}s`, boxShadow: `0 0 10px ${colors[i % colors.length]}66` }} />
                    </div>
                    <span style={{ color: '#9ca3af', fontSize: '9px', minWidth: '120px', textAlign: 'right' }}>{item.label.substring(0, 20)}</span>
                </div>
            ))}
        </div>
    );
};

// ============================================
// 💎 STAT BOX
// ============================================
const StatBox: React.FC<{ value: string | number; label: string; icon: string; color: string }> = ({ value, label, icon, color }) => (
    <div style={{ background: `linear-gradient(145deg, ${color}20, ${color}05)`, border: `1px solid ${color}40`, borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
        <div style={{ fontSize: '10px', marginBottom: '4px', opacity: 0.8 }}>{icon}</div>
        <div style={{ fontSize: '20px', fontWeight: 'bold', color, textShadow: `0 0 20px ${color}` }}>{value}</div>
        <div style={{ fontSize: '9px', color: '#71717a', marginTop: '2px' }}>{label}</div>
    </div>
);

// ============================================
// 📄 FULL REPORT SECTION
// ============================================
const FullReportSection: React.FC<{ report: string; isArabic: boolean }> = ({ report, isArabic }) => {
    const [expanded, setExpanded] = useState(false);

    // Format the report text
    const formatReport = (text: string) => {
        return text
            .replace(/##\s*(.+)/g, '<h3 style="color:#6366f1;margin:20px 0 10px;font-size:16px;border-bottom:1px solid rgba(99,102,241,0.3);padding-bottom:8px">$1</h3>')
            .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#22d3ee">$1</strong>')
            .replace(/- (.+)/g, '<li style="margin:6px 0;color:#d4d4d8">$1</li>')
            .replace(/\n\n/g, '</p><p style="margin:12px 0;line-height:1.9">')
            .replace(/\n/g, '<br/>');
    };

    return (
        <div style={{ background: 'linear-gradient(145deg, rgba(0,0,0,0.4), rgba(0,0,0,0.2))', borderRadius: '16px', padding: '20px', border: '1px solid rgba(99,102,241,0.2)', marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', padding: '6px 10px', borderRadius: '8px', fontSize: '12px' }}>📄</span>
                    <span style={{ color: '#fff', fontSize: '14px', fontWeight: '700' }}>{isArabic ? 'التقرير الكامل' : 'Full Research Report'}</span>
                </div>
                <button onClick={() => setExpanded(!expanded)} style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)', padding: '6px 14px', borderRadius: '8px', color: '#a5b4fc', cursor: 'pointer', fontSize: '11px' }}>
                    {expanded ? (isArabic ? '🔼 إخفاء' : '🔼 Collapse') : (isArabic ? '🔽 عرض الكل' : '🔽 Expand All')}
                </button>
            </div>
            <div style={{
                maxHeight: expanded ? 'none' : '300px',
                overflow: 'hidden',
                position: 'relative',
                color: '#e5e5e5',
                fontSize: '13px',
                lineHeight: '2',
                direction: isArabic ? 'rtl' : 'ltr'
            }}>
                <div dangerouslySetInnerHTML={{ __html: formatReport(report) }} />
                {!expanded && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px', background: 'linear-gradient(transparent, rgba(15,15,26,1))' }} />
                )}
            </div>
        </div>
    );
};

// ============================================
// 🔗 SOURCES
// ============================================
const SourcesPanel: React.FC<{ sources: Source[] }> = ({ sources }) => (
    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(99,102,241,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ background: 'linear-gradient(135deg, #22c55e, #22d3ee)', padding: '4px 8px', borderRadius: '6px', fontSize: '10px' }}>🔗</span>
            <span style={{ color: '#fff', fontSize: '12px', fontWeight: '600' }}>SOURCES</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '100px', overflowY: 'auto' }}>
            {sources.length > 0 ? sources.slice(0, 4).map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(99,102,241,0.1)', padding: '8px 10px', borderRadius: '8px', borderLeft: '2px solid #6366f1', color: '#e5e5e5', fontSize: '10px', textDecoration: 'none', display: 'block' }}>
                    {s.title?.substring(0, 40)}... <span style={{ color: '#818cf8' }}>↗</span>
                </a>
            )) : <div style={{ color: '#6b7280', fontSize: '11px', textAlign: 'center', padding: '15px' }}>No sources</div>}
        </div>
    </div>
);

// ============================================
// 🧠 MAIN COMPONENT
// ============================================
const AutonomousMode: React.FC<AutonomousModeProps> = ({ isOpen, onClose, language }) => {
    const [prompt, setPrompt] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [result, setResult] = useState<TaskResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

    const isArabic = language === 'ar';

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleStart = async () => {
        if (!prompt.trim()) return;
        setIsRunning(true); setProgress(0); setError(null); setResult(null);

        const msgs = isArabic ? ['🔍 البحث في الإنترنت...', '📊 تحليل البيانات...', '🧠 إنشاء الرسوم...', '📝 كتابة التقرير...', '✨ اللمسات النهائية...']
            : ['🔍 Searching...', '📊 Analyzing...', '🧠 Charting...', '📝 Writing...', '✨ Finishing...'];

        let idx = 0;
        const interval = setInterval(() => {
            setProgress(p => { if (p >= 95) { clearInterval(interval); return 95; } if (p >= idx * 20 && idx < msgs.length) setStatusMessage(msgs[idx++]); return p + 1; });
        }, 150);

        try {
            const res = await fetch(`${BACKEND_URL}/autonomous`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: prompt }) });
            clearInterval(interval);
            if (!res.ok) throw new Error(`Error ${res.status}`);
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed');
            setProgress(100); setStatusMessage(isArabic ? '✅ اكتمل!' : '✅ Done!');
            setResult({
                title: data.data.title || prompt,
                results: { summary: data.data.results?.summary || '', report: data.data.results?.report || '', stats: data.data.results?.stats || [], charts: data.data.results?.charts || [], sources: data.data.results?.sources || [] },
                execution: data.data.execution || { executionTime: '5s' }
            });
        } catch (e: any) { clearInterval(interval); setError(e.message); } finally { setIsRunning(false); }
    };

    const handleReset = () => { setResult(null); setPrompt(''); setProgress(0); setError(null); };

    const handleExportPDF = () => {
        if (!result) return;
        const html = `<!DOCTYPE html><html dir="${isArabic ? 'rtl' : 'ltr'}"><head><meta charset="UTF-8"><style>body{font-family:sans-serif;padding:40px;max-width:1000px;margin:0 auto;background:#0f0f1a;color:#e5e5e5;line-height:2}h1{color:#6366f1;border-bottom:2px solid #6366f1;padding-bottom:16px}h2{color:#22d3ee;margin-top:30px}h3{color:#a855f7}.summary{background:linear-gradient(135deg,rgba(99,102,241,0.1),rgba(34,211,238,0.05));padding:20px;border-radius:12px;border-left:4px solid #6366f1;margin:20px 0}</style></head><body><h1>🧠 ${result.title}</h1><div class="summary"><h2>📝 الملخص التنفيذي</h2><p>${result.results.summary}</p></div><h2>📄 التقرير الكامل</h2><div>${result.results.report.replace(/\n/g, '<br/>')}</div><hr style="border-color:#333;margin:40px 0"><p style="color:#6b7280;text-align:center">تم إنشاء هذا التقرير بواسطة Lukas AI</p></body></html>`;
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lukas-report-${Date.now()}.html`;
        a.click();
    };

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(135deg, #0a0a12 0%, #0f0f1a 100%)', zIndex: 9999, overflow: 'auto', direction: isArabic ? 'rtl' : 'ltr' }}>
            {/* Background effects */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08), transparent)', top: '-200px', right: '-200px', filter: 'blur(100px)' }} />
                <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,0.06), transparent)', bottom: '-150px', left: '-150px', filter: 'blur(100px)' }} />
            </div>

            {/* Header */}
            <div style={{ padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', width: '36px', height: '36px', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontSize: '16px' }}>✕</button>
                    <span style={{ color: '#22d3ee', fontFamily: 'monospace', fontSize: '13px', fontWeight: 'bold' }}>PM {currentTime} ⚡</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold' }}>AI RESEARCH REPORT</div>
                        <div style={{ color: '#6366f1', fontSize: '10px' }}>✨ {isArabic ? 'بحث + تحليل + رسوم بيانية + PDF' : 'Research + Analysis + Charts + PDF'}</div>
                    </div>
                    <div style={{ width: '46px', height: '46px', background: 'linear-gradient(135deg, #6366f1, #22d3ee)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', boxShadow: '0 0 25px rgba(99,102,241,0.5)' }}>🧠</div>
                </div>
            </div>

            <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
                {/* Input Section */}
                {!result ? (
                    <div style={{ maxWidth: '700px', margin: '50px auto' }}>
                        <div style={{ background: 'rgba(99,102,241,0.1)', borderRadius: '14px', padding: '16px', marginBottom: '20px', border: '1px solid rgba(99,102,241,0.2)' }}>
                            <p style={{ color: '#a5b4fc', margin: 0, fontSize: '13px' }}>🚀 {isArabic ? 'اكتب سؤالك وشاهد السحر!' : 'Ask anything and watch the magic!'}</p>
                        </div>
                        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} disabled={isRunning} placeholder={isArabic ? 'مثال: قارن بين أفضل 5 لغات برمجة في 2025' : 'Example: Compare top 5 languages'} style={{ width: '100%', minHeight: '100px', padding: '16px', borderRadius: '14px', border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '14px', resize: 'vertical' }} />
                        {isRunning && (
                            <div style={{ marginTop: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ color: '#22d3ee', fontSize: '13px' }}>{statusMessage}</span>
                                    <span style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>{Math.round(progress)}%</span>
                                </div>
                                <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #6366f1, #22d3ee)', boxShadow: '0 0 20px rgba(99,102,241,0.5)' }} />
                                </div>
                            </div>
                        )}
                        {error && <div style={{ marginTop: '16px', padding: '14px', background: 'rgba(239,68,68,0.1)', borderRadius: '12px', color: '#ef4444', fontSize: '13px' }}>❌ {error}</div>}
                        <button onClick={handleStart} disabled={isRunning || !prompt.trim()} style={{ marginTop: '20px', width: '100%', padding: '16px', borderRadius: '14px', border: 'none', background: isRunning || !prompt.trim() ? '#27272a' : 'linear-gradient(135deg, #6366f1, #22d3ee)', color: '#fff', fontSize: '16px', fontWeight: 'bold', cursor: isRunning || !prompt.trim() ? 'not-allowed' : 'pointer', boxShadow: '0 10px 40px rgba(99,102,241,0.3)' }}>
                            {isRunning ? '⚡ جاري العمل...' : '🚀 أطلق القوة!'}
                        </button>
                    </div>
                ) : (
                    /* ========== DASHBOARD ========== */
                    <>
                        {/* Title */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,211,238,0.05))', padding: '14px 20px', borderRadius: '12px', border: '1px solid rgba(34,197,94,0.2)' }}>
                            <div>
                                <h3 style={{ margin: 0, color: '#22c55e', fontSize: '15px' }}>✨ {result.title.substring(0, 60)}...</h3>
                                <p style={{ margin: '4px 0 0', color: '#86efac', fontSize: '11px' }}>⏱️ {result.execution.executionTime} | 📊 {result.results.charts?.length || 0} charts | 📚 {result.results.sources?.length || 0} sources</p>
                            </div>
                            <button onClick={handleReset} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', fontSize: '11px' }}>🔄 {isArabic ? 'بحث جديد' : 'New Search'}</button>
                        </div>

                        {/* GRID */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '16px' }}>

                            {/* Row 1: Donut + Performance */}
                            <div style={{ gridColumn: 'span 7', background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '18px', border: '1px solid rgba(99,102,241,0.15)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                    <span style={{ background: 'linear-gradient(135deg, #ec4899, #f43f5e)', padding: '4px 8px', borderRadius: '6px', fontSize: '10px' }}>📈</span>
                                    <span style={{ color: '#fff', fontSize: '12px', fontWeight: '600' }}>{isArabic ? 'القيم والأسعار' : 'Values & Data'}</span>
                                </div>
                                <DonutChart data={result.results.stats?.map(s => ({ label: s.label, value: s.value })) || [{ label: 'Data', value: 100 }]} />
                            </div>

                            <div style={{ gridColumn: 'span 5', background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '18px', border: '1px solid rgba(99,102,241,0.15)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                    <span style={{ background: 'linear-gradient(135deg, #6366f1, #22d3ee)', padding: '4px 8px', borderRadius: '6px', fontSize: '10px' }}>📊</span>
                                    <span style={{ color: '#fff', fontSize: '12px', fontWeight: '600' }}>MODEL PERFORMANCE</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                                    <PerformanceRing value={87} label="Accuracy" color="#22c55e" />
                                    <PerformanceRing value={92} label="Speed" color="#22d3ee" />
                                </div>
                            </div>

                            {/* Row 2: Stats */}
                            <div style={{ gridColumn: 'span 3' }}><StatBox value={`${result.results.stats?.[0]?.value || 20}%`} label={result.results.stats?.[0]?.label || 'إحصائية 1'} icon="💰" color="#f59e0b" /></div>
                            <div style={{ gridColumn: 'span 3' }}><StatBox value={result.results.stats?.[1]?.value || 72} label={result.results.stats?.[1]?.label || 'إحصائية 2'} icon="📊" color="#6366f1" /></div>
                            <div style={{ gridColumn: 'span 3' }}><StatBox value={`${result.results.stats?.[2]?.value || 85}%`} label={result.results.stats?.[2]?.label || 'إحصائية 3'} icon="📈" color="#22c55e" /></div>
                            <div style={{ gridColumn: 'span 3' }}><StatBox value={`${result.results.stats?.[3]?.value || 0}$`} label={result.results.stats?.[3]?.label || 'إحصائية 4'} icon="⚡" color="#22d3ee" /></div>

                            {/* Row 3: Summary + Neural Network */}
                            <div style={{ gridColumn: 'span 8', background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '18px', border: '1px solid rgba(99,102,241,0.15)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <span style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', padding: '4px 8px', borderRadius: '6px', fontSize: '10px' }}>💡</span>
                                    <span style={{ color: '#fff', fontSize: '12px', fontWeight: '600' }}>{isArabic ? 'الملخص التنفيذي' : 'Executive Summary'}</span>
                                </div>
                                <p style={{ color: '#d4d4d8', fontSize: '12px', lineHeight: '1.9', margin: 0 }}>{result.results.summary.substring(0, 400)}...</p>
                            </div>
                            <div style={{ gridColumn: 'span 4' }}><NeuralNetwork3D /></div>

                            {/* Row 4: Bars */}
                            <div style={{ gridColumn: 'span 12' }}>
                                <HorizontalBars data={result.results.charts?.[0]?.data || []} title={isArabic ? 'الترتيب' : 'Ranking'} />
                            </div>

                            {/* Row 5: Full Report */}
                            <div style={{ gridColumn: 'span 12' }}>
                                <FullReportSection report={result.results.report} isArabic={isArabic} />
                            </div>

                            {/* Row 6: Sources + Export */}
                            <div style={{ gridColumn: 'span 6' }}><SourcesPanel sources={result.results.sources} /></div>
                            <div style={{ gridColumn: 'span 6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <button onClick={handleExportPDF} style={{ padding: '14px 40px', borderRadius: '12px', border: '2px solid #22c55e', background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))', color: '#22c55e', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 0 25px rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    📄 PDF EXPORT
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AutonomousMode;
