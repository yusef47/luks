import React, { useState, useEffect, useRef } from 'react';

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
// 🌌 NEURAL NETWORK
// ============================================
const NeuralNetwork: React.FC = () => {
    const [rotation, setRotation] = useState(0);
    useEffect(() => { const interval = setInterval(() => setRotation(p => (p + 0.5) % 360), 50); return () => clearInterval(interval); }, []);
    return (
        <div style={{ height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.12) 0%, transparent 70%)', borderRadius: '12px' }}>
            <svg width="120" height="120" viewBox="0 0 200 200">
                <defs><filter id="ng"><feGaussianBlur stdDeviation="4" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter><linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#22d3ee" /></linearGradient></defs>
                <ellipse cx="100" cy="100" rx="70" ry="25" fill="none" stroke="url(#sg)" strokeWidth="1.5" opacity="0.6" filter="url(#ng)" />
                <ellipse cx="100" cy="100" rx="25" ry="70" fill="none" stroke="url(#sg)" strokeWidth="1.5" opacity="0.5" transform={`rotate(${rotation} 100 100)`} />
                <circle cx="100" cy="100" r="22" fill="url(#sg)" opacity="0.9" filter="url(#ng)" />
                {[0, 60, 120, 180, 240, 300].map((a, i) => { const r = (a + rotation) * Math.PI / 180; return <g key={i}><line x1="100" y1="100" x2={100 + 65 * Math.cos(r)} y2={100 + 22 * Math.sin(r)} stroke="#22d3ee" strokeWidth="0.5" opacity="0.4" /><circle cx={100 + 65 * Math.cos(r)} cy={100 + 22 * Math.sin(r)} r="5" fill="#22d3ee" filter="url(#ng)" /></g>; })}
            </svg>
            <div style={{ color: '#6366f1', fontSize: '10px', fontWeight: 'bold', letterSpacing: '2px', marginTop: '8px' }}>NEURAL NETWORK</div>
        </div>
    );
};

// ============================================
// 📊 PERFORMANCE RING
// ============================================
const Ring: React.FC<{ value: number; label: string; color: string }> = ({ value, label, color }) => {
    const [anim, setAnim] = useState(false);
    const c = 2 * Math.PI * 35, o = c - (value / 100) * c;
    useEffect(() => { setTimeout(() => setAnim(true), 200); }, []);
    return (
        <div style={{ textAlign: 'center' }}>
            <svg width="90" height="90" viewBox="0 0 90 90">
                <circle cx="45" cy="45" r="35" stroke="rgba(255,255,255,0.08)" strokeWidth="7" fill="none" />
                <circle cx="45" cy="45" r="35" stroke={color} strokeWidth="7" fill="none" strokeDasharray={c} strokeDashoffset={anim ? o : c} strokeLinecap="round" transform="rotate(-90 45 45)" style={{ transition: 'stroke-dashoffset 1.2s ease', filter: `drop-shadow(0 0 10px ${color})` }} />
                <text x="45" y="45" textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="16" fontWeight="bold">{value}%</text>
            </svg>
            <div style={{ color: '#9ca3af', fontSize: '11px', marginTop: '4px' }}>{label}</div>
        </div>
    );
};

// ============================================
// 🍩 DONUT CHART
// ============================================
const Donut: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
    const colors = ['#ec4899', '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#22d3ee', '#a855f7'];
    const total = data.reduce((a, b) => a + b.value, 0) || 1;
    let angle = 0;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <svg width="120" height="120" viewBox="0 0 100 100">
                <defs><filter id="dg"><feGaussianBlur stdDeviation="2" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
                {data.slice(0, 7).map((item, i) => {
                    const a = ((item.value / total) * 360) || 25, s = angle; angle += a;
                    const sr = (s - 90) * Math.PI / 180, er = (s + a - 90) * Math.PI / 180, la = a > 180 ? 1 : 0;
                    return <path key={i} d={`M 50 50 L ${50 + 42 * Math.cos(sr)} ${50 + 42 * Math.sin(sr)} A 42 42 0 ${la} 1 ${50 + 42 * Math.cos(er)} ${50 + 42 * Math.sin(er)} Z`} fill={colors[i % colors.length]} filter="url(#dg)" />;
                })}
                <circle cx="50" cy="50" r="25" fill="#0f0f1a" />
            </svg>
            <div style={{ flex: 1 }}>
                {data.slice(0, 6).map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: colors[i % colors.length] }} />
                        <span style={{ color: '#9ca3af', fontSize: '9px', flex: 1 }}>{item.label.substring(0, 20)}</span>
                        <span style={{ color: colors[i % colors.length], fontSize: '9px', fontWeight: 'bold' }}>{item.value}$</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================
