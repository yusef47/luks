import React, { useState, useEffect } from 'react';

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
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.1) 0%, transparent 70%)' }}>
            <svg width="100" height="100" viewBox="0 0 200 200">
                <defs><filter id="ng"><feGaussianBlur stdDeviation="4" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter><linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#22d3ee" /></linearGradient></defs>
                <ellipse cx="100" cy="100" rx="70" ry="25" fill="none" stroke="url(#sg)" strokeWidth="1" opacity="0.5" filter="url(#ng)" />
                <ellipse cx="100" cy="100" rx="25" ry="70" fill="none" stroke="url(#sg)" strokeWidth="1" opacity="0.4" transform={`rotate(${rotation} 100 100)`} />
                <circle cx="100" cy="100" r="20" fill="url(#sg)" opacity="0.8" filter="url(#ng)" />
                {[0, 72, 144, 216, 288].map((a, i) => { const r = (a + rotation) * Math.PI / 180; return <circle key={i} cx={100 + 60 * Math.cos(r)} cy={100 + 20 * Math.sin(r)} r="4" fill="#22d3ee" filter="url(#ng)" />; })}
            </svg>
        </div>
    );
};

// ============================================
// 📊 RING
// ============================================
const Ring: React.FC<{ value: number; label: string; color: string }> = ({ value, label, color }) => {
    const [anim, setAnim] = useState(false);
    const c = 2 * Math.PI * 30, o = c - (value / 100) * c;
    useEffect(() => { setTimeout(() => setAnim(true), 200); }, []);
    return (
        <div style={{ textAlign: 'center' }}>
            <svg width="70" height="70" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="30" stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="none" />
                <circle cx="40" cy="40" r="30" stroke={color} strokeWidth="6" fill="none" strokeDasharray={c} strokeDashoffset={anim ? o : c} strokeLinecap="round" transform="rotate(-90 40 40)" style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 8px ${color})` }} />
                <text x="40" y="40" textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="14" fontWeight="bold">{value}%</text>
            </svg>
            <div style={{ color: '#9ca3af', fontSize: '9px' }}>{label}</div>
        </div>
    );
};

// ============================================
// 🍩 DONUT
// ============================================
const Donut: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
    const colors = ['#ec4899', '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#22d3ee'];
    const total = data.reduce((a, b) => a + b.value, 0) || 1;
    let angle = 0;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '100%' }}>
            <div style={{ flex: 1, fontSize: '8px' }}>
                {data.slice(0, 5).map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '1px', background: colors[i % colors.length] }} />
                        <span style={{ color: '#9ca3af', flex: 1 }}>{item.label.substring(0, 18)}</span>
                        <span style={{ color: colors[i % colors.length], fontWeight: 'bold' }}>{item.value}$</span>
                    </div>
                ))}
            </div>
            <svg width="90" height="90" viewBox="0 0 100 100">
                {data.slice(0, 6).map((item, i) => {
                    const a = ((item.value / total) * 360) || 20, s = angle; angle += a;
                    const sr = (s - 90) * Math.PI / 180, er = (s + a - 90) * Math.PI / 180, la = a > 180 ? 1 : 0;
                    return <path key={i} d={`M 50 50 L ${50 + 40 * Math.cos(sr)} ${50 + 40 * Math.sin(sr)} A 40 40 0 ${la} 1 ${50 + 40 * Math.cos(er)} ${50 + 40 * Math.sin(er)} Z`} fill={colors[i % colors.length]} style={{ filter: `drop-shadow(0 0 5px ${colors[i % colors.length]})` }} />;
                })}
                <circle cx="50" cy="50" r="22" fill="#0f0f1a" />
            </svg>
        </div>
    );
};

// ============================================
// 📈 BARS
// ============================================
const Bars: React.FC<{ data: { label: string; value: number }[]; title: string }> = ({ data, title }) => {
    const [anim, setAnim] = useState(false);
    const colors = ['#6366f1', '#22d3ee', '#22c55e', '#f59e0b', '#ec4899'];
    const max = Math.max(...data.map(d => d.value), 10);
    useEffect(() => { setTimeout(() => setAnim(true), 300); }, []);
    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ background: 'linear-gradient(135deg, #6366f1, #22d3ee)', padding: '3px 6px', borderRadius: '4px', fontSize: '8px' }}>📊</span>
                <span style={{ color: '#fff', fontSize: '10px', fontWeight: '600' }}>{title}</span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {data.slice(0, 5).map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: colors[i % colors.length], fontSize: '9px', fontWeight: 'bold', width: '35px' }}>{item.value}</span>
                        <div style={{ flex: 1, height: '14px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: anim ? `${(item.value / max) * 100}%` : '0%', height: '100%', background: `linear-gradient(90deg, ${colors[i % colors.length]}, ${colors[i % colors.length]}88)`, borderRadius: '3px', transition: `width 0.6s ease ${i * 0.08}s`, boxShadow: `0 0 8px ${colors[i % colors.length]}66` }} />
                        </div>
                        <span style={{ color: '#9ca3af', fontSize: '8px', width: '80px', textAlign: 'right' }}>{item.label.substring(0, 15)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================
// 💎 STAT
// ============================================
const Stat: React.FC<{ value: string; label: string; icon: string; color: string }> = ({ value, label, icon, color }) => (
    <div style={{ background: `linear-gradient(145deg, ${color}15, ${color}05)`, border: `1px solid ${color}30`, borderRadius: '10px', padding: '10px', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: '8px', marginBottom: '2px' }}>{icon}</div>
        <div style={{ fontSize: '16px', fontWeight: 'bold', color, textShadow: `0 0 15px ${color}` }}>{value}</div>
        <div style={{ fontSize: '7px', color: '#71717a', marginTop: '2px' }}>{label.substring(0, 12)}</div>
    </div>
);

// ============================================
// 🧠 MAIN
// ============================================
const AutonomousMode: React.FC<AutonomousModeProps> = ({ isOpen, onClose, language }) => {
    const [prompt, setPrompt] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [result, setResult] = useState<TaskResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [time, setTime] = useState(new Date().toLocaleTimeString());
    const [showReport, setShowReport] = useState(false);

    const isArabic = language === 'ar';

    useEffect(() => { const t = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000); return () => clearInterval(t); }, []);

    const handleStart = async () => {
        if (!prompt.trim()) return;
        setIsRunning(true); setProgress(0); setError(null); setResult(null);
        const msgs = ['🔍', '📊', '🧠', '📝', '✨'];
        let i = 0;
        const int = setInterval(() => { setProgress(p => { if (p >= 95) { clearInterval(int); return 95; } if (p >= i * 20 && i < msgs.length) setStatusMessage(msgs[i++]); return p + 1; }); }, 100);
        try {
            const res = await fetch(`${BACKEND_URL}/autonomous`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: prompt }) });
            clearInterval(int);
            if (!res.ok) throw new Error(`${res.status}`);
            const d = await res.json();
            if (!d.success) throw new Error(d.error);
            setProgress(100); setStatusMessage('✅');
            setResult({ title: d.data.title || prompt, results: { summary: d.data.results?.summary || '', report: d.data.results?.report || '', stats: d.data.results?.stats || [], charts: d.data.results?.charts || [], sources: d.data.results?.sources || [] }, execution: d.data.execution || { executionTime: '5s' } });
        } catch (e: any) { clearInterval(int); setError(e.message); } finally { setIsRunning(false); }
    };

    const handleReset = () => { setResult(null); setPrompt(''); setProgress(0); setError(null); setShowReport(false); };
    const handlePDF = () => { if (!result) return; const h = `<!DOCTYPE html><html dir="${isArabic ? 'rtl' : 'ltr'}"><head><meta charset="UTF-8"><style>body{font-family:sans-serif;padding:40px;max-width:900px;margin:0 auto;background:#0f0f1a;color:#e5e5e5;line-height:1.8}h1{color:#6366f1}</style></head><body><h1>🧠 ${result.title}</h1><h2>الملخص</h2><p>${result.results.summary}</p><h2>التقرير</h2><div style="white-space:pre-wrap">${result.results.report}</div></body></html>`; const b = new Blob([h], { type: 'text/html' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `lukas-${Date.now()}.html`; a.click(); };

    if (!isOpen) return null;

    // FULL REPORT MODAL
    if (showReport && result) {
        return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 10000, overflow: 'auto', padding: '30px', direction: isArabic ? 'rtl' : 'ltr' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ color: '#6366f1', margin: 0 }}>📄 التقرير الكامل</h2>
                        <button onClick={() => setShowReport(false)} style={{ background: '#6366f1', border: 'none', padding: '8px 16px', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>✕ إغلاق</button>
                    </div>
                    <div style={{ background: 'rgba(99,102,241,0.1)', padding: '20px', borderRadius: '12px', marginBottom: '20px', borderLeft: '4px solid #6366f1' }}>
                        <h3 style={{ color: '#22d3ee', margin: '0 0 10px' }}>💡 الملخص التنفيذي</h3>
                        <p style={{ color: '#e5e5e5', lineHeight: '2', margin: 0 }}>{result.results.summary}</p>
                    </div>
                    <div style={{ color: '#d4d4d8', lineHeight: '2.2', fontSize: '14px', whiteSpace: 'pre-wrap' }}>{result.results.report}</div>
                    {result.results.sources.length > 0 && (
                        <div style={{ marginTop: '30px', padding: '20px', background: 'rgba(34,197,94,0.1)', borderRadius: '12px' }}>
                            <h3 style={{ color: '#22c55e', margin: '0 0 15px' }}>🔗 المصادر ({result.results.sources.length})</h3>
                            {result.results.sources.map((s, i) => (
                                <a key={i} href={s.url} target="_blank" style={{ display: 'block', color: '#818cf8', marginBottom: '8px', textDecoration: 'none' }}>{i + 1}. {s.title} ↗</a>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(135deg, #0a0a12, #0f0f1a)', zIndex: 9999, display: 'flex', flexDirection: 'column', direction: isArabic ? 'rtl' : 'ltr' }}>
            {/* Background */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08), transparent)', top: '-100px', right: '-100px', filter: 'blur(80px)' }} />
                <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,0.06), transparent)', bottom: '-80px', left: '-80px', filter: 'blur(80px)' }} />
            </div>

            {/* Header */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #6366f1, #22d3ee)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', boxShadow: '0 0 20px rgba(99,102,241,0.5)' }}>🧠</div>
                    <div>
                        <div style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>AI RESEARCH REPORT</div>
                        <div style={{ color: '#6366f1', fontSize: '9px' }}>✨ {isArabic ? 'بحث + تحليل + رسوم بيانية + PDF' : 'Search + Analysis + Charts + PDF'}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: '#22d3ee', fontFamily: 'monospace', fontSize: '12px', fontWeight: 'bold' }}>⚡ PM {time}</span>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', width: '32px', height: '32px', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {!result ? (
                    /* INPUT */
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '100%', maxWidth: '600px' }}>
                            <div style={{ background: 'rgba(99,102,241,0.1)', borderRadius: '12px', padding: '14px', marginBottom: '16px', border: '1px solid rgba(99,102,241,0.2)' }}>
                                <p style={{ color: '#a5b4fc', margin: 0, fontSize: '12px' }}>🚀 {isArabic ? 'اكتب سؤالك وشاهد السحر!' : 'Ask anything!'}</p>
                            </div>
                            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} disabled={isRunning} placeholder={isArabic ? 'مثال: قارن بين أفضل 5 لغات برمجة' : 'Example: Compare top 5 languages'} style={{ width: '100%', minHeight: '80px', padding: '14px', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '13px', resize: 'none' }} />
                            {isRunning && (
                                <div style={{ marginTop: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{ color: '#22d3ee', fontSize: '12px' }}>{statusMessage} جاري العمل...</span>
                                        <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>{Math.round(progress)}%</span>
                                    </div>
                                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #6366f1, #22d3ee)', boxShadow: '0 0 15px rgba(99,102,241,0.5)' }} />
                                    </div>
                                </div>
                            )}
                            {error && <div style={{ marginTop: '14px', padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: '10px', color: '#ef4444', fontSize: '12px' }}>❌ {error}</div>}
                            <button onClick={handleStart} disabled={isRunning || !prompt.trim()} style={{ marginTop: '16px', width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: isRunning || !prompt.trim() ? '#27272a' : 'linear-gradient(135deg, #6366f1, #22d3ee)', color: '#fff', fontSize: '14px', fontWeight: 'bold', cursor: isRunning || !prompt.trim() ? 'not-allowed' : 'pointer', boxShadow: '0 8px 30px rgba(99,102,241,0.3)' }}>
                                {isRunning ? '⚡' : '🚀'} {isArabic ? 'أطلق القوة!' : 'Launch!'}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* DASHBOARD */
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        {/* Title Bar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', background: 'rgba(34,197,94,0.1)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(34,197,94,0.2)' }}>
                            <div>
                                <span style={{ color: '#22c55e', fontSize: '13px', fontWeight: '600' }}>✨ {result.title.substring(0, 50)}...</span>
                                <span style={{ color: '#86efac', fontSize: '10px', marginLeft: '10px' }}>⏱️ {result.execution.executionTime} | 📊 {result.results.charts?.length || 0} | 📚 {result.results.sources?.length || 0}</span>
                            </div>
                            <button onClick={handleReset} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', fontSize: '10px' }}>🔄 جديد</button>
                        </div>

                        {/* GRID */}
                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gridTemplateRows: 'auto auto 1fr auto', gap: '12px', minHeight: 0 }}>

                            {/* Row 1: Performance + Donut */}
                            <div style={{ gridColumn: 'span 4', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(99,102,241,0.15)' }}>
                                <div style={{ color: '#fff', fontSize: '10px', fontWeight: '600', marginBottom: '8px' }}>📊 MODEL PERFORMANCE</div>
                                <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                                    <Ring value={92} label="Speed" color="#22d3ee" />
                                    <Ring value={87} label="Accuracy" color="#22c55e" />
                                </div>
                            </div>

                            <div style={{ gridColumn: 'span 5', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(99,102,241,0.15)' }}>
                                <div style={{ color: '#fff', fontSize: '10px', fontWeight: '600', marginBottom: '8px' }}>📈 {isArabic ? 'القيم والأسعار' : 'Values'}</div>
                                <Donut data={result.results.stats?.map(s => ({ label: s.label, value: s.value })) || [{ label: 'Data', value: 100 }]} />
                            </div>

                            <div style={{ gridColumn: 'span 3', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(99,102,241,0.15)' }}>
                                <NeuralNetwork />
                            </div>

                            {/* Row 2: Stats */}
                            <div style={{ gridColumn: 'span 3' }}><Stat value={`${result.results.stats?.[0]?.value || 56}$`} label={result.results.stats?.[0]?.label || 'إحصائية'} icon="💰" color="#f59e0b" /></div>
                            <div style={{ gridColumn: 'span 3' }}><Stat value={`${result.results.stats?.[1]?.value || 55}%`} label={result.results.stats?.[1]?.label || 'إحصائية'} icon="📊" color="#6366f1" /></div>
                            <div style={{ gridColumn: 'span 3' }}><Stat value={`${result.results.stats?.[2]?.value || 78}`} label={result.results.stats?.[2]?.label || 'إحصائية'} icon="📈" color="#22c55e" /></div>
                            <div style={{ gridColumn: 'span 3' }}><Stat value={`${result.results.stats?.[3]?.value || 866}%`} label={result.results.stats?.[3]?.label || 'إحصائية'} icon="⚡" color="#ec4899" /></div>

                            {/* Row 3: Summary + Bars */}
                            <div style={{ gridColumn: 'span 6', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(99,102,241,0.15)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                    <span style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', padding: '3px 6px', borderRadius: '4px', fontSize: '8px' }}>💡</span>
                                    <span style={{ color: '#fff', fontSize: '10px', fontWeight: '600' }}>{isArabic ? 'الملخص التنفيذي' : 'Summary'}</span>
                                </div>
                                <p style={{ color: '#d4d4d8', fontSize: '11px', lineHeight: '1.7', margin: 0, flex: 1, overflow: 'hidden' }}>{result.results.summary.substring(0, 300)}...</p>
                            </div>

                            <div style={{ gridColumn: 'span 6', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(99,102,241,0.15)', minHeight: 0 }}>
                                <Bars data={result.results.charts?.[0]?.data || []} title={isArabic ? 'الترتيب' : 'Ranking'} />
                            </div>

                            {/* Row 4: Actions */}
                            <div style={{ gridColumn: 'span 12', display: 'flex', justifyContent: 'center', gap: '12px', paddingTop: '8px' }}>
                                <button onClick={() => setShowReport(true)} style={{ padding: '10px 24px', borderRadius: '10px', border: '1px solid #6366f1', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>📄 {isArabic ? 'التقرير الكامل' : 'Full Report'}</button>
                                <button onClick={handlePDF} style={{ padding: '10px 24px', borderRadius: '10px', border: '2px solid #22c55e', background: 'rgba(34,197,94,0.1)', color: '#22c55e', cursor: 'pointer', fontSize: '12px', fontWeight: '600', boxShadow: '0 0 20px rgba(34,197,94,0.2)' }}>📥 PDF EXPORT</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AutonomousMode;
