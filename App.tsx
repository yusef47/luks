/**
 * App.tsx - Clean Refactored Version
 * النسخة النظيفة المُعاد هيكلتها
 * 
 * Changes:
 * - Components separated into their own files
 * - Hooks separated for conversations management
 * - Services separated for speech and tutor
 * - Cleaner state management
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Agent, Exchange, PlanStep, StepResult, StoredFile, Conversation } from './types';
import { translations, Localization, Lang } from './localization';
import { useLocation } from './hooks/useLocation';

// Components
import { Sidebar } from './src/components/sidebar/Sidebar';
import { ChatPanel } from './src/components/chat/ChatPanel';
import { VirtualComputer } from './src/components/computer/VirtualComputer';
import { TaskProgress } from './src/components/computer/TaskProgress';
import PresentationGenerator from './src/components/presentation/PresentationGenerator';

// Services
import { speechService } from './src/services/speechService';
import { getPersonaById, tutorPersonas } from './src/config/tutorPersonas';

// Types
export type LanguageLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

// Note: All Gemini API calls are now handled by the backend proxy
// Frontend no longer imports directly from geminiService (deprecated)

// Stub implementations - these should be called via backend proxy in production
const generatePlan = async (prompt: string, hasImage: boolean, hasVideo: boolean, history: any, cycleCount: number) => ({ plan: [], clarification: null });
const executeSearch = async (task: string, onChunk: (chunk: string) => void) => ({});
const executeMap = async (task: string, location: any, onChunk: (chunk: string) => void) => ({});
const executeVision = async (task: string, imageFile: File, onChunk: (chunk: string) => void) => ({});
const executeVideo = async (task: string, videoFile: File, onChunk: (chunk: string) => void) => ({});
const synthesizeAnswer = async (prompt: string, results: any, onChunk: (chunk: string) => void) => ({});
const executeEmail = async (task: string, onChunk: (chunk: string) => void) => ({});
const executeSheets = async (task: string, prevData: string, onChunk: (chunk: string) => void) => ({ sheetData: [] });
const executeDrive = async (task: string, onChunk: (chunk: string) => void) => ({});
const executeOrchestratorIntermediateStep = async (task: string, prompt: string, results: any, onChunk: (chunk: string) => void) => ({});
const executeImageGeneration = async (task: string, onChunk: (chunk: string) => void) => ({ imageBase64: '' });

// ============================================
// MAIN APP COMPONENT
// ============================================

const App: React.FC = () => {
  // ========== THEME & LANGUAGE ==========
  const [lang, setLang] = useState<Lang>('ar');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // ========== UI STATE ==========
  const [showComputer, setShowComputer] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewedStep, setViewedStep] = useState<StepResult | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [cycleCount, setCycleCount] = useState(1);

  // ========== FILE ATTACHMENT ==========
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ========== TUTOR MODE ==========
  const [isTutorMode, setIsTutorMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [languageLevel, setLanguageLevel] = useState<LanguageLevel>('B1');
  const [personaId, setPersonaId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tutor_persona') || 'emma';
    }
    return 'emma';
  });
  const continuousListeningRef = useRef(false);
  const activeRecognitionRef = useRef<any>(null);
  const tutorConversationIdRef = useRef<string | null>(null);
  const recognitionStarterRef = useRef<(() => void) | null>(null);

  // ========== PRESENTATION MODE ==========
  const [isPresentationMode, setIsPresentationMode] = useState(false);

  // ========== CONVERSATIONS ==========
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem('lukas_conversations');
      if (!saved) return [];
      return JSON.parse(saved).map((c: any) => ({
        ...c,
        exchanges: c.exchanges.map((e: any) => ({ ...e, imageFile: null, videoFile: null }))
      }));
    } catch { return []; }
  });
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // ========== DERIVED STATE ==========
  const activeConversation = useMemo(() =>
    conversations.find(c => c.id === activeConversationId),
    [conversations, activeConversationId]
  );

  const activeExchange = useMemo(() => {
    if (!activeConversation) return null;
    return activeConversation.exchanges[activeConversation.exchanges.length - 1];
  }, [activeConversation]);

  const { location } = useLocation();

  // ========== TRANSLATION ==========
  const t = useMemo(() => (key: keyof Localization) => {
    return translations[lang][key] || translations['en'][key] || key;
  }, [lang]);

  // ========== EFFECTS ==========

  // Persist conversations
  useEffect(() => {
    const data = conversations.map(c => ({
      ...c,
      exchanges: c.exchanges.map(({ imageFile, videoFile, ...rest }) => rest)
    }));
    localStorage.setItem('lukas_conversations', JSON.stringify(data));
  }, [conversations]);

  // Theme
  useEffect(() => {
    const saved = localStorage.getItem('lukas_theme') as 'light' | 'dark';
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('lukas_theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  // Update viewed step
  useEffect(() => {
    if (!activeExchange?.results?.length) {
      setViewedStep(null);
      return;
    }
    const running = activeExchange.results.find(r => r.status === 'running');
    if (running) {
      setViewedStep(running);
    } else {
      const latest = [...activeExchange.results].reverse().find(r =>
        r.status === 'completed' || r.status === 'error'
      );
      if (latest) setViewedStep(latest);
    }
  }, [activeExchange]);

  // Get current persona
  const currentPersona = getPersonaById(personaId) || tutorPersonas[0];

  // Tutor welcome - persona and level appropriate
  useEffect(() => {
    if (isTutorMode && !hasGreeted) {
      // Personalized welcome messages
      const personaWelcomes: Record<string, string> = {
        'emma': "Hi there! I'm Emma, your English tutor. I'm so happy to help you learn today! What would you like to practice?",
        'james': "Hello. I'm James, your English instructor. I'm here to help you improve your language skills. How can I assist you?",
        'sofia': "Hey! I'm Sofia! Super excited to practice English with you today! Ready to have some fun while learning?",
        'michael': "Hello. I'm Michael, your English teacher. I'll take my time to explain everything clearly. What would you like to work on?"
      };

      const welcomeText = personaWelcomes[personaId] || `Hello! I'm ${currentPersona.name}, your English tutor. How can I help you today?`;

      speechService.speak(welcomeText, {
        rate: speechRate * currentPersona.speechRate,
        pitch: currentPersona.pitch,
        voiceHints: currentPersona.voiceHints
      }).then(() => setHasGreeted(true));
    } else if (!isTutorMode) {
      setHasGreeted(false);
      tutorConversationIdRef.current = null;
    }
  }, [isTutorMode, hasGreeted, speechRate, personaId, currentPersona]);

  // Auto-show computer
  useEffect(() => {
    if (activeExchange && activeExchange.status !== 'planning' && activeExchange.status !== 'clarification_needed') {
      setShowComputer(true);
    }
  }, [activeExchange?.status]);

  // ========== CONVERSATION HELPERS ==========

  const updateExchange = useCallback((convoId: string, exchangeId: string, updates: Partial<Exchange>) => {
    setConversations(prev => prev.map(c => {
      if (c.id !== convoId) return c;
      return { ...c, exchanges: c.exchanges.map(e => e.id === exchangeId ? { ...e, ...updates } : e) };
    }));
  }, []);

  const updateStepResult = useCallback((
    convoId: string,
    exchangeId: string,
    step: number,
    updates: Partial<StepResult>,
    appendResult = ''
  ) => {
    setConversations(prev => prev.map(c => {
      if (c.id !== convoId) return c;
      return {
        ...c,
        exchanges: c.exchanges.map(e => {
          if (e.id !== exchangeId) return e;
          return {
            ...e,
            results: e.results.map(r =>
              r.step === step
                ? { ...r, ...updates, result: updates.result !== undefined ? updates.result : r.result + appendResult }
                : r
            )
          };
        })
      };
    }));
  }, []);

  // ========== FILE HANDLING ==========

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearAttachment = () => {
    setAttachedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ========== TUTOR HANDLERS ==========

  const handleTutorSubmit = async (text: string) => {
    if (!text.trim()) return;

    const newExchange: Exchange = {
      id: Date.now().toString(),
      prompt: text,
      imageFile: null,
      videoFile: null,
      plan: null,
      results: [],
      status: 'executing'
    };

    let convoId = tutorConversationIdRef.current || activeConversationId;

    if (!convoId) {
      const newConvoId = Date.now().toString();
      convoId = newConvoId;
      tutorConversationIdRef.current = newConvoId;
      setConversations(prev => [...prev, { id: newConvoId, title: "English Tutor Session", exchanges: [newExchange] }]);
      setActiveConversationId(newConvoId);
    } else {
      setConversations(prev => prev.map(c =>
        c.id === convoId ? { ...c, exchanges: [...c.exchanges, newExchange] } : c
      ));
    }

    setPrompt('');
    setIsLoading(true);

    try {
      const currentConvo = conversations.find(c => c.id === convoId) || { exchanges: [] };
      const history = currentConvo.exchanges.map(ex => {
        const resp = ex.results.find(r => r.agent === Agent.Orchestrator);
        return [
          { role: 'user' as const, content: ex.prompt },
          ...(resp?.result ? [{ role: 'assistant' as const, content: resp.result }] : [])
        ];
      }).flat();

      let fullResponse = '';
      const onChunk = (chunk: string) => {
        fullResponse += chunk;
        updateExchange(convoId!, newExchange.id, {
          status: 'executing',
          results: [{ step: 1, agent: Agent.Orchestrator, task: 'Tutor Response', result: fullResponse, status: 'running' }]
        });
      };

      // Import backend tutor client
      const { generateTutorResponse } = await import('./src/services/tutorClient');
      const responseText = await generateTutorResponse(history, text, languageLevel);

      // Stop recognition before TTS
      if (activeRecognitionRef.current) {
        try { activeRecognitionRef.current.stop(); } catch { }
        activeRecognitionRef.current = null;
      }

      const wasListening = continuousListeningRef.current;
      if (wasListening) {
        continuousListeningRef.current = false;
        setIsListening(false);
      }

      // Speak response with persona voice
      await speechService.speak(responseText, {
        rate: speechRate * currentPersona.speechRate,
        pitch: currentPersona.pitch,
        voiceHints: currentPersona.voiceHints
      });

      // Resume listening
      if (wasListening && isTutorMode && recognitionStarterRef.current) {
        continuousListeningRef.current = true;
        setTimeout(() => recognitionStarterRef.current?.(), 500);
      }

      updateExchange(convoId!, newExchange.id, {
        status: 'completed',
        results: [{ step: 1, agent: Agent.Orchestrator, task: 'Tutor Response', result: responseText, status: 'completed' }]
      });

    } catch (error: any) {
      updateExchange(convoId!, newExchange.id, { status: 'error', errorMessage: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // ========== SPEECH RECOGNITION ==========

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Speech recognition not supported. Use Chrome.");
      return;
    }

    if (isListening || continuousListeningRef.current) {
      if (activeRecognitionRef.current) {
        try { activeRecognitionRef.current.stop(); } catch { }
        activeRecognitionRef.current = null;
      }
      continuousListeningRef.current = false;
      setIsListening(false);
      return;
    }

    continuousListeningRef.current = true;

    const startRecognition = () => {
      if (!continuousListeningRef.current) return;

      const recognition = new (window as any).webkitSpeechRecognition();
      activeRecognitionRef.current = recognition;
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);

      recognition.onend = () => {
        if (continuousListeningRef.current && !speechService.isSpeaking()) {
          setTimeout(startRecognition, 300);
        } else {
          setIsListening(false);
        }
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setPrompt(transcript);
        if (isTutorMode) handleTutorSubmit(transcript);
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech' && continuousListeningRef.current && !speechService.isSpeaking()) {
          setTimeout(startRecognition, 300);
        }
      };

      try { recognition.start(); } catch { }
    };

    recognitionStarterRef.current = startRecognition;
    startRecognition();
  };

  // ========== ORCHESTRATOR HANDLERS ==========

  const handleSubmit = async () => {
    if (!prompt.trim() && !attachedFile) return;
    if (isTutorMode) { handleTutorSubmit(prompt); return; }

    const newExchange: Exchange = {
      id: Date.now().toString(),
      prompt,
      imageFile: attachedFile?.type.startsWith('image/') ? attachedFile : null,
      videoFile: attachedFile?.type.startsWith('video/') ? attachedFile : null,
      plan: null,
      results: [],
      status: 'planning'
    };
    clearAttachment();

    let convoId: string;
    if (activeConversationId) {
      convoId = activeConversationId;
      setConversations(prev => prev.map(c =>
        c.id === convoId ? { ...c, exchanges: [...c.exchanges, newExchange] } : c
      ));
    } else {
      convoId = Date.now().toString();
      setConversations(prev => [...prev, { id: convoId, title: prompt, exchanges: [newExchange] }]);
      setActiveConversationId(convoId);
    }

    setPrompt('');
    setIsLoading(true);

    try {
      const history = conversations.find(c => c.id === convoId)?.exchanges
        .filter(e => e.status === 'completed')
        .map(e => ({ prompt: e.prompt, results: e.results })) || [];

      const planResponse = await generatePlan(
        newExchange.prompt,
        !!newExchange.imageFile,
        !!newExchange.videoFile,
        history as any,
        cycleCount
      );

      updateExchange(convoId, newExchange.id, {
        plan: planResponse.plan || null,
        clarification: planResponse.clarification || null,
        status: planResponse.clarification ? 'clarification_needed' : 'planning'
      });

      if (planResponse.plan) {
        await handleExecute(convoId, newExchange.id, newExchange, planResponse.plan);
      }
    } catch (err: any) {
      updateExchange(convoId, newExchange.id, { status: 'error', errorMessage: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async (convoId: string, exchangeId: string, exchange: Exchange, plan: PlanStep[]) => {
    let generatedFile: StoredFile | null = null;

    try {
      updateExchange(convoId, exchangeId, {
        status: 'executing',
        plan,
        results: plan.map(s => ({ ...s, result: '', status: 'pending' as const }))
      });

      let outputs: StepResult[] = [];

      for (const step of plan) {
        updateStepResult(convoId, exchangeId, step.step, { status: 'running' });
        let fullResult = '';
        let r: any = {};
        let imageBase64: string | undefined;

        const onChunk = (chunk: string) => {
          updateStepResult(convoId, exchangeId, step.step, {}, chunk);
          fullResult += chunk;
        };

        try {
          if (step.agent === Agent.Orchestrator) {
            if (step.step === plan.length) {
              r = await synthesizeAnswer(exchange.prompt, outputs, onChunk);
            } else {
              r = await executeOrchestratorIntermediateStep(step.task, exchange.prompt, outputs, onChunk);
            }
          } else {
            switch (step.agent) {
              case Agent.SearchAgent: r = await executeSearch(step.task, onChunk); break;
              case Agent.MapsAgent: r = await executeMap(step.task, location, onChunk); break;
              case Agent.VisionAgent: r = await executeVision(step.task, exchange.imageFile!, onChunk); break;
              case Agent.VideoAgent: r = await executeVideo(step.task, exchange.videoFile!, onChunk); break;
              case Agent.ImageGenerationAgent:
                r = await executeImageGeneration(step.task, onChunk);
                imageBase64 = r.imageBase64;
                break;
              case Agent.EmailAgent: r = await executeEmail(step.task, onChunk); break;
              case Agent.DriveAgent: r = await executeDrive(step.task, onChunk); break;
              case Agent.SheetsAgent:
                const prevData = outputs.length > 0 ? outputs[outputs.length - 1].result : '';
                r = await executeSheets(step.task, prevData, onChunk);
                if (r.sheetData) {
                  generatedFile = {
                    id: `file-${Date.now()}`,
                    name: `${step.task.substring(0, 30)}...`,
                    data: r.sheetData,
                    createdAt: new Date().toISOString()
                  };
                }
                break;
            }
          }

          const completed: StepResult = {
            ...step,
            result: fullResult,
            status: 'completed',
            sources: r.sources,
            imageBase64
          };

          updateStepResult(convoId, exchangeId, step.step, completed);
          outputs.push(completed);

          if (step.step < plan.length) await new Promise(r => setTimeout(r, 1000));
        } catch (e: any) {
          updateStepResult(convoId, exchangeId, step.step, { status: 'error', result: e.message });
          throw e;
        }
      }

      updateExchange(convoId, exchangeId, { status: 'completed', generatedFile });
    } catch (err: any) {
      updateExchange(convoId, exchangeId, { status: 'error', errorMessage: err.message });
    }
  };

  const handleClarificationResponse = async (
    convoId: string,
    exchangeId: string,
    exchange: Exchange,
    option: { key: string; value: string }
  ) => {
    setIsLoading(true);
    updateExchange(convoId, exchangeId, { status: 'planning', clarification: null });

    const clarified = `Original: "${exchange.prompt}". User chose: "${option.value}". Generate plan.`;

    try {
      const history = conversations.find(c => c.id === convoId)?.exchanges
        .filter(e => e.id !== exchangeId && e.status === 'completed')
        .map(e => ({ prompt: e.prompt, results: e.results })) || [];

      const planResponse = await generatePlan(clarified, !!exchange.imageFile, !!exchange.videoFile, history as any, cycleCount);
      if (!planResponse.plan) throw new Error("Failed to get plan after clarification.");

      updateExchange(convoId, exchangeId, { plan: planResponse.plan, clarification: null, status: 'planning' });
      await handleExecute(convoId, exchangeId, { ...exchange, plan: planResponse.plan }, planResponse.plan);
    } catch (err: any) {
      updateExchange(convoId, exchangeId, { status: 'error', errorMessage: err.message });
    } finally {
      setIsLoading(false);
    }
  };





  // ========== RENDER ==========

  return (
    <div className="fixed inset-0 flex bg-[var(--bg-color)] overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={setActiveConversationId}
        onNewChat={() => setActiveConversationId(null)}
        isTutorMode={isTutorMode}
        onToggleTutor={() => setIsTutorMode(!isTutorMode)}
        speechRate={speechRate}
        onSpeechRateChange={setSpeechRate}
        languageLevel={languageLevel}
        onLanguageLevelChange={setLanguageLevel}
        personaId={personaId}
        onPersonaChange={(id) => {
          setPersonaId(id);
          localStorage.setItem('tutor_persona', id);
        }}
        isPresentationMode={isPresentationMode}
        onTogglePresentation={() => setIsPresentationMode(!isPresentationMode)}
        t={t as any}
      />

      {/* Main */}
      <div className="flex-grow flex flex-col min-w-0 h-full">
        {isPresentationMode ? (
          // Presentation Mode
          <PresentationGenerator
            onComplete={(presentation) => {
              console.log('Presentation complete:', presentation);
              // Could show success notification here
            }}
          />
        ) : (
          // Normal Chat Mode
          <div className={`flex-grow min-h-0 grid h-full ${showComputer ? 'grid-cols-1 lg:grid-cols-[1fr_450px]' : 'grid-cols-1'}`}>
            {/* Chat */}
            <ChatPanel
              activeConversation={activeConversation || null}
              isLoading={isLoading}
              prompt={prompt}
              setPrompt={setPrompt}
              onSubmit={handleSubmit}
              previewUrl={previewUrl}
              onFileSelect={handleFileChange}
              onClearAttachment={clearAttachment}
              isListening={isListening}
              onToggleListening={startListening}
              isTutorMode={isTutorMode}
              isSettingsOpen={isSettingsOpen}
              onToggleSettings={() => setIsSettingsOpen(!isSettingsOpen)}
              cycleCount={cycleCount}
              setCycleCount={setCycleCount}
              showComputer={showComputer}
              onToggleComputer={() => setShowComputer(!showComputer)}
              t={t as any}
            />

            {/* Computer */}
            {showComputer && (
              <div className="flex flex-col h-full min-h-0">
                <VirtualComputer
                  viewedStep={viewedStep}
                  t={t as any}
                />
                <TaskProgress
                  plan={activeExchange?.plan || null}
                  results={activeExchange?.results || []}
                  onStepSelect={setViewedStep}
                  viewedStep={viewedStep}
                  t={t as any}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
