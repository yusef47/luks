/**
 * Mastra API Client
 * Frontend client للتواصل مع Mastra Backend
 */

const API_BASE = '/api/mastra';

export interface PlanStep {
  step: number;
  agent: string;
  task: string;
}

export interface StepResult extends PlanStep {
  result: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  error?: string;
}

export interface OrchestrateRequest {
  userMessage: string;
  hasImage?: boolean;
  hasVideo?: boolean;
  imageData?: string;
  videoData?: string;
  location?: { latitude: number; longitude: number };
  history?: any[];
}

export interface TutorRequest {
  message: string;
  level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  mode?: 'conversation' | 'practice' | 'correction';
  history?: { role: string; content: string }[];
}

export interface StreamEvent {
  type: 'status' | 'plan' | 'step_result' | 'corrections' | 'complete' | 'error';
  [key: string]: any;
}

/**
 * Stream orchestration response
 */
export async function* streamOrchestrate(
  request: OrchestrateRequest
): AsyncGenerator<StreamEvent> {
  const response = await fetch(`${API_BASE}/orchestrate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          yield data as StreamEvent;
        } catch (e) {
          console.error('Parse error:', e);
        }
      }
    }
  }
}

/**
 * Stream tutor response
 */
export async function* streamTutor(
  request: TutorRequest
): AsyncGenerator<StreamEvent> {
  const response = await fetch(`${API_BASE}/tutor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          yield data as StreamEvent;
        } catch (e) {
          console.error('Parse error:', e);
        }
      }
    }
  }
}

/**
 * Generate practice sentence
 */
export async function generatePractice(
  level: string = 'B1',
  topic?: string
): Promise<{
  sentence: string;
  topic: string;
  hints: string[];
  vocabulary: { word: string; meaning: string }[];
}> {
  const response = await fetch(`${API_BASE}/tutor/practice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level, topic })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Evaluate pronunciation attempt
 */
export async function evaluatePronunciation(
  targetSentence: string,
  studentAttempt: string,
  level: string = 'B1'
): Promise<{
  score: number;
  correctedSentence: string;
  mistakes: { original: string; corrected: string; explanation: string }[];
  pronunciationTips: string[];
  encouragement: string;
}> {
  const response = await fetch(`${API_BASE}/tutor/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetSentence, studentAttempt, level })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Get list of available agents
 */
export async function getAgents(): Promise<{
  count: number;
  agents: { name: string; description: string }[];
}> {
  const response = await fetch(`${API_BASE}/agents`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

/**
 * Get list of available workflows
 */
export async function getWorkflows(): Promise<{
  count: number;
  workflows: { name: string; description: string }[];
}> {
  const response = await fetch(`${API_BASE}/workflows`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

/**
 * Helper: Run orchestration and get final result
 */
export async function orchestrate(request: OrchestrateRequest): Promise<{
  response: string;
  plan: PlanStep[];
  results: StepResult[];
}> {
  let finalResult: any = { response: '', plan: [], results: [] };

  for await (const event of streamOrchestrate(request)) {
    if (event.type === 'complete') {
      finalResult = {
        response: event.response,
        plan: event.plan || [],
        results: event.results || []
      };
    } else if (event.type === 'error') {
      throw new Error(event.error);
    }
  }

  return finalResult;
}

/**
 * Helper: Run tutor and get final result
 */
export async function tutorChat(request: TutorRequest): Promise<{
  response: string;
  corrections: any[];
  history: any[];
}> {
  let finalResult: any = { response: '', corrections: [], history: [] };

  for await (const event of streamTutor(request)) {
    if (event.type === 'complete') {
      finalResult = {
        response: event.response,
        corrections: event.corrections || [],
        history: event.history || []
      };
    } else if (event.type === 'error') {
      throw new Error(event.error || event.response);
    }
  }

  return finalResult;
}

export default {
  streamOrchestrate,
  streamTutor,
  orchestrate,
  tutorChat,
  generatePractice,
  evaluatePronunciation,
  getAgents,
  getWorkflows
};
