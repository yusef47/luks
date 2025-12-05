import React, { useState, useEffect, useCallback } from 'react';

// Types
interface Task {
    id: string;
    title: string;
    status: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed';
    progress: number;
    currentStep: number;
    totalSteps: number;
    outputs: string[];
    unreadNotifications: number;
    createdAt: string;
    completedAt?: string;
}

interface Notification {
    id: number;
    type: 'progress' | 'warning' | 'question' | 'success' | 'error';
    message: string;
    timestamp: string;
    read: boolean;
}

interface TaskDetails {
    id: string;
    title: string;
    prompt: string;
    status: string;
    progress: number;
    currentStep: number;
    totalSteps: number;
    currentPhase: number;
    totalPhases: number;
    currentPhaseName: string;
    estimatedTime: string;
    notifications: Notification[];
}

interface AutonomousModeProps {
    isOpen: boolean;
    onClose: () => void;
    language: 'ar' | 'en';
}

const BACKEND_URL = '/api';

const AutonomousMode: React.FC<AutonomousModeProps> = ({ isOpen, onClose, language }) => {
    const [view, setView] = useState<'create' | 'list' | 'detail' | 'results'>('list');
    const [prompt, setPrompt] = useState('');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedTask, setSelectedTask] = useState<TaskDetails | null>(null);
    const [results, setResults] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);

    const isArabic = language === 'ar';

    // Fetch all tasks
    const fetchTasks = useCallback(async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/autonomous/list`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const data = await response.json();
            if (data.success) {
                setTasks(data.tasks);
            }
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        }
    }, []);

    // Fetch task details
    const fetchTaskDetails = useCallback(async (taskId: string) => {
        try {
            const response = await fetch(`${BACKEND_URL}/autonomous/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId })
            });
            const data = await response.json();
            if (data.success) {
                setSelectedTask(data.task);
            }
        } catch (error) {
            console.error('Failed to fetch task details:', error);
        }
    }, []);

    // Auto-refresh for running tasks
    useEffect(() => {
        if (!isOpen) return;

        fetchTasks();

        const interval = setInterval(() => {
            fetchTasks();
            if (selectedTask && selectedTask.status === 'running') {
                fetchTaskDetails(selectedTask.id);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [isOpen, selectedTask?.id, fetchTasks, fetchTaskDetails]);

    // Create new task
    const handleCreateTask = async () => {
        if (!prompt.trim()) return;

        setIsCreating(true);
        try {
            const response = await fetch(`${BACKEND_URL}/autonomous/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            const data = await response.json();

            if (data.success) {
                setPrompt('');
                fetchTasks();
                // Auto-start execution
                await handleStartExecution(data.task.id);
                setView('list');
            }
        } catch (error) {
            console.error('Failed to create task:', error);
        } finally {
            setIsCreating(false);
        }
    };

    // Start task execution
    const handleStartExecution = async (taskId: string) => {
        setIsExecuting(true);
        try {
            await fetch(`${BACKEND_URL}/autonomous/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId, executeAll: true })
            });
            fetchTasks();
        } catch (error) {
            console.error('Failed to start execution:', error);
        } finally {
            setIsExecuting(false);
        }
    };

    // Cancel task
    const handleCancelTask = async (taskId: string) => {
        try {
            await fetch(`${BACKEND_URL}/autonomous/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId })
            });
            fetchTasks();
        } catch (error) {
            console.error('Failed to cancel task:', error);
        }
    };

    // Get results
    const handleGetResults = async (taskId: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/autonomous/results`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId })
            });
            const data = await response.json();
            if (data.success) {
                setResults(data);
                setView('results');
            }
        } catch (error) {
            console.error('Failed to get results:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // View task details
    const handleViewTask = async (taskId: string) => {
        await fetchTaskDetails(taskId);
        setView('detail');
    };

    if (!isOpen) return null;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return '#22c55e';
            case 'running': return '#3b82f6';
            case 'pending': return '#f59e0b';
            case 'cancelled': return '#6b7280';
            case 'failed': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const getStatusText = (status: string) => {
        const texts: Record<string, { ar: string; en: string }> = {
            pending: { ar: 'في الانتظار', en: 'Pending' },
            running: { ar: '🔄 جاري التنفيذ', en: '🔄 Running' },
            completed: { ar: '✅ مكتمل', en: '✅ Completed' },
            cancelled: { ar: '⛔ ملغي', en: '⛔ Cancelled' },
            failed: { ar: '❌ فشل', en: '❌ Failed' }
        };
        return texts[status]?.[isArabic ? 'ar' : 'en'] || status;
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
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
                width: '90%',
                maxWidth: '900px',
                maxHeight: '85vh',
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
                    background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '28px' }}>🧠</span>
                        <div>
                            <h2 style={{ margin: 0, color: '#fff', fontSize: '20px' }}>
                                {isArabic ? 'وضع الاستقلالية' : 'Autonomous Mode'}
                            </h2>
                            <p style={{ margin: 0, color: '#a1a1aa', fontSize: '13px' }}>
                                {isArabic ? 'مهام تعمل في الخلفية بدون تدخل' : 'Background tasks without intervention'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '18px'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Navigation */}
                <div style={{
                    padding: '12px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    gap: '8px'
                }}>
                    <button
                        onClick={() => setView('list')}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: view === 'list' ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                            color: '#fff',
                            cursor: 'pointer'
                        }}
                    >
                        📋 {isArabic ? 'المهام' : 'Tasks'}
                    </button>
                    <button
                        onClick={() => setView('create')}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: view === 'create' ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                            color: '#fff',
                            cursor: 'pointer'
                        }}
                    >
                        ➕ {isArabic ? 'مهمة جديدة' : 'New Task'}
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(85vh - 160px)' }}>

                    {/* Create View */}
                    {view === 'create' && (
                        <div>
                            <h3 style={{ color: '#fff', marginBottom: '16px' }}>
                                {isArabic ? '🚀 إنشاء مهمة جديدة' : '🚀 Create New Task'}
                            </h3>
                            <p style={{ color: '#a1a1aa', marginBottom: '20px', fontSize: '14px' }}>
                                {isArabic
                                    ? 'اكتب طلبك بالتفصيل. لوكاس هيقسمه لخطوات وينفذها لوحده.'
                                    : 'Describe your request in detail. Lukas will break it down and execute it autonomously.'
                                }
                            </p>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder={isArabic
                                    ? 'مثال: عايز تحليل كامل لسوق العقارات في مصر 2024، مع مقارنة بالإمارات، وتوقعات للأسعار...'
                                    : 'Example: I want a complete analysis of the Egyptian real estate market 2024, compared with UAE, with price predictions...'
                                }
                                style={{
                                    width: '100%',
                                    minHeight: '150px',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(0,0,0,0.3)',
                                    color: '#fff',
                                    fontSize: '15px',
                                    resize: 'vertical',
                                    direction: isArabic ? 'rtl' : 'ltr'
                                }}
                            />
                            <button
                                onClick={handleCreateTask}
                                disabled={isCreating || !prompt.trim()}
                                style={{
                                    marginTop: '16px',
                                    padding: '14px 28px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: isCreating ? '#4b5563' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                    color: '#fff',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    cursor: isCreating ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                {isCreating ? (
                                    <>⏳ {isArabic ? 'جاري الإنشاء...' : 'Creating...'}</>
                                ) : (
                                    <>🚀 {isArabic ? 'ابدأ المهمة' : 'Start Task'}</>
                                )}
                            </button>
                        </div>
                    )}

                    {/* List View */}
                    {view === 'list' && (
                        <div>
                            {tasks.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                                    <span style={{ fontSize: '48px', opacity: 0.5 }}>📭</span>
                                    <p style={{ color: '#71717a', marginTop: '16px' }}>
                                        {isArabic ? 'لا توجد مهام بعد' : 'No tasks yet'}
                                    </p>
                                    <button
                                        onClick={() => setView('create')}
                                        style={{
                                            marginTop: '16px',
                                            padding: '12px 24px',
                                            borderRadius: '10px',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                            color: '#fff',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ➕ {isArabic ? 'إنشاء مهمة' : 'Create Task'}
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {tasks.map(task => (
                                        <div
                                            key={task.id}
                                            style={{
                                                background: 'rgba(255,255,255,0.05)',
                                                borderRadius: '16px',
                                                padding: '20px',
                                                border: '1px solid rgba(255,255,255,0.1)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                                <div>
                                                    <h4 style={{ color: '#fff', margin: 0, fontSize: '16px' }}>{task.title}</h4>
                                                    <span style={{
                                                        display: 'inline-block',
                                                        marginTop: '8px',
                                                        padding: '4px 10px',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        background: getStatusColor(task.status) + '22',
                                                        color: getStatusColor(task.status)
                                                    }}>
                                                        {getStatusText(task.status)}
                                                    </span>
                                                </div>
                                                {task.unreadNotifications > 0 && (
                                                    <span style={{
                                                        background: '#ef4444',
                                                        color: '#fff',
                                                        padding: '2px 8px',
                                                        borderRadius: '10px',
                                                        fontSize: '12px'
                                                    }}>
                                                        {task.unreadNotifications}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Progress Bar */}
                                            {(task.status === 'running' || task.status === 'completed') && (
                                                <div style={{ marginBottom: '16px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                        <span style={{ color: '#a1a1aa', fontSize: '13px' }}>
                                                            {isArabic ? 'التقدم' : 'Progress'}
                                                        </span>
                                                        <span style={{ color: '#fff', fontSize: '13px' }}>
                                                            {task.progress}% ({task.currentStep}/{task.totalSteps})
                                                        </span>
                                                    </div>
                                                    <div style={{
                                                        height: '6px',
                                                        background: 'rgba(255,255,255,0.1)',
                                                        borderRadius: '3px',
                                                        overflow: 'hidden'
                                                    }}>
                                                        <div style={{
                                                            height: '100%',
                                                            width: `${task.progress}%`,
                                                            background: task.status === 'completed'
                                                                ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                                                                : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                                            transition: 'width 0.5s ease'
                                                        }} />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                <button
                                                    onClick={() => handleViewTask(task.id)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        borderRadius: '8px',
                                                        border: '1px solid rgba(255,255,255,0.2)',
                                                        background: 'transparent',
                                                        color: '#fff',
                                                        cursor: 'pointer',
                                                        fontSize: '13px'
                                                    }}
                                                >
                                                    👁️ {isArabic ? 'التفاصيل' : 'Details'}
                                                </button>

                                                {task.status === 'completed' && (
                                                    <button
                                                        onClick={() => handleGetResults(task.id)}
                                                        style={{
                                                            padding: '8px 16px',
                                                            borderRadius: '8px',
                                                            border: 'none',
                                                            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                                            color: '#fff',
                                                            cursor: 'pointer',
                                                            fontSize: '13px'
                                                        }}
                                                    >
                                                        📥 {isArabic ? 'النتائج' : 'Results'}
                                                    </button>
                                                )}

                                                {task.status === 'running' && (
                                                    <button
                                                        onClick={() => handleCancelTask(task.id)}
                                                        style={{
                                                            padding: '8px 16px',
                                                            borderRadius: '8px',
                                                            border: 'none',
                                                            background: '#ef4444',
                                                            color: '#fff',
                                                            cursor: 'pointer',
                                                            fontSize: '13px'
                                                        }}
                                                    >
                                                        ⛔ {isArabic ? 'إلغاء' : 'Cancel'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Detail View */}
                    {view === 'detail' && selectedTask && (
                        <div>
                            <button
                                onClick={() => setView('list')}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#a1a1aa',
                                    cursor: 'pointer',
                                    marginBottom: '16px',
                                    fontSize: '14px'
                                }}
                            >
                                ← {isArabic ? 'رجوع' : 'Back'}
                            </button>

                            <h3 style={{ color: '#fff', marginBottom: '8px' }}>{selectedTask.title}</h3>
                            <p style={{ color: '#71717a', fontSize: '14px', marginBottom: '20px' }}>{selectedTask.prompt}</p>

                            {/* Progress */}
                            <div style={{
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '12px',
                                padding: '20px',
                                marginBottom: '20px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ color: '#fff' }}>
                                        {isArabic ? 'المرحلة الحالية' : 'Current Phase'}: {selectedTask.currentPhaseName}
                                    </span>
                                    <span style={{ color: '#a1a1aa' }}>
                                        {selectedTask.currentPhase}/{selectedTask.totalPhases}
                                    </span>
                                </div>
                                <div style={{
                                    height: '10px',
                                    background: 'rgba(255,255,255,0.1)',
                                    borderRadius: '5px',
                                    overflow: 'hidden',
                                    marginBottom: '8px'
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${selectedTask.progress}%`,
                                        background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                        transition: 'width 0.5s ease'
                                    }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#71717a', fontSize: '13px' }}>
                                    <span>{isArabic ? 'الخطوة' : 'Step'} {selectedTask.currentStep}/{selectedTask.totalSteps}</span>
                                    <span>{selectedTask.progress}%</span>
                                </div>
                            </div>

                            {/* Notifications */}
                            <h4 style={{ color: '#fff', marginBottom: '12px' }}>
                                🔔 {isArabic ? 'التحديثات' : 'Updates'}
                            </h4>
                            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {selectedTask.notifications.slice().reverse().map(notif => (
                                    <div
                                        key={notif.id}
                                        style={{
                                            padding: '12px 16px',
                                            background: 'rgba(255,255,255,0.03)',
                                            borderRadius: '8px',
                                            marginBottom: '8px',
                                            borderLeft: `3px solid ${notif.type === 'success' ? '#22c55e' :
                                                    notif.type === 'error' ? '#ef4444' :
                                                        notif.type === 'warning' ? '#f59e0b' : '#6366f1'
                                                }`
                                        }}
                                    >
                                        <p style={{ color: '#fff', margin: 0, fontSize: '14px' }}>{notif.message}</p>
                                        <span style={{ color: '#71717a', fontSize: '12px' }}>
                                            {new Date(notif.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Results View */}
                    {view === 'results' && results && (
                        <div>
                            <button
                                onClick={() => setView('list')}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#a1a1aa',
                                    cursor: 'pointer',
                                    marginBottom: '16px',
                                    fontSize: '14px'
                                }}
                            >
                                ← {isArabic ? 'رجوع' : 'Back'}
                            </button>

                            <h3 style={{ color: '#fff', marginBottom: '20px' }}>
                                📊 {results.title}
                            </h3>

                            {/* Summary */}
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.1))',
                                borderRadius: '16px',
                                padding: '20px',
                                marginBottom: '20px',
                                border: '1px solid rgba(34, 197, 94, 0.2)'
                            }}>
                                <h4 style={{ color: '#22c55e', marginBottom: '12px' }}>
                                    📝 {isArabic ? 'الملخص التنفيذي' : 'Executive Summary'}
                                </h4>
                                <div style={{ color: '#e5e5e5', whiteSpace: 'pre-wrap', lineHeight: '1.7' }}>
                                    {results.output?.summary}
                                </div>
                            </div>

                            {/* Full Report */}
                            <div style={{
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '16px',
                                padding: '20px',
                                marginBottom: '20px'
                            }}>
                                <h4 style={{ color: '#fff', marginBottom: '12px' }}>
                                    📄 {isArabic ? 'التقرير الكامل' : 'Full Report'}
                                </h4>
                                <div style={{
                                    color: '#d4d4d4',
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: '1.8',
                                    maxHeight: '400px',
                                    overflowY: 'auto'
                                }}>
                                    {results.output?.report}
                                </div>
                            </div>

                            {/* Copy Button */}
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(results.output?.report || '');
                                    alert(isArabic ? 'تم النسخ!' : 'Copied!');
                                }}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                📋 {isArabic ? 'نسخ التقرير' : 'Copy Report'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AutonomousMode;
