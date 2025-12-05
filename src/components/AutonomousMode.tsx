import React, { useState, useEffect } from 'react';

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
// 🌟 FUTURISTIC ANIMATED COMPONENTS
// ============================================

// Animated Glow Ring Chart
const GlowRingChart: React.FC<{ value: number; label: string; color: string; delay: number }> = ({ value, label, color, delay }) => {
    const [animatedValue, setAnimatedValue] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => {
            let current = 0;
            const interval = setInterval(() => {
                current += 2;
                if (current >= value) {
                    setAnimatedValue(value);
                    clearInterval(interval);
                } else {
                    setAnimatedValue(current);
                }
            }, 20);
        }, delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (animatedValue / 100) * circumference;

    return (
        <div style={{ textAlign: 'center', position: 'relative' }}>
            <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                {/* Background ring */}
                <circle cx="60" cy="60" r="45" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
                {/* Animated ring */}
                <circle
                    cx="60" cy="60" r="45"
                    stroke={`url(#gradient-${label})`}
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{ transition: 'stroke-dashoffset 0.5s ease', filter: `drop-shadow(0 0 10px ${color})` }}
                />
                <defs>
                    <linearGradient id={`gradient-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={color} />
                        <stop offset="100%" stopColor={`${color}88`} />
                    </linearGradient>
                </defs>
            </svg>
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', textShadow: `0 0 20px ${color}` }}>
                    {animatedValue}%
                </div>
            </div>
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#a1a1aa', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {label}
            </div>
        </div>
    );
};

// 3D Bar Chart with Glow
const NeonBarChart: React.FC<{ chart: ChartData; isArabic: boolean }> = ({ chart, isArabic }) => {
    const [animated, setAnimated] = useState(false);
    const maxValue = Math.max(...chart.data.map(d => d.value));
    const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

    useEffect(() => {
        setTimeout(() => setAnimated(true), 100);
    }, []);

    return (
        <div style={{ marginBottom: '24px' }}>
            <h4 style={{
                color: '#fff',
                marginBottom: '20px',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
            }}>
                <span style={{
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '14px'
                }}>📊</span>
                {chart.title}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {chart.data.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            width: '90px',
                            fontSize: '12px',
                            color: colors[i % colors.length],
                            textAlign: isArabic ? 'right' : 'left',
                            fontWeight: '500',
                            textShadow: `0 0 10px ${colors[i % colors.length]}44`
                        }}>
                            {item.label}
                        </div>
                        <div style={{
                            flex: 1,
                            height: '32px',
                            background: 'rgba(0,0,0,0.4)',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            position: 'relative',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            {/* Animated bar */}
                            <div style={{
                                width: animated ? `${(item.value / maxValue) * 100}%` : '0%',
                                height: '100%',
                                background: `linear-gradient(90deg, ${colors[i % colors.length]}, ${colors[(i + 1) % colors.length]})`,
                                borderRadius: '8px',
                                transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                                transitionDelay: `${i * 100}ms`,
                                position: 'relative',
                                boxShadow: `0 0 20px ${colors[i % colors.length]}66, inset 0 1px 0 rgba(255,255,255,0.2)`
                            }}>
                                {/* Shine effect */}
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: '50%',
                                    background: 'linear-gradient(180deg, rgba(255,255,255,0.3), transparent)',
                                    borderRadius: '8px 8px 0 0'
                                }} />
                                {/* Value label */}
                                <div style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    color: '#fff',
                                    textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                                }}>
                                    {item.value}{chart.unit}
                                </div>
                            </div>
                            {/* Glow pulse */}
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: animated ? `${(item.value / maxValue) * 100}%` : '0%',
                                height: '100%',
                                background: `linear-gradient(90deg, transparent, ${colors[i % colors.length]}44)`,
                                animation: 'pulse 2s infinite',
                                borderRadius: '8px'
                            }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Futuristic Ranking with Trophies
const FuturisticRanking: React.FC<{ chart: ChartData; isArabic: boolean }> = ({ chart, isArabic }) => {
    const [visible, setVisible] = useState(false);
    const trophies = ['👑', '🥈', '🥉', '⭐', '✨', '💫'];
    const colors = ['#fbbf24', '#94a3b8', '#cd7c2a', '#6366f1', '#22c55e', '#f43f5e'];

    useEffect(() => {
        setTimeout(() => setVisible(true), 200);
    }, []);

    return (
        <div style={{ marginBottom: '24px' }}>
            <h4 style={{
                color: '#fff',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
            }}>
                <span style={{
                    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '14px'
                }}>🏆</span>
                {chart.title}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {chart.data.map((item, i) => (
                    <div key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '14px 18px',
                        background: visible
                            ? `linear-gradient(135deg, ${colors[i]}15, ${colors[i]}05)`
                            : 'transparent',
                        borderRadius: '12px',
                        border: `1px solid ${colors[i]}33`,
                        transform: visible ? 'translateX(0)' : `translateX(${isArabic ? '100px' : '-100px'})`,
                        opacity: visible ? 1 : 0,
                        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                        transitionDelay: `${i * 100}ms`,
                        boxShadow: i === 0 ? `0 0 30px ${colors[0]}22` : 'none',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {/* Rank badge */}
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: i < 3
                                ? `linear-gradient(135deg, ${colors[i]}, ${colors[i]}aa)`
                                : 'rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            boxShadow: i < 3 ? `0 0 20px ${colors[i]}66` : 'none'
                        }}>
                            {trophies[i] || (i + 1)}
                        </div>

                        {/* Name */}
                        <span style={{
                            flex: 1,
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: i === 0 ? '600' : '400'
                        }}>
                            {item.label}
                        </span>

                        {/* Crown for #1 */}
                        {i === 0 && (
                            <div style={{
                                position: 'absolute',
                                top: '-2px',
                                right: '20px',
                                fontSize: '24px',
                                animation: 'float 2s ease-in-out infinite'
                            }}>👑</div>
                        )}

                        {/* Shine effect for top 3 */}
                        {i < 3 && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: '-100%',
                                width: '100%',
                                height: '100%',
                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                                animation: 'shine 3s infinite',
                                animationDelay: `${i * 0.5}s`
                            }} />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// Glowing Stats Cards
const GlowingStatsCards: React.FC<{ stats: { label: string; value: number; unit: string }[]; isArabic: boolean }> = ({ stats, isArabic }) => {
    const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
            gap: '12px',
            marginBottom: '24px'
        }}>
            {stats.map((stat, i) => (
                <div key={i} style={{
                    background: `linear-gradient(145deg, ${colors[i % colors.length]}11, ${colors[i % colors.length]}05)`,
                    border: `1px solid ${colors[i % colors.length]}33`,
                    borderRadius: '16px',
                    padding: '18px 14px',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Glow orb */}
                    <div style={{
                        position: 'absolute',
                        top: '-20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '60px',
                        height: '60px',
                        background: `radial-gradient(circle, ${colors[i % colors.length]}44, transparent)`,
                        filter: 'blur(20px)'
                    }} />

                    <div style={{
                        fontSize: '28px',
                        fontWeight: 'bold',
                        color: colors[i % colors.length],
                        textShadow: `0 0 30px ${colors[i % colors.length]}`,
                        position: 'relative'
                    }}>
                        {stat.value}{stat.unit}
                    </div>
                    <div style={{ fontSize: '10px', color: '#71717a', marginTop: '6px' }}>
                        {stat.label}
                    </div>
                </div>
            ))}
        </div>
    );
};

// Circular Progress Grid
const CircularProgressGrid: React.FC<{ stats: { label: string; value: number; unit: string }[]; chart?: ChartData }> = ({ stats, chart }) => {
    const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const data = chart?.data || stats.map(s => ({ label: s.label, value: s.value }));

    if (data.length < 3) return null;

    return (
        <div style={{ marginBottom: '24px' }}>
            <h4 style={{
                color: '#fff',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
            }}>
                <span style={{
                    background: 'linear-gradient(135deg, #22c55e, #10b981)',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '14px'
                }}>📈</span>
                {chart?.title || 'Key Metrics'}
            </h4>
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '20px'
            }}>
                {data.slice(0, 4).map((item, i) => (
                    <GlowRingChart
                        key={i}
                        value={Math.min(item.value, 100)}
                        label={item.label}
                        color={colors[i % colors.length]}
                        delay={i * 200}
                    />
                ))}
            </div>
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================
const AutonomousMode: React.FC<AutonomousModeProps> = ({ isOpen, onClose, language }) => {
    const [prompt, setPrompt] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [result, setResult] = useState<TaskResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'charts' | 'summary' | 'report' | 'sources'>('charts');

    const isArabic = language === 'ar';

    const handleStart = async () => {
        if (!prompt.trim()) return;

        setIsRunning(true);
        setProgress(0);
        setError(null);
        setResult(null);
        setStatusMessage(isArabic ? '🔍 جاري البحث...' : '🔍 Researching...');

        const progressInterval = setInterval(() => {
            setProgress(prev => Math.min(prev + Math.random() * 10 + 5, 92));
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
            setActiveTab('charts');

        } catch (err: any) {
            setError(err.message);
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
        if (result) {
            navigator.clipboard.writeText(result.results.report);
            alert(isArabic ? 'تم النسخ!' : 'Copied!');
        }
    };

    if (!isOpen) return null;

    const tabStyle = (active: boolean) => ({
        padding: '10px 18px',
        borderRadius: '10px',
        border: 'none',
        background: active
            ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.4), rgba(139, 92, 246, 0.4))'
            : 'rgba(255,255,255,0.03)',
        color: active ? '#fff' : '#6b7280',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: active ? '600' : '400',
        transition: 'all 0.3s',
        boxShadow: active ? '0 4px 20px rgba(99, 102, 241, 0.25)' : 'none'
    });

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(ellipse at top, #0f0a1a 0%, #000 100%)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            direction: isArabic ? 'rtl' : 'ltr'
        }}>
            {/* Animated background orbs */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                <div style={{
                    position: 'absolute',
                    width: '400px',
                    height: '400px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15), transparent)',
                    top: '-100px',
                    right: '-100px',
                    filter: 'blur(60px)',
                    animation: 'float 8s ease-in-out infinite'
                }} />
                <div style={{
                    position: 'absolute',
                    width: '300px',
                    height: '300px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15), transparent)',
                    bottom: '-50px',
                    left: '-50px',
                    filter: 'blur(60px)',
                    animation: 'float 10s ease-in-out infinite reverse'
                }} />
            </div>

            <div style={{
                background: 'linear-gradient(145deg, rgba(15, 15, 25, 0.95), rgba(20, 20, 35, 0.95))',
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                width: '94%',
                maxWidth: '920px',
                maxHeight: '92vh',
                overflow: 'hidden',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                boxShadow: '0 0 80px rgba(99, 102, 241, 0.1), 0 30px 60px rgba(0, 0, 0, 0.5)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '18px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.05), rgba(168, 85, 247, 0.05))'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            width: '48px', height: '48px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)',
                            borderRadius: '14px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '24px',
                            boxShadow: '0 0 30px rgba(99, 102, 241, 0.4)'
                        }}>🧠</div>
                        <div>
                            <h2 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: '600' }}>
                                {isArabic ? 'الوكيل المستقل' : 'Autonomous Agent'}
                            </h2>
                            <p style={{ margin: 0, color: '#6366f1', fontSize: '11px' }}>
                                ✨ {isArabic ? 'بحث مدعوم بالذكاء الاصطناعي' : 'AI-Powered Research'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} disabled={isRunning} style={{
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        width: '36px', height: '36px', borderRadius: '10px',
                        color: '#fff', cursor: isRunning ? 'not-allowed' : 'pointer',
                        opacity: isRunning ? 0.5 : 1, transition: 'all 0.2s'
                    }}>✕</button>
                </div>

                <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(92vh - 90px)' }}>

                    {/* Input Phase */}
                    {!result && (
                        <>
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.04))',
                                borderRadius: '14px',
                                padding: '16px 18px',
                                marginBottom: '18px',
                                border: '1px solid rgba(99, 102, 241, 0.15)'
                            }}>
                                <p style={{ color: '#a5b4fc', margin: 0, fontSize: '13px' }}>
                                    🚀 {isArabic
                                        ? 'اكتب سؤالك وشاهد السحر! رسوم بيانية متحركة + تقرير شامل'
                                        : 'Ask anything and watch the magic! Animated charts + comprehensive report'
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
                                    width: '100%', minHeight: '100px', padding: '16px',
                                    borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)',
                                    background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '14px',
                                    resize: 'vertical', direction: isArabic ? 'rtl' : 'ltr',
                                    opacity: isRunning ? 0.6 : 1
                                }}
                            />

                            {isRunning && (
                                <div style={{ marginTop: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: '#818cf8', fontSize: '13px' }}>{statusMessage}</span>
                                        <span style={{ color: '#fff', fontSize: '13px', fontWeight: '600' }}>{Math.round(progress)}%</span>
                                    </div>
                                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%', width: `${progress}%`,
                                            background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7)',
                                            transition: 'width 0.3s',
                                            boxShadow: '0 0 20px rgba(99, 102, 241, 0.5)'
                                        }} />
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div style={{
                                    marginTop: '14px', padding: '14px',
                                    background: 'rgba(239, 68, 68, 0.1)', borderRadius: '10px',
                                    border: '1px solid rgba(239, 68, 68, 0.2)'
                                }}>
                                    <p style={{ color: '#ef4444', margin: 0, fontSize: '13px' }}>❌ {error}</p>
                                </div>
                            )}

                            <button
                                onClick={handleStart}
                                disabled={isRunning || !prompt.trim()}
                                style={{
                                    marginTop: '18px', width: '100%', padding: '16px',
                                    borderRadius: '14px', border: 'none',
                                    background: isRunning || !prompt.trim()
                                        ? '#27272a'
                                        : 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)',
                                    color: '#fff', fontSize: '15px', fontWeight: '600',
                                    cursor: isRunning || !prompt.trim() ? 'not-allowed' : 'pointer',
                                    boxShadow: isRunning || !prompt.trim() ? 'none' : '0 8px 30px rgba(99, 102, 241, 0.35)',
                                    transition: 'all 0.3s'
                                }}
                            >
                                {isRunning ? '⚡' : '🚀'} {isRunning
                                    ? (isArabic ? 'السحر يحدث...' : 'Magic happening...')
                                    : (isArabic ? 'أطلق القوة!' : 'Unleash the Power!')
                                }
                            </button>
                        </>
                    )}

                    {/* Results */}
                    {result && (
                        <>
                            {/* Success Header */}
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.05))',
                                borderRadius: '14px', padding: '16px 18px', marginBottom: '18px',
                                border: '1px solid rgba(34, 197, 94, 0.2)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'
                            }}>
                                <div>
                                    <h3 style={{ color: '#22c55e', margin: 0, fontSize: '16px', fontWeight: '600' }}>
                                        ✨ {result.title}
                                    </h3>
                                    <p style={{ color: '#86efac', margin: '4px 0 0', fontSize: '11px' }}>
                                        ⏱️ {result.execution.executionTime} |
                                        📊 {result.results.charts?.length || 0} {isArabic ? 'رسم' : 'charts'} |
                                        📚 {result.results.sources.length} {isArabic ? 'مصادر' : 'sources'}
                                    </p>
                                </div>
                                <button onClick={handleReset} style={{
                                    padding: '8px 14px', borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(255,255,255,0.05)', color: '#fff',
                                    cursor: 'pointer', fontSize: '12px'
                                }}>🔄 {isArabic ? 'جديد' : 'New'}</button>
                            </div>

                            {/* Tabs */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
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
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: '16px', padding: '24px',
                                maxHeight: '400px', overflowY: 'auto',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                {activeTab === 'charts' && (
                                    <>
                                        {/* Stats Cards */}
                                        {result.results.stats && result.results.stats.length > 0 && (
                                            <GlowingStatsCards stats={result.results.stats} isArabic={isArabic} />
                                        )}

                                        {/* Circular Progress if we have percentage data */}
                                        {result.results.charts?.find(c => c.unit === '%') && (
                                            <CircularProgressGrid
                                                stats={result.results.stats}
                                                chart={result.results.charts.find(c => c.unit === '%')}
                                            />
                                        )}

                                        {/* Charts */}
                                        {result.results.charts && result.results.charts.length > 0 ? (
                                            result.results.charts.map((chart, i) => (
                                                chart.type === 'ranking'
                                                    ? <FuturisticRanking key={i} chart={chart} isArabic={isArabic} />
                                                    : <NeonBarChart key={i} chart={chart} isArabic={isArabic} />
                                            ))
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                                                <span style={{ fontSize: '50px', display: 'block', marginBottom: '16px' }}>📊</span>
                                                {isArabic ? 'لا توجد بيانات رسومية' : 'No chart data available'}
                                            </div>
                                        )}
                                    </>
                                )}

                                {activeTab === 'summary' && (
                                    <p style={{ color: '#e5e5e5', lineHeight: '2', margin: 0, whiteSpace: 'pre-wrap', fontSize: '14px' }}>
                                        {result.results.summary}
                                    </p>
                                )}

                                {activeTab === 'report' && (
                                    <div style={{ color: '#d4d4d4', lineHeight: '1.9', whiteSpace: 'pre-wrap', fontSize: '13px' }}>
                                        {result.results.report}
                                    </div>
                                )}

                                {activeTab === 'sources' && (
                                    <>
                                        {result.results.sources.length > 0 ? (
                                            result.results.sources.map((s, i) => (
                                                <div key={i} style={{
                                                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), transparent)',
                                                    borderRadius: '10px', padding: '14px', marginBottom: '10px',
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
                            <div style={{ display: 'flex', gap: '12px', marginTop: '18px' }}>
                                <button onClick={handleCopy} style={{
                                    flex: 1, padding: '14px', borderRadius: '12px', border: 'none',
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '500',
                                    boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)'
                                }}>📋 {isArabic ? 'نسخ' : 'Copy'}</button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-20px); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 1; }
                }
                @keyframes shine {
                    0% { left: -100%; }
                    100% { left: 200%; }
                }
            `}</style>
        </div>
    );
};

export default AutonomousMode;
