/**
 * AgentVisualizer Component
 * عرض تفاصيل خطوة الـ Agent الحالية
 */

import React from 'react';
import { StepResult, Agent } from '../../../types';
import { AgentIcon, ComputerIcon, CheckCircleIcon } from '../../../components/icons';
import { StreamingMarkdownRenderer } from '../StreamingMarkdownRenderer';

interface AgentVisualizerProps {
  step: StepResult | null;
  t: (key: string) => string;
}

export const AgentVisualizer: React.FC<AgentVisualizerProps> = ({ step, t }) => {
  if (!step) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary-color)] opacity-50">
        <div className="w-16 h-16 rounded-2xl border border-[var(--border-color)] flex items-center justify-center mb-4">
          <ComputerIcon className="w-8 h-8" />
        </div>
        <p className="text-sm font-medium">Lukas Computer Idle</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            step.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-[var(--text-secondary-color)]'
          }`} />
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-secondary-color)]">
            {step.agent === Agent.Orchestrator ? 'SYSTEM' : step.agent}
          </span>
        </div>
        <span className="text-xs font-mono text-[var(--text-secondary-color)] opacity-70">
          PID: {Math.floor(Math.random() * 9000) + 1000}
        </span>
      </div>

      {/* Content */}
      <div className="flex-grow overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {/* Action Card */}
        <div className="glass-panel p-4 rounded-xl border-l-2 border-l-[var(--accent-color)]">
          <div className="flex items-start gap-3">
            <AgentIcon agent={step.agent} className="w-5 h-5 text-[var(--accent-color)] mt-0.5" />
            <div className="flex-grow">
              <p className="text-sm font-medium text-[var(--text-color)]">{step.action || step.task}</p>
              {step.details && (
                <p className="text-xs text-[var(--text-secondary-color)] mt-1 font-mono">
                  {step.details}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tool Call */}
        {step.toolCall && (
          <div className="glass-panel p-3 rounded-xl">
            <div className="flex items-center gap-2 mb-2 border-b border-[var(--border-color)] pb-2">
              <span className="text-xs font-mono text-[var(--accent-color)]">$ tool_exec</span>
              <span className="text-xs text-[var(--text-secondary-color)]">{step.toolCall.name}</span>
            </div>
            <pre className="text-xs font-mono text-[var(--text-secondary-color)] overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(step.toolCall.args, null, 2)}
            </pre>
          </div>
        )}

        {/* Output */}
        {step.output && (
          <div className="glass-panel p-3 rounded-xl border border-green-500/20 bg-green-500/5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircleIcon className="w-4 h-4 text-green-500" />
              <span className="text-xs font-bold text-green-500">SUCCESS</span>
            </div>
            <div className="prose prose-invert prose-xs max-w-none">
              <StreamingMarkdownRenderer 
                content={typeof step.output === 'string' ? step.output : JSON.stringify(step.output)} 
              />
            </div>
          </div>
        )}

        {/* Result (if no output) */}
        {!step.output && step.result && step.status === 'completed' && (
          <div className="glass-panel p-3 rounded-xl border border-green-500/20 bg-green-500/5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircleIcon className="w-4 h-4 text-green-500" />
              <span className="text-xs font-bold text-green-500">COMPLETED</span>
            </div>
            <div className="prose prose-invert prose-xs max-w-none">
              <StreamingMarkdownRenderer content={step.result} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentVisualizer;
