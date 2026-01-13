/**
 * VirtualComputer Component
 * عرض الـ Virtual Computer الذي يظهر عمل الـ Agents مع البث المباشر
 */

import React, { useState } from 'react';
import { StepResult } from '../../../types';
import { AgentVisualizer } from './AgentVisualizer';
import { BrowserStream } from './BrowserStream';
import { Brain, Monitor } from 'lucide-react';

interface VirtualComputerProps {
  viewedStep: StepResult | null;
  t: (key: string) => string;
  isBrowserActive?: boolean;
  aiBrowserScreenshot?: string | null;
}

export const VirtualComputer: React.FC<VirtualComputerProps> = ({ viewedStep, t, isBrowserActive = false, aiBrowserScreenshot = null }) => {
  const [activeTab, setActiveTab] = useState<'agent' | 'browser'>('agent');
  const [browserStatus, setBrowserStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');

  return (
    <div className="flex flex-col h-full rounded-2xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-color)] shadow-sm">
      {/* Window Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-[var(--bg-secondary-color)] border-b border-[var(--border-color)]">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          {/* Mac-style traffic lights */}
          <div className="w-3 h-3 rounded-full bg-[#FF5F57] border border-[#E0443E]" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border-[#DEA123]" />
          <div className="w-3 h-3 rounded-full bg-[#28C840] border-[#1AAB29]" />
          <div className="h-4 w-[1px] bg-[var(--border-color)] mx-2" />
          <span className="text-xs font-medium text-[var(--text-secondary-color)] tracking-wide">
            Lukas Virtual OS
          </span>
        </div>
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          {browserStatus === 'connected' && (
            <div className="px-2 py-0.5 rounded bg-green-100 border border-green-300">
              <span className="text-[10px] font-mono text-green-700 font-bold">LIVE</span>
            </div>
          )}
          <div className="px-2 py-0.5 rounded bg-white/50 border border-[var(--border-color)]">
            <span className="text-[10px] font-mono text-green-600 font-bold">ONLINE</span>
          </div>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-secondary-color)]">
        <button
          onClick={() => setActiveTab('agent')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'agent'
            ? 'text-[var(--primary-color)] border-b-2 border-[var(--primary-color)] bg-[var(--bg-color)]'
            : 'text-[var(--text-secondary-color)] hover:text-[var(--text-color)]'
            }`}
        >
          <Brain className="w-4 h-4" />
          <span>الوكلاء</span>
        </button>
        <button
          onClick={() => setActiveTab('browser')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'browser'
            ? 'text-[var(--primary-color)] border-b-2 border-[var(--primary-color)] bg-[var(--bg-color)]'
            : 'text-[var(--text-secondary-color)] hover:text-[var(--text-color)]'
            }`}
        >
          <Monitor className="w-4 h-4" />
          <span>المتصفح</span>
          {browserStatus === 'connected' && (
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-grow min-h-0 bg-[var(--bg-tertiary-color)]">
        {activeTab === 'agent' ? (
          <div className="h-full p-4">
            <AgentVisualizer step={viewedStep} t={t} />
          </div>
        ) : (
          <div className="h-full">
            <BrowserStream
              isActive={isBrowserActive || activeTab === 'browser'}
              onStatusChange={setBrowserStatus}
              aiScreenshot={aiBrowserScreenshot}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default VirtualComputer;
