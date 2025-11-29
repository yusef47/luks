/**
 * Backend Proxy Service
 * ⚠️ SECURITY: All Gemini API calls go through backend
 * API keys are NEVER exposed to the client
 */

// @ts-ignore - Vite env
const env = (import.meta as any).env || {};

const BACKEND_URL = env.VITE_BACKEND_URL || 'http://localhost:5000/api';

export interface ProxyRequest {
    model: string;
    prompt: string;
}

export interface ProxyResponse {
    success: boolean;
    data?: string;
    error?: string;
}

/**
 * Call Gemini API through secure backend proxy
 */
export const callGeminiViaBackend = async (request: ProxyRequest): Promise<string> => {
    try {
        console.log(`🔄 Calling backend proxy: ${BACKEND_URL}/gemini/call`);
        
        const response = await fetch(`${BACKEND_URL}/gemini/call`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            throw new Error(`Backend error: ${response.status} ${response.statusText}`);
        }

        const result: ProxyResponse = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Backend call failed');
        }

        console.log('✅ Backend proxy call successful');
        return result.data || '';
    } catch (error: any) {
        console.error('❌ Backend proxy error:', error);
        throw error;
    }
};

/**
 * Wrapper for presentation generation
 */
export const callPresentationModel = async (
    model: string,
    prompt: string,
    schema?: any
): Promise<any> => {
    const response = await callGeminiViaBackend({
        model,
        prompt
    });

    // Parse JSON if needed
    try {
        let jsonText = response.trim();
        
        // Remove markdown code blocks
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.substring(7);
        }
        if (jsonText.startsWith('```')) {
            jsonText = jsonText.substring(3);
        }
        if (jsonText.endsWith('```')) {
            jsonText = jsonText.substring(0, jsonText.length - 3);
        }
        
        jsonText = jsonText.trim();
        return JSON.parse(jsonText);
    } catch (e) {
        // Return as string if not JSON
        return response;
    }
};

/**
 * Stream presentation content
 */
export const streamPresentationContent = async (
    model: string,
    prompt: string,
    onChunk?: (chunk: string) => void
): Promise<string> => {
    // For now, just call the regular endpoint
    // Streaming can be implemented later if needed
    const response = await callGeminiViaBackend({
        model,
        prompt
    });

    if (onChunk) {
        onChunk(response);
    }

    return response;
};

// Export model names for compatibility
export const MODELS = {
    FLASH_LITE: 'gemini-2.0-flash-lite',
    FLASH_LIVE: 'gemini-2.5-flash-live',
    PRO: 'gemini-2.5-pro',
    IMAGE_GEN: 'gemini-2.5-flash-image'
};

export default {
    callGeminiViaBackend,
    callPresentationModel,
    streamPresentationContent,
    MODELS
};
