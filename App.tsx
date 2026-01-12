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
import AutonomousMode from './src/components/AutonomousMode';
import DailyFeedSettings from './src/components/DailyFeedSettings';


// Note: All Gemini API calls are now handled by the backend proxy
// Frontend no longer imports directly from geminiService (deprecated)

// Simple backend proxy for Orchestrator
// On Vercel, we use /api directly. On localhost, fallback to /api as well (for dev server)
const BACKEND_URL = '/api';


const callBackendAPI = async (endpoint: string, data: any, onChunk?: (chunk: string) => void) => {
  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const result = await response.json();

    if (onChunk && result.data) {
      onChunk(result.data);
    }

    return result;
  } catch (error: any) {
    console.error(`❌ Backend error:`, error);
    throw error;
  }
};

// Stub implementations - these should be called via backend proxy in production
const generatePlan = async (prompt: string, hasImage: boolean, hasVideo: boolean, history: any, cycleCount: number) => {
  try {
    const result = await callBackendAPI('/orchestrator/plan', { prompt, hasImage, hasVideo, history, cycleCount });
    return result.data || { plan: [], clarification: null };
  } catch (error) {
    console.error('Plan generation error:', error);
    return { plan: [], clarification: null };
  }
};

const executeSearch = async (task: string, onChunk: (chunk: string) => void) => {
  try {
    const result = await callBackendAPI('/orchestrator/search', { task }, onChunk);
    return result.data || {};
  } catch (error) {
    console.error('Search error:', error);
    return {};
  }
};

const executeMap = async (task: string, location: any, onChunk: (chunk: string) => void) => {
  try {
    const result = await callBackendAPI('/orchestrator/map', { task, location }, onChunk);
    return result.data || {};
  } catch (error) {
    console.error('Map error:', error);
    return {};
  }
};

