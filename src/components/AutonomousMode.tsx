import React, { useState, useEffect } from 'react';
import { StreamingMarkdownRenderer } from './StreamingMarkdownRenderer';

interface AutonomousModeProps {
    isOpen: boolean;
    onClose: () => void;
    language: 'ar' | 'en';
}

interface ChartData { type: string; title: string; data: { label: string; value: number }[]; unit: string; color: string; }
interface Source { title: string; url: string; }
interface TaskResult { title: string; results: { summary: string; report: string; stats: { label: string; value: number; unit: string }[]; charts: ChartData[]; sources: Source[]; }; execution: { executionTime: string; }; }

const BACKEND_URL = '/api';

// ============================================
// 🌌 NEURAL NETWORK (Enhanced)
// ============================================
const NeuralNetwork: React.FC = () => {
    const [rotation, setRotation] = useState(0);
    useEffect(() => { const interval = setInterval(() => setRotation(p => (p + 0.3) % 360), 30); return () => clearInterval(interval); }, []);
    return (
        <div style={{
            height: '200px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.15) 0%, rgba(34,211,238,0.05) 50%, transparent 70%)',
            position: 'relative'
        }}>
            {/* Outer glow ring */}
            <div style={{ position: 'absolute', width: '140px', height: '140px', borderRadius: '50%', border: '1px solid rgba(99,102,241,0.2)', animation: 'pulse 3s infinite' }} />
            <div style={{ position: 'absolute', width: '170px', height: '170px', borderRadius: '50%', border: '1px solid rgba(34,211,238,0.1)' }} />

            <svg width="130" height="130" viewBox="0 0 200 200">
                <defs>
                    <filter id="neuralGlow">
                        <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                        <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <linearGradient id="neuralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="50%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                    <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.4" />
                    </radialGradient>
                </defs>
                {/* Orbits */}
                <ellipse cx="100" cy="100" rx="75" ry="28" fill="none" stroke="url(#neuralGrad)" strokeWidth="1.5" opacity="0.6" filter="url(#neuralGlow)" />
                <ellipse cx="100" cy="100" rx="28" ry="75" fill="none" stroke="url(#neuralGrad)" strokeWidth="1.5" opacity="0.5" transform={`rotate(${rotation} 100 100)`} />
                <ellipse cx="100" cy="100" rx="55" ry="55" fill="none" stroke="url(#neuralGrad)" strokeWidth="0.5" opacity="0.3" strokeDasharray="5 5" />
                {/* Center core */}
                <circle cx="100" cy="100" r="25" fill="url(#centerGlow)" filter="url(#neuralGlow)" />
                <circle cx="100" cy="100" r="12" fill="#22d3ee" opacity="0.9" />
                {/* Nodes */}
                {[0, 60, 120, 180, 240, 300].map((a, i) => {
                    const r = (a + rotation) * Math.PI / 180;
                    const x = 100 + 68 * Math.cos(r);
                    const y = 100 + 25 * Math.sin(r);
                    return (
                        <g key={i}>
                            <line x1="100" y1="100" x2={x} y2={y} stroke="#22d3ee" strokeWidth="0.8" opacity="0.4" />
                            <circle cx={x} cy={y} r="6" fill="#22d3ee" filter="url(#neuralGlow)" />
                            <circle cx={x} cy={y} r="3" fill="#fff" opacity="0.8" />
                        </g>
                    );
                })}
            </svg>
            <div style={{
                color: '#6366f1',
                fontSize: '10px',
                fontWeight: '700',
                letterSpacing: '3px',
                marginTop: '12px',
                textShadow: '0 0 20px rgba(99,102,241,0.5)'
            }}>NEURAL NETWORK</div>
        </div>
    );
};

