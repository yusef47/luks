import React from 'react';
import { Clarification } from '../../types';

interface ClarificationRequestProps {
    clarification: Clarification;
    onSelect: (option: { key: string; value: string }) => void;
    disabled: boolean;
}

export const ClarificationRequest: React.FC<ClarificationRequestProps> = ({ clarification, onSelect, disabled }) => {
    return (
        <div>
            <p className="mb-3">{clarification.question}</p>
            <div className="flex flex-col sm:flex-row gap-2">
                {clarification.options.map(option => (
                    <button
                        key={option.key}
                        onClick={() => onSelect(option)}
                        disabled={disabled}
                        className="text-sm w-full text-left p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--hover-bg-color)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {option.value}
                    </button>
                ))}
            </div>
        </div>
    );
};
