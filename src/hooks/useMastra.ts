/**
 * useMastra Hook
 * هوك للتعامل مع Mastra API من الـ Frontend
 */

import { useState, useCallback, useRef } from 'react';
import {
  streamOrchestrate,
  streamTutor,
  generatePractice,
  evaluatePronunciation,
  OrchestrateRequest,
  TutorRequest,
  StreamEvent,
  PlanStep,
  StepResult
} from '../api/mastraApi';

export interface MastraState {
  isLoading: boolean;
  error: string | null;
  status: string;
}

export interface OrchestratorResult {
  response: string;
  plan: PlanStep[];
  results: StepResult[];
}

export interface TutorResult {
  response: string;
  corrections: any[];
  history: any[];
}

export function useMastra() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('idle');
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Run orchestration with streaming
   */
  const runOrchestration = useCallback(async (
    request: OrchestrateRequest,
    callbacks?: {
      onStatus?: (status: string, message: string) => void;
      onPlan?: (plan: PlanStep[], reasoning: string) => void;
      onStepResult?: (result: StepResult) => void;
      onComplete?: (result: OrchestratorResult) => void;
      onError?: (error: string) => void;
    }
  ): Promise<OrchestratorResult | null> => {
    setIsLoading(true);
    setError(null);
    setStatus('starting');

    let finalResult: OrchestratorResult | null = null;

    try {
      for await (const event of streamOrchestrate(request)) {
        switch (event.type) {
          case 'status':
            setStatus(event.status);
            callbacks?.onStatus?.(event.status, event.message);
            break;

          case 'plan':
            callbacks?.onPlan?.(event.plan, event.reasoning);
            break;

          case 'step_result':
            callbacks?.onStepResult?.(event as unknown as StepResult);
            break;

          case 'complete':
            finalResult = {
              response: event.response,
              plan: event.plan || [],
              results: event.results || []
            };
            setStatus('completed');
            callbacks?.onComplete?.(finalResult);
            break;

          case 'error':
            setError(event.error);
            setStatus('error');
            callbacks?.onError?.(event.error);
            break;
        }
      }
    } catch (e: any) {
      setError(e.message);
      setStatus('error');
      callbacks?.onError?.(e.message);
    } finally {
      setIsLoading(false);
    }

    return finalResult;
  }, []);

  /**
   * Run tutor conversation with streaming
   */
  const runTutor = useCallback(async (
    request: TutorRequest,
    callbacks?: {
      onStatus?: (status: string, message: string) => void;
      onCorrections?: (corrections: any[]) => void;
      onComplete?: (result: TutorResult) => void;
      onError?: (error: string) => void;
    }
  ): Promise<TutorResult | null> => {
    setIsLoading(true);
    setError(null);
    setStatus('processing');

    let finalResult: TutorResult | null = null;

    try {
      for await (const event of streamTutor(request)) {
        switch (event.type) {
          case 'status':
            setStatus(event.status);
            callbacks?.onStatus?.(event.status, event.message);
            break;

          case 'corrections':
            callbacks?.onCorrections?.(event.corrections);
            break;

          case 'complete':
            finalResult = {
              response: event.response,
              corrections: event.corrections || [],
              history: event.history || []
            };
            setStatus('completed');
            callbacks?.onComplete?.(finalResult);
            break;

          case 'error':
            setError(event.error);
            setStatus('error');
            callbacks?.onError?.(event.error);
            break;
        }
      }
    } catch (e: any) {
      setError(e.message);
      setStatus('error');
      callbacks?.onError?.(e.message);
    } finally {
      setIsLoading(false);
    }

    return finalResult;
  }, []);

  /**
   * Generate practice sentence
   */
  const getPractice = useCallback(async (level: string = 'B1', topic?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await generatePractice(level, topic);
      return result;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Evaluate pronunciation
   */
  const evaluate = useCallback(async (
    targetSentence: string,
    studentAttempt: string,
    level: string = 'B1'
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await evaluatePronunciation(targetSentence, studentAttempt, level);
      return result;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Cancel ongoing request
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setStatus('cancelled');
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setStatus('idle');
  }, []);

  return {
    // State
    isLoading,
    error,
    status,

    // Actions
    runOrchestration,
    runTutor,
    getPractice,
    evaluate,
    cancel,
    reset
  };
}

export default useMastra;
