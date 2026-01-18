/**
 * BrowserAIModal Component
 * Modal for Browser AI extension installation instructions
 */

import React, { useState } from 'react';

interface BrowserAIModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const BrowserAIModal: React.FC<BrowserAIModalProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState(1);
    const [isDownloading, setIsDownloading] = useState(false);

    if (!isOpen) return null;

    const handleDownload = async () => {
        setIsDownloading(true);

        // Download from public folder (static file)
        const link = document.createElement('a');
        link.href = '/lukas-browser-ai.zip';
        link.download = 'lukas-browser-ai.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setIsDownloading(false);
        setStep(2);
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
            onClick={onClose}
        >
            <div
                className="bg-[var(--bg-color)] border border-[var(--border-color)] rounded-2xl max-w-lg w-full p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">🖥️</span>
                        <div>
                            <h2 className="text-lg font-bold text-[var(--text-color)]">Browser AI</h2>
                            <p className="text-xs text-[var(--text-secondary-color)]">تحكم في متصفحك بالذكاء الاصطناعي</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[var(--hover-bg-color)] rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5 text-[var(--text-secondary-color)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center gap-2 mb-6">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex-1 flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= s
                                ? 'bg-[var(--accent-color)] text-white'
                                : 'bg-[var(--bg-tertiary-color)] text-[var(--text-secondary-color)]'
                                }`}>
                                {step > s ? '✓' : s}
                            </div>
                            {s < 3 && <div className={`flex-1 h-1 rounded ${step > s ? 'bg-[var(--accent-color)]' : 'bg-[var(--bg-tertiary-color)]'}`} />}
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                {step === 1 && (
                    <div className="text-center py-4">
                        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">الخطوة 1: تحميل الإضافة</h3>
                        <p className="text-sm text-[var(--text-secondary-color)] mb-6">
                            اضغط الزر أدناه لتحميل ملف الإضافة (ZIP)
                        </p>
                        <button
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50"
                        >
                            {isDownloading ? '⏳ جاري التحميل...' : '📥 تحميل الإضافة'}
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="text-center py-4">
                        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center">
                            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">الخطوة 2: فتح إعدادات Chrome</h3>
                        <div className="text-sm text-[var(--text-secondary-color)] mb-4 space-y-2">
                            <p>1. افتح Chrome</p>
                            <p>2. اكتب في شريط العنوان:</p>
                            <code className="block bg-[var(--bg-tertiary-color)] px-4 py-2 rounded-lg text-[var(--accent-color)] font-mono my-2">
                                chrome://extensions
                            </code>
                            <p>3. فعّل <strong>وضع المطور</strong> (أعلى اليمين)</p>
                        </div>
                        <button
                            onClick={() => setStep(3)}
                            className="w-full py-3 px-6 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all"
                        >
                            التالي ←
                        </button>
                    </div>
                )}

                {step === 3 && (
                    <div className="text-center py-4">
                        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">الخطوة 3: تثبيت الإضافة</h3>
                        <div className="text-sm text-[var(--text-secondary-color)] mb-4 space-y-2">
                            <p>1. فك ضغط الملف المحمّل</p>
                            <p>2. اضغط <strong>"تحميل إضافة غير مضغوطة"</strong></p>
                            <p>3. اختر مجلد الإضافة</p>
                            <p>4. ✅ تم! اضغط على أيقونة Lukas في المتصفح</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-full py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all"
                        >
                            ✓ انتهيت
                        </button>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-[var(--border-color)] text-center">
                    <p className="text-xs text-[var(--text-secondary-color)]">
                        🔒 الإضافة آمنة ولا تجمع بياناتك
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BrowserAIModal;
