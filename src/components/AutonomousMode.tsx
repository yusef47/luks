import React, { useState, useEffect, useRef } from 'react';

interface AutonomousModeProps {
    isOpen: boolean;
    onClose: () => void;
    language: 'ar' | 'en';
}

interface ChartData {
    type: 'donut' | 'bar' | 'ranking' | 'score' | 'versus';
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
// 🌟 CHART COMPONENTS - All Types
// ============================================

// Animated Donut/Ring Chart
const DonutChart: React.FC<{ chart: ChartData; isArabic: boolean }> = ({ chart, isArabic }) => {
    const [animated, setAnimated] = useState(false);
    const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    useEffect(() => { setTimeout(() => setAnimated(true), 100); }, []);

    const total = chart.data.reduce((a, b) => a + b.value, 0);
    let currentAngle = 0;

    return (
        <div style={{ marginBottom: '28px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', padding: '20px' }}>
            <h4 style={{ color: '#fff', marginBottom: '20px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', padding: '6px 10px', borderRadius: '8px' }}>📊</span>
                {chart.title}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' }}>
                <svg width="180" height="180" viewBox="0 0 100 100">
                    {chart.data.map((item, i) => {
                        const angle = (item.value / total) * 360;
                        const startAngle = currentAngle;
                        currentAngle += angle;

                        const startRad = (startAngle - 90) * Math.PI / 180;
                        const endRad = (startAngle + angle - 90) * Math.PI / 180;
                        const largeArc = angle > 180 ? 1 : 0;

                        const x1 = 50 + 35 * Math.cos(startRad);
                        const y1 = 50 + 35 * Math.sin(startRad);
                        const x2 = 50 + 35 * Math.cos(endRad);
                        const y2 = 50 + 35 * Math.sin(endRad);

                        const path = `M 50 50 L ${x1} ${y1} A 35 35 0 ${largeArc} 1 ${x2} ${y2} Z`;

                        return (
                            <path
                                key={i}
                                d={path}
                                fill={colors[i % colors.length]}
                                style={{
                                    opacity: animated ? 1 : 0,
                                    transform: animated ? 'scale(1)' : 'scale(0)',
                                    transformOrigin: '50px 50px',
                                    transition: `all 0.5s ease ${i * 0.1}s`,
                                    filter: `drop-shadow(0 0 8px ${colors[i % colors.length]}66)`
                                }}
                            />
                        );
                    })}
                    <circle cx="50" cy="50" r="22" fill="#0a0a12" />
                </svg>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {chart.data.map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: colors[i % colors.length], boxShadow: `0 0 10px ${colors[i % colors.length]}` }} />
                            <span style={{ color: '#a1a1aa', fontSize: '12px' }}>{item.label}</span>
                            <span style={{ color: '#fff', fontSize: '12px', fontWeight: '600' }}>{item.value}{chart.unit}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Neon Bar Chart
const NeonBarChart: React.FC<{ chart: ChartData; isArabic: boolean }> = ({ chart, isArabic }) => {
    const [animated, setAnimated] = useState(false);
    const maxValue = Math.max(...chart.data.map(d => d.value));
    const colors = ['#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6'];

    useEffect(() => { setTimeout(() => setAnimated(true), 100); }, []);

    return (
        <div style={{ marginBottom: '28px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', padding: '20px' }}>
            <h4 style={{ color: '#fff', marginBottom: '20px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ background: 'linear-gradient(135deg, #22c55e, #10b981)', padding: '6px 10px', borderRadius: '8px' }}>📈</span>
                {chart.title}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {chart.data.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '80px', fontSize: '11px', color: colors[i % colors.length], textAlign: isArabic ? 'right' : 'left', fontWeight: '500', textShadow: `0 0 10px ${colors[i % colors.length]}44` }}>
                            {item.label}
                        </div>
                        <div style={{ flex: 1, height: '28px', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                            <div style={{
                                width: animated ? `${(item.value / maxValue) * 100}%` : '0%',
                                height: '100%',
                                background: `linear-gradient(90deg, ${colors[i % colors.length]}, ${colors[i % colors.length]}aa)`,
                                borderRadius: '6px',
                                transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                                transitionDelay: `${i * 80}ms`,
                                boxShadow: `0 0 15px ${colors[i % colors.length]}55`
                            }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(180deg, rgba(255,255,255,0.2), transparent)', borderRadius: '6px 6px 0 0' }} />
                            </div>
                            <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 'bold', color: '#fff' }}>
                                {chart.unit === '$' ? '$' : ''}{item.value.toLocaleString()}{chart.unit !== '$' ? chart.unit : ''}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Futuristic Ranking
const RankingChart: React.FC<{ chart: ChartData; isArabic: boolean }> = ({ chart, isArabic }) => {
    const [visible, setVisible] = useState(false);
    const trophies = ['👑', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];
    const colors = ['#fbbf24', '#94a3b8', '#cd7c2a', '#6366f1', '#22c55e', '#f43f5e', '#8b5cf6', '#06b6d4'];

    useEffect(() => { setTimeout(() => setVisible(true), 150); }, []);

    return (
        <div style={{ marginBottom: '28px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', padding: '20px' }}>
            <h4 style={{ color: '#fff', marginBottom: '20px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', padding: '6px 10px', borderRadius: '8px' }}>🏆</span>
                {chart.title}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                {chart.data.map((item, i) => (
                    <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '12px 14px',
                        background: visible ? `linear-gradient(135deg, ${colors[i]}15, ${colors[i]}05)` : 'transparent',
                        borderRadius: '10px',
                        border: `1px solid ${colors[i]}33`,
                        transform: visible ? 'translateY(0)' : 'translateY(20px)',
                        opacity: visible ? 1 : 0,
                        transition: `all 0.4s ease ${i * 80}ms`,
                        boxShadow: i < 3 ? `0 0 20px ${colors[i]}22` : 'none'
                    }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: i < 3 ? `linear-gradient(135deg, ${colors[i]}, ${colors[i]}aa)` : 'rgba(255,255,255,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '14px', boxShadow: i < 3 ? `0 0 15px ${colors[i]}66` : 'none'
                        }}>{trophies[i]}</div>
                        <span style={{ flex: 1, color: '#fff', fontSize: '12px', fontWeight: i < 3 ? '600' : '400' }}>{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Score/Rating Chart - Horizontal Bars with Stars
const ScoreChart: React.FC<{ chart: ChartData; isArabic: boolean }> = ({ chart, isArabic }) => {
    const [animated, setAnimated] = useState(false);
    useEffect(() => { setTimeout(() => setAnimated(true), 100); }, []);

    return (
        <div style={{ marginBottom: '28px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', padding: '20px' }}>
            <h4 style={{ color: '#fff', marginBottom: '20px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ background: 'linear-gradient(135deg, #ec4899, #f43f5e)', padding: '6px 10px', borderRadius: '8px' }}>⭐</span>
                {chart.title}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {chart.data.map((item, i) => (
                    <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ color: '#fff', fontSize: '13px' }}>{item.label}</span>
                            <span style={{ color: '#ec4899', fontSize: '13px', fontWeight: '600' }}>{item.value}/100</span>
                        </div>
                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                                width: animated ? `${item.value}%` : '0%',
                                height: '100%',
                                background: 'linear-gradient(90deg, #ec4899, #f43f5e, #fb7185)',
                                borderRadius: '4px',
                                transition: 'width 1s ease',
                                transitionDelay: `${i * 100}ms`,
                                boxShadow: '0 0 15px rgba(236, 72, 153, 0.5)'
                            }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Versus/Comparison Chart
const VersusChart: React.FC<{ chart: ChartData; isArabic: boolean }> = ({ chart, isArabic }) => {
    const [animated, setAnimated] = useState(false);
    const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444'];

    useEffect(() => { setTimeout(() => setAnimated(true), 100); }, []);

    return (
        <div style={{ marginBottom: '28px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', padding: '20px' }}>
            <h4 style={{ color: '#fff', marginBottom: '20px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ background: 'linear-gradient(135deg, #8b5cf6, #a855f7)', padding: '6px 10px', borderRadius: '8px' }}>⚔️</span>
                {chart.title}
            </h4>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '20px', height: '180px', padding: '0 20px' }}>
                {chart.data.map((item, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                        <span style={{ color: colors[i % colors.length], fontSize: '18px', fontWeight: '700', marginBottom: '8px', textShadow: `0 0 20px ${colors[i % colors.length]}` }}>
                            {Math.round(item.value)}
                        </span>
                        <div style={{
                            width: '100%',
                            maxWidth: '60px',
                            height: animated ? `${item.value * 1.5}px` : '0px',
                            background: `linear-gradient(180deg, ${colors[i % colors.length]}, ${colors[i % colors.length]}88)`,
                            borderRadius: '8px 8px 0 0',
                            transition: 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                            transitionDelay: `${i * 100}ms`,
                            boxShadow: `0 0 25px ${colors[i % colors.length]}44`
                        }} />
                        <span style={{ color: '#a1a1aa', fontSize: '11px', marginTop: '8px', textAlign: 'center' }}>{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Stats Cards
const StatsCards: React.FC<{ stats: { label: string; value: number; unit: string }[] }> = ({ stats }) => {
    const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            {stats.map((stat, i) => (
                <div key={i} style={{
                    background: `linear-gradient(145deg, ${colors[i % colors.length]}15, ${colors[i % colors.length]}05)`,
                    border: `1px solid ${colors[i % colors.length]}33`,
                    borderRadius: '14px', padding: '16px', textAlign: 'center', position: 'relative', overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', width: '50px', height: '50px', background: `radial-gradient(circle, ${colors[i % colors.length]}33, transparent)`, filter: 'blur(15px)' }} />
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: colors[i % colors.length], textShadow: `0 0 25px ${colors[i % colors.length]}`, position: 'relative' }}>
                        {stat.unit === '$' ? '$' : ''}{stat.value.toLocaleString()}{stat.unit !== '$' ? stat.unit : ''}
                    </div>
                    <div style={{ fontSize: '10px', color: '#71717a', marginTop: '4px' }}>{stat.label}</div>
                </div>
            ))}
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
    const reportRef = useRef<HTMLDivElement>(null);

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

    // PDF Export with all charts
    const handleExportPDF = () => {
        if (!result) return;

        const chartColors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

        // Generate chart HTML for PDF
        const chartsHTML = result.results.charts.map((chart, ci) => {
            const maxVal = Math.max(...chart.data.map(d => d.value));
            return `
                <div style="margin: 20px 0; padding: 20px; background: linear-gradient(135deg, #f8fafc, #f1f5f9); border-radius: 12px; border-left: 4px solid ${chartColors[ci % chartColors.length]};">
                    <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">📊 ${chart.title}</h3>
                    ${chart.data.map((item, i) => `
                        <div style="margin: 10px 0;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span style="color: #4b5563; font-size: 12px;">${item.label}</span>
                                <span style="color: ${chartColors[i % chartColors.length]}; font-weight: 600; font-size: 12px;">${chart.unit === '$' ? '$' : ''}${item.value.toLocaleString()}${chart.unit !== '$' ? chart.unit : ''}</span>
                            </div>
                            <div style="height: 12px; background: #e5e7eb; border-radius: 6px; overflow: hidden;">
                                <div style="height: 100%; width: ${(item.value / maxVal) * 100}%; background: linear-gradient(90deg, ${chartColors[i % chartColors.length]}, ${chartColors[i % chartColors.length]}aa); border-radius: 6px;"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }).join('');

        // Stats HTML
        const statsHTML = result.results.stats.length > 0 ? `
            <div style="display: flex; gap: 15px; flex-wrap: wrap; margin: 20px 0;">
                ${result.results.stats.map((stat, i) => `
                    <div style="flex: 1; min-width: 100px; padding: 15px 20px; background: linear-gradient(135deg, ${chartColors[i % chartColors.length]}15, ${chartColors[i % chartColors.length]}05); border: 1px solid ${chartColors[i % chartColors.length]}33; border-radius: 10px; text-align: center;">
                        <div style="font-size: 22px; font-weight: bold; color: ${chartColors[i % chartColors.length]};">${stat.unit === '$' ? '$' : ''}${stat.value.toLocaleString()}${stat.unit !== '$' ? stat.unit : ''}</div>
                        <div style="font-size: 10px; color: #6b7280; margin-top: 4px;">${stat.label}</div>
                    </div>
                `).join('')}
            </div>
        ` : '';

        const content = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>${result.title} - Lukas AI Report</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                    * { box-sizing: border-box; }
                    body { 
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
                        padding: 40px 50px; 
                        direction: ${isArabic ? 'rtl' : 'ltr'}; 
                        line-height: 1.8; 
                        max-width: 900px; 
                        margin: 0 auto; 
                        color: #1f2937;
                        background: #fff;
                    }
                    h1 { 
                        color: #111827; 
                        font-size: 28px; 
                        margin-bottom: 10px;
                        padding-bottom: 15px;
                        border-bottom: 3px solid #6366f1;
                    }
                    h2 { 
                        color: #374151; 
                        font-size: 18px; 
                        margin-top: 30px;
                        padding-left: 15px;
                        border-left: 4px solid #6366f1;
                    }
                    .meta { color: #6b7280; font-size: 12px; margin-bottom: 25px; }
                    .summary { 
                        background: linear-gradient(135deg, #f0fdf4, #dcfce7); 
                        padding: 20px 25px; 
                        border-radius: 12px; 
                        margin: 25px 0;
                        border-left: 4px solid #22c55e;
                    }
                    .report-content { 
                        line-height: 2; 
                        font-size: 14px;
                    }
                    .sources { 
                        margin-top: 40px; 
                        padding: 20px; 
                        background: #f9fafb; 
                        border-radius: 10px; 
                    }
                    .source { 
                        margin: 10px 0; 
                        padding: 10px 15px;
                        background: #fff;
                        border-radius: 8px;
                        border-left: 3px solid #6366f1;
                    }
                    .source a { color: #6366f1; text-decoration: none; font-size: 12px; }
                    footer { 
                        margin-top: 50px; 
                        text-align: center; 
                        color: #9ca3af; 
                        font-size: 11px; 
                        border-top: 1px solid #e5e7eb; 
                        padding-top: 20px; 
                    }
                    @media print {
                        body { padding: 20px; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <h1>📊 ${result.title}</h1>
                <div class="meta">
                    ⏱️ ${isArabic ? 'وقت التنفيذ:' : 'Execution time:'} ${result.execution.executionTime} | 
                    📊 ${result.results.charts.length} ${isArabic ? 'رسم بياني' : 'charts'} | 
                    📚 ${result.results.sources.length} ${isArabic ? 'مصادر' : 'sources'} |
                    📅 ${new Date().toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>

                ${statsHTML}

                <div class="summary">
                    <h2 style="margin-top: 0; border: none; padding: 0;">📝 ${isArabic ? 'الملخص التنفيذي' : 'Executive Summary'}</h2>
                    <p>${result.results.summary}</p>
                </div>

                <h2>📊 ${isArabic ? 'الرسوم البيانية والبيانات' : 'Charts & Data'}</h2>
                ${chartsHTML}

                <h2>📄 ${isArabic ? 'التقرير الكامل' : 'Full Report'}</h2>
                <div class="report-content">
                    ${result.results.report.replace(/##\s*/g, '<h3>').replace(/\n/g, '<br>')}
                </div>

                <div class="sources">
                    <h2 style="margin-top: 0;">📚 ${isArabic ? 'المصادر' : 'Sources'}</h2>
                    ${result.results.sources.map((s, i) => `
                        <div class="source">
                            <strong>${i + 1}.</strong> ${s.title}<br>
                            <a href="${s.url}" target="_blank">🔗 ${s.url}</a>
                        </div>
                    `).join('')}
                </div>

                <footer>
                    <img src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><text y='20' font-size='20'>🧠</text></svg>" style="width: 24px; vertical-align: middle;">
                    ${isArabic ? 'تقرير مُعد بواسطة لوكاس AI - وضع الاستقلالية' : 'Report generated by Lukas AI - Autonomous Mode'}<br>
                    ${new Date().toLocaleString(isArabic ? 'ar-EG' : 'en-US')}
                </footer>

                <script>
                    window.onload = function() { 
                        setTimeout(function() { window.print(); }, 500);
                    };
                </script>
            </body>
            </html>
        `;

        const win = window.open('', '_blank');
        if (win) {
            win.document.write(content);
            win.document.close();
        }
    };

    if (!isOpen) return null;

    const tabStyle = (active: boolean) => ({
        padding: '10px 18px',
        borderRadius: '10px',
        border: 'none',
        background: active ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.4), rgba(139, 92, 246, 0.4))' : 'rgba(255,255,255,0.03)',
        color: active ? '#fff' : '#6b7280',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: active ? '600' : '400',
        transition: 'all 0.3s',
        boxShadow: active ? '0 4px 20px rgba(99, 102, 241, 0.25)' : 'none'
    });

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'radial-gradient(ellipse at top, #0f0a1a 0%, #000 100%)',
            zIndex: 9999,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            direction: isArabic ? 'rtl' : 'ltr'
        }}>
            {/* Background orbs */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15), transparent)', top: '-100px', right: '-100px', filter: 'blur(60px)', animation: 'float 8s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15), transparent)', bottom: '-50px', left: '-50px', filter: 'blur(60px)', animation: 'float 10s ease-in-out infinite reverse' }} />
            </div>

            <div style={{
                background: 'linear-gradient(145deg, rgba(15, 15, 25, 0.95), rgba(20, 20, 35, 0.95))',
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                width: '95%', maxWidth: '950px', maxHeight: '94vh',
                overflow: 'hidden',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                boxShadow: '0 0 80px rgba(99, 102, 241, 0.1), 0 30px 60px rgba(0, 0, 0, 0.5)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.05), rgba(168, 85, 247, 0.05))'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', boxShadow: '0 0 25px rgba(99, 102, 241, 0.4)' }}>🧠</div>
                        <div>
                            <h2 style={{ margin: 0, color: '#fff', fontSize: '17px', fontWeight: '600' }}>{isArabic ? 'الوكيل المستقل' : 'Autonomous Agent'}</h2>
                            <p style={{ margin: 0, color: '#6366f1', fontSize: '11px' }}>✨ {isArabic ? 'بحث + تحليل + رسوم بيانية + PDF' : 'Research + Analysis + Charts + PDF'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} disabled={isRunning} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', width: '34px', height: '34px', borderRadius: '8px', color: '#fff', cursor: isRunning ? 'not-allowed' : 'pointer', opacity: isRunning ? 0.5 : 1 }}>✕</button>
                </div>

                <div ref={reportRef} style={{ padding: '20px 24px', overflowY: 'auto', maxHeight: 'calc(94vh - 85px)' }}>
                    {/* Input */}
                    {!result && (
                        <>
                            <div style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.04))', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
                                <p style={{ color: '#a5b4fc', margin: 0, fontSize: '13px' }}>
                                    🚀 {isArabic ? 'اكتب سؤالك وشاهد السحر! رسوم بيانية متعددة + تصدير PDF' : 'Ask anything! Multiple chart types + PDF export'}
                                </p>
                            </div>

                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                disabled={isRunning}
                                placeholder={isArabic ? 'مثال: قارن بين أفضل 5 لغات برمجة في 2025 من حيث الرواتب والطلب' : 'Example: Compare top 5 programming languages in 2025'}
                                style={{ width: '100%', minHeight: '90px', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '14px', resize: 'vertical', direction: isArabic ? 'rtl' : 'ltr', opacity: isRunning ? 0.6 : 1 }}
                            />

                            {isRunning && (
                                <div style={{ marginTop: '18px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{ color: '#818cf8', fontSize: '13px' }}>{statusMessage}</span>
                                        <span style={{ color: '#fff', fontSize: '13px', fontWeight: '600' }}>{Math.round(progress)}%</span>
                                    </div>
                                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7)', transition: 'width 0.3s', boxShadow: '0 0 20px rgba(99, 102, 241, 0.5)' }} />
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div style={{ marginTop: '14px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    <p style={{ color: '#ef4444', margin: 0, fontSize: '13px' }}>❌ {error}</p>
                                </div>
                            )}

                            <button onClick={handleStart} disabled={isRunning || !prompt.trim()} style={{ marginTop: '16px', width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: isRunning || !prompt.trim() ? '#27272a' : 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: isRunning || !prompt.trim() ? 'not-allowed' : 'pointer', boxShadow: isRunning || !prompt.trim() ? 'none' : '0 8px 30px rgba(99, 102, 241, 0.35)' }}>
                                {isRunning ? '⚡' : '🚀'} {isRunning ? (isArabic ? 'السحر يحدث...' : 'Magic happening...') : (isArabic ? 'أطلق القوة!' : 'Unleash the Power!')}
                            </button>
                        </>
                    )}

                    {/* Results */}
                    {result && (
                        <>
                            {/* Header */}
                            <div style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.05))', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', border: '1px solid rgba(34, 197, 94, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                <div>
                                    <h3 style={{ color: '#22c55e', margin: 0, fontSize: '15px', fontWeight: '600' }}>✨ {result.title}</h3>
                                    <p style={{ color: '#86efac', margin: '3px 0 0', fontSize: '11px' }}>⏱️ {result.execution.executionTime} | 📊 {result.results.charts?.length || 0} {isArabic ? 'رسم' : 'charts'} | 📚 {result.results.sources.length} {isArabic ? 'مصادر' : 'sources'}</p>
                                </div>
                                <button onClick={handleReset} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', fontSize: '11px' }}>🔄 {isArabic ? 'جديد' : 'New'}</button>
                            </div>

                            {/* Tabs */}
                            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                                <button onClick={() => setActiveTab('charts')} style={tabStyle(activeTab === 'charts')}>📊 {isArabic ? 'الرسوم' : 'Charts'}</button>
                                <button onClick={() => setActiveTab('summary')} style={tabStyle(activeTab === 'summary')}>📝 {isArabic ? 'الملخص' : 'Summary'}</button>
                                <button onClick={() => setActiveTab('report')} style={tabStyle(activeTab === 'report')}>📄 {isArabic ? 'التقرير' : 'Report'}</button>
                                <button onClick={() => setActiveTab('sources')} style={tabStyle(activeTab === 'sources')}>🔗 {isArabic ? 'المصادر' : 'Sources'}</button>
                            </div>

                            {/* Content */}
                            <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '16px', padding: '20px', maxHeight: '380px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.04)' }}>
                                {activeTab === 'charts' && (
                                    <>
                                        {result.results.stats?.length > 0 && <StatsCards stats={result.results.stats} />}

                                        {result.results.charts?.length > 0 ? (
                                            result.results.charts.map((chart, i) => {
                                                switch (chart.type) {
                                                    case 'donut': return <DonutChart key={i} chart={chart} isArabic={isArabic} />;
                                                    case 'bar': return <NeonBarChart key={i} chart={chart} isArabic={isArabic} />;
                                                    case 'ranking': return <RankingChart key={i} chart={chart} isArabic={isArabic} />;
                                                    case 'score': return <ScoreChart key={i} chart={chart} isArabic={isArabic} />;
                                                    case 'versus': return <VersusChart key={i} chart={chart} isArabic={isArabic} />;
                                                    default: return <NeonBarChart key={i} chart={chart} isArabic={isArabic} />;
                                                }
                                            })
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                                                <span style={{ fontSize: '50px', display: 'block', marginBottom: '16px' }}>📊</span>
                                                {isArabic ? 'لا توجد بيانات رسومية' : 'No chart data available'}
                                            </div>
                                        )}
                                    </>
                                )}

                                {activeTab === 'summary' && (
                                    <p style={{ color: '#e5e5e5', lineHeight: '2', margin: 0, whiteSpace: 'pre-wrap', fontSize: '14px' }}>{result.results.summary}</p>
                                )}

                                {activeTab === 'report' && (
                                    <div style={{ color: '#d4d4d4', lineHeight: '1.9', whiteSpace: 'pre-wrap', fontSize: '13px' }}>{result.results.report}</div>
                                )}

                                {activeTab === 'sources' && (
                                    <>
                                        {result.results.sources.length > 0 ? result.results.sources.map((s, i) => (
                                            <div key={i} style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), transparent)', borderRadius: '10px', padding: '12px 14px', marginBottom: '8px', borderLeft: '3px solid #6366f1' }}>
                                                <div style={{ color: '#fff', fontSize: '13px', marginBottom: '4px' }}>{s.title}</div>
                                                {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', fontSize: '11px', textDecoration: 'none' }}>🔗 {s.url.substring(0, 50)}...</a>}
                                            </div>
                                        )) : <p style={{ color: '#6b7280', textAlign: 'center' }}>{isArabic ? 'لا توجد مصادر' : 'No sources'}</p>}
                                    </>
                                )}
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                                <button onClick={handleCopy} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '500', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)' }}>
                                    📋 {isArabic ? 'نسخ' : 'Copy'}
                                </button>
                                <button onClick={handleExportPDF} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '500', boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)' }}>
                                    📄 {isArabic ? 'تصدير PDF' : 'Export PDF'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
            `}</style>
        </div>
    );
};

export default AutonomousMode;
