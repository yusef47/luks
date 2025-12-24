/**
 * Tutor Personas Configuration - Groq Voices
 * تعريف الشخصيات المختلفة للمعلم باستخدام Groq PlayAI
 */

export interface TutorPersona {
  id: string;
  name: string;
  displayName: string;
  avatar: string;
  description: string;
  descriptionAr: string;
  gender: 'male' | 'female';
  personality: string;
  // Groq voice ID for PlayAI TTS
  groqVoiceId: string;
  // Colors for UI
  primaryColor: string;
  secondaryColor: string;
}

export const tutorPersonas: TutorPersona[] = [
  {
    id: 'emma',
    name: 'Emma',
    displayName: 'إيما',
    avatar: '👩‍🏫',
    description: 'Friendly & Patient',
    descriptionAr: 'ودودة وصبورة',
    gender: 'female',
    personality: 'warm, encouraging, patient',
    groqVoiceId: 'Arista-PlayAI',
    primaryColor: '#EC4899',
    secondaryColor: '#F9A8D4'
  },
  {
    id: 'james',
    name: 'James',
    displayName: 'جيمس',
    avatar: '👨‍🎓',
    description: 'Professional & Clear',
    descriptionAr: 'محترف وواضح',
    gender: 'male',
    personality: 'professional, articulate, structured',
    groqVoiceId: 'Fritz-PlayAI',
    primaryColor: '#3B82F6',
    secondaryColor: '#93C5FD'
  },
  {
    id: 'atlas',
    name: 'Atlas',
    displayName: 'أطلس',
    avatar: '🧔',
    description: 'Deep & Confident',
    descriptionAr: 'عميق وواثق',
    gender: 'male',
    personality: 'confident, deep, authoritative',
    groqVoiceId: 'Atlas-PlayAI',
    primaryColor: '#6366F1',
    secondaryColor: '#A5B4FC'
  },
  {
    id: 'basil',
    name: 'Basil',
    displayName: 'باسل',
    avatar: '👨‍💼',
    description: 'Calm & Steady',
    descriptionAr: 'هادئ ومتزن',
    gender: 'male',
    personality: 'calm, steady, relaxed',
    groqVoiceId: 'Basil-PlayAI',
    primaryColor: '#10B981',
    secondaryColor: '#6EE7B7'
  },
  {
    id: 'briggs',
    name: 'Briggs',
    displayName: 'بريجز',
    avatar: '🧑‍🦱',
    description: 'Energetic',
    descriptionAr: 'نشيط وحماسي',
    gender: 'male',
    personality: 'energetic, enthusiastic, upbeat',
    groqVoiceId: 'Briggs-PlayAI',
    primaryColor: '#F59E0B',
    secondaryColor: '#FCD34D'
  },
  {
    id: 'coral',
    name: 'Coral',
    displayName: 'كورال',
    avatar: '👩‍🦰',
    description: 'Warm & Expressive',
    descriptionAr: 'دافئة ومعبرة',
    gender: 'female',
    personality: 'warm, expressive, friendly',
    groqVoiceId: 'Coral-PlayAI',
    primaryColor: '#F43F5E',
    secondaryColor: '#FDA4AF'
  },
  {
    id: 'indigo',
    name: 'Indigo',
    displayName: 'إنديجو',
    avatar: '👩‍💼',
    description: 'Professional',
    descriptionAr: 'محترفة',
    gender: 'female',
    personality: 'professional, polished, sophisticated',
    groqVoiceId: 'Indigo-PlayAI',
    primaryColor: '#8B5CF6',
    secondaryColor: '#C4B5FD'
  },
  {
    id: 'jasper',
    name: 'Jasper',
    displayName: 'جاسبر',
    avatar: '🧑‍🏫',
    description: 'Friendly',
    descriptionAr: 'ودود',
    gender: 'male',
    personality: 'friendly, approachable, cheerful',
    groqVoiceId: 'Jasper-PlayAI',
    primaryColor: '#14B8A6',
    secondaryColor: '#5EEAD4'
  }
];

// Default persona
export const defaultPersonaId = 'emma';

// Get persona by ID
export const getPersonaById = (id: string): TutorPersona | undefined => {
  return tutorPersonas.find(p => p.id === id);
};

// Get default persona
export const getDefaultPersona = (): TutorPersona => {
  return getPersonaById(defaultPersonaId) || tutorPersonas[0];
};

export default tutorPersonas;
