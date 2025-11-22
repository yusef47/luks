import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Agent, StepResult, Conversation, StoredFile, PlanStep, Clarification, GroundingSource, Exchange } from './types';
import { AgentIcon, ClockIcon, CheckCircleIcon, LoadingSpinnerIcon, SunIcon, MoonIcon, ComputerIcon, OrchestratorIcon, UserIcon, WindowCloseIcon, WindowMaximizeIcon, WindowMinimizeIcon, SearchIcon, MapIcon, ArrowUpIcon, ArrowRightIcon, SettingsIcon, CogIcon, SheetsIcon, ImageIcon, PaperclipIcon } from './components/icons';
import { useLocation } from './hooks/useLocation';
import { useOrchestratorIntegration } from './hooks/useOrchestratorIntegration';
import { generatePlan, executeSearch, executeMap, executeVision, executeVideo, synthesizeAnswer, executeEmail, executeSheets, executeDrive, executeOrchestratorIntermediateStep, executeImageGeneration } from './services/geminiService';
import { marked } from 'marked';
import { translations, Localization, Lang } from './localization';
import QuickActions from './components/QuickActions';

// --- HELPER COMPONENTS ---

import { StreamingMarkdownRenderer } from './src/components/StreamingMarkdownRenderer';

// --- RIGHT PANEL COMPONENTS ---

