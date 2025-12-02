/**
 * TutorControls Component
 * أدوات التحكم في الـ English Tutor Mode
 * مع دعم الشخصيات المختلفة
 */

import React from 'react';
import type { LanguageLevel } from '../../services/tutorClient';
import { PersonaSelector } from '../tutor/PersonaSelector';

interface TutorControlsProps {
  isActive: boolean;
  onToggle: () => void;
  speechRate: number;
  onSpeechRateChange: (rate: number) => void;
  languageLevel: LanguageLevel;
  onLanguageLevelChange: (level: LanguageLevel) => void;
  personaId: string;
  onPersonaChange: (personaId: string) => void;
}

export const TutorControls: React.FC<TutorControlsProps> = ({
  isActive,
  onToggle,
  speechRate,
  onSpeechRateChange,
  languageLevel,
  onLanguageLevelChange,
  personaId,
  onPersonaChange
}) => {
  const speedOptions = [
    { value: 1.5, label: '🚀 Fast', title: 'Fast - للمتقدمين' },
    { value: 1.0, label: '⚡ Normal', title: 'Normal - عادي' },
    { value: 0.6, label: '🐢 Slow', title: 'Slow - للمبتدئين' }
  ];

  const levels: LanguageLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];
  const levelTitles: Record<LanguageLevel, string> = {
    'A1': 'Beginner',
    'A2': 'Elementary',
    'B1': 'Intermediate',
    'B2': 'Upper-Int',
    'C1': 'Advanced'
  };

  return (
    <div className="px-3 py-2">
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all border ${
          isActive 
            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
            : 'bg-[var(--bg-tertiary-color)] border-transparent text-[var(--text-secondary-color)] hover:text-[var(--text-color)]'
        }`}
      >
        <span className="text-lg">🎓</span>
        <span className="text-sm font-medium">English Tutor</span>
        {isActive && (
          <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        )}
      </button>

      {/* Controls (only show when active) */}
      {isActive && (
        <div className="mt-3 px-1 space-y-4">
          {/* Speaking Speed */}
          <div>
            <div className="text-xs text-[var(--text-secondary-color)] mb-1.5 font-medium">
              Speaking Speed
            </div>
            <div className="flex gap-1">
              {speedOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => onSpeechRateChange(option.value)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs transition-all ${
                    speechRate === option.value 
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' 
                      : 'bg-[var(--bg-tertiary-color)] text-[var(--text-secondary-color)] hover:bg-[var(--hover-bg-color)]'
                  }`}
                  title={option.title}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Language Level */}
          <div>
            <div className="text-xs text-[var(--text-secondary-color)] mb-1.5 font-medium">
              Language Level
            </div>
            <div className="grid grid-cols-5 gap-1">
              {levels.map(level => (
                <button
                  key={level}
                  onClick={() => onLanguageLevelChange(level)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    languageLevel === level 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
                      : 'bg-[var(--bg-tertiary-color)] text-[var(--text-secondary-color)] hover:bg-[var(--hover-bg-color)]'
                  }`}
                  title={levelTitles[level]}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Persona Selection */}
          <div>
            <PersonaSelector
              selectedPersonaId={personaId}
              onSelectPersona={onPersonaChange}
            />
          </div>

          {/* Tips */}
          <div className="text-xs text-[var(--text-secondary-color)] bg-[var(--bg-tertiary-color)] rounded-lg p-2">
            💡 Click the microphone to start speaking
          </div>
        </div>
      )}
    </div>
  );
};

export default TutorControls;
