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
    <div className="glass-panel flex flex-col h-full rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10">
      {/* Window Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-black/40 border-b border-[var(--border-color)] backdrop-blur-md">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          {/* Traffic Lights */}
          <div className="w-2 h-2 rounded-full bg-red-500/50" />
          <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
          <div className="w-2 h-2 rounded-full bg-green-500/50" />
          <div className="h-4 w-[1px] bg-[var(--border-color)] mx-2" />
          <span className="text-xs font-mono font-medium text-[var(--text-secondary-color)] tracking-wide">
            LUKAS_OS_V2.0
          </span>
        </div>
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <div className="px-2 py-0.5 rounded bg-[var(--bg-tertiary-color)] border border-[var(--border-color)]">
            <span className="text-[10px] font-mono text-[var(--text-secondary-color)]">CONNECTED</span>
          </div>
        </div>
      </header>
      
      {/* Content */}
      <div className="flex-grow min-h-0 bg-black/20 p-4">
        <AgentVisualizer step={viewedStep} t={t} />
      </div>
    </div>
  );
};

export default VirtualComputer;
