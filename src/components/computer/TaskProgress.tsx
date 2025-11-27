/**
 * TaskProgress Component
 * عرض تقدم المهام في الخطة
 */

import React from 'react';
import { PlanStep, StepResult } from '../../../types';
import { ClockIcon, CheckCircleIcon, LoadingSpinnerIcon } from '../../../components/icons';

interface TaskProgressProps {
  plan: PlanStep[] | null;
  results: StepResult[];
  onStepSelect: (step: StepResult) => void;
  viewedStep: StepResult | null;
  t: (key: string) => string;
}

export const TaskProgress: React.FC<TaskProgressProps> = ({
  plan,
  results,
  onStepSelect,
  viewedStep,
  t
}) => {
  if (!plan || plan.length === 0) {
    return (
      <div className="card p-4 h-full">
        <h3 className="font-bold text-sm mb-2">{t('taskProgress')}</h3>
        <p className="text-sm text-[var(--text-secondary-color)]">
          {t('computerStatusWaiting')}
        </p>
      </div>
    );
  }

  const getStatusIcon = (status: StepResult['status']) => {
    switch (status) {
      case 'running':
        return <LoadingSpinnerIcon className="w-5 h-5 text-blue-500" />;
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'error':
        return <CheckCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-[var(--text-secondary-color)]" />;
    }
  };

  return (
    <div className="card p-4 h-full overflow-y-scroll">
      <h3 className="font-bold text-sm mb-3">{t('taskProgress')}</h3>
      <ul className="space-y-1">
        {plan.map(step => {
          const result = results.find(r => r.step === step.step);
          if (!result) return null;

          const status = result.status;
          const isViewed = viewedStep?.step === result.step;

          return (
            <li key={step.step}>
              <button
                onClick={() => onStepSelect(result)}
                disabled={status === 'pending'}
                className={`w-full flex items-center space-x-3 rtl:space-x-reverse text-sm p-2 rounded-md transition-colors text-left rtl:text-right disabled:opacity-50 disabled:cursor-not-allowed ${
                  isViewed 
                    ? 'bg-[var(--hover-bg-color)]' 
                    : 'hover:bg-[var(--hover-bg-color)]'
                }`}
              >
                <div>{getStatusIcon(status)}</div>
                <span className={status === 'pending' ? 'text-[var(--text-secondary-color)]' : ''}>
                  {step.task}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default TaskProgress;