// ============================================
// 📊 PERFORMANCE RING (Enhanced)
// ============================================
const Ring: React.FC<{ value: number; label: string; color: string }> = ({ value, label, color }) => {
    const [anim, setAnim] = useState(false);
    const c = 2 * Math.PI * 38, o = c - (value / 100) * c;
    useEffect(() => { setTimeout(() => setAnim(true), 300); }, []);

    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
                {/* Outer glow */}
                <div style={{
                    position: 'absolute',
                    inset: '-8px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`
                }} />
                <svg width="100" height="100" viewBox="0 0 100 100">
                    <defs>
                        <filter id={`ringGlow${label}`}>
                            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                        <linearGradient id={`ringGrad${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={color} />
                            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
                        </linearGradient>
                    </defs>
                    {/* Background circle */}
                    <circle cx="50" cy="50" r="38" stroke="rgba(255,255,255,0.06)" strokeWidth="8" fill="none" />
                    {/* Progress circle */}
                    <circle
                        cx="50" cy="50" r="38"
                        stroke={`url(#ringGrad${label})`}
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={c}
                        strokeDashoffset={anim ? o : c}
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                        style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
                        filter={`url(#ringGlow${label})`}
                    />
                    {/* Value text */}
                    <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="18" fontWeight="700">{value}%</text>
                </svg>
            </div>
            <div style={{ color: '#a1a1aa', fontSize: '11px', marginTop: '8px', fontWeight: '500' }}>{label}</div>
        </div>
    );
};

// ============================================
// 🍩 DONUT CHART (Enhanced)
// ============================================
const Donut: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
    const colors = ['#ec4899', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7'];
    const total = data.reduce((a, b) => a + b.value, 0) || 1;
    let angle = 0;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ position: 'relative' }}>
                {/* Outer glow */}
                <div style={{ position: 'absolute', inset: '-15px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.15) 0%, transparent 70%)' }} />
                <svg width="130" height="130" viewBox="0 0 100 100">
                    <defs>
                        <filter id="donutGlow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                    </defs>
                    {data.slice(0, 7).map((item, i) => {
                        const a = ((item.value / total) * 360) || 25, s = angle; angle += a;
                        const sr = (s - 90) * Math.PI / 180, er = (s + a - 90) * Math.PI / 180, la = a > 180 ? 1 : 0;
                        return <path key={i} d={`M 50 50 L ${50 + 44 * Math.cos(sr)} ${50 + 44 * Math.sin(sr)} A 44 44 0 ${la} 1 ${50 + 44 * Math.cos(er)} ${50 + 44 * Math.sin(er)} Z`} fill={colors[i % colors.length]} filter="url(#donutGlow)" style={{ opacity: 0.9 }} />;
                    })}
                    <circle cx="50" cy="50" r="28" fill="#0c0c14" />
                    <circle cx="50" cy="50" r="26" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                </svg>
            </div>
            <div style={{ flex: 1 }}>
                {data.slice(0, 6).map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', padding: '4px 0' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: colors[i % colors.length], boxShadow: `0 0 8px ${colors[i % colors.length]}66` }} />
                        <span style={{ color: '#a1a1aa', fontSize: '10px', flex: 1 }}>{item.label.substring(0, 18)}</span>
                        <span style={{ color: colors[i % colors.length], fontSize: '10px', fontWeight: '700' }}>{item.value}$</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================
// 📈 HORIZONTAL BARS (Enhanced)
// ============================================
const Bars: React.FC<{ data: { label: string; value: number }[]; title: string }> = ({ data, title }) => {
    const [anim, setAnim] = useState(false);
    const colors = ['#6366f1', '#06b6d4', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6'];
    const max = Math.max(...data.map(d => d.value), 10);
    useEffect(() => { setTimeout(() => setAnim(true), 400); }, []);

    return (
        <div style={{
            background: 'linear-gradient(145deg, rgba(15,15,25,0.8), rgba(10,10,18,0.9))',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid rgba(99,102,241,0.15)',
            boxShadow: '0 4px 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <span style={{
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    boxShadow: '0 4px 15px rgba(99,102,241,0.4)'
                }}>📊</span>
                <span style={{ color: '#fff', fontSize: '13px', fontWeight: '600' }}>{title}</span>
            </div>
            {data.slice(0, 6).map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <span style={{
                        color: colors[i % colors.length],
                        fontSize: '13px',
                        fontWeight: '700',
                        minWidth: '50px',
                        textShadow: `0 0 10px ${colors[i % colors.length]}66`
                    }}>{item.value}</span>
                    <div style={{
                        flex: 1,
                        height: '24px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <div style={{
                            width: anim ? `${(item.value / max) * 100}%` : '0%',
                            height: '100%',
                            background: `linear-gradient(90deg, ${colors[i % colors.length]}, ${colors[i % colors.length]}99)`,
                            borderRadius: '5px',
                            transition: `width 1s cubic-bezier(0.4, 0, 0.2, 1) ${i * 0.12}s`,
                            boxShadow: `0 0 20px ${colors[i % colors.length]}44, inset 0 1px 0 rgba(255,255,255,0.2)`
                        }} />
                    </div>
                    <span style={{ color: '#9ca3af', fontSize: '11px', minWidth: '130px', textAlign: 'right' }}>{item.label.substring(0, 20)}</span>
                </div>
            ))}
        </div>
    );
};

