import React from 'react';
import { Agent } from '../types';
import {
  SearchIcon,
  MapIcon,
  ImageIcon,
  SheetsIcon,
  CogIcon,
  PaperclipIcon,
  ComputerIcon
} from './icons';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  agent: Agent;
  prompt: string;
}

interface QuickActionsProps {
  onActionClick: (action: QuickAction) => void;
  t: (key: string) => string;
  lang: 'en' | 'ar';
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onActionClick, t, lang }) => {
  const actions: QuickAction[] = [
    {
      id: 'search',
      label: lang === 'ar' ? 'بحث على الويب' : 'Web Search',
      description: lang === 'ar' ? 'ابحث عن معلومات على الإنترنت' : 'Search for information online',
      icon: <SearchIcon className="w-5 h-5" />,
      agent: Agent.SearchAgent,
      prompt: lang === 'ar' ? 'ابحث عن: ' : 'Search for: '
    },
    {
      id: 'maps',
      label: lang === 'ar' ? 'خرائط' : 'Maps',
      description: lang === 'ar' ? 'ابحث عن أماكن وتوجيهات' : 'Find places and directions',
      icon: <MapIcon className="w-5 h-5" />,
      agent: Agent.MapsAgent,
      prompt: lang === 'ar' ? 'ابحث عن: ' : 'Find: '
    },
    {
      id: 'image',
      label: lang === 'ar' ? 'إنشاء صورة' : 'Create Image',
      description: lang === 'ar' ? 'أنشئ صورة من وصف نصي' : 'Generate image from text',
      icon: <ImageIcon className="w-5 h-5" />,
      agent: Agent.ImageGenerationAgent,
      prompt: lang === 'ar' ? 'أنشئ صورة: ' : 'Create image: '
    },
    {
      id: 'sheets',
      label: lang === 'ar' ? 'تنظيم البيانات' : 'Organize Data',
      description: lang === 'ar' ? 'نظم البيانات في جداول' : 'Organize data into tables',
      icon: <SheetsIcon className="w-5 h-5" />,
      agent: Agent.SheetsAgent,
      prompt: lang === 'ar' ? 'نظم البيانات التالية: ' : 'Organize this data: '
    },
    {
      id: 'vision',
      label: lang === 'ar' ? 'تحليل الصورة' : 'Analyze Image',
      description: lang === 'ar' ? 'حلل صورة وأخبرني عنها' : 'Analyze and describe an image',
      icon: <PaperclipIcon className="w-5 h-5" />,
      agent: Agent.VisionAgent,
      prompt: lang === 'ar' ? 'حلل الصورة: ' : 'Analyze this image: '
    },
    {
      id: 'code',
      label: lang === 'ar' ? 'كود' : 'Code',
      description: lang === 'ar' ? 'اكتب أو حلل أكواد برمجية' : 'Write or analyze code',
      icon: <CogIcon className="w-5 h-5" />,
      agent: Agent.SearchAgent,
      prompt: lang === 'ar' ? 'ساعدني بـ: ' : 'Help me with: '
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onActionClick(action)}
          className="flex flex-col items-center justify-center p-4 rounded-lg bg-[var(--bg-secondary-color)] border border-[var(--border-color)] hover:bg-[var(--hover-bg-color)] transition-colors duration-200 group"
          title={action.description}
        >
          <div className="text-[var(--accent-color)] group-hover:scale-110 transition-transform mb-2">
            {action.icon}
          </div>
          <span className="text-xs font-semibold text-center text-[var(--text-color)] line-clamp-2">
            {action.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default QuickActions;
