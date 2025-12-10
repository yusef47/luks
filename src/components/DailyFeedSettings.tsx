/**
 * DailyFeedSettings Component
 * صفحة إعدادات النشرة الذكية اليومية
 */

import React, { useState } from 'react';

interface DailyFeedSettingsProps {
    onClose: () => void;
    t: (key: string) => string;
}

const TOPIC_SUGGESTIONS = [
    { emoji: '🤖', label: 'الذكاء الاصطناعي', value: 'أخبار الذكاء الاصطناعي والتعلم الآلي' },
    { emoji: '💰', label: 'الاقتصاد', value: 'أخبار الاقتصاد والأسواق المالية' },
    { emoji: '🥇', label: 'الذهب', value: 'أسعار الذهب والمعادن الثمينة' },
    { emoji: '💱', label: 'العملات', value: 'أسعار العملات والصرف' },
    { emoji: '💻', label: 'التكنولوجيا', value: 'أخبار التكنولوجيا والشركات التقنية' },
    { emoji: '🌍', label: 'السياسة', value: 'الأخبار السياسية والعلاقات الدولية' },
    { emoji: '⚽', label: 'الرياضة', value: 'أخبار الرياضة وكرة القدم' },
    { emoji: '🎬', label: 'الترفيه', value: 'أخبار الترفيه والمشاهير' },
];

const TIME_OPTIONS = [
    { label: '6:00 صباحاً', value: '06:00' },
    { label: '7:00 صباحاً', value: '07:00' },
    { label: '8:00 صباحاً', value: '08:00' },
    { label: '9:00 صباحاً', value: '09:00' },
    { label: '10:00 صباحاً', value: '10:00' },
    { label: '12:00 ظهراً', value: '12:00' },
    { label: '6:00 مساءً', value: '18:00' },
    { label: '8:00 مساءً', value: '20:00' },
];

export const DailyFeedSettings: React.FC<DailyFeedSettingsProps> = ({ onClose, t }) => {
    const [email, setEmail] = useState('');
    const [customTopics, setCustomTopics] = useState('');
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const [time, setTime] = useState('08:00');
    const [language, setLanguage] = useState('ar');
    const [isLoading, setIsLoading] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [previewReport, setPreviewReport] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const toggleTopic = (value: string) => {
        setSelectedTopics(prev =>
            prev.includes(value)
                ? prev.filter(t => t !== value)
                : [...prev, value]
        );
    };

    const getAllTopics = () => {
        const topics = [...selectedTopics];
        if (customTopics.trim()) {
            topics.push(customTopics.trim());
        }
        return topics.join(' + ');
    };

    const handlePreview = async () => {
        const topics = getAllTopics();
        if (!topics) {
            setMessage({ type: 'error', text: 'اختر مواضيع أو اكتب اهتماماتك أولاً' });
            return;
        }

        setIsPreviewing(true);
        setMessage(null);

        try {
            const response = await fetch('/api/daily-feed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topics, language, preview: true })
            });

            const data = await response.json();

            if (data.success) {
                setPreviewReport(data.data.report);
            } else {
                setMessage({ type: 'error', text: data.error || 'فشل في إنشاء المعاينة' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'حدث خطأ في الاتصال' });
        } finally {
            setIsPreviewing(false);
        }
    };

    const handleSubscribe = async () => {
        const topics = getAllTopics();

        if (!email || !email.includes('@')) {
            setMessage({ type: 'error', text: 'أدخل بريد إلكتروني صحيح' });
            return;
        }

        if (!topics) {
            setMessage({ type: 'error', text: 'اختر مواضيع أو اكتب اهتماماتك' });
            return;
        }

        setIsLoading(true);
        setMessage(null);

        try {
            // Send report to email directly
            const response = await fetch('/api/daily-feed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, topics, language, preview: false })
            });

            const genData = await response.json();

            if (genData.success) {
                setMessage({ type: 'success', text: '🎉 تم الاشتراك بنجاح! تفقد بريدك الإلكتروني الآن!' });
                setPreviewReport(genData.data.report);
            } else {
                setMessage({ type: 'error', text: genData.error || 'فشل في إرسال النشرة' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'حدث خطأ في الاتصال' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--bg-secondary-color)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[var(--border-color)]">

                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 p-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            ⭐ النشرة الذكية اليومية
                        </h2>
                        <p className="text-white/80 text-sm mt-1">احصل على أحدث الأخبار في بريدك كل يوم</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    >
                        <span className="text-white text-xl">✕</span>
                    </button>
                </div>

                <div className="p-6 space-y-6">

                    {/* Email Input */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary-color)] mb-2">
                            📧 البريد الإلكتروني
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="w-full px-4 py-3 rounded-xl bg-[var(--bg-tertiary-color)] border border-[var(--border-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            dir="ltr"
                        />
                    </div>

                    {/* Quick Topics */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary-color)] mb-2">
                            🎯 اختر المواضيع
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {TOPIC_SUGGESTIONS.map((topic) => (
                                <button
                                    key={topic.value}
                                    onClick={() => toggleTopic(topic.value)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedTopics.includes(topic.value)
                                        ? 'bg-indigo-600 text-white shadow-lg scale-105'
                                        : 'bg-[var(--bg-tertiary-color)] text-[var(--text-color)] hover:bg-[var(--hover-bg-color)]'
                                        }`}
                                >
                                    {topic.emoji} {topic.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Topics */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary-color)] mb-2">
                            ✍️ أو اكتب اهتماماتك الخاصة
                        </label>
                        <textarea
                            value={customTopics}
                            onChange={(e) => setCustomTopics(e.target.value)}
                            placeholder="مثال: أخبار شركة Apple، تحديثات ChatGPT، أسعار البيتكوين..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl bg-[var(--bg-tertiary-color)] border border-[var(--border-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                    </div>

                    {/* Time Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary-color)] mb-2">
                                ⏰ وقت الإرسال
                            </label>
                            <select
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-tertiary-color)] border border-[var(--border-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                {TIME_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary-color)] mb-2">
                                🌍 اللغة
                            </label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-tertiary-color)] border border-[var(--border-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="ar">العربية</option>
                                <option value="en">English</option>
                            </select>
                        </div>
                    </div>

                    {/* Message */}
                    {message && (
                        <div className={`p-4 rounded-xl ${message.type === 'success'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={handlePreview}
                            disabled={isPreviewing}
                            className="flex-1 px-6 py-3 rounded-xl bg-[var(--bg-tertiary-color)] text-[var(--text-color)] font-medium hover:bg-[var(--hover-bg-color)] transition-colors disabled:opacity-50"
                        >
                            {isPreviewing ? '⏳ جاري التحميل...' : '👁️ معاينة'}
                        </button>
                        <button
                            onClick={handleSubscribe}
                            disabled={isLoading}
                            className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg"
                        >
                            {isLoading ? '⏳ جاري الاشتراك...' : '🚀 اشترك الآن'}
                        </button>
                    </div>

                    {/* Preview */}
                    {previewReport && (
                        <div className="mt-6">
                            <h3 className="text-lg font-bold text-[var(--text-color)] mb-3 flex items-center gap-2">
                                📄 معاينة النشرة
                            </h3>
                            <div className="p-4 rounded-xl bg-[var(--bg-tertiary-color)] border border-[var(--border-color)] max-h-96 overflow-y-auto prose prose-invert prose-sm">
                                <div className="whitespace-pre-wrap text-[var(--text-color)]">
                                    {previewReport}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default DailyFeedSettings;