// ============================================
// 💎 STAT BOX (Enhanced)
// ============================================
const Stat: React.FC<{ value: string; label: string; icon: string; color: string }> = ({ value, label, icon, color }) => (
    <div style={{
        background: `linear-gradient(145deg, ${color}12, ${color}05)`,
        border: `1px solid ${color}25`,
        borderRadius: '14px',
        padding: '18px 16px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 4px 20px ${color}15`
    }}>
        {/* Corner glow */}
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '60px', height: '60px', borderRadius: '50%', background: `radial-gradient(circle, ${color}20 0%, transparent 70%)` }} />
        <div style={{ fontSize: '16px', marginBottom: '6px' }}>{icon}</div>
        <div style={{
            fontSize: '26px',
            fontWeight: '800',
            color,
            textShadow: `0 0 30px ${color}88`,
            letterSpacing: '-1px'
        }}>{value}</div>
        <div style={{ fontSize: '10px', color: '#71717a', marginTop: '6px', fontWeight: '500' }}>{label.substring(0, 15)}</div>
    </div>
);

// ============================================
// 📄 FULL REPORT (Enhanced)
// ============================================
const FullReport: React.FC<{ report: string; title: string; isArabic: boolean }> = ({ report, title, isArabic }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div style={{
            background: 'linear-gradient(145deg, rgba(15,15,25,0.8), rgba(10,10,18,0.9))',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid rgba(99,102,241,0.15)',
            boxShadow: '0 4px 30px rgba(0,0,0,0.3)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                        background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        boxShadow: '0 4px 15px rgba(168,85,247,0.4)'
                    }}>📄</span>
                    <span style={{ color: '#fff', fontSize: '13px', fontWeight: '600' }}>{isArabic ? 'التقرير الكامل' : 'Full Report'}</span>
                </div>
                <button onClick={() => setExpanded(!expanded)} style={{
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.1))',
                    border: '1px solid rgba(99,102,241,0.3)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    color: '#a5b4fc',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 10px rgba(99,102,241,0.2)'
                }}>
                    {expanded ? '🔼 ' + (isArabic ? 'إخفاء' : 'Hide') : '🔽 ' + (isArabic ? 'عرض الكل' : 'Show All')}
                </button>
            </div>
            <div style={{ color: '#22d3ee', fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>{title}</div>
            <div style={{ color: '#8b5cf6', fontSize: '12px', marginBottom: '12px', fontWeight: '500' }}># {isArabic ? 'الملخص التنفيذي' : 'Executive Summary'}</div>
            <div style={{
                color: '#d4d4d8',
                fontSize: '13px',
                lineHeight: '2.1',
                maxHeight: expanded ? 'none' : '180px',
                overflow: 'hidden',
                position: 'relative',
                direction: isArabic ? 'rtl' : 'ltr'
            }}>
                <StreamingMarkdownRenderer content={report} />
                {!expanded && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px', background: 'linear-gradient(transparent, rgba(12,12,20,1))' }} />}
            </div>
        </div>
    );
};

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
    const [time, setTime] = useState(new Date().toLocaleTimeString());

    const isArabic = language === 'ar';

    useEffect(() => { const t = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000); return () => clearInterval(t); }, []);

    const handleStart = async () => {
        if (!prompt.trim()) return;
        setIsRunning(true); setProgress(0); setError(null); setResult(null);
        const msgs = isArabic
            ? ['🔍 البحث في الإنترنت...', '📊 تحليل البيانات...', '🧠 إنشاء الرسوم البيانية...', '📝 كتابة التقرير...', '✨ اللمسات النهائية...']
            : ['🔍 Searching...', '📊 Analyzing...', '🧠 Charting...', '📝 Writing...', '✨ Finishing...'];
        let i = 0;
        const int = setInterval(() => { setProgress(p => { if (p >= 95) { clearInterval(int); return 95; } if (p >= i * 20 && i < msgs.length) setStatusMessage(msgs[i++]); return p + 1; }); }, 120);
        try {
            const res = await fetch(`${BACKEND_URL}/autonomous`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: prompt }) });
            clearInterval(int);
            if (!res.ok) throw new Error(`Error ${res.status}`);
            const d = await res.json();
            if (!d.success) throw new Error(d.error || 'Failed');
            setProgress(100); setStatusMessage(isArabic ? '✅ اكتمل!' : '✅ Complete!');
            setResult({ title: d.data.title || prompt, results: { summary: d.data.results?.summary || '', report: d.data.results?.report || '', stats: d.data.results?.stats || [], charts: d.data.results?.charts || [], sources: d.data.results?.sources || [] }, execution: d.data.execution || { executionTime: '5s' } });
        } catch (e: any) { clearInterval(int); setError(e.message); } finally { setIsRunning(false); }
    };

    const handleReset = () => { setResult(null); setPrompt(''); setProgress(0); setError(null); };

    const handlePDF = () => {
        if (!result) return;

        // Create styled HTML for PDF
        const statsHtml = result.results.stats?.map(s =>
            `<div style="background:linear-gradient(145deg,rgba(99,102,241,0.15),rgba(99,102,241,0.05));padding:20px;border-radius:12px;text-align:center;border:1px solid rgba(99,102,241,0.3)">
                <div style="font-size:28px;font-weight:800;color:#6366f1">${s.value}${s.unit || ''}</div>
                <div style="font-size:12px;color:#a1a1aa;margin-top:8px">${s.label}</div>
            </div>`
        ).join('') || '';

        const chartsHtml = result.results.charts?.map(chart =>
            `<div style="background:linear-gradient(145deg,rgba(15,15,25,0.9),rgba(10,10,18,0.95));padding:20px;border-radius:16px;border:1px solid rgba(99,102,241,0.2);margin:20px 0">
                <h3 style="color:#22d3ee;margin:0 0 15px 0">📊 ${chart.title}</h3>
                ${chart.data?.map((d, i) =>
                `<div style="display:flex;align-items:center;margin:10px 0">
                        <span style="color:#a1a1aa;min-width:150px">${d.label}</span>
                        <div style="flex:1;height:24px;background:rgba(255,255,255,0.05);border-radius:6px;overflow:hidden">
                            <div style="width:${(d.value / Math.max(...chart.data.map(x => x.value))) * 100}%;height:100%;background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:6px"></div>
                        </div>
                        <span style="color:#6366f1;font-weight:700;min-width:80px;text-align:right">${d.value.toLocaleString()}</span>
                    </div>`
            ).join('') || ''}
            </div>`
        ).join('') || '';

        const sourcesHtml = result.results.sources?.length > 0
            ? `<div style="background:linear-gradient(145deg,rgba(6,182,212,0.1),rgba(6,182,212,0.05));padding:20px;border-radius:16px;border:1px solid rgba(6,182,212,0.3);margin:25px 0">
                <h2 style="color:#22d3ee;margin:0 0 15px 0">📚 المصادر (${result.results.sources.length})</h2>
                ${result.results.sources.map((s, i) =>
                `<div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
                        <span style="color:#06b6d4">${i + 1}.</span>
                        <a href="${s.url}" style="color:#a5f3fc;text-decoration:none;margin-right:10px">${s.title}</a>
                    </div>`
            ).join('')}
            </div>`
            : '';

        const htmlContent = `
<!DOCTYPE html>
<html dir="${isArabic ? 'rtl' : 'ltr'}">
<head>
    <meta charset="UTF-8">
    <title>🧠 ${result.title}</title>
    <style>
        @media print {
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #0a0a12, #0f0f1a);
            color: #e5e5e5;
            padding: 40px;
            line-height: 1.8;
        }
        h1 { color: #6366f1; font-size: 32px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #6366f1; }
        h2 { color: #22d3ee; font-size: 20px; margin: 30px 0 15px 0; }
        h3 { color: #a855f7; font-size: 16px; margin: 20px 0 10px 0; }
        p, li { color: #d4d4d8; line-height: 2; }
        ul { padding-right: 20px; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 25px 0; }
        .summary-box { background: linear-gradient(145deg, rgba(245,158,11,0.1), rgba(245,158,11,0.05)); padding: 25px; border-radius: 16px; border-left: 4px solid #f59e0b; margin: 25px 0; }
        .report-box { background: linear-gradient(145deg, rgba(168,85,247,0.1), rgba(168,85,247,0.05)); padding: 25px; border-radius: 16px; border-left: 4px solid #a855f7; margin: 25px 0; white-space: pre-wrap; }
        strong { color: #fff; }
    </style>
</head>
<body>
    <h1>🧠 ${result.title}</h1>
    
    <div class="stats-grid">${statsHtml}</div>
    
    <div class="summary-box">
        <h2>💡 الملخص التنفيذي</h2>
        <p>${result.results.summary}</p>
    </div>
    
    ${chartsHtml}
    
    <div class="report-box">
        <h2>📄 التقرير الكامل</h2>
        <div>${result.results.report}</div>
    </div>
    
    ${sourcesHtml}
    
    <div style="text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.1);color:#71717a;font-size:12px">
        تم إنشاء هذا التقرير بواسطة لوكاس - ${new Date().toLocaleDateString('ar-EG')}
    </div>
</body>
</html>`;

        // Open in new window and trigger print
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            setTimeout(() => { printWindow.print(); }, 500);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(135deg, #0a0a12 0%, #0c0c14 50%, #0f0f1a 100%)', zIndex: 9999, overflow: 'auto', direction: isArabic ? 'rtl' : 'ltr' }}>
            {/* Background effects */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 60%)', top: '-200px', right: '-200px', filter: 'blur(60px)' }} />
                <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 60%)', bottom: '-150px', left: '-150px', filter: 'blur(60px)' }} />
                <div style={{ position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 60%)', top: '40%', left: '30%', filter: 'blur(80px)' }} />
            </div>

            {/* Header */}
            <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                padding: '14px 24px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(10,10,18,0.85)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 4px 30px rgba(0,0,0,0.3)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                        width: '46px',
                        height: '46px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #22d3ee)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        boxShadow: '0 4px 25px rgba(99,102,241,0.5), inset 0 1px 0 rgba(255,255,255,0.2)'
                    }}>🧠</div>
                    <div>
                        <div style={{ color: '#fff', fontSize: '16px', fontWeight: '700' }}>AI RESEARCH REPORT</div>
                        <div style={{ color: '#8b5cf6', fontSize: '10px', fontWeight: '500' }}>✨ {isArabic ? 'بحث + تحليل + رسوم بيانية + PDF' : 'Research + Analysis + Charts + PDF'}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{
                        color: '#22d3ee',
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        fontWeight: '700',
                        textShadow: '0 0 20px rgba(34,211,238,0.5)'
                    }}>⚡ PM {time}</span>
                    <button onClick={onClose} style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '16px',
                        transition: 'all 0.2s'
                    }}>✕</button>
                </div>
            </div>

            <div style={{ padding: '24px', maxWidth: '1350px', margin: '0 auto' }}>
                {!result ? (
                    /* INPUT SECTION */
                    <div style={{ maxWidth: '680px', margin: '70px auto' }}>
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))',
                            borderRadius: '16px',
                            padding: '20px',
                            marginBottom: '24px',
                            border: '1px solid rgba(99,102,241,0.2)',
                            boxShadow: '0 4px 30px rgba(99,102,241,0.15)'
                        }}>
                            <p style={{ color: '#a5b4fc', margin: 0, fontSize: '14px', fontWeight: '500' }}>🚀 {isArabic ? 'اكتب سؤالك وشاهد السحر!' : 'Ask anything and watch the magic!'}</p>
                        </div>
                        <textarea
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            disabled={isRunning}
                            placeholder={isArabic ? 'مثال: قارن بين أفضل 10 وظائف في مجال الـ AI في 2025' : 'Example: Top 10 AI jobs in 2025'}
                            style={{
                                width: '100%',
                                minHeight: '110px',
                                padding: '18px',
                                borderRadius: '14px',
                                border: '1px solid rgba(99,102,241,0.2)',
                                background: 'rgba(0,0,0,0.4)',
                                color: '#fff',
                                fontSize: '15px',
                                resize: 'vertical',
                                boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.3)'
                            }}
                        />
                        {isRunning && (
                            <div style={{ marginTop: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ color: '#22d3ee', fontSize: '14px', fontWeight: '500' }}>{statusMessage}</span>
                                    <span style={{ color: '#fff', fontSize: '14px', fontWeight: '700' }}>{Math.round(progress)}%</span>
                                </div>
                                <div style={{ height: '10px', background: 'rgba(255,255,255,0.06)', borderRadius: '5px', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${progress}%`,
                                        background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #22d3ee)',
                                        boxShadow: '0 0 25px rgba(99,102,241,0.6)',
                                        transition: 'width 0.3s',
                                        borderRadius: '5px'
                                    }} />
                                </div>
                            </div>
                        )}
                        {error && <div style={{ marginTop: '18px', padding: '16px', background: 'rgba(239,68,68,0.1)', borderRadius: '12px', color: '#ef4444', fontSize: '14px', border: '1px solid rgba(239,68,68,0.2)' }}>❌ {error}</div>}
                        <button
                            onClick={handleStart}
                            disabled={isRunning || !prompt.trim()}
                            style={{
                                marginTop: '24px',
                                width: '100%',
                                padding: '18px',
                                borderRadius: '14px',
                                border: 'none',
                                background: isRunning || !prompt.trim() ? '#27272a' : 'linear-gradient(135deg, #6366f1, #8b5cf6, #22d3ee)',
                                color: '#fff',
                                fontSize: '16px',
                                fontWeight: '700',
                                cursor: isRunning || !prompt.trim() ? 'not-allowed' : 'pointer',
                                boxShadow: isRunning || !prompt.trim() ? 'none' : '0 8px 40px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                                transition: 'all 0.3s'
                            }}>
                            {isRunning ? '⚡ جاري العمل...' : '🚀 ' + (isArabic ? 'أطلق القوة!' : 'Launch Research!')}
                        </button>
                    </div>
                ) : (
                    /* ========== DASHBOARD ========== */
                    <>
                        {/* Title Bar */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '24px',
                            background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,211,238,0.06))',
                            padding: '16px 22px',
                            borderRadius: '14px',
                            border: '1px solid rgba(34,197,94,0.2)',
                            boxShadow: '0 4px 25px rgba(34,197,94,0.15)'
                        }}>
                            <div>
                                <span style={{ color: '#22c55e', fontSize: '15px', fontWeight: '700' }}>✨ {result.title.substring(0, 55)}...</span>
                                <div style={{ color: '#86efac', fontSize: '12px', marginTop: '6px', fontWeight: '500' }}>⏱️ {result.execution.executionTime} | 📊 {result.results.charts?.length || 0} charts | 📚 {result.results.sources?.length || 0} sources</div>
                            </div>
                            <button onClick={handleReset} style={{
                                padding: '10px 18px',
                                borderRadius: '10px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.05)',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '500',
                                transition: 'all 0.2s'
                            }}>🔄 {isArabic ? 'بحث جديد' : 'New'}</button>
                        </div>

                        {/* Row 1: Neural Network + Donut + Performance */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px', marginBottom: '20px' }}>
                            <div style={{
                                gridColumn: 'span 3',
                                background: 'linear-gradient(145deg, rgba(15,15,25,0.8), rgba(10,10,18,0.9))',
                                borderRadius: '16px',
                                padding: '16px',
                                border: '1px solid rgba(99,102,241,0.15)',
                                boxShadow: '0 4px 30px rgba(0,0,0,0.3)'
                            }}>
                                <NeuralNetwork />
                            </div>
                            <div style={{
                                gridColumn: 'span 5',
                                background: 'linear-gradient(145deg, rgba(15,15,25,0.8), rgba(10,10,18,0.9))',
                                borderRadius: '16px',
                                padding: '20px',
                                border: '1px solid rgba(99,102,241,0.15)',
                                boxShadow: '0 4px 30px rgba(0,0,0,0.3)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                                    <span style={{ background: 'linear-gradient(135deg, #ec4899, #f43f5e)', padding: '5px 9px', borderRadius: '6px', fontSize: '10px', boxShadow: '0 3px 12px rgba(236,72,153,0.4)' }}>📈</span>
                                    <span style={{ color: '#fff', fontSize: '12px', fontWeight: '600' }}>{isArabic ? 'القيم والأسعار' : 'Values & Data'}</span>
                                </div>
                                <Donut data={result.results.stats?.map(s => ({ label: s.label, value: s.value })) || [{ label: 'Data', value: 100 }]} />
                            </div>
                            <div style={{
                                gridColumn: 'span 4',
                                background: 'linear-gradient(145deg, rgba(15,15,25,0.8), rgba(10,10,18,0.9))',
                                borderRadius: '16px',
                                padding: '20px',
                                border: '1px solid rgba(99,102,241,0.15)',
                                boxShadow: '0 4px 30px rgba(0,0,0,0.3)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                                    <span style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', padding: '5px 9px', borderRadius: '6px', fontSize: '10px', boxShadow: '0 3px 12px rgba(99,102,241,0.4)' }}>📊</span>
                                    <span style={{ color: '#fff', fontSize: '12px', fontWeight: '600' }}>{isArabic ? 'إحصائيات البحث' : 'SEARCH STATS'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '10px' }}>
                                    <Ring value={result.results.sources?.length || 0} label={isArabic ? 'المصادر' : 'Sources'} color="#22c55e" />
                                    <Ring value={result.results.charts?.length || 0} label={isArabic ? 'الرسوم' : 'Charts'} color="#06b6d4" />
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '20px' }}>
                            {result.results.stats?.slice(0, 4).map((stat, i) => (
                                <Stat
                                    key={i}
                                    value={`${stat.value}${stat.unit || ''}`}
                                    label={stat.label}
                                    icon={['💰', '📊', '📈', '⚡'][i]}
                                    color={['#f59e0b', '#6366f1', '#22c55e', '#06b6d4'][i]}
                                />
                            ))}
                        </div>

                        {/* Row 3: Summary */}
                        <div style={{
                            background: 'linear-gradient(145deg, rgba(15,15,25,0.8), rgba(10,10,18,0.9))',
                            borderRadius: '16px',
                            padding: '22px',
                            border: '1px solid rgba(99,102,241,0.15)',
                            marginBottom: '20px',
                            boxShadow: '0 4px 30px rgba(0,0,0,0.3)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                                <span style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', padding: '6px 10px', borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 15px rgba(245,158,11,0.4)' }}>💡</span>
                                <span style={{ color: '#fff', fontSize: '14px', fontWeight: '700' }}>{isArabic ? 'الملخص التنفيذي' : 'Executive Summary'}</span>
                            </div>
                            <div style={{ color: '#d4d4d8', fontSize: '14px', lineHeight: '2.2' }}>
                                <StreamingMarkdownRenderer content={result.results.summary} />
                            </div>
                        </div>

                        {/* Row 4: All Charts */}
                        {result.results.charts && result.results.charts.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: result.results.charts.length > 1 ? 'repeat(2, 1fr)' : '1fr', gap: '20px', marginBottom: '20px' }}>
                                {result.results.charts.map((chart: ChartData, index: number) => (
                                    <Bars key={index} data={chart.data || []} title={chart.title || (isArabic ? 'البيانات' : 'Data')} />
                                ))}
                            </div>
                        )}

                        {/* Row 5: Full Report */}
                        <div style={{ marginBottom: '20px' }}>
                            <FullReport report={result.results.report} title={result.title} isArabic={isArabic} />
                        </div>

                        {/* Row 6: Sources */}
                        {result.results.sources && result.results.sources.length > 0 && (
                            <div style={{
                                background: 'linear-gradient(145deg, rgba(15,15,25,0.8), rgba(10,10,18,0.9))',
                                borderRadius: '16px',
                                padding: '20px',
                                border: '1px solid rgba(99,102,241,0.15)',
                                marginBottom: '20px',
                                boxShadow: '0 4px 30px rgba(0,0,0,0.3)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                    <span style={{
                                        background: 'linear-gradient(135deg, #06b6d4, #22d3ee)',
                                        padding: '6px 10px',
                                        borderRadius: '8px',
                                        fontSize: '11px',
                                        boxShadow: '0 4px 15px rgba(6,182,212,0.4)'
                                    }}>📚</span>
                                    <span style={{ color: '#fff', fontSize: '14px', fontWeight: '700' }}>
                                        {isArabic ? 'المصادر' : 'Sources'} ({result.results.sources.length})
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {result.results.sources.map((source: Source, index: number) => (
                                        <a
                                            key={index}
                                            href={source.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: '12px 16px',
                                                background: 'rgba(6,182,212,0.08)',
                                                borderRadius: '10px',
                                                border: '1px solid rgba(6,182,212,0.2)',
                                                textDecoration: 'none',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <span style={{ color: '#22d3ee', fontSize: '14px' }}>🔗</span>
                                            <span style={{
                                                color: '#a5f3fc',
                                                fontSize: '13px',
                                                flex: 1,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {source.title}
                                            </span>
                                            <span style={{ color: '#67e8f9', fontSize: '11px' }}>↗</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Row 7: Export */}
                        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '15px', paddingBottom: '40px' }}>
                            <button onClick={handlePDF} style={{
                                padding: '16px 50px',
                                borderRadius: '14px',
                                border: '2px solid #22c55e',
                                background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
                                color: '#22c55e',
                                cursor: 'pointer',
                                fontSize: '15px',
                                fontWeight: '700',
                                boxShadow: '0 4px 30px rgba(34,197,94,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                transition: 'all 0.3s'
                            }}>
                                📄 PDF EXPORT
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AutonomousMode;
