/**
 * ThinkingAccordion Component - Manus Style
 * Shows real-time thinking steps with spinner/checkmark
 */

import React, { useState } from 'react';

interface ThinkingStep {
    id: string;
    label: string;
    status: 'pending' | 'active' | 'completed';
    detail?: string;
}

interface ThinkingAccordionProps {
    steps: ThinkingStep[];
    isExpanded?: boolean;
}

export const ThinkingAccordion: React.FC<ThinkingAccordionProps> = ({
    steps,
    isExpanded: initialExpanded = true
}) => {
    const [isExpanded, setIsExpanded] = useState(initialExpanded);

    if (steps.length === 0) return null;

    const completedCount = steps.filter(s => s.status === 'completed').length;
    const activeStep = steps.find(s => s.status === 'active');

    return (
        <div className="mb-4">
            {/* Header - Clickable to expand/collapse */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-sm text-[var(--text-secondary-color)] hover:text-[var(--text-color)] transition-colors"
            >
                {/* Chevron */}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                >
                    <polyline points="9 18 15 12 9 6" />
                </svg>

                {/* Status Text */}
                <span>
                    {activeStep ? activeStep.label : `${completedCount} steps completed`}
                </span>

                {/* Active Spinner */}
                {activeStep && (
                    <div className="w-4 h-4 border-2 border-[var(--text-secondary-color)] border-t-[var(--accent-color)] rounded-full animate-spin" />
                )}
            </button>

            {/* Steps List */}
            {isExpanded && (
                <div className="mt-3 pl-4 border-l-2 border-[var(--border-color)] space-y-2">
                    {steps.map(step => (
                        <div key={step.id} className="flex items-start gap-2">
                            {/* Status Icon */}
                            {step.status === 'completed' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 mt-0.5">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            ) : step.status === 'active' ? (
                                <div className="w-4 h-4 mt-0.5 border-2 border-[var(--text-secondary-color)] border-t-[var(--accent-color)] rounded-full animate-spin" />
                            ) : (
                                <div className="w-4 h-4 mt-0.5 rounded-full border border-[var(--border-color)]" />
                            )}

                            {/* Step Content */}
                            <div className="flex-1">
                                <span className={`text-sm ${step.status === 'completed' ? 'text-[var(--text-secondary-color)]' : 'text-[var(--text-color)]'}`}>
                                    {step.label}
                                </span>
                                {step.detail && (
                                    <p className="text-xs text-[var(--text-secondary-color)] mt-0.5">{step.detail}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ThinkingAccordion;