const AgentVisualizer: React.FC<{ step: StepResult | null; t: (key: keyof Localization) => string; }> = ({ step, t }) => {
    if (!step) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary-color)] opacity-50">
                <div className="w-16 h-16 rounded-2xl border border-[var(--border-color)] flex items-center justify-center mb-4">
                    <ComputerIcon className="w-8 h-8" />
                </div>
                <p className="text-sm font-medium">Manus Computer Idle</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full animate-fade-in">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${step.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-[var(--text-secondary-color)]'}`} />
                    <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-secondary-color)]">
                        {step.agent === Agent.Orchestrator ? 'SYSTEM' : step.agent}
                    </span>
                </div>
                <span className="text-xs font-mono text-[var(--text-secondary-color)] opacity-70">PID: {Math.floor(Math.random() * 9000) + 1000}</span>
            </div>

            <div className="flex-grow overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                <div className="glass-panel p-4 rounded-xl border-l-2 border-l-[var(--accent-color)]">
                    <div className="flex items-start gap-3">
                        <AgentIcon agent={step.agent} className="w-5 h-5 text-[var(--accent-color)] mt-0.5" />
                        <div className="flex-grow">
                            <p className="text-sm font-medium text-[var(--text-color)]">{step.action}</p>
                            {step.details && <p className="text-xs text-[var(--text-secondary-color)] mt-1 font-mono">{step.details}</p>}
                        </div>
                    </div>
                </div>

                {step.toolCall && (
                    <div className="glass-panel p-3 rounded-xl">
                        <div className="flex items-center gap-2 mb-2 border-b border-[var(--border-color)] pb-2">
                            <span className="text-xs font-mono text-[var(--accent-color)]">$ tool_exec</span>
                            <span className="text-xs text-[var(--text-secondary-color)]">{step.toolCall.name}</span>
                        </div>
                        <pre className="text-xs font-mono text-[var(--text-secondary-color)] overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(step.toolCall.args, null, 2)}
                        </pre>
                    </div>
                )}

                {step.output && (
                    <div className="glass-panel p-3 rounded-xl border border-green-500/20 bg-green-500/5">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircleIcon className="w-4 h-4 text-green-500" />
                            <span className="text-xs font-bold text-green-500">SUCCESS</span>
                        </div>
                        <div className="prose prose-invert prose-xs max-w-none">
                            <StreamingMarkdownRenderer content={typeof step.output === 'string' ? step.output : JSON.stringify(step.output)} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const VirtualComputer: React.FC<{ viewedStep: StepResult | null; t: (key: keyof Localization) => string; }> = ({ viewedStep, t }) => {
    return (
        <div className="glass-panel flex flex-col h-full rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10">
            <header className="flex items-center justify-between px-4 py-3 bg-black/40 border-b border-[var(--border-color)] backdrop-blur-md">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <div className="w-2 h-2 rounded-full bg-red-500/50" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                    <div className="w-2 h-2 rounded-full bg-green-500/50" />
                    <div className="h-4 w-[1px] bg-[var(--border-color)] mx-2" />
                    <span className="text-xs font-mono font-medium text-[var(--text-secondary-color)] tracking-wide">MANUS_OS_V1.5</span>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <div className="px-2 py-0.5 rounded bg-[var(--bg-tertiary-color)] border border-[var(--border-color)]">
                        <span className="text-[10px] font-mono text-[var(--text-secondary-color)]">CONNECTED</span>
                    </div>
                </div>
            </header>
            <div className="flex-grow min-h-0 bg-black/20 p-4">
                <AgentVisualizer step={viewedStep} t={t} />
            </div>
        </div>
    );
};

const TaskProgress: React.FC<{
    plan: PlanStep[] | null;
    results: StepResult[];
    onStepSelect: (step: StepResult) => void;
    viewedStep: StepResult | null;
    t: (key: keyof Localization) => string;
}> = ({ plan, results, onStepSelect, viewedStep, t }) => {
    if (!plan || plan.length === 0) {
        return <div className="card p-4 h-full"><h3 className="font-bold text-sm mb-2">{t('taskProgress')}</h3><p className="text-sm text-[var(--text-secondary-color)]">{t('computerStatusWaiting')}</p></div>
    }
    const getStatusIcon = (status: StepResult['status']) => {
        switch (status) {
            case 'running': return <LoadingSpinnerIcon className="w-5 h-5 text-blue-500" />;
            case 'completed': return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
            case 'error': return <CheckCircleIcon className="w-5 h-5 text-red-500" />;
            default: return <ClockIcon className="w-5 h-5 text-[var(--text-secondary-color)]" />;
        }
    }

    return (
        <div className="card p-4 h-full overflow-y-scroll">
            <h3 className="font-bold text-sm mb-3">{t('taskProgress')}</h3>
            <ul className="space-y-1">
                {plan.map(step => {
                    const result = results.find(r => r.step === step.step);
                    if (!result) return null;

                    const status = result.status;
                    const isViewed = viewedStep?.step === result.step;

                    return (
                        <li key={step.step}>
                            <button
                                onClick={() => onStepSelect(result)}
                                disabled={status === 'pending'}
                                className={`w-full flex items-center space-x-3 rtl:space-x-reverse text-sm p-2 rounded-md transition-colors text-left rtl:text-right disabled:opacity-50 disabled:cursor-not-allowed ${isViewed ? 'bg-[var(--hover-bg-color)]' : 'hover:bg-[var(--hover-bg-color)]'}`}
                            >
                                <div>{getStatusIcon(status)}</div>
                                <span className={`${status === 'pending' ? 'text-[var(--text-secondary-color)]' : ''}`}>{step.task}</span>
                            </button>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

import { ChatMessage } from './src/components/ChatMessage';
import { ClarificationRequest } from './src/components/ClarificationRequest';

// --- CHAT PANEL COMPONENTS ---



const SettingsPopover: React.FC<{
    isOpen: boolean;
    cycleCount: number;
    setCycleCount: (count: number) => void;
    onClose: () => void;
    t: (key: keyof Localization) => string;
}> = ({ isOpen, cycleCount, setCycleCount, onClose, t }) => {
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div ref={popoverRef} className="absolute bottom-full mb-3 right-0 rtl:right-auto rtl:left-0 w-64 card p-4 shadow-lg z-10">
            <h4 className="font-bold text-sm mb-2">{t('settingsTitle')}</h4>
            <div className="flex items-center justify-between">
                <label htmlFor="cycle-count" className="text-sm text-[var(--text-secondary-color)]">{t('cycleCount')}</label>
                <div className="flex items-center gap-2">
                    <button onClick={() => setCycleCount(Math.max(1, cycleCount - 1))} className="font-bold w-6 h-6 rounded-md bg-[var(--bg-tertiary-color)]">-</button>
                    <input id="cycle-count" type="number" value={cycleCount} readOnly className="w-10 text-center bg-transparent" />
                    <button onClick={() => setCycleCount(Math.min(5, cycleCount + 1))} className="font-bold w-6 h-6 rounded-md bg-[var(--bg-tertiary-color)]">+</button>
                </div>
            </div>
        </div>
    );
};


const App: React.FC = () => {
    const [lang, setLang] = useState<Lang>('ar');
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [showComputer, setShowComputer] = useState(true);
    const [prompt, setPrompt] = useState('');
    const [conversations, setConversations] = useState<Conversation[]>(() => {
        try {
            const saved = localStorage.getItem('lukas_conversations');
            if (!saved) return [];
            const parsed = JSON.parse(saved);
            return parsed.map((convo: Conversation) => ({
                ...convo,
                exchanges: convo.exchanges.map((ex: any) => ({
                    ...ex,
                    imageFile: null,
                    videoFile: null,
                }))
            }));
        } catch { return []; }
    });
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [viewedStep, setViewedStep] = useState<StepResult | null>(null);
    const { location } = useLocation();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [cycleCount, setCycleCount] = useState(1);
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const activeConversation = useMemo(() => conversations.find(c => c.id === activeConversationId), [conversations, activeConversationId]);
    const activeExchange = useMemo(() => {
        if (!activeConversation) return null;
        return activeConversation.exchanges[activeConversation.exchanges.length - 1];
    }, [activeConversation]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (!activeExchange?.results || activeExchange.results.length === 0) { setViewedStep(null); return; }
        const runningStep = activeExchange.results.find(r => r.status === 'running');
        if (runningStep) { setViewedStep(runningStep); return; }
        const latestProcessedStep = [...activeExchange.results].reverse().find(r => r.status === 'completed' || r.status === 'error');
        if (latestProcessedStep) { setViewedStep(latestProcessedStep); }
        else if (activeExchange.status === 'executing' && activeExchange.results.length > 0) { setViewedStep(activeExchange.results[0]); }
    }, [activeExchange]);

    const t = useMemo(() => (key: keyof Localization, ...args: (string | number)[]) => {
        let translation = translations[lang][key] || translations['en'][key];
        if (args.length) { translation = translation.replace(/\{0\}/g, String(args[0])); }
        return translation;
    }, [lang]);

    useEffect(() => {
        const savedTheme = localStorage.getItem('lukas_theme') as 'light' | 'dark';
        if (savedTheme) setTheme(savedTheme);
        else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) setTheme('light');
    }, []);

    useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'; }, [lang]);
    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('lukas_theme', theme);
    }, [theme]);
    useEffect(() => {
        const serializableConversations = conversations.map(convo => ({
            ...convo,
            exchanges: convo.exchanges.map(({ imageFile, videoFile, ...rest }) => rest)
        }));
        localStorage.setItem('lukas_conversations', JSON.stringify(serializableConversations));
    }, [conversations]);

    useEffect(() => {
        const scrollContainer = chatEndRef.current?.parentElement;
        if (scrollContainer) {
            const isNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 200;
            if (isNearBottom) {
                chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [activeConversation, isLoading]);
    useEffect(() => { if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; } }, [prompt]);

    const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');
    const toggleLang = () => setLang(lang === 'en' ? 'ar' : 'en');

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setAttachedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const clearAttachment = () => {
        setAttachedFile(null);
        if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
        if (fileInputRef.current) { fileInputRef.current.value = ""; }
    };

    const updateExchange = (convoId: string, exchangeId: string, updates: Partial<Exchange>) => {
        setConversations(prevConvos => prevConvos.map(c => {
            if (c.id !== convoId) return c;
            const newExchanges = c.exchanges.map(ex =>
                ex.id === exchangeId ? { ...ex, ...updates } : ex
            );
            return { ...c, exchanges: newExchanges };
        }));
    };

    const updateStepResult = (convoId: string, exchangeId: string, step: number, updates: Partial<StepResult>, appendResult: string = '') => {
        setConversations(prev => prev.map(c => {
            if (c.id !== convoId) return c;
            const newExchanges = c.exchanges.map(ex => {
                if (ex.id !== exchangeId) return ex;
                const newResults = ex.results.map(r => r.step === step ? { ...r, ...updates, result: (updates.result !== undefined) ? updates.result : r.result + appendResult } : r);
                return { ...ex, results: newResults };
            });
            return { ...c, exchanges: newExchanges };
        }));
    };

    const handleQuickAction = async (action: any) => {
        // Handle quick action button clicks
        const fullPrompt = action.prompt;
        await handleSubmitPrompt(fullPrompt);
    };

    const handleSubmitPrompt = async (promptToSubmit: string) => {
        if ((!promptToSubmit.trim() && !attachedFile) || isLoading) return;

        setIsLoading(true);
        setPrompt('');

        const exchangeId = Date.now().toString();
        const newExchange: Exchange = {
            id: exchangeId,
            prompt: promptToSubmit,
            imageFile: attachedFile && attachedFile.type.startsWith('image/') ? attachedFile : null,
            videoFile: attachedFile && attachedFile.type.startsWith('video/') ? attachedFile : null,
            plan: null, results: [], status: 'planning',
        };
        clearAttachment();

        let convoToUpdateId: string;
        let convoToUpdate: Conversation;

        if (activeConversationId) {
            convoToUpdateId = activeConversationId;
            setConversations(prev => prev.map(c => {
                if (c.id !== convoToUpdateId) return c;
                convoToUpdate = { ...c, exchanges: [...c.exchanges, newExchange] };
                return convoToUpdate;
            }));
        } else {
            const newConvoId = Date.now().toString();
            convoToUpdateId = newConvoId;
            convoToUpdate = {
                id: newConvoId,
                title: promptToSubmit,
                exchanges: [newExchange]
            };
            setConversations(prev => [...prev, convoToUpdate]);
            setActiveConversationId(newConvoId);
        }

        const currentConvo = conversations.find(c => c.id === convoToUpdateId) || convoToUpdate!;
        const history = (currentConvo.exchanges || [])
            .filter(ex => ex.status === 'completed')
            .map(ex => ({ prompt: ex.prompt, results: ex.results }));

        try {
            const planResponse = await generatePlan(promptToSubmit, !!newExchange.imageFile, !!newExchange.videoFile, history as any, cycleCount);

            updateExchange(convoToUpdateId, exchangeId, {
                plan: planResponse.plan || null,
                clarification: planResponse.clarification || null,
                status: planResponse.clarification ? 'clarification_needed' : 'planning'
            });

            if (planResponse.plan) {
                await handleExecute(convoToUpdateId, exchangeId, newExchange, planResponse.plan);
            }
        } catch (err: any) {
            const errorMessage = err.message || t('unknownError');
            updateExchange(convoToUpdateId, exchangeId, { status: 'error', errorMessage });
        }
        finally { setIsLoading(false); }
    };

    const handlePlan = () => handleSubmitPrompt(prompt);

    const handleClarificationResponse = async (convoId: string, exchangeId: string, exchange: Exchange, selectedOption: { key: string; value: string; }) => {
        setIsLoading(true);
        updateExchange(convoId, exchangeId, { status: 'planning', clarification: null });

        const clarifiedPrompt = `The user's original request was: "${exchange.prompt}". I asked for clarification, and the user chose: "${selectedOption.value}". Now, please generate the execution plan based on this clarified request.`;

        try {
            const currentConvo = conversations.find(c => c.id === convoId)!;
            const history = currentConvo.exchanges
                .filter(ex => ex.id !== exchangeId && ex.status === 'completed')
                .map(ex => ({ prompt: ex.prompt, results: ex.results }));

            const planResponse = await generatePlan(clarifiedPrompt, !!exchange.imageFile, !!exchange.videoFile, history as any, cycleCount);
            if (!planResponse.plan) throw new Error("Failed to get a plan after clarification.");

            updateExchange(convoId, exchangeId, { plan: planResponse.plan, clarification: null, status: 'planning' });
            await handleExecute(convoId, exchangeId, { ...exchange, plan: planResponse.plan }, planResponse.plan);

        } catch (err: any) {
            const errorMessage = err.message || t('unknownError');
            updateExchange(convoId, exchangeId, { status: 'error', errorMessage });
        } finally { setIsLoading(false); }
    };

    const handleExecute = async (convoId: string, exchangeId: string, exchange: Exchange, plan: PlanStep[]) => {
        let generatedSheetFile: StoredFile | null = null;
        try {
            setIsLoading(true);
            updateExchange(convoId, exchangeId, { status: 'executing', plan, results: plan.map(step => ({ ...step, result: '', status: 'pending' })) });

            let stepOutputs: StepResult[] = [];
            for (const step of plan) {
                updateStepResult(convoId, exchangeId, step.step, { status: 'running' });
                let fullStepResult = '';

                try {
                    const onChunk = (chunk: string) => { updateStepResult(convoId, exchangeId, step.step, {}, chunk); fullStepResult += chunk; };
                    let r: any = {};
                    let imageBase64Data: string | undefined;

                    if (step.agent === Agent.Orchestrator) {
                        if (step.step === plan.length) { r = await synthesizeAnswer(exchange.prompt, stepOutputs, onChunk); }
                        else { r = await executeOrchestratorIntermediateStep(step.task, exchange.prompt, stepOutputs, onChunk); }
                    } else {
                        switch (step.agent) {
                            case Agent.SearchAgent: r = await executeSearch(step.task, onChunk); break;
                            case Agent.MapsAgent: r = await executeMap(step.task, location, onChunk); break;
                            case Agent.VisionAgent: r = await executeVision(step.task, exchange.imageFile!, onChunk); break;
                            case Agent.VideoAgent: r = await executeVideo(step.task, exchange.videoFile!, onChunk); break;
                            case Agent.ImageGenerationAgent:
                                r = await executeImageGeneration(step.task, onChunk);
                                imageBase64Data = r.imageBase64;
                                break;
                            case Agent.EmailAgent: r = await executeEmail(step.task, onChunk); break;
                            case Agent.DriveAgent: r = await executeDrive(step.task, onChunk); break;
                            case Agent.SheetsAgent: {
                                const prevData = stepOutputs.length > 0 ? stepOutputs[stepOutputs.length - 1].result : '';
                                r = await executeSheets(step.task, prevData, onChunk);
                                if (r.sheetData) generatedSheetFile = { id: `file-${Date.now()}`, name: `${step.task.substring(0, 30)}...`, data: r.sheetData, createdAt: new Date().toISOString() };
                                break;
                            }
                        }
                    }

                    const completedStep: StepResult = {
                        ...step,
                        result: fullStepResult,
                        status: 'completed',
                        sources: r.sources,
                        imageBase64: imageBase64Data,
                    };

                    updateStepResult(convoId, exchangeId, step.step, completedStep);
                    stepOutputs.push(completedStep);
                    if (step.step < plan.length) { await new Promise(resolve => setTimeout(resolve, 1000)); }
                } catch (e: any) {
                    updateStepResult(convoId, exchangeId, step.step, { status: 'error', result: e.message }); throw e;
                }
            }
            updateExchange(convoId, exchangeId, { status: 'completed', generatedFile: generatedSheetFile });
        } catch (err: any) {
            console.error(err);
            const errorMessage = err.message || t('unknownError');
            updateExchange(convoId, exchangeId, { status: 'error', errorMessage });
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-show computer when executing
    useEffect(() => {
        if (activeExchange && (activeExchange.status !== 'planning' && activeExchange.status !== 'clarification_needed')) {
            setShowComputer(true);
        }
    }, [activeExchange?.status]);

    const examplePrompts = [
        { icon: <MapIcon className="w-6 h-6 text-[var(--accent-color)]" />, title: "Find a place", prompt: "Find cafes near Central Park, NYC" },
        { icon: <ImageIcon className="w-6 h-6 text-[var(--accent-color)]" />, title: "Create an image", prompt: "Generate an image of a photorealistic cat wearing sunglasses" },
        { icon: <SheetsIcon className="w-6 h-6 text-[var(--accent-color)]" />, title: "Organize data", prompt: "Create a spreadsheet of the top 5 largest cities in the world by population in 2024" },
    ];

    const handleNewChat = () => { setActiveConversationId(null); setViewedStep(null); }

    const renderExchangeResponse = (exchange: Exchange) => {
        if (exchange.status === 'completed') {
            const finalAnswer = exchange.results.find(r => r.agent === Agent.Orchestrator && r.step === exchange.plan?.length);
            const finalImage = exchange.results.find(r => r.imageBase64);
            if (!finalAnswer && !finalImage) return null;

            const allSources = Array.from(new Map(exchange.results.flatMap(r => r.sources || []).map(s => [s.uri, s])).values());

            return (
                <>
                    {finalAnswer && (
                        <ChatMessage
                            agent={Agent.Orchestrator}
                            content={<StreamingMarkdownRenderer content={finalAnswer.result} />}
                            sources={allSources}
                        />
                    )}
                    {finalImage && (
                        <ChatMessage
                            agent={Agent.Orchestrator}
                            content={
                                <img
                                    src={`data:image/png;base64,${finalImage.imageBase64}`}
                                    alt={finalImage.task}
                                    className="rounded-lg max-w-full h-auto"
                                />
                            }
                        />
                    )}
                </>
            );
        }
        if (exchange.status === 'clarification_needed' && exchange.clarification && activeConversation) {
            return (
                <ChatMessage
                    agent={Agent.Orchestrator}
                    content={<ClarificationRequest
                        clarification={exchange.clarification}
                        onSelect={(option) => handleClarificationResponse(activeConversation.id, exchange.id, exchange, option)}
                        disabled={isLoading}
                    />}
                />
            );
        }
        if (exchange.status === 'error' && exchange.errorMessage) {
            return <ChatMessage agent={Agent.Orchestrator} content={`${t('errorMessage')}: ${exchange.errorMessage}`} />;
        }
        return null;
    }

    return (
        <div className="fixed inset-0 flex bg-[var(--bg-color)] overflow-hidden">
            {/* Sidebar (Navigation Rail) */}
            <div className="flex-shrink-0 w-[280px] bg-[var(--bg-secondary-color)] border-r border-[var(--border-color)] flex flex-col z-20">
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                            <span className="font-bold text-black text-lg">M</span>
                        </div>
                        <span className="font-bold text-lg tracking-tight">Manus</span>
                    </div>
                    <button onClick={handleNewChat} className="p-2 hover:bg-[var(--hover-bg-color)] rounded-lg transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                    </button>
                </div>

                <div className="px-3 py-2">
                    <button onClick={handleNewChat} className="w-full flex items-center gap-3 px-3 py-2.5 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20 group">
                        <span className="text-sm font-medium">New Project</span>
                        <span className="ml-auto text-xs opacity-70 group-hover:opacity-100">⌘N</span>
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
                    <div className="text-xs font-medium text-[var(--text-secondary-color)] px-3 py-2 uppercase tracking-wider">Recents</div>
                    {conversations.slice().reverse().map(convo => (
                        <button key={convo.id} onClick={() => setActiveConversationId(convo.id)} className={`w-full text-left rtl:text-right px-3 py-2 rounded-lg text-sm truncate transition-all ${activeConversationId === convo.id ? 'bg-[var(--hover-bg-color)] text-[var(--text-color)] font-medium' : 'text-[var(--text-secondary-color)] hover:bg-[var(--hover-bg-color)] hover:text-[var(--text-color)]'}`}>
                            {convo.title || t('newChat')}
                        </button>
                    ))}
                </div>

                <div className="p-3 border-t border-[var(--border-color)]">
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--hover-bg-color)] transition-colors text-[var(--text-secondary-color)] hover:text-[var(--text-color)]">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                            U
                        </div>
                        <div className="flex-grow text-left rtl:text-right">
                            <div className="text-sm font-medium">User Account</div>
                            <div className="text-xs opacity-60">Pro Plan</div>
                        </div>
                        <SettingsIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-grow flex flex-col min-w-0 h-full">
                <div className={`flex-grow min-h-0 grid h-full ${showComputer ? 'grid-cols-1 lg:grid-cols-[1fr_450px]' : 'grid-cols-1'}`}>
                    {/* Left Panel: Chat */}
                    <div className="flex flex-col h-full min-h-0 p-4">
                        <div className="glass-panel flex flex-col h-full rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10 relative">
                            {/* Chat Header */}
                            <header className="flex items-center justify-between px-4 py-3 bg-black/40 border-b border-[var(--border-color)] backdrop-blur-md flex-shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500/50" />
                                    <span className="text-xs font-mono font-medium text-[var(--text-secondary-color)] tracking-wide">ORCHESTRATOR_LINK</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setShowComputer(!showComputer)} className={`p-1.5 rounded-lg transition-colors ${showComputer ? 'bg-[var(--accent-color)] text-white' : 'text-[var(--text-secondary-color)] hover:bg-[var(--hover-bg-color)]'}`} title={t('toggleComputer')}>
                                        <ComputerIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </header>

                            {/* Chat Messages */}
                            <main className="flex-grow min-h-0 w-full overflow-y-auto p-4 space-y-6 pb-4 custom-scrollbar">
                                {!activeConversation ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-6 border border-white/10">
                                            <OrchestratorIcon className="w-10 h-10 text-[var(--accent-color)]" />
                                        </div>
                                        <h2 className="text-2xl font-bold mb-2 tracking-tight">How can I help you?</h2>
                                        <p className="text-[var(--text-secondary-color)] max-w-md mx-auto">I can help you research, analyze data, generate content, and more using my autonomous agents.</p>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 w-full max-w-2xl">
                                            <button onClick={() => setPrompt("Research the latest developments in quantum computing")} className="p-4 rounded-xl bg-[var(--bg-tertiary-color)] hover:bg-[var(--hover-bg-color)] border border-[var(--border-color)] text-left transition-all hover:scale-[1.02]">
                                                <span className="text-sm font-medium block mb-1">Quantum Computing</span>
                                                <span className="text-xs text-[var(--text-secondary-color)]">Research latest developments</span>
                                            </button>
                                            <button onClick={() => setPrompt("Create a marketing plan for a new coffee brand")} className="p-4 rounded-xl bg-[var(--bg-tertiary-color)] hover:bg-[var(--hover-bg-color)] border border-[var(--border-color)] text-left transition-all hover:scale-[1.02]">
                                                <span className="text-sm font-medium block mb-1">Marketing Plan</span>
                                                <span className="text-xs text-[var(--text-secondary-color)]">Launch a coffee brand</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {activeConversation.exchanges.map(exchange => (
                                            <React.Fragment key={exchange.id}>
                                                <ChatMessage agent={Agent.User} content={exchange.prompt} />
                                                {renderExchangeResponse(exchange)}
                                            </React.Fragment>
                                        ))}
                                        {isLoading && activeExchange && activeExchange.status !== 'completed' && <ChatMessage agent={Agent.Orchestrator} content={<div className="flex justify-center items-center p-2"><LoadingSpinnerIcon className="w-6 h-6" /></div>} />}
                                        <div ref={chatEndRef} />
                                    </>
                                )}
                            </main>

                            {/* Chat Input */}
                            <footer className="flex-shrink-0 p-4 relative z-10 bg-gradient-to-t from-black/80 to-transparent">
                                <div className="max-w-3xl mx-auto w-full relative">
                                    <SettingsPopover isOpen={isSettingsOpen} cycleCount={cycleCount} setCycleCount={setCycleCount} onClose={() => setIsSettingsOpen(false)} t={t} />
                                    {previewUrl && (
                                        <div className="relative w-24 h-24 mb-2 p-1 border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--bg-tertiary-color)]">
                                            <img src={previewUrl} className="w-full h-full object-cover rounded-lg" />
                                            <button onClick={clearAttachment} className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"><WindowCloseIcon className="w-3 h-3" /></button>
                                        </div>
                                    )}
                                    <div className="glass-panel p-2 flex items-end gap-2 rounded-2xl shadow-2xl shadow-black/50 ring-1 ring-white/10 bg-black/40 backdrop-blur-xl">
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,video/*" />
                                        <button onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="p-2 rounded-xl text-[var(--text-secondary-color)] hover:bg-[var(--hover-bg-color)] hover:text-[var(--text-color)] transition-colors flex-shrink-0 h-10 w-10 flex items-center justify-center">
                                            <PaperclipIcon className="w-5 h-5" />
                                        </button>
                                        <textarea ref={textareaRef} value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePlan(); } }} placeholder={t('promptPlaceholder')} className="flex-grow bg-transparent focus:outline-none resize-none text-base p-2 max-h-40 text-[var(--text-color)] placeholder-[var(--text-secondary-color)]" rows={1} disabled={isLoading} />
                                        <button onClick={() => setIsSettingsOpen(prev => !prev)} className="p-2 rounded-xl text-[var(--text-secondary-color)] hover:bg-[var(--hover-bg-color)] hover:text-[var(--text-color)] transition-colors h-10 w-10 flex items-center justify-center flex-shrink-0">
                                            <CogIcon className="w-5 h-5" />
                                        </button>
                                        <button onClick={handlePlan} disabled={isLoading || !prompt.trim()} className="p-2 rounded-xl bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white transition-all h-10 w-10 flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20">
                                            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowRightIcon className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    <div className="text-center mt-2">
                                        <p className="text-[10px] text-[var(--text-secondary-color)] opacity-50">Manus can make mistakes. Check important info.</p>
                                    </div>
                                </div>
                            </footer>
                        </div>
                    </div>

                    {/* Right Panel: Computer */}
                    {showComputer && (
                        <div className="hidden lg:flex flex-col h-full p-4 space-y-4 bg-[var(--bg-tertiary-color)] border-l border-[var(--border-color)] animate-fade-in">
                            <div className="flex-1 min-h-0">
                                <VirtualComputer viewedStep={viewedStep} t={t} />
                            </div>
                            <div className="flex-1 min-h-0">
                                <TaskProgress plan={activeExchange?.plan || null} results={activeExchange?.results || []} onStepSelect={setViewedStep} viewedStep={viewedStep} t={t} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;