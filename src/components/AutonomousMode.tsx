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
// 🌟 NEURAL NETWORK BACKGROUND
// ============================================
const NeuralNetworkBackground: React.FC = () => {
    const nodes = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        cx: 10 + Math.random() * 80,
        cy: 10 + Math.random() * 80,
        r: 2 + Math.random() * 3,
    }));

    const connections: { x1: number; y1: number; x2: number; y2: number }[] = [];
    nodes.forEach((n1, i) => {
        nodes.forEach((n2, j) => {
            if (i < j && Math.random() > 0.7) {
                connections.push({ x1: n1.cx, y1: n1.cy, x2: n2.cx, y2: n2.cy });
            }
        });
    });

    return (
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15, pointerEvents: 'none' }}>
            <defs>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            {connections.map((c, i) => (
                <line key={i} x1={`${c.x1}%`} y1={`${c.y1}%`} x2={`${c.x2}%`} y2={`${c.y2}%`}
                    stroke="url(#lineGrad)" strokeWidth="0.5" filter="url(#glow)" />
            ))}
            {nodes.map((n, i) => (
                <circle key={i} cx={`${n.cx}%`} cy={`${n.cy}%`} r={n.r}
                    fill="#6366f1" filter="url(#glow)">
                    <animate attributeName="opacity" values="0.5;1;0.5" dur={`${2 + Math.random() * 2}s`} repeatCount="indefinite" />
                </circle>
            ))}
        </svg>
    );
};

// ============================================
// 🔵 LARGE DONUT CHART (Main Chart)
// ============================================
const LargeDonutChart: React.FC<{ chart: ChartData }> = ({ chart }) => {
    const [animated, setAnimated] = useState(false);
    const colors = ['#6366f1', '#22d3ee', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'];

    useEffect(() => { setTimeout(() => setAnimated(true), 200); }, []);

    const total = chart.data.reduce((a, b) => a + b.value, 0);
    let currentAngle = 0;

    return (
        <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '20px', padding: '24px', border: '1px solid rgba(99,102,241,0.2)' }}>
            <h4 style={{ color: '#fff', marginBottom: '20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ background: 'linear-gradient(135deg, #6366f1, #22d3ee)', padding: '6px 10px', borderRadius: '8px', fontSize: '12px' }}>📊</span>
                {chart.title}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '30px' }}>
                <svg width="200" height="200" viewBox="0 0 100 100">
                    <defs>
                        <filter id="chartGlow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    {chart.data.map((item, i) => {
                        const angle = (item.value / total) * 360;
                        const startAngle = currentAngle;
                        currentAngle += angle;

                        const startRad = (startAngle - 90) * Math.PI / 180;
                        const endRad = (startAngle + angle - 90) * Math.PI / 180;
                        const largeArc = angle > 180 ? 1 : 0;

                        const x1 = 50 + 38 * Math.cos(startRad);
                        const y1 = 50 + 38 * Math.sin(startRad);
                        const x2 = 50 + 38 * Math.cos(endRad);
                        const y2 = 50 + 38 * Math.sin(endRad);

                        const path = `M 50 50 L ${x1} ${y1} A 38 38 0 ${largeArc} 1 ${x2} ${y2} Z`;

                        return (
                            <path key={i} d={path} fill={colors[i % colors.length]}
                                style={{
                                    opacity: animated ? 1 : 0,
                                    transform: animated ? 'scale(1)' : 'scale(0)',
                                    transformOrigin: '50px 50px',
                                    transition: `all 0.6s ease ${i * 0.1}s`,
                                }}
                                filter="url(#chartGlow)"
                            />
                        );
                    })}
                    <circle cx="50" cy="50" r="25" fill="#0a0a12" />
                    <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="12" fontWeight="bold">
                        {Math.round((chart.data[0]?.value / total) * 100)}%
                    </text>
                </svg>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {chart.data.map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: colors[i % colors.length], boxShadow: `0 0 12px ${colors[i % colors.length]}` }} />
                            <span style={{ color: '#a1a1aa', fontSize: '11px' }}>{item.label}</span>
                            <span style={{ color: '#fff', fontSize: '11px', fontWeight: '600' }}>{item.value}{chart.unit}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ============================================