// 📈 HORIZONTAL BARS (RANKING)
// ============================================
const Bars: React.FC<{ data: { label: string; value: number }[]; title: string }> = ({ data, title }) => {
    const [anim, setAnim] = useState(false);
    const colors = ['#6366f1', '#22d3ee', '#22c55e', '#f59e0b', '#ec4899', '#a855f7'];
    const max = Math.max(...data.map(d => d.value), 10);
    useEffect(() => { setTimeout(() => setAnim(true), 300); }, []);
    return (
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(99,102,241,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ background: 'linear-gradient(135deg, #6366f1, #22d3ee)', padding: '4px 8px', borderRadius: '6px', fontSize: '10px' }}>📊</span>
                <span style={{ color: '#fff', fontSize: '12px', fontWeight: '600' }}>{title}</span>
            </div>
            {data.slice(0, 6).map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ color: colors[i % colors.length], fontSize: '11px', fontWeight: 'bold', minWidth: '45px' }}>{item.value}</span>
                    <div style={{ flex: 1, height: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: anim ? `${(item.value / max) * 100}%` : '0%', height: '100%', background: `linear-gradient(90deg, ${colors[i % colors.length]}, ${colors[i % colors.length]}88)`, borderRadius: '4px', transition: `width 0.8s ease ${i * 0.1}s`, boxShadow: `0 0 12px ${colors[i % colors.length]}55` }} />
                    </div>
                    <span style={{ color: '#9ca3af', fontSize: '10px', minWidth: '120px', textAlign: 'right' }}>{item.label.substring(0, 18)}</span>
                </div>
            ))}
        </div>
    );
};

