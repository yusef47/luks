import { useCallback, useRef } from 'react';
import {
  classifyIntent,
  evaluateResult,
  saveMessage,
  saveContext,
  getContext,
  IntentResult,
  EvaluationResult
} from '../services/orchestratorService';
import { Agent, StepResult } from '../types';

interface UseOrchestratorIntegrationProps {
  conversationId: string;
  onIntentClassified?: (intent: IntentResult) => void;
  onResultEvaluated?: (evaluation: EvaluationResult) => void;
}

export const useOrchestratorIntegration = ({
  conversationId,
  onIntentClassified,
  onResultEvaluated
}: UseOrchestratorIntegrationProps) => {
  const retryCountRef = useRef<{ [key: string]: number }>({});

  // Classify user intent
  const classifyUserIntent = useCallback(
    async (message: string): Promise<IntentResult | null> => {
      try {
        const intent = await classifyIntent(message);
        onIntentClassified?.(intent);
        return intent;
      } catch (error) {
        console.error('Failed to classify intent:', error);
        return null;
      }
    },
    [onIntentClassified]
  );

  // Evaluate agent result with retry logic
  const evaluateAgentResult = useCallback(
    async (
      userRequest: string,
      agentResponse: string,
      agent: string,
      maxRetries: number = 2
    ): Promise<EvaluationResult | null> => {
      try {
        const evaluation = await evaluateResult(userRequest, agentResponse, agent);
        
        // If result is not acceptable and we have retries left, mark for retry
        if (!evaluation.isAcceptable && evaluation.shouldRetry) {
          const retryKey = `${agent}-${userRequest}`;
          const currentRetries = retryCountRef.current[retryKey] || 0;
          
          if (currentRetries < maxRetries) {
            retryCountRef.current[retryKey] = currentRetries + 1;
            evaluation.shouldRetry = true;
          } else {
            evaluation.shouldRetry = false;
            delete retryCountRef.current[retryKey];
          }
        }
        
        onResultEvaluated?.(evaluation);
        return evaluation;
      } catch (error) {
        console.error('Failed to evaluate result:', error);
        return null;
      }
    },
    [onResultEvaluated]
  );

  // Save message to database
  const persistMessage = useCallback(
    async (
      messageId: string,
      userMessage: string,
      agentResponse?: string,
      agent?: string,
      status?: string
    ): Promise<void> => {
      try {
        await saveMessage(
          messageId,
          conversationId,
          userMessage,
          agentResponse,
          agent,
          status
        );
      } catch (error) {
        console.error('Failed to save message:', error);
      }
    },
    [conversationId]
  );

  // Save context for session memory
  const persistContext = useCallback(
    async (contextData: Record<string, any>): Promise<void> => {
      try {
        const contextId = `ctx-${Date.now()}`;
        await saveContext(contextId, conversationId, contextData);
      } catch (error) {
        console.error('Failed to save context:', error);
      }
    },
    [conversationId]
  );

  // Get context history
  const retrieveContext = useCallback(async (): Promise<Record<string, any>[]> => {
    try {
      const contextArray = await getContext(conversationId);
      return contextArray;
    } catch (error) {
      console.error('Failed to retrieve context:', error);
      return [];
    }
  }, [conversationId]);

  // Build context from previous interactions
  const buildContextFromHistory = useCallback(
    async (stepResults: StepResult[]): Promise<Record<string, any>> => {
      const context: Record<string, any> = {
        timestamp: new Date().toISOString(),
        completedSteps: stepResults
          .filter(s => s.status === 'completed')
          .map(s => ({
            agent: s.agent,
            task: s.task,
            resultPreview: s.result.substring(0, 200)
          })),
        lastResults: stepResults.slice(-3).map(s => ({
          agent: s.agent,
          status: s.status
        }))
      };

      // Add historical context if available
      const historicalContext = await retrieveContext();
      if (historicalContext.length > 0) {
        context.previousContext = historicalContext[0];
      }

      return context;
    },
    [retrieveContext]
  );

  return {
    classifyUserIntent,
    evaluateAgentResult,
    persistMessage,
    persistContext,
    retrieveContext,
    buildContextFromHistory
  };
};
