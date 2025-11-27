/**
 * PersonaSelector Component
 * مكون اختيار الشخصية للمعلم
 */

import React from 'react';
import { tutorPersonas, TutorPersona } from '../../config/tutorPersonas';
import { speechService } from '../../services/speechService';

interface PersonaSelectorProps {
  selectedPersonaId: string;
  onSelectPersona: (personaId: string) => void;
  isCompact?: boolean;
}

export const PersonaSelector: React.FC<PersonaSelectorProps> = ({
  selectedPersonaId,
  onSelectPersona,
  isCompact = false
}) => {
  const [previewingId, setPreviewingId] = React.useState<string | null>(null);

  const handlePreview = async (persona: TutorPersona, e: React.MouseEvent) => {
    e.stopPropagation();

    if (previewingId) {
      speechService.stopSpeaking();
      setPreviewingId(null);
      return;
    }

    setPreviewingId(persona.id);

    const previewTexts: Record<string, string> = {
      'emma': "Hi there! I'm Emma, your friendly English tutor. I'm here to help you learn in a warm and supportive way!",
      'james': "Hello. I'm James, your English instructor. I focus on clear explanations and practical language skills.",
      'sofia': "Hey! I'm Sofia! Ready to have some fun while learning English? Let's make this exciting!",
      'michael': "Hello. I'm Michael. I take my time to explain things clearly, step by step. No rushing here."
    };

    try {
      await speechService.speak(previewTexts[persona.id] || `Hi, I'm ${persona.name}!`, {
        voiceHints: persona.voiceHints,
        rate: persona.speechRate,
        pitch: persona.pitch
      });
    } catch (err) {
      console.error('Preview error:', err);
    }

    setPreviewingId(null);
  };

  // State for collapse/expand
  const [isExpanded, setIsExpanded] = React.useState(!selectedPersonaId);

  // Auto-collapse after selection
  const handleSelect = (id: string) => {
    onSelectPersona(id);
    setIsExpanded(false);
  };

  if (isCompact) {
    return (
      <div className="flex gap-2 flex-wrap">
        {tutorPersonas.map((persona) => (
          <button
            key={persona.id}
            onClick={() => handleSelect(persona.id)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200
              ${selectedPersonaId === persona.id
                ? 'ring-2 ring-offset-2 ring-offset-gray-900'
                : 'hover:bg-white/10'
              }
            `}
            style={{
              backgroundColor: selectedPersonaId === persona.id
                ? `${persona.primaryColor}30`
                : 'rgba(255,255,255,0.05)',
              borderColor: selectedPersonaId === persona.id
                ? persona.primaryColor
                : 'transparent',
              ringColor: persona.primaryColor
            }}
          >
            <span className="text-xl">{persona.avatar}</span>
            <span className="text-sm font-medium text-white">{persona.name}</span>
          </button>
        ))}
      </div>
    );
  }

  // Collapsed View (Selected Tutor)
  if (!isExpanded && selectedPersonaId) {
    const selectedPersona = tutorPersonas.find(p => p.id === selectedPersonaId);
    if (selectedPersona) {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-400">Your Tutor</h3>
            <button
              onClick={() => setIsExpanded(true)}
              className="text-xs text-[var(--accent-color)] hover:underline"
            >
              Change
            </button>
          </div>

          <div
            className="relative rounded-xl p-3 border transition-all"
            style={{
              backgroundColor: `${selectedPersona.primaryColor}10`,
              borderColor: selectedPersona.primaryColor
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                style={{
                  background: `linear-gradient(135deg, ${selectedPersona.primaryColor}, ${selectedPersona.secondaryColor})`
                }}
              >
                {selectedPersona.avatar}
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">{selectedPersona.name}</h4>
                <p className="text-xs text-gray-400">{selectedPersona.personality}</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // Expanded View (Full List)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-400">Choose Your Tutor</h3>
        {selectedPersonaId && (
          <button
            onClick={() => setIsExpanded(false)}
            className="text-xs text-gray-500 hover:text-white"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {tutorPersonas.map((persona) => {
          const isSelected = selectedPersonaId === persona.id;
          const isPreviewing = previewingId === persona.id;

          return (
            <div
              key={persona.id}
              onClick={() => handleSelect(persona.id)}
              className={`
                relative cursor-pointer rounded-xl p-4 transition-all duration-300
                transform hover:scale-[1.02] active:scale-[0.98]
                ${isSelected
                  ? 'ring-2 shadow-lg'
                  : 'hover:bg-white/5'
                }
              `}
              style={{
                backgroundColor: isSelected
                  ? `${persona.primaryColor}20`
                  : 'rgba(255,255,255,0.03)',
                borderColor: isSelected ? persona.primaryColor : 'transparent',
                ringColor: persona.primaryColor,
                boxShadow: isSelected
                  ? `0 4px 20px ${persona.primaryColor}30`
                  : 'none'
              }}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div
                  className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: persona.primaryColor }}
                >
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}

              {/* Avatar */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                  style={{
                    background: `linear-gradient(135deg, ${persona.primaryColor}, ${persona.secondaryColor})`
                  }}
                >
                  {persona.avatar}
                </div>
                <div>
                  <h4 className="font-semibold text-white">{persona.name}</h4>
                  <p className="text-xs text-gray-400">{persona.description}</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                {persona.personality}
              </p>

              {/* Preview button */}
              <button
                onClick={(e) => handlePreview(persona, e)}
                className={`
                  w-full py-2 px-3 rounded-lg text-xs font-medium
                  flex items-center justify-center gap-2
                  transition-all duration-200
                  ${isPreviewing
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }
                `}
              >
                {isPreviewing ? (
                  <>
                    <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Stop
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    Preview Voice
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PersonaSelector;