const executeVision = async (task: string, imageFile: File, onChunk: (chunk: string) => void) => {
  try {
    const formData = new FormData();
    formData.append('task', task);
    formData.append('image', imageFile);

    const response = await fetch(`${BACKEND_URL}/orchestrator/vision`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    if (onChunk && result.data) onChunk(result.data);
    return result.data || {};
  } catch (error) {
    console.error('Vision error:', error);
    return {};
  }
};

const executeVideo = async (task: string, videoFile: File, onChunk: (chunk: string) => void) => {
  try {
    const formData = new FormData();
    formData.append('task', task);
    formData.append('video', videoFile);

    const response = await fetch(`${BACKEND_URL}/orchestrator/video`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    if (onChunk && result.data) onChunk(result.data);
    return result.data || {};
  } catch (error) {
    console.error('Video error:', error);
    return {};
  }
};

const synthesizeAnswer = async (prompt: string, results: any, onChunk: (chunk: string) => void, conversationId?: string, conversationHistory?: any[]) => {
  try {
    const result = await callBackendAPI('/orchestrator/synthesize', { prompt, results, conversationId, conversationHistory }, onChunk);
    return result.data || {};
  } catch (error) {
    console.error('Synthesize error:', error);
    return {};
  }
};

const executeEmail = async (task: string, onChunk: (chunk: string) => void) => {
  try {
    const result = await callBackendAPI('/orchestrator/email', { task }, onChunk);
    return result.data || {};
  } catch (error) {
    console.error('Email error:', error);
    return {};
  }
};

const executeSheets = async (task: string, prevData: string, onChunk: (chunk: string) => void) => {
  try {
    const result = await callBackendAPI('/orchestrator/sheets', { task, prevData }, onChunk);
    return result.data || { sheetData: [] };
  } catch (error) {
    console.error('Sheets error:', error);
    return { sheetData: [] };
  }
};

const executeDrive = async (task: string, onChunk: (chunk: string) => void) => {
  try {
    const result = await callBackendAPI('/orchestrator/drive', { task }, onChunk);
    return result.data || {};
  } catch (error) {
    console.error('Drive error:', error);
    return {};
  }
};

const executeOrchestratorIntermediateStep = async (task: string, prompt: string, results: any, onChunk: (chunk: string) => void) => {
  try {
    const result = await callBackendAPI('/orchestrator/intermediate', { task, prompt, results }, onChunk);
    return result.data || {};
  } catch (error) {
    console.error('Intermediate step error:', error);
    return {};
  }
};

const executeImageGeneration = async (task: string, onChunk: (chunk: string) => void) => {
  try {
    const result = await callBackendAPI('/orchestrator/generate-image', { task }, onChunk);
    return result.data || { imageBase64: '' };
  } catch (error) {
    console.error('Image generation error:', error);
    return { imageBase64: '' };
  }
};

// ============================================
// MAIN APP COMPONENT
// ============================================

const App: React.FC = () => {
  // ========== THEME & LANGUAGE ==========
  const [lang, setLang] = useState<Lang>('ar');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // ========== UI STATE ==========
  const [showComputer, setShowComputer] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewedStep, setViewedStep] = useState<StepResult | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [cycleCount, setCycleCount] = useState(1);
  const [isBrowserActive, setIsBrowserActive] = useState(false);

  // ========== FILE ATTACHMENT ==========
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  // ========== PRESENTATION MODE ==========
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isAutonomousMode, setIsAutonomousMode] = useState(false);
  const [showDailyFeed, setShowDailyFeed] = useState(false);

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
    // Force light theme initially, then respect local storage
    const saved = localStorage.getItem('lukas_theme') as 'light' | 'dark';
    if (saved) {
      setTheme(saved);
    } else {
      setTheme('light');
    }
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

  // Auto-show computer - Disabled to keep UI clean
  // useEffect(() => {
  //   if (activeExchange && activeExchange.status !== 'planning' && activeExchange.status !== 'clarification_needed') {
  //     setShowComputer(true);
  //   }
  // }, [activeExchange?.status]);

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
      setFileName(file.name);
      setFileType(file.type);
      // Only create preview URL for images
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const clearAttachment = () => {
    setAttachedFile(null);
    setFileName(null);
    setFileType(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Helper: Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Process file with AI and get extracted text
  const processFileWithAI = async (file: File, userPrompt: string): Promise<string> => {
    try {
      const base64Content = await fileToBase64(file);

      const response = await fetch('/api/file/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileContent: base64Content,
          mimeType: file.type,
          fileName: file.name,
          prompt: userPrompt || `Analyze this file and describe its contents in detail.`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process file');
      }

      const data = await response.json();
      return data.data?.extractedText || '';
    } catch (error) {
      console.error('Error processing file:', error);
      return '';
    }
  };

  // ========== ORCHESTRATOR HANDLERS ==========

  const handleSubmit = async () => {
    if (!prompt.trim() && !attachedFile) return;

    // Determine file type
    const isImage = attachedFile?.type.startsWith('image/');
    const isVideo = attachedFile?.type.startsWith('video/');
    const isDocument = attachedFile && !isImage && !isVideo;

    // Store file reference before clearing
    const fileToProcess = attachedFile;
    const originalPrompt = prompt;

    const newExchange: Exchange = {
      id: Date.now().toString(),
      prompt,
      imageFile: isImage ? attachedFile : null,
      videoFile: isVideo ? attachedFile : null,
      documentFile: isDocument ? attachedFile : null,
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
      setConversations(prev => [...prev, { id: convoId, title: prompt || 'File Analysis', exchanges: [newExchange] }]);
      setActiveConversationId(convoId);
    }

    setPrompt('');
    setIsLoading(true);

    try {
      // If there's a file, process it first
      let enhancedPrompt = originalPrompt;

      if (fileToProcess) {
        console.log(`[App] Processing file: ${fileToProcess.name} (${fileToProcess.type})`);

        // Update status to show we're processing the file
        updateExchange(convoId, newExchange.id, {
          status: 'executing',
          results: [{ step: 1, agent: Agent.Orchestrator, task: 'جاري تحليل الملف...', result: '', status: 'running' }]
        });

        try {
          const fileAnalysis = await processFileWithAI(fileToProcess, originalPrompt);

          if (fileAnalysis) {
            // Combine file analysis with user's prompt
            enhancedPrompt = `
المستخدم رفع ملف: ${fileToProcess.name}

محتوى الملف المستخرج:
${fileAnalysis}

طلب المستخدم: ${originalPrompt || 'حلل هذا الملف واشرح محتواه'}
`;
            console.log('[App] File analyzed successfully');
          } else {
            // File analysis returned empty - still try to proceed with the original prompt
            console.log('[App] File analysis returned empty, using original prompt');
            enhancedPrompt = originalPrompt || `تحليل الملف: ${fileToProcess.name}`;
          }
        } catch (fileError: any) {
          console.error('[App] File processing failed:', fileError.message);
          // If file processing fails, show error and stop
          updateExchange(convoId, newExchange.id, {
            status: 'completed',
            results: [{
              step: 1,
              agent: Agent.Orchestrator,
              task: 'File Analysis',
              result: `⚠️ عذراً، لم أتمكن من قراءة الملف.\n\nالسبب: ${fileError.message}\n\n**نصائح:**\n- تأكد أن حجم الملف أقل من 3 ميجابايت\n- جرب رفع صورة للمستند (screenshot) بدلاً من PDF\n- تأكد أن الملف غير تالف`,
              status: 'completed'
            }]
          });
          setIsLoading(false);
          return;
        }
      }

      // Update the exchange prompt with enhanced version
      updateExchange(convoId, newExchange.id, {
        prompt: enhancedPrompt,
        status: 'planning'
      });

      const history = conversations.find(c => c.id === convoId)?.exchanges
        .filter(e => e.status === 'completed')
        .map(e => ({ prompt: e.prompt, results: e.results })) || [];

      const planResponse = await generatePlan(
        enhancedPrompt,
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
        await handleExecute(convoId, newExchange.id, { ...newExchange, prompt: enhancedPrompt }, planResponse.plan);
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
              // Get conversation history for context
              const conversationHistory = conversations.find(c => c.id === convoId)?.exchanges
                .filter(e => e.status === 'completed')
                .map(e => ({ prompt: e.prompt, results: e.results })) || [];
              r = await synthesizeAnswer(exchange.prompt, outputs, onChunk, convoId, conversationHistory);
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
          console.error(`[App] Step ${step.step} failed:`, e.message);
          updateStepResult(convoId, exchangeId, step.step, { status: 'error', result: `⚠️ ${e.message}` });
          // Continue to next step instead of stopping the entire execution
          outputs.push({ ...step, result: `⚠️ خطأ: ${e.message}`, status: 'error' });
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
    <div className={`fixed inset-0 flex bg-[var(--bg-color)] overflow-hidden ${lang === 'ar' ? 'flex-row-reverse' : ''}`}>
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={setActiveConversationId}
        onNewChat={() => setActiveConversationId(null)}
        isPresentationMode={isPresentationMode}
        onTogglePresentation={() => setIsPresentationMode(!isPresentationMode)}
        isAutonomousMode={isAutonomousMode}
        onToggleAutonomous={() => setIsAutonomousMode(!isAutonomousMode)}
        onOpenDailyFeed={() => setShowDailyFeed(true)}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
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
              fileName={fileName}
              fileType={fileType}
              onFileSelect={handleFileChange}
              onClearAttachment={clearAttachment}
              isSettingsOpen={isSettingsOpen}
              onToggleSettings={() => setIsSettingsOpen(!isSettingsOpen)}
              cycleCount={cycleCount}
              setCycleCount={setCycleCount}
              showComputer={showComputer}
              onToggleComputer={() => setShowComputer(!showComputer)}
              onClarificationResponse={handleClarificationResponse}
              t={t as any}
            />

            {/* Computer & Task Progress - Hidden when Thinking UI is active, or kept for detailed debug view */}
            {showComputer && (
              <div className="flex flex-col h-full min-h-0 border-l border-[var(--border-color)] bg-[var(--bg-secondary-color)]">
                <div className="flex-1 p-4 overflow-hidden">
                  <VirtualComputer
                    viewedStep={viewedStep}
                    t={t as any}
                    isBrowserActive={isBrowserActive}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Autonomous Mode Modal */}
      <AutonomousMode
        isOpen={isAutonomousMode}
        onClose={() => setIsAutonomousMode(false)}
        language={lang}
      />

      {/* Daily Feed Settings Modal */}
      {showDailyFeed && (
        <DailyFeedSettings
          onClose={() => setShowDailyFeed(false)}
          t={t as any}
        />
      )}
    </div>
  );
};

export default App;
