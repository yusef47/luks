import React, { useState, useRef } from 'react';

interface AutonomousModeProps {
    isOpen: boolean;
    onClose: () => void;
    language: 'ar' | 'en';
}

interface Stage {
    id: number;
    name: string;
    description: string;
    searchQueries: string[];
    estimatedTime: string;
}

interface Plan {
    taskTitle: string;
    complexity: string;
    requiredSources: string[];
    stages: Stage[];
    expectedOutputs: string[];
    totalEstimatedTime: string;
}

interface StageDetail {
    id: number;
    name: string;
    status: string;
    queriesExecuted: number;
}

interface Source {
    title: string;
    url: string;
}

interface TaskResult {
    title: string;
    complexity: string;
    plan: {
        stages: Stage[];
        totalStages: number;
        expectedOutputs: string[];
    };
    execution: {
        stagesCompleted: number;
        stageDetails: StageDetail[];
    };
    results: {
        summary: string;
        report: string;
        stats: { label: string; value: number; unit: string }[];
        sources: Source[];
    };
}

const BACKEND_URL = '/api';

const AutonomousMode: React.FC<AutonomousModeProps> = ({ isOpen, onClose, language }) => {
    const [prompt, setPrompt] = useState('');
    const [phase, setPhase] = useState<'input' | 'planning' | 'executing' | 'done'>('input');
    const [plan, setPlan] = useState<Plan | null>(null);
    const [currentStage, setCurrentStage] = useState(0);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [result, setResult] = useState<TaskResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'summary' | 'report' | 'stages' | 'sources'>('summary');
    const reportRef = useRef<HTMLDivElement>(null);

    const isArabic = language === 'ar';

    // Get plan first, then execute
    const handleStart = async () => {
        if (!prompt.trim()) return;

        setPhase('planning');
        setError(null);
        setStatusMessage(isArabic ? '🧠 جاري تحليل المهمة وإنشاء الخطة...' : '🧠 Analyzing task and creating plan...');

        try {
            // Step 1: Get the plan
            const planResponse = await fetch(`${BACKEND_URL}/autonomous`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'plan', prompt })
            });

            const planData = await planResponse.json();

            if (!planData.success) throw new Error(planData.error);

            setPlan(planData.data.plan);
            setPhase('executing');

            // Step 2: Execute with progress simulation
            setProgress(0);
            const stages = planData.data.plan.stages;
            const progressPerStage = 100 / (stages.length + 2); // +2 for planning and synthesis

            // Update progress for each stage
            const progressInterval = setInterval(() => {
                setProgress(prev => {
                    const newProgress = Math.min(prev + 2, 95);
                    const stageIndex = Math.floor((newProgress / 100) * stages.length);
                    if (stageIndex !== currentStage && stageIndex < stages.length) {
                        setCurrentStage(stageIndex);
                        setStatusMessage(
                            isArabic
                                ? `📊 المرحلة ${stageIndex + 1}: ${stages[stageIndex].name}`
                                : `📊 Stage ${stageIndex + 1}: ${stages[stageIndex].name}`
                        );
                    }
                    return newProgress;
                });
            }, 1500);

            // Execute the full task
            const execResponse = await fetch(`${BACKEND_URL}/autonomous`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'run', prompt })
            });

            clearInterval(progressInterval);

            const execData = await execResponse.json();

            if (!execData.success) throw new Error(execData.error);

            setProgress(100);
            setResult(execData.data);
            setPhase('done');
            setStatusMessage(isArabic ? '✅ تم الانتهاء بنجاح!' : '✅ Completed successfully!');
            setActiveTab('summary');

        } catch (err: any) {
            setError(err.message);
            setPhase('input');
            setStatusMessage('');
        }
    };

    const handleReset = () => {
        setPrompt('');
        setPhase('input');
        setPlan(null);
        setResult(null);
        setProgress(0);
        setCurrentStage(0);
        setStatusMessage('');
        setError(null);
    };

    const handleCopyReport = () => {
        if (!result) return;
        const text = `${result.title}\n\n${result.results.summary}\n\n${result.results.report}\n\nSources:\n${result.results.sources.map(s => `- ${s.title}: ${s.url}`).join('\n')}`;
        navigator.clipboard.writeText(text);
        alert(isArabic ? 'تم نسخ التقرير!' : 'Report copied!');
    };

    const handlePrint = () => {
        const content = `
            <html>
            <head>
                <meta charset="utf-8">
                <title>${result?.title}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; direction: ${isArabic ? 'rtl' : 'ltr'}; line-height: 1.8; max-width: 800px; margin: 0 auto; }
                    h1 { color: #1a1a2e; border-bottom: 3px solid #6366f1; padding-bottom: 15px; }
                    h2 { color: #374151; margin-top: 30px; border-left: 4px solid #6366f1; padding-left: 15px; }
                    .summary { background: linear-gradient(135deg, #f0fdf4, #dcfce7); padding: 25px; border-radius: 12px; margin: 25px 0; }
                    .stats { display: flex; gap: 15px; flex-wrap: wrap; margin: 25px 0; }
                    .stat { background: #f3f4f6; padding: 20px; border-radius: 10px; text-align: center; min-width: 120px; }
                    .stat-value { font-size: 28px; font-weight: bold; color: #6366f1; }
                    .sources { margin-top: 40px; padding: 20px; background: #f9fafb; border-radius: 10px; }
                    .source { margin: 10px 0; color: #4b5563; }
                    .source a { color: #6366f1; }
                    .methodology { background: #eff6ff; padding: 20px; border-radius: 10px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <h1>📊 ${result?.title}</h1>
                
                <div class="methodology">
                    <strong>${isArabic ? 'منهجية البحث:' : 'Methodology:'}</strong>
                    ${result?.plan.stages.map(s => `<br>• ${s.name}`).join('')}
                </div>
                
                <div class="summary">
                    <h2>${isArabic ? '📝 الملخص التنفيذي' : '📝 Executive Summary'}</h2>
                    <p>${result?.results.summary}</p>
                </div>

                ${result?.results.stats && result.results.stats.length > 0 ? `
                <div class="stats">
                    ${result.results.stats.map(s => `
                        <div class="stat">
                            <div class="stat-value">${s.value}${s.unit}</div>
                            <div>${s.label}</div>
                        </div>
                    `).join('')}
                </div>
                ` : ''}

                <div class="report">${result?.results.report.replace(/##/g, '<h2>').replace(/\n/g, '<br>')}</div>

                <div class="sources">
                    <h2>${isArabic ? '📚 المصادر' : '📚 Sources'}</h2>
                    ${result?.results.sources.map(s => `<div class="source">• <a href="${s.url}" target="_blank">${s.title}</a></div>`).join('')}
                </div>

                <footer style="margin-top: 50px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                    ${isArabic ? 'تقرير مُعد بواسطة لوكاس AI - وضع الاستقلالية' : 'Report by Lukas AI - Autonomous Mode'}<br>
                    ${new Date().toLocaleDateString()} | ${result?.execution.stagesCompleted} ${isArabic ? 'مراحل بحثية' : 'research stages'}
                </footer>
            </body>
            </html>
        `;

        const win = window.open('', '_blank');
        if (win) {
            win.document.write(content);
            win.document.close();
            setTimeout(() => win.print(), 500);
        }
    };

    if (!isOpen) return null;

    const tabStyle = (isActive: boolean) => ({
        padding: '10px 18px',
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
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(12px)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            direction: isArabic ? 'rtl' : 'ltr'
        }}>
            <div style={{
                background: 'linear-gradient(145deg, #0f0f1a 0%, #1a1a2e 100%)',
                borderRadius: '24px',
                width: '95%',
                maxWidth: '950px',
                maxHeight: '92vh',
                overflow: 'hidden',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.7)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '45px', height: '45px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            borderRadius: '12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '24px'
                        }}>🧠</div>
                        <div>
                            <h2 style={{ margin: 0, color: '#fff', fontSize: '20px' }}>
                                {isArabic ? 'الوكيل المستقل' : 'Autonomous Agent'}
                            </h2>
                            <p style={{ margin: 0, color: '#a1a1aa', fontSize: '12px' }}>
                                {isArabic ? 'تخطيط → بحث متعدد المراحل → تحليل → تقرير' : 'Plan → Multi-Stage Research → Analyze → Report'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={phase === 'planning' || phase === 'executing'}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            width: '36px', height: '36px',
                            borderRadius: '50%',
                            color: '#fff',
                            cursor: phase === 'planning' || phase === 'executing' ? 'not-allowed' : 'pointer',
                            fontSize: '18px',
                            opacity: phase === 'planning' || phase === 'executing' ? 0.5 : 1
                        }}
                    >✕</button>
                </div>

                {/* Content */}
                <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(92vh - 100px)' }}>

                    {/* INPUT PHASE */}
                    {phase === 'input' && (
                        <>
                            <div style={{
                                background: 'rgba(99, 102, 241, 0.1)',
                                borderRadius: '12px',
                                padding: '16px',
                                marginBottom: '20px',
                                border: '1px solid rgba(99, 102, 241, 0.2)'
                            }}>
                                <p style={{ color: '#c4b5fd', margin: 0, fontSize: '14px' }}>
                                    💡 {isArabic
                                        ? 'هذا الوكيل يعمل بشكل مستقل: يخطط، يبحث في مصادر حقيقية، يحلل، ويكتب تقرير شامل.'
                                        : 'This agent works autonomously: plans, searches real sources, analyzes, and writes a comprehensive report.'
                                    }
                                </p>
                            </div>

                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder={isArabic
                                    ? 'مثال: أريد تحليل شامل لسوق السيارات الكهربائية في الشرق الأوسط 2024-2025، مع مقارنة الأسعار والتوقعات'
                                    : 'Example: Complete analysis of the electric vehicle market in Middle East 2024-2025, with price comparison and forecasts'
                                }
                                style={{
                                    width: '100%',
                                    minHeight: '120px',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    background: 'rgba(0,0,0,0.4)',
                                    color: '#fff',
                                    fontSize: '15px',
                                    resize: 'vertical',
                                    direction: isArabic ? 'rtl' : 'ltr'
                                }}
                            />

                            {error && (
                                <div style={{
                                    marginTop: '16px',
                                    padding: '12px 16px',
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(239, 68, 68, 0.3)'
                                }}>
                                    <p style={{ color: '#ef4444', margin: 0 }}>❌ {error}</p>
                                </div>
                            )}

                            <button
                                onClick={handleStart}
                                disabled={!prompt.trim()}
                                style={{
                                    marginTop: '20px',
                                    width: '100%',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: !prompt.trim()
                                        ? '#4b5563'
                                        : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                    color: '#fff',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    cursor: !prompt.trim() ? 'not-allowed' : 'pointer'
                                }}
                            >
                                🚀 {isArabic ? 'ابدأ التنفيذ المستقل' : 'Start Autonomous Execution'}
                            </button>
                        </>
                    )}

                    {/* EXECUTING PHASE */}
                    {(phase === 'planning' || phase === 'executing') && (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <div style={{
                                width: '80px', height: '80px',
                                margin: '0 auto 24px',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '36px',
                                animation: 'pulse 2s infinite'
                            }}>
                                {phase === 'planning' ? '🧠' : '⚡'}
                            </div>

                            <h3 style={{ color: '#fff', marginBottom: '8px' }}>
                                {statusMessage || (isArabic ? 'جاري العمل...' : 'Working...')}
                            </h3>

                            {plan && (
                                <p style={{ color: '#a1a1aa', fontSize: '14px', marginBottom: '24px' }}>
                                    {isArabic ? `المرحلة ${currentStage + 1} من ${plan.stages.length}` : `Stage ${currentStage + 1} of ${plan.stages.length}`}
                                </p>
                            )}

                            {/* Progress Bar */}
                            <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                                <div style={{
                                    height: '12px',
                                    background: 'rgba(255,255,255,0.1)',
                                    borderRadius: '6px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${progress}%`,
                                        background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7)',
                                        transition: 'width 0.5s ease',
                                        borderRadius: '6px'
                                    }} />
                                </div>
                                <p style={{ color: '#6366f1', fontSize: '14px', marginTop: '8px' }}>{Math.round(progress)}%</p>
                            </div>

                            {/* Stage Progress */}
                            {plan && (
                                <div style={{ marginTop: '30px', textAlign: isArabic ? 'right' : 'left' }}>
                                    {plan.stages.map((stage, i) => (
                                        <div key={stage.id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '10px 16px',
                                            background: i === currentStage ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                            borderRadius: '8px',
                                            marginBottom: '4px'
                                        }}>
                                            <span style={{
                                                width: '24px', height: '24px',
                                                borderRadius: '50%',
                                                background: i < currentStage ? '#22c55e' : i === currentStage ? '#6366f1' : 'rgba(255,255,255,0.1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '12px', color: '#fff'
                                            }}>
                                                {i < currentStage ? '✓' : i + 1}
                                            </span>
                                            <span style={{ color: i <= currentStage ? '#fff' : '#6b7280', fontSize: '14px' }}>
                                                {stage.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* DONE PHASE - RESULTS */}
                    {phase === 'done' && result && (
                        <div ref={reportRef}>
                            {/* Success Header */}
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(22, 163, 74, 0.1))',
                                borderRadius: '16px',
                                padding: '20px',
                                marginBottom: '20px',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '12px'
                            }}>
                                <div>
                                    <h3 style={{ color: '#22c55e', margin: 0, fontSize: '18px' }}>✅ {result.title}</h3>
                                    <p style={{ color: '#86efac', margin: '4px 0 0', fontSize: '13px' }}>
                                        {result.execution.stagesCompleted} {isArabic ? 'مراحل بحثية' : 'research stages'} |
                                        {result.results.sources.length} {isArabic ? 'مصادر' : 'sources'}
                                    </p>
                                </div>
                                <button onClick={handleReset} style={{
                                    padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
                                    background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: '13px'
                                }}>
                                    🔄 {isArabic ? 'بحث جديد' : 'New Research'}
                                </button>
                            </div>

                            {/* Tabs */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                <button onClick={() => setActiveTab('summary')} style={tabStyle(activeTab === 'summary')}>
                                    📝 {isArabic ? 'الملخص' : 'Summary'}
                                </button>
                                <button onClick={() => setActiveTab('report')} style={tabStyle(activeTab === 'report')}>
                                    📄 {isArabic ? 'التقرير' : 'Report'}
                                </button>
                                <button onClick={() => setActiveTab('stages')} style={tabStyle(activeTab === 'stages')}>
                                    📊 {isArabic ? 'المراحل' : 'Stages'}
                                </button>
                                <button onClick={() => setActiveTab('sources')} style={tabStyle(activeTab === 'sources')}>
                                    🔗 {isArabic ? 'المصادر' : 'Sources'}
                                </button>
                            </div>

                            {/* Tab Content */}
                            <div style={{
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '16px',
                                padding: '24px',
                                minHeight: '300px',
                                maxHeight: '400px',
                                overflowY: 'auto'
                            }}>
                                {activeTab === 'summary' && (
                                    <>
                                        <h4 style={{ color: '#22c55e', marginTop: 0 }}>📝 {isArabic ? 'الملخص التنفيذي' : 'Executive Summary'}</h4>
                                        <p style={{ color: '#e5e5e5', lineHeight: '1.9', whiteSpace: 'pre-wrap' }}>{result.results.summary}</p>

                                        {result.results.stats && result.results.stats.length > 0 && (
                                            <>
                                                <h4 style={{ color: '#6366f1', marginTop: '24px' }}>📊 {isArabic ? 'إحصائيات رئيسية' : 'Key Stats'}</h4>
                                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                                    {result.results.stats.map((s, i) => (
                                                        <div key={i} style={{
                                                            background: 'rgba(99, 102, 241, 0.15)',
                                                            padding: '16px 24px',
                                                            borderRadius: '10px',
                                                            textAlign: 'center'
                                                        }}>
                                                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#818cf8' }}>{s.value}{s.unit}</div>
                                                            <div style={{ fontSize: '12px', color: '#a1a1aa' }}>{s.label}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}

                                {activeTab === 'report' && (
                                    <div style={{ color: '#d4d4d4', lineHeight: '1.9', whiteSpace: 'pre-wrap', fontSize: '14px' }}>
                                        {result.results.report}
                                    </div>
                                )}

                                {activeTab === 'stages' && (
                                    <>
                                        <h4 style={{ color: '#fff', marginTop: 0 }}>📊 {isArabic ? 'مراحل البحث' : 'Research Stages'}</h4>
                                        {result.execution.stageDetails.map((stage, i) => (
                                            <div key={stage.id} style={{
                                                background: 'rgba(99, 102, 241, 0.1)',
                                                borderRadius: '10px',
                                                padding: '16px',
                                                marginBottom: '12px',
                                                borderLeft: '4px solid #6366f1'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ color: '#fff', fontWeight: '500' }}>{i + 1}. {stage.name}</span>
                                                    <span style={{
                                                        background: stage.status === 'completed' ? '#22c55e' : '#6366f1',
                                                        padding: '4px 10px',
                                                        borderRadius: '12px',
                                                        fontSize: '11px',
                                                        color: '#fff'
                                                    }}>
                                                        {stage.status === 'completed' ? '✓' : '...'} {stage.queriesExecuted} {isArabic ? 'استعلام' : 'queries'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                )}

                                {activeTab === 'sources' && (
                                    <>
                                        <h4 style={{ color: '#fff', marginTop: 0 }}>🔗 {isArabic ? 'المصادر المستخدمة' : 'Sources Used'}</h4>
                                        {result.results.sources.length > 0 ? (
                                            result.results.sources.map((source, i) => (
                                                <div key={i} style={{
                                                    background: 'rgba(255,255,255,0.05)',
                                                    borderRadius: '8px',
                                                    padding: '12px 16px',
                                                    marginBottom: '8px'
                                                }}>
                                                    <div style={{ color: '#fff', fontSize: '14px', marginBottom: '4px' }}>{source.title}</div>
                                                    {source.url && (
                                                        <a href={source.url} target="_blank" rel="noopener noreferrer"
                                                            style={{ color: '#818cf8', fontSize: '12px', textDecoration: 'none' }}>
                                                            {source.url}
                                                        </a>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p style={{ color: '#6b7280' }}>{isArabic ? 'لم يتم العثور على مصادر' : 'No sources found'}</p>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
                                <button onClick={handleCopyReport} style={{
                                    flex: 1, minWidth: '140px', padding: '14px', borderRadius: '10px', border: 'none',
                                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                    color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '500'
                                }}>
                                    📋 {isArabic ? 'نسخ' : 'Copy'}
                                </button>
                                <button onClick={handlePrint} style={{
                                    flex: 1, minWidth: '140px', padding: '14px', borderRadius: '10px', border: 'none',
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

            <style>{`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.8; }
                }
            `}</style>
        </div>
    );
};

export default AutonomousMode;
