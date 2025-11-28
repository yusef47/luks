import React, { useState, useRef } from 'react';
import { parsePDF } from '../../../services/pdfParser';
import { generatePresentation, Presentation } from '../../../services/presentationService';
import { FileText, Loader2, Download, CheckCircle2, XCircle } from 'lucide-react';

import PresentationPreview from './PresentationPreview';

interface PresentationGeneratorProps {
    onComplete?: (presentation: Presentation) => void;
}

export default function PresentationGenerator({ onComplete }: PresentationGeneratorProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentStage, setCurrentStage] = useState('');
    const [presentation, setPresentation] = useState<Presentation | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [slideCount, setSlideCount] = useState<number | null>(null);
    const [language, setLanguage] = useState<'en' | 'ar'>('en');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
            setPresentation(null);
            setLogs([]);
        }
    };

    const handleGenerate = async () => {
        if (!file) return;

        setIsGenerating(true);
        setError(null);
        setLogs([]);
        setProgress(0);

        try {
            // Add log
            const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

            addLog('📄 Parsing PDF...');
            const parsedPDF = await parsePDF(file);
            addLog(`✅ Parsed ${parsedPDF.pages} pages`);

            addLog('🤖 Starting AI generation...');

            const result = await generatePresentation(
                parsedPDF,
                {
                    maxSlides: slideCount || undefined, // Use user-selected count or auto-calculate
                    includeImages: false, // Skip images for now
                    language: language // Pass language preference
                },
                (stage, prog) => {
                    setCurrentStage(stage);
                    setProgress(prog);
                    addLog(`⏳ ${stage} (${prog}%)`);
                },
                (chunk) => {
                    // Real-time AI chunks (optional)
                    console.log('AI chunk:', chunk);
                }
            );

            addLog('✅ Presentation generated successfully!');
            setPresentation(result);
            onComplete?.(result);

        } catch (err: any) {
            console.error('Generation error:', err);
            setError(err.message || 'Failed to generate presentation');
            setLogs(prev => [...prev, `❌ Error: ${err.message}`]);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        if (!presentation?.file) return;

        const url = URL.createObjectURL(presentation.file);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${presentation.title}.pptx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col h-full bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    📊 Presentation Generator
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Transform any PDF into a professional PowerPoint presentation
                </p>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-4xl mx-auto space-y-6">

                    {/* Upload Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                            1. Upload PDF
                        </h2>

                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center cursor-pointer hover:border-purple-500 dark:hover:border-purple-400 transition-colors"
                        >
                            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                            {file ? (
                                <div>
                                    <p className="text-lg font-medium text-gray-900 dark:text-white">{file.name}</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                                        Click to upload PDF
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Maximum size: 50MB
                                    </p>
                                </div>
                            )}
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {file && !isGenerating && !presentation && (
                            <div className="mt-6 space-y-4">
                                {/* Language Selector */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Presentation Language
                                    </label>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setLanguage('en')}
                                            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                                                language === 'en'
                                                    ? 'bg-blue-600 text-white shadow-lg'
                                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                            }`}
                                        >
                                            🇬🇧 English
                                        </button>
                                        <button
                                            onClick={() => setLanguage('ar')}
                                            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                                                language === 'ar'
                                                    ? 'bg-blue-600 text-white shadow-lg'
                                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                            }`}
                                        >
                                            🇸🇦 العربية
                                        </button>
                                    </div>
                                </div>

                                {/* Slide Count Selector */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Number of Slides (Optional)
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="5"
                                            max="30"
                                            value={slideCount || 15}
                                            onChange={(e) => setSlideCount(parseInt(e.target.value))}
                                            className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <span className="text-lg font-semibold text-purple-600 dark:text-purple-400 min-w-12 text-center">
                                            {slideCount || 'Auto'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Leave as "Auto" for intelligent slide count based on document size
                                    </p>
                                </div>

                                {/* Generate Button */}
                                <button
                                    onClick={handleGenerate}
                                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg"
                                >
                                    🚀 Generate Presentation
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Progress Section */}
                    {isGenerating && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Generating...
                            </h2>

                            {/* Progress Bar */}
                            <div className="mb-4">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-600 dark:text-gray-400">{currentStage}</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{progress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-purple-600 to-blue-600 h-full transition-all duration-500 ease-out"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>

                            {/* Logs */}
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-48 overflow-y-auto font-mono text-xs">
                                {logs.map((log, i) => (
                                    <div key={i} className="text-gray-700 dark:text-gray-300 mb-1">
                                        {log}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Success Section & Preview */}
                    {presentation && !error && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-green-200 dark:border-green-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-3 mb-6">
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    Presentation Ready!
                                </h2>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                                    <p className="text-gray-500 dark:text-gray-400">Slides</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {presentation.slides.length}
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                                    <p className="text-gray-500 dark:text-gray-400">Generation Time</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {((presentation.metadata?.generationTime || 0) / 1000).toFixed(1)}s
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowPreview(true)}
                                    className="flex-1 bg-white border-2 border-purple-600 text-purple-600 hover:bg-purple-50 font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    <FileText className="w-5 h-5" />
                                    Preview Slides
                                </button>

                                <button
                                    onClick={handleDownload}
                                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2"
                                >
                                    <Download className="w-5 h-5" />
                                    Download PPTX
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Preview Modal */}
                    {showPreview && presentation && (
                        <PresentationPreview
                            presentation={presentation}
                            onDownload={handleDownload}
                            onClose={() => setShowPreview(false)}
                        />
                    )}

                    {/* Error Section */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <XCircle className="w-6 h-6 text-red-600" />
                                <h3 className="text-lg font-semibold text-red-900 dark:text-red-200">
                                    Generation Failed
                                </h3>
                            </div>
                            <p className="text-red-700 dark:text-red-300">{error}</p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
