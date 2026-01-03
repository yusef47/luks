/**
 * VirtualComputer Component
 * عرض الـ Virtual Computer الذي يظهر عمل الـ Agents
 */

import React from 'react';
import { StepResult } from '../../../types';
import { AgentVisualizer } from './AgentVisualizer';

interface VirtualComputerProps {
  viewedStep: StepResult | null;
  t: (key: string) => string;
}

export const VirtualComputer: React.FC<VirtualComputerProps> = ({ viewedStep, t }) => {
  return (
    <div className="flex flex-col h-full rounded-2xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-color)] shadow-sm">
      {/* Window Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-[var(--bg-secondary-color)] border-b border-[var(--border-color)]">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          {/* Mac-style traffic lights (muted for light theme) */}
          <div className="w-3 h-3 rounded-full bg-[#FF5F57] border border-[#E0443E]" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border-[#DEA123]" />
          <div className="w-3 h-3 rounded-full bg-[#28C840] border-[#1AAB29]" />
          <div className="h-4 w-[1px] bg-[var(--border-color)] mx-2" />
          <span className="text-xs font-medium text-[var(--text-secondary-color)] tracking-wide">
            Lukas Virtual OS
          </span>
        </div>
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <div className="px-2 py-0.5 rounded bg-white/50 border border-[var(--border-color)]">
            <span className="text-[10px] font-mono text-green-600 font-bold">ONLINE</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-grow min-h-0 bg-[var(--bg-tertiary-color)] p-4">
        <AgentVisualizer step={viewedStep} t={t} />
      </div>
    </div>
  );
};

export default VirtualComputer;