// 🔷 PROGRESS RING (Performance Meters)
// ============================================
const ProgressRing: React.FC<{ value: number; max: number; label: string; color: string }> = ({ value, max, label, color }) => {
    const [animated, setAnimated] = useState(false);
    const percent = (value / max) * 100;
    const circumference = 2 * Math.PI * 35;
    const offset = circumference - (percent / 100) * circumference;

    useEffect(() => { setTimeout(() => setAnimated(true), 300); }, []);

    return (
        <div style={{ textAlign: 'center' }}>
            <svg width="90" height="90" viewBox="0 0 80 80">
                <defs>
                    <filter id={`ringGlow${label}`}>
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>
                <circle cx="40" cy="40" r="35" stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="none" />
                <circle cx="40" cy="40" r="35" stroke={color} strokeWidth="6" fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={animated ? offset : circumference}
                    strokeLinecap="round"
                    transform="rotate(-90 40 40)"
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                    filter={`url(#ringGlow${label})`}
                />
                <text x="40" y="40" textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="14" fontWeight="bold">
                    {Math.round(percent)}%
                </text>
            </svg>
            <div style={{ color: '#a1a1aa', fontSize: '10px', marginTop: '4px' }}>{label}</div>
        </div>
    );
};

// ============================================
// 📊 HORIZONTAL BAR CHART
// ============================================
const HorizontalBarChart: React.FC<{ chart: ChartData }> = ({ chart }) => {
    const [animated, setAnimated] = useState(false);
    const maxValue = Math.max(...chart.data.map(d => d.value));
    const colors = ['#6366f1', '#22d3ee', '#22c55e', '#f59e0b', '#ec4899'];

    useEffect(() => { setTimeout(() => setAnimated(true), 400); }, []);

    return (
        <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(99,102,241,0.2)' }}>
            <h4 style={{ color: '#fff', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: 'linear-gradient(135deg, #22c55e, #22d3ee)', padding: '5px 8px', borderRadius: '6px', fontSize: '11px' }}>📈</span>
                {chart.title}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {chart.data.map((item, i) => (
                    <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ color: '#9ca3af', fontSize: '11px' }}>{item.label}</span>
                            <span style={{ color: colors[i % colors.length], fontSize: '11px', fontWeight: '600' }}>{item.value}{chart.unit}</span>
                        </div>
                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                                width: animated ? `${(item.value / maxValue) * 100}%` : '0%',
                                height: '100%',
                                background: `linear-gradient(90deg, ${colors[i % colors.length]}, ${colors[i % colors.length]}88)`,
                                borderRadius: '4px',
                                transition: `width 0.8s ease ${i * 0.1}s`,
                                boxShadow: `0 0 12px ${colors[i % colors.length]}66`
                            }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================
// 💎 STATS CARD (Single)
// ============================================
const StatCard: React.FC<{ label: string; value: number | string; unit?: string; icon: string; color: string }> = ({ label, value, unit, icon, color }) => (
    <div style={{
        background: `linear-gradient(145deg, ${color}15, ${color}05)`,
        border: `1px solid ${color}30`,
        borderRadius: '12px',
        padding: '14px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
    }}>
        <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', width: '40px', height: '40px', background: `radial-gradient(circle, ${color}40, transparent)`, filter: 'blur(12px)' }} />
        <div style={{ fontSize: '10px', marginBottom: '4px' }}>{icon}</div>
        <div style={{ fontSize: '20px', fontWeight: 'bold', color, textShadow: `0 0 20px ${color}`, marginBottom: '2px' }}>
            {typeof value === 'number' ? value.toLocaleString() : value}{unit}
        </div>
        <div style={{ fontSize: '9px', color: '#71717a' }}>{label}</div>
    </div>
);

// ============================================
// 🔗 SOURCE CARD
// ============================================
const SourceCard: React.FC<{ source: Source; index: number }> = ({ source, index }) => (
    <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.1), transparent)',
        borderRadius: '10px',
        padding: '10px 12px',
        borderLeft: '3px solid #6366f1',
        transition: 'all 0.3s'
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: '#6366f1', color: '#fff', width: '20px', height: '20px', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>{index + 1}</span>
            <span style={{ color: '#e5e5e5', fontSize: '11px', flex: 1 }}>{source.title.substring(0, 40)}...</span>
        </div>
        {source.url && (
            <a href={source.url} target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', fontSize: '9px', textDecoration: 'none', marginTop: '4px', display: 'block' }}>
                🔗 {source.url.substring(0, 35)}...
            </a>
        )}
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
    const reportRef = useRef<HTMLDivElement>(null);

    const isArabic = language === 'ar';

    // Update time every second
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleStart = async () => {
        if (!prompt.trim()) return;
        setIsRunning(true);
        setProgress(0);
        setError(null);
        setResult(null);

        const statusMessages = isArabic
            ? ['🔍 البحث في الإنترنت...', '📊 تحليل البيانات...', '🧠 إنشاء الرسوم البيانية...', '📝 كتابة التقرير...', '✨ اللمسات النهائية...']
            : ['🔍 Searching the web...', '📊 Analyzing data...', '🧠 Generating charts...', '📝 Writing report...', '✨ Final touches...'];

        let idx = 0;
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 95) { clearInterval(progressInterval); return 95; }
                if (prev >= idx * 20 && idx < statusMessages.length) { setStatusMessage(statusMessages[idx++]); }
                return prev + 1;
            });
        }, 150);

        try {
            const response = await fetch(`${BACKEND_URL}/autonomous`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: prompt })
            });

            clearInterval(progressInterval);

            if (!response.ok) throw new Error(`Error ${response.status}`);

            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Failed');

            setProgress(100);
            setStatusMessage(isArabic ? '✅ اكتمل!' : '✅ Complete!');
            setResult({
                title: prompt,
                results: { summary: data.data.summary || '', report: data.data.report || '', stats: data.data.stats || [], charts: data.data.charts || [], sources: data.data.sources || [] },
                execution: { executionTime: data.data.executionTime || '5s' }
            });
        } catch (err: any) {
            clearInterval(progressInterval);
            setError(err.message);
        } finally {
            setIsRunning(false);
        }
    };

    const handleReset = () => { setResult(null); setPrompt(''); setProgress(0); setError(null); };

    const handleExportPDF = () => {
        if (!result) return;
        const html = `<!DOCTYPE html><html><head><style>body{font-family:sans-serif;padding:40px;max-width:900px;margin:0 auto}h1{color:#6366f1}</style></head><body><h1>${result.title}</h1><p>${result.results.summary}</p><h2>Report</h2><p>${result.results.report}</p></body></html>`;
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lukas-report-${Date.now()}.html`;
        a.click();
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'linear-gradient(135deg, #0a0a12 0%, #0f0f1a 50%, #0a0a12 100%)',
            zIndex: 9999,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            direction: isArabic ? 'rtl' : 'ltr'
        }}>
            {/* Neural Network Background */}
            <NeuralNetworkBackground />

            {/* Floating Orbs */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12), transparent)', top: '-150px', right: '-150px', filter: 'blur(80px)' }} />
                <div style={{ position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,0.1), transparent)', bottom: '-100px', left: '-100px', filter: 'blur(80px)' }} />
            </div>

            {/* Main Container */}
            <div style={{
                background: 'rgba(15,15,25,0.9)',
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                width: '95%', maxWidth: '1200px', maxHeight: '90vh',
                overflow: 'hidden',
                border: '1px solid rgba(99,102,241,0.2)',
                boxShadow: '0 0 100px rgba(99,102,241,0.15), 0 40px 80px rgba(0,0,0,0.5)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'linear-gradient(90deg, rgba(99,102,241,0.08), rgba(34,211,238,0.05))'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            width: '48px', height: '48px',
                            background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
                            borderRadius: '14px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '24px',
                            boxShadow: '0 0 30px rgba(99,102,241,0.5)'
                        }}>🧠</div>
                        <div>
                            <h2 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: '700' }}>
                                AI RESEARCH REPORT
                            </h2>
                            <p style={{ margin: 0, color: '#6366f1', fontSize: '11px' }}>
                                ⚡ {isArabic ? 'بحث + تحليل + رسوم بيانية + PDF' : 'Research + Analysis + Charts + PDF'}
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ color: '#22d3ee', fontSize: '14px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                            ⏱️ {currentTime}
                        </div>
                        <button onClick={onClose} disabled={isRunning} style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            width: '36px', height: '36px',
                            borderRadius: '10px',
                            color: '#fff',
                            cursor: isRunning ? 'not-allowed' : 'pointer',
                            opacity: isRunning ? 0.5 : 1
                        }}>✕</button>
                    </div>
                </div>

                {/* Content */}
                <div ref={reportRef} style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(90vh - 90px)' }}>
                    {/* Input Section */}
                    {!result && (
                        <>
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(34,211,238,0.05))',
                                borderRadius: '14px', padding: '16px', marginBottom: '20px',
                                border: '1px solid rgba(99,102,241,0.2)'
                            }}>
                                <p style={{ color: '#a5b4fc', margin: 0, fontSize: '13px' }}>
                                    🚀 {isArabic ? 'اكتب سؤالك وشاهد السحر!' : 'Ask anything and watch the magic!'}
                                </p>
                            </div>

                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                disabled={isRunning}
                                placeholder={isArabic ? 'مثال: قارن بين أفضل 5 لغات برمجة في 2025' : 'Example: Compare top 5 programming languages in 2025'}
                                style={{
                                    width: '100%', minHeight: '100px', padding: '16px',
                                    borderRadius: '14px',
                                    border: '1px solid rgba(99,102,241,0.2)',
                                    background: 'rgba(0,0,0,0.4)',
                                    color: '#fff', fontSize: '14px',
                                    resize: 'vertical',
                                    direction: isArabic ? 'rtl' : 'ltr'
                                }}
                            />

                            {isRunning && (
                                <div style={{ marginTop: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: '#22d3ee', fontSize: '13px' }}>{statusMessage}</span>
                                        <span style={{ color: '#fff', fontSize: '13px', fontWeight: '700' }}>{Math.round(progress)}%</span>
                                    </div>
                                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%', width: `${progress}%`,
                                            background: 'linear-gradient(90deg, #6366f1, #22d3ee)',
                                            transition: 'width 0.3s',
                                            boxShadow: '0 0 20px rgba(99,102,241,0.5)'
                                        }} />
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div style={{ marginTop: '16px', padding: '14px', background: 'rgba(239,68,68,0.1)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)' }}>
                                    <p style={{ color: '#ef4444', margin: 0, fontSize: '13px' }}>❌ {error}</p>
                                </div>
                            )}

                            <button
                                onClick={handleStart}
                                disabled={isRunning || !prompt.trim()}
                                style={{
                                    marginTop: '20px', width: '100%', padding: '16px',
                                    borderRadius: '14px', border: 'none',
                                    background: isRunning || !prompt.trim() ? '#27272a' : 'linear-gradient(135deg, #6366f1, #22d3ee)',
                                    color: '#fff', fontSize: '16px', fontWeight: '700',
                                    cursor: isRunning || !prompt.trim() ? 'not-allowed' : 'pointer',
                                    boxShadow: isRunning || !prompt.trim() ? 'none' : '0 10px 40px rgba(99,102,241,0.4)'
                                }}
                            >
                                {isRunning ? '⚡ جاري العمل...' : '🚀 أطلق القوة!'}
                            </button>
                        </>
                    )}

                    {/* RESULTS DASHBOARD */}
                    {result && (
                        <>
                            {/* Result Header */}
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,211,238,0.08))',
                                borderRadius: '14px', padding: '16px', marginBottom: '24px',
                                border: '1px solid rgba(34,197,94,0.3)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'
                            }}>
                                <div>
                                    <h3 style={{ color: '#22c55e', margin: 0, fontSize: '16px', fontWeight: '700' }}>✨ {result.title}</h3>
                                    <p style={{ color: '#86efac', margin: '4px 0 0', fontSize: '11px' }}>
                                        ⏱️ {result.execution.executionTime} | 📊 {result.results.charts?.length || 0} charts | 📚 {result.results.sources.length} sources
                                    </p>
                                </div>
                                <button onClick={handleReset} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', fontSize: '12px' }}>
                                    🔄 {isArabic ? 'بحث جديد' : 'New Search'}
                                </button>
                            </div>

                            {/* DASHBOARD GRID */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px' }}>

                                {/* Left Column - Main Charts */}
                                <div style={{ gridColumn: 'span 8' }}>
                                    {/* Main Donut Chart */}
                                    {result.results.charts?.[0] && (
                                        <LargeDonutChart chart={result.results.charts[0]} />
                                    )}

                                    {/* Bar Chart */}
                                    {result.results.charts?.[1] && (
                                        <div style={{ marginTop: '20px' }}>
                                            <HorizontalBarChart chart={result.results.charts[1]} />
                                        </div>
                                    )}

                                    {/* Summary */}
                                    <div style={{ marginTop: '20px', background: 'rgba(0,0,0,0.4)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(99,102,241,0.2)' }}>
                                        <h4 style={{ color: '#fff', marginBottom: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', padding: '5px 8px', borderRadius: '6px', fontSize: '11px' }}>💡</span>
                                            {isArabic ? 'الملخص التنفيذي' : 'Executive Summary'}
                                        </h4>
                                        <p style={{ color: '#d4d4d8', lineHeight: '1.8', margin: 0, fontSize: '12px' }}>{result.results.summary}</p>
                                    </div>
                                </div>

                                {/* Right Column - Stats & Sources */}
                                <div style={{ gridColumn: 'span 4' }}>
                                    {/* Performance Rings */}
                                    <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(99,102,241,0.2)', marginBottom: '20px' }}>
                                        <h4 style={{ color: '#fff', marginBottom: '16px', fontSize: '12px' }}>📊 MODEL PERFORMANCE</h4>
                                        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '10px' }}>
                                            <ProgressRing value={87} max={100} label="Accuracy" color="#22c55e" />
                                            <ProgressRing value={92} max={100} label="Speed" color="#22d3ee" />
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    {result.results.stats && result.results.stats.length > 0 && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
                                            {result.results.stats.slice(0, 4).map((stat, i) => (
                                                <StatCard
                                                    key={i}
                                                    label={stat.label}
                                                    value={stat.value}
                                                    unit={stat.unit}
                                                    icon={['📊', '💰', '📈', '⚡'][i] || '📊'}
                                                    color={['#6366f1', '#22c55e', '#f59e0b', '#22d3ee'][i % 4]}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* Sources */}
                                    <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(99,102,241,0.2)' }}>
                                        <h4 style={{ color: '#fff', marginBottom: '12px', fontSize: '12px' }}>🔗 {isArabic ? 'المصادر' : 'SOURCES'}</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                                            {result.results.sources.slice(0, 5).map((s, i) => (
                                                <SourceCard key={i} source={s} index={i} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Export Button */}
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
                                <button onClick={handleExportPDF} style={{
                                    padding: '14px 40px',
                                    borderRadius: '12px', border: 'none',
                                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                    color: '#fff', fontSize: '14px', fontWeight: '600',
                                    cursor: 'pointer',
                                    boxShadow: '0 8px 30px rgba(34,197,94,0.4)',
                                    display: 'flex', alignItems: 'center', gap: '8px'
                                }}>
                                    📄 {isArabic ? 'تصدير PDF' : 'Export PDF'}
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