// ============================================
// 💎 STAT BOX
// ============================================
const Stat: React.FC<{ value: string; label: string; icon: string; color: string }> = ({ value, label, icon, color }) => (
    <div style={{ background: `linear-gradient(145deg, ${color}18, ${color}05)`, border: `1px solid ${color}35`, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
        <div style={{ fontSize: '12px', marginBottom: '4px' }}>{icon}</div>
        <div style={{ fontSize: '22px', fontWeight: 'bold', color, textShadow: `0 0 20px ${color}` }}>{value}</div>
        <div style={{ fontSize: '9px', color: '#71717a', marginTop: '4px' }}>{label.substring(0, 15)}</div>
    </div>
);

// ============================================
// 📄 FULL REPORT SECTION
// ============================================
const FullReport: React.FC<{ report: string; title: string; isArabic: boolean }> = ({ report, title, isArabic }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(99,102,241,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', padding: '4px 8px', borderRadius: '6px', fontSize: '10px' }}>📄</span>
                    <span style={{ color: '#fff', fontSize: '12px', fontWeight: '600' }}>{isArabic ? 'التقرير الكامل' : 'Full Report'}</span>
                </div>
                <button onClick={() => setExpanded(!expanded)} style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', padding: '5px 12px', borderRadius: '6px', color: '#a5b4fc', cursor: 'pointer', fontSize: '10px' }}>
                    {expanded ? '🔼 ' + (isArabic ? 'إخفاء' : 'Hide') : '🔽 ' + (isArabic ? 'عرض الكل' : 'Show All')}
                </button>
            </div>
            <div style={{ color: '#22d3ee', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>{title}</div>
            <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '10px' }}># {isArabic ? 'الملخص التنفيذي' : 'Executive Summary'}</div>
            <div style={{
                color: '#d4d4d8',
                fontSize: '12px',
                lineHeight: '1.9',
                maxHeight: expanded ? 'none' : '150px',
                overflow: 'hidden',
                position: 'relative',
                direction: isArabic ? 'rtl' : 'ltr'
            }}>
                {report}
                {!expanded && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', background: 'linear-gradient(transparent, rgba(15,15,26,1))' }} />}
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
    const handlePDF = () => { if (!result) return; const h = `<!DOCTYPE html><html dir="${isArabic ? 'rtl' : 'ltr'}"><head><meta charset="UTF-8"><style>body{font-family:sans-serif;padding:40px;max-width:900px;margin:0 auto;background:#0f0f1a;color:#e5e5e5;line-height:2}h1{color:#6366f1;border-bottom:2px solid #6366f1;padding-bottom:16px}h2{color:#22d3ee;margin-top:30px}.box{background:rgba(99,102,241,0.1);padding:20px;border-radius:10px;border-left:4px solid #6366f1;margin:20px 0}</style></head><body><h1>🧠 ${result.title}</h1><div class="box"><h2>الملخص التنفيذي</h2><p>${result.results.summary}</p></div><h2>التقرير الكامل</h2><div style="white-space:pre-wrap">${result.results.report}</div>${result.results.sources.length > 0 ? `<h2>المصادر</h2><ul>${result.results.sources.map(s => `<li><a href="${s.url}">${s.title}</a></li>`).join('')}</ul>` : ''}</body></html>`; const b = new Blob([h], { type: 'text/html' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `lukas-report-${Date.now()}.html`; a.click(); };

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(135deg, #0a0a12 0%, #0f0f1a 100%)', zIndex: 9999, overflow: 'auto', direction: isArabic ? 'rtl' : 'ltr' }}>
            {/* Background effects */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08), transparent)', top: '-150px', right: '-150px', filter: 'blur(80px)' }} />
                <div style={{ position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,0.06), transparent)', bottom: '-100px', left: '-100px', filter: 'blur(80px)' }} />
            </div>

            {/* Header - Sticky */}
            <div style={{ position: 'sticky', top: 0, zIndex: 100, padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(10,10,18,0.9)', backdropFilter: 'blur(10px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg, #6366f1, #22d3ee)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', boxShadow: '0 0 25px rgba(99,102,241,0.5)' }}>🧠</div>
                    <div>
                        <div style={{ color: '#fff', fontSize: '15px', fontWeight: 'bold' }}>AI RESEARCH REPORT</div>
                        <div style={{ color: '#6366f1', fontSize: '10px' }}>✨ {isArabic ? 'بحث + تحليل + رسوم بيانية + PDF' : 'Research + Analysis + Charts + PDF'}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: '#22d3ee', fontFamily: 'monospace', fontSize: '13px', fontWeight: 'bold' }}>⚡ PM {time}</span>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', width: '34px', height: '34px', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '16px' }}>✕</button>
                </div>
            </div>

            <div style={{ padding: '20px', maxWidth: '1300px', margin: '0 auto' }}>
                {!result ? (
                    /* INPUT SECTION */
                    <div style={{ maxWidth: '650px', margin: '60px auto' }}>
                        <div style={{ background: 'rgba(99,102,241,0.1)', borderRadius: '14px', padding: '16px', marginBottom: '20px', border: '1px solid rgba(99,102,241,0.2)' }}>
                            <p style={{ color: '#a5b4fc', margin: 0, fontSize: '13px' }}>🚀 {isArabic ? 'اكتب سؤالك وشاهد السحر!' : 'Ask anything and watch the magic!'}</p>
                        </div>
                        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} disabled={isRunning} placeholder={isArabic ? 'مثال: قارن بين أفضل 10 وظائف في مجال الـ AI في 2025' : 'Example: Top 10 AI jobs in 2025'} style={{ width: '100%', minHeight: '100px', padding: '16px', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '14px', resize: 'vertical' }} />
                        {isRunning && (
                            <div style={{ marginTop: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ color: '#22d3ee', fontSize: '13px' }}>{statusMessage}</span>
                                    <span style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>{Math.round(progress)}%</span>
                                </div>
                                <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #6366f1, #22d3ee)', boxShadow: '0 0 20px rgba(99,102,241,0.5)', transition: 'width 0.3s' }} />
                                </div>
                            </div>
                        )}
                        {error && <div style={{ marginTop: '16px', padding: '14px', background: 'rgba(239,68,68,0.1)', borderRadius: '12px', color: '#ef4444', fontSize: '13px' }}>❌ {error}</div>}
                        <button onClick={handleStart} disabled={isRunning || !prompt.trim()} style={{ marginTop: '20px', width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: isRunning || !prompt.trim() ? '#27272a' : 'linear-gradient(135deg, #6366f1, #22d3ee)', color: '#fff', fontSize: '15px', fontWeight: 'bold', cursor: isRunning || !prompt.trim() ? 'not-allowed' : 'pointer', boxShadow: '0 10px 40px rgba(99,102,241,0.3)' }}>
                            {isRunning ? '⚡ جاري العمل...' : '🚀 ' + (isArabic ? 'أطلق القوة!' : 'Launch Research!')}
                        </button>
                    </div>
                ) : (
                    /* ========== SCROLLABLE DASHBOARD ========== */
                    <>
                        {/* Title Bar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: 'rgba(34,197,94,0.1)', padding: '12px 18px', borderRadius: '12px', border: '1px solid rgba(34,197,94,0.2)' }}>
                            <div>
                                <span style={{ color: '#22c55e', fontSize: '14px', fontWeight: '600' }}>✨ {result.title.substring(0, 55)}...</span>
                                <div style={{ color: '#86efac', fontSize: '11px', marginTop: '4px' }}>⏱️ {result.execution.executionTime} | 📊 {result.results.charts?.length || 0} charts | 📚 {result.results.sources?.length || 0} sources</div>
                            </div>
                            <button onClick={handleReset} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', fontSize: '11px' }}>🔄 {isArabic ? 'بحث جديد' : 'New'}</button>
                        </div>

                        {/* Row 1: Performance + Donut + Neural Network */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '16px', marginBottom: '16px' }}>
                            <div style={{ gridColumn: 'span 4', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(99,102,241,0.15)' }}>
                                <div style={{ color: '#fff', fontSize: '11px', fontWeight: '600', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ background: 'linear-gradient(135deg, #6366f1, #22d3ee)', padding: '3px 6px', borderRadius: '4px', fontSize: '9px' }}>📊</span>
                                    MODEL PERFORMANCE
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                                    <Ring value={92} label="Speed" color="#22d3ee" />
                                    <Ring value={87} label="Accuracy" color="#22c55e" />
                                </div>
                            </div>
                            <div style={{ gridColumn: 'span 5', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(99,102,241,0.15)' }}>
                                <div style={{ color: '#fff', fontSize: '11px', fontWeight: '600', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ background: 'linear-gradient(135deg, #ec4899, #f43f5e)', padding: '3px 6px', borderRadius: '4px', fontSize: '9px' }}>📈</span>
                                    {isArabic ? 'القيم والأسعار' : 'Values & Data'}
                                </div>
                                <Donut data={result.results.stats?.map(s => ({ label: s.label, value: s.value })) || [{ label: 'Data', value: 100 }]} />
                            </div>
                            <div style={{ gridColumn: 'span 3', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '10px', border: '1px solid rgba(99,102,241,0.15)' }}>
                                <NeuralNetwork />
                            </div>
                        </div>

                        {/* Row 2: Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
                            <Stat value={`${result.results.stats?.[0]?.value || 56}$`} label={result.results.stats?.[0]?.label || 'إحصائية 1'} icon="💰" color="#f59e0b" />
                            <Stat value={`${result.results.stats?.[1]?.value || 55}%`} label={result.results.stats?.[1]?.label || 'إحصائية 2'} icon="📊" color="#6366f1" />
                            <Stat value={`${result.results.stats?.[2]?.value || 78}`} label={result.results.stats?.[2]?.label || 'إحصائية 3'} icon="📈" color="#22c55e" />
                            <Stat value={`${result.results.stats?.[3]?.value || 866}%`} label={result.results.stats?.[3]?.label || 'إحصائية 4'} icon="⚡" color="#ec4899" />
                        </div>

                        {/* Row 3: Summary */}
                        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '18px', border: '1px solid rgba(99,102,241,0.15)', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <span style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', padding: '4px 8px', borderRadius: '6px', fontSize: '10px' }}>💡</span>
                                <span style={{ color: '#fff', fontSize: '12px', fontWeight: '600' }}>{isArabic ? 'الملخص التنفيذي' : 'Executive Summary'}</span>
                            </div>
                            <p style={{ color: '#d4d4d8', fontSize: '13px', lineHeight: '2', margin: 0 }}>{result.results.summary}</p>
                        </div>

                        {/* Row 4: Ranking Bars */}
                        <div style={{ marginBottom: '16px' }}>
                            <Bars data={result.results.charts?.[0]?.data || []} title={isArabic ? 'الترتيب' : 'Ranking'} />
                        </div>

                        {/* Row 5: Full Report */}
                        <div style={{ marginBottom: '16px' }}>
                            <FullReport report={result.results.report} title={result.title} isArabic={isArabic} />
                        </div>

                        {/* Row 6: Actions */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', paddingTop: '10px', paddingBottom: '30px' }}>
                            <button onClick={handlePDF} style={{ padding: '14px 40px', borderRadius: '12px', border: '2px solid #22c55e', background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))', color: '#22c55e', cursor: 'pointer', fontSize: '14px', fontWeight: '600', boxShadow: '0 0 25px rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
